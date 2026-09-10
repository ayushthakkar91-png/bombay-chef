"use client";

import { useRef, useState, useTransition } from "react";
import { ImageOff, Loader2, Upload } from "lucide-react";

import { uploadImage } from "@/app/admin/_actions/upload";
import { Field, TextInput } from "./primitives";

/**
 * Image field with a live preview. Staff can either UPLOAD a photo (stored in
 * Supabase Storage, the resulting public URL is filled in automatically) or
 * paste an existing https:// link. The form still submits a plain `imageUrl`
 * string, so the save actions are unchanged. Uses a native <img> so any host
 * previews without next.config domain setup.
 */
export function ImageUrlField({
  defaultValue = "",
  error,
  folder = "misc",
}: {
  defaultValue?: string;
  error?: string;
  /** Storage folder for uploads (allowlisted server-side). */
  folder?: "popup" | "menu" | "misc";
}) {
  const [url, setUrl] = useState(defaultValue);
  const [broken, setBroken] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const valid = /^https?:\/\//i.test(url);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    startUpload(async () => {
      const res = await uploadImage(fd);
      if (res.ok) {
        setUrl(res.url);
        setBroken(false);
      } else {
        setUploadError(res.error);
      }
      if (fileRef.current) fileRef.current.value = ""; // allow re-picking the same file
    });
  };

  return (
    <Field label="Image" htmlFor="imageUrl" error={error ?? uploadError ?? undefined} hint="Upload a photo (JPG, PNG or WebP, max 5 MB) or paste an https:// link.">
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sand bg-bg">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-body/50" aria-hidden />
          ) : valid && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              onLoad={() => setBroken(false)}
              onError={() => setBroken(true)}
            />
          ) : (
            <ImageOff className="h-5 w-5 text-body/40" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              id="imageUpload"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-sand bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-brass disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
              {uploading ? "Uploading…" : valid ? "Replace image" : "Upload image"}
            </button>
            {valid && !uploading && (
              <button type="button" onClick={() => { setUrl(""); setBroken(false); }} className="text-sm text-body hover:text-primary">
                Remove
              </button>
            )}
          </div>
          <TextInput
            id="imageUrl"
            name="imageUrl"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setBroken(false);
            }}
            placeholder="…or paste https:// link"
          />
          {valid && broken && <p className="text-xs text-primary">That image couldn’t be loaded.</p>}
        </div>
      </div>
    </Field>
  );
}
