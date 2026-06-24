"use client";

import { useFormStatus } from "react-dom";
import { type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/validation";

// cx lives in a non-client module so server components can use it too; import it
// for local use and re-export for the many client components that import it here.
import { cx } from "./cx";
export { cx };

/* ---- Buttons ---------------------------------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";

const BTN: Record<Variant, string> = {
  primary: "bg-primary text-on-dark hover:bg-primary-dark",
  secondary: "border border-sand bg-surface text-text hover:bg-sand/50",
  ghost: "text-body hover:bg-sand/50",
  danger: "border border-primary/30 text-primary hover:bg-primary/5",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: Variant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-60",
        BTN[variant],
        className,
      )}
      {...props}
    />
  );
}

/** Submit button that reflects the enclosing form's pending state. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} aria-busy={pending}>
      {pending && <Spinner />}
      {pending ? pendingLabel ?? "Saving…" : children}
    </Button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

/* ---- Feedback --------------------------------------------------------- */

/** Renders success / error feedback from an ActionState. */
export function Banner({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  const isError = state.ok === false;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cx(
        "rounded-md px-3.5 py-2.5 text-sm",
        isError
          ? "border border-primary/25 bg-primary/5 text-primary"
          : "border border-brass/30 bg-brass/10 text-[#6b5418]",
      )}
    >
      {state.message}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "on" | "off" | "accent";
}) {
  const tones = {
    neutral: "bg-sand text-body",
    on: "bg-[#e7f0e3] text-[#3a6b2e]",
    off: "bg-primary/8 text-primary",
    accent: "bg-brass/15 text-[#6b5418]",
  } as const;
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

/* ---- Form fields ------------------------------------------------------ */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-body">{hint}</p>}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}

const INPUT =
  "w-full rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text placeholder:text-body/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT, props.className)} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(INPUT, "min-h-20 resize-y", props.className)} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(INPUT, "appearance-none pr-8", props.className)} {...props} />;
}

/* ---- Empty / loading states ------------------------------------------ */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-sand bg-surface/60 px-6 py-14 text-center">
      <p className="font-serif text-xl text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-body">{description}</p>}
      {action}
    </div>
  );
}
