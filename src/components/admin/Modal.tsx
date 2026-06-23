"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Native <dialog> modal. Using the platform element means it escapes any
 * `overflow:hidden`/stacking context for free and gives us Esc-to-close, focus
 * trapping, and the top layer without a portal.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Close when the backdrop (the dialog element itself) is clicked.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-sand bg-surface p-0 text-text shadow-2xl backdrop:bg-text/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-sand px-6 py-4">
        <div>
          <h2 className="font-serif text-xl leading-tight text-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-body">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 rounded-md p-1.5 text-body transition-colors hover:bg-sand/60 hover:text-text"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
