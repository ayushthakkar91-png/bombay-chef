"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Field, TextInput } from "./primitives";

/**
 * Image URL input with a live preview thumbnail. Phase 1 stores an external
 * URL in `menu_items.image_url`; binary upload to Supabase Storage is a later
 * enhancement. Uses a native <img> (not next/image) so an arbitrary,
 * not-yet-configured remote host previews without next.config domain setup.
 */
export function ImageUrlField({
  defaultValue = "",
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [broken, setBroken] = useState(false);
  const valid = /^https?:\/\//i.test(url);

  return (
    <Field label="Image URL" htmlFor="imageUrl" error={error} hint="A full https:// link to the dish photo.">
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sand bg-bg">
          {valid && !broken ? (
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
        <div className="flex-1">
          <TextInput
            id="imageUrl"
            name="imageUrl"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setBroken(false);
            }}
            placeholder="https://…"
          />
          {valid && broken && <p className="mt-1 text-xs text-primary">That image couldn’t be loaded.</p>}
        </div>
      </div>
    </Field>
  );
}
