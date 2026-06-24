import { groupWeekly, type ServiceHours } from "@/lib/hours";

/**
 * Renders one or more services' weekly opening hours as compact rows
 * ("Mon–Wed", "5:30pm – 11pm"). Colour is inherited from the parent so it works
 * on both light and dark surfaces. Built from <span>s only, so it's valid inside
 * a <p> as well as a <div>.
 */
export function OpeningHours({
  services,
  className = "",
  showServiceLabel,
}: {
  services: ServiceHours[];
  className?: string;
  /** Force service labels on/off; defaults to showing them only when >1 service. */
  showServiceLabel?: boolean;
}) {
  const withLabels = showServiceLabel ?? services.length > 1;
  return (
    <span className={`flex flex-col gap-3 ${className}`}>
      {services.map((s) => (
        <span key={s.label} className="flex flex-col gap-0.5">
          {withLabels && (
            <span className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
              {s.label}
            </span>
          )}
          {groupWeekly(s.weekly).map((row) => (
            <span key={row.days} className="flex justify-between gap-6 tabular-nums">
              <span>{row.days}</span>
              <span>{row.hours}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
