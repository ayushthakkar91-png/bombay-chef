"use server";

import crypto from "node:crypto";

import { getServiceClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";

/**
 * Admin image upload → Supabase Storage (public bucket). Used by the shared
 * image field (popup background, menu dish photos).
 *
 * Security:
 *  - Staff-only (restaurant_manager, same bar as editing the popup/menu).
 *  - File type is decided from the file's magic bytes, NOT the client-sent
 *    MIME/extension, and only JPEG/PNG/WebP are accepted (no SVG → no script
 *    in an image). Max 5 MB.
 *  - The object name is a server-generated UUID inside an allowlisted folder, so
 *    the client can't choose or traverse paths or overwrite existing files.
 */

const BUCKET = "site-images";
const MAX_BYTES = 5 * 1024 * 1024;
const FOLDERS = new Set(["popup", "menu", "misc"]);

type UploadResult = { ok: true; url: string } | { ok: false; error: string };

function sniff(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { ext: "png", type: "image/png" };
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) {
    return { ext: "webp", type: "image/webp" };
  }
  return null;
}

export async function uploadImage(form: FormData): Promise<UploadResult> {
  await requireRole("restaurant_manager");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image is too large — max 5 MB." };

  const folderRaw = String(form.get("folder") ?? "misc");
  const folder = FOLDERS.has(folderRaw) ? folderRaw : "misc";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { ok: false, error: "Only JPG, PNG or WebP images are allowed." };

  const service = getServiceClient();
  if (!service) return { ok: false, error: "Storage isn't configured." };

  const path = `${folder}/${crypto.randomUUID()}.${kind.ext}`;
  const put = () =>
    service.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false, cacheControl: "31536000" });

  let { error } = await put();
  // First upload ever: create the public bucket, then retry once.
  if (error && /not found/i.test(error.message)) {
    const created = await service.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      return { ok: false, error: "Couldn't set up image storage — please try again." };
    }
    ({ error } = await put());
  }
  if (error) return { ok: false, error: "Upload failed — please try again." };

  const { data } = service.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
