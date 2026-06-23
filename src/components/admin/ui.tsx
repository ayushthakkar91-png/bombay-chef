import { type ReactNode } from "react";

/** Page title block. `actions` sits on the right on wide screens. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl leading-tight text-text md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-body">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A bordered content section. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-sand bg-surface ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-sand px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-body">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Restrained metric tile — a figure and a label, no gradient, no chrome. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-sand bg-surface px-5 py-4">
      <p className="text-3xl font-semibold tabular-nums text-text">{value}</p>
      <p className="mt-1 text-sm text-body">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-body/70">{hint}</p>}
    </div>
  );
}

/* Lightweight table primitives for consistent admin tables. */
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-body/80 ${className ?? ""}`}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-sm text-text ${className ?? ""}`}>{children}</td>;
}
