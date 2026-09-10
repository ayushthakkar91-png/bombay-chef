import QRCode from "qrcode";

import { SITE_URL } from "@/lib/site";
import { TIER_LABEL, type Tier } from "@/lib/loyalty/constants";

/**
 * The customer's membership card: name, tier, points, member number and a QR
 * that encodes a stable /m/<token> identity URL (staff-scan is a Phase-2 use;
 * for now the QR is display/identity only). Server component — the QR is
 * rendered to inline SVG at request time, so there's no client JS or image
 * request. The "Add to Apple Wallet" action is stubbed until the Apple Pass
 * signing certificate is configured.
 */
export async function MembershipCard({
  name,
  memberNo,
  memberToken,
  tier,
  pointsBalance,
}: {
  name: string | null;
  memberNo: string;
  memberToken: string;
  tier: Tier;
  pointsBalance: number;
}) {
  const memberUrl = `${SITE_URL}/m/${memberToken}`;
  // Dark modules on transparent so the card's own background shows through the
  // quiet zone; we paint a white plate behind it for scanner contrast.
  const qrSvg = await QRCode.toString(memberUrl, {
    type: "svg",
    margin: 0,
    color: { dark: "#2A211C", light: "#00000000" },
    errorCorrectionLevel: "M",
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-[#B08A3E]/30 bg-[#2A211C] text-[#F6F2EA] shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: identity + points */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 bg-[#B08A3E]"
              style={{
                WebkitMaskImage: "url('/images/brand/logo.svg')",
                maskImage: "url('/images/brand/logo.svg')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
              aria-hidden="true"
            />
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">{TIER_LABEL[tier]} Member</p>
          </div>

          <p className="mt-4 truncate font-serif text-[26px] leading-tight text-[#F6F2EA]">{name?.trim() || "Bombay Bicycle Chef"}</p>

          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="font-serif text-[40px] leading-none">{pointsBalance}</p>
              <p className="mt-1 font-sans text-[12px] text-[#F6F2EA]/60">points · £{(pointsBalance / 100).toFixed(2)}</p>
            </div>
            <div className="pb-1">
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#F6F2EA]/45">Member no.</p>
              <p className="font-sans text-[15px] tracking-[0.12em] tabular-nums text-[#F6F2EA]">{memberNo}</p>
            </div>
          </div>
        </div>

        {/* Right: QR on a white plate for scan contrast */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div
            className="h-[124px] w-[124px] rounded-lg bg-white p-2.5"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            aria-label={`Membership QR code for ${memberNo}`}
            role="img"
          />
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#F6F2EA]/45">Show in store</p>
        </div>
      </div>

      {/* Apple Wallet — stubbed until the Pass Type signing cert is configured. */}
      <div className="border-t border-[#F6F2EA]/10 px-7 py-4">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Apple Wallet passes are coming soon."
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-[#F6F2EA]/20 bg-black/20 px-4 py-2 font-sans text-[13px] text-[#F6F2EA]/55"
        >
          <AppleLogo /> Add to Apple Wallet
          <span className="ml-1 rounded bg-[#B08A3E]/20 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#B08A3E]">Soon</span>
        </button>
      </div>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.82 0-2.07-.92-3.4-.9-1.75.03-3.37 1.02-4.27 2.59-1.82 3.16-.47 7.84 1.31 10.41.87 1.26 1.9 2.67 3.26 2.62 1.31-.05 1.8-.85 3.39-.85 1.57 0 2.02.85 3.4.82 1.4-.02 2.29-1.28 3.15-2.55.99-1.46 1.4-2.87 1.42-2.95-.03-.01-2.72-1.04-2.75-4.13M14.5 4.5c.72-.88 1.21-2.09 1.08-3.3-1.04.04-2.3.69-3.05 1.56-.67.77-1.25 2-.09 3.28 1.13.09 2.28-.66 3.06-1.54"/>
    </svg>
  );
}
