import "server-only";

import crypto from "node:crypto";

/**
 * Firebase Cloud Messaging (HTTP v1) sender for Sunmi POS new-order pushes.
 * FCM is a LATENCY optimisation, never a source of truth — the POS app still
 * polls every 5s regardless, so a push failure just means the ticket prints
 * on the next poll instead of instantly. Config via env:
 *   FCM_PROJECT_ID    — Firebase project id
 *   FCM_CLIENT_EMAIL  — service account client_email
 *   FCM_PRIVATE_KEY   — service account private_key (PEM; \n-escaped in env)
 */

const PROJECT_ID = process.env.FCM_PROJECT_ID;
const CLIENT_EMAIL = process.env.FCM_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.FCM_PRIVATE_KEY;

export function isFcmConfigured(): boolean {
  return Boolean(PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY);
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Mint a short-lived Google OAuth2 access token from the service account (JWT bearer grant). */
async function mintAccessToken(): Promise<string> {
  const privateKey = (PRIVATE_KEY as string).replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`,
    cache: "no-store",
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`FCM OAuth2 token exchange failed: ${data.error_description ?? data.error ?? res.status}`);
  }
  return data.access_token;
}

// Cache the access token in-process — tokens are valid ~1h; we refresh at ~55min.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;
  const token = await mintAccessToken();
  cachedToken = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

/**
 * Send a data-only, high-priority FCM message to each token. Data-only (no
 * `notification` key) so the Sunmi app's onMessageReceived fires even in the
 * background. Returns how many sent successfully and which tokens are dead
 * (unregistered/not-found) so the caller can prune pos_devices.
 */
export async function sendFcmData(
  tokens: string[],
  data: Record<string, string>,
): Promise<{ sent: number; invalidTokens: string[] }> {
  if (!isFcmConfigured()) return { sent: 0, invalidTokens: [] };
  if (tokens.length === 0) return { sent: 0, invalidTokens: [] };

  // Let a mint failure throw — the caller (dispatchFcmDue) must see this as a
  // real failure so it retries/dead-letters instead of silently marking the
  // row "sent". Never include the key/token/JWT in the thrown message.
  const accessToken = await getAccessToken();

  let sent = 0;
  let realFailure = false;
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            data,
            android: { priority: "high" },
          },
        }),
        cache: "no-store",
      });

      if (res.ok) {
        sent++;
        continue;
      }

      const bodyText = await res.text().catch(() => "");
      if (res.status === 404 || bodyText.includes("UNREGISTERED") || bodyText.includes("NOT_FOUND")) {
        invalidTokens.push(token);
      } else {
        realFailure = true;
      }
    } catch {
      // Network/other error on this one token — skip it, don't abort the batch,
      // but this is a real (transport) failure, not an invalid token.
      realFailure = true;
    }
  }

  // If every token failed for a real (non-invalid-token) reason, surface that
  // as a thrown error so dispatchFcmDue retries/dead-letters the row instead
  // of marking it "sent". If at least one token sent, or every failure was an
  // invalid/unregistered token (handled via pruning), return normally.
  if (tokens.length > 0 && sent === 0 && invalidTokens.length === 0 && realFailure) {
    throw new Error("FCM send failed for all tokens");
  }

  return { sent, invalidTokens };
}
