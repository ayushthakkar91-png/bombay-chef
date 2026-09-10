import Link from "next/link";

/**
 * Order progress, as a slim segmented bar:
 *   Menu → Details → Payment → Confirmed
 * Done segments are gold, the current one maroon, upcoming ones faint. Only the
 * Menu step links back — later steps are reached by completing the flow.
 */
const STEPS = ["Menu", "Details", "Payment", "Confirmed"] as const;

export function CheckoutSteps({ current, menuHref }: { current: 1 | 2 | 3 | 4; menuHref?: string }) {
  return (
    <nav aria-label="Order progress" className="mb-7">
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          const bar = done ? "bg-[#B08A3E]" : active ? "bg-[#5D0925]" : "bg-[#2A211C]/12";
          const text = active ? "font-semibold text-[#5D0925]" : done ? "text-[#2B221D]" : "text-[#5A524B]/70";
          const content = (
            <>
              <span aria-hidden className={`block h-[3px] w-full rounded-full transition-colors ${bar}`} />
              <span className={`mt-2 block font-sans text-[10.5px] uppercase tracking-[0.12em] sm:text-[12px] ${text}`}>{label}</span>
            </>
          );
          return (
            <li key={label} aria-current={active ? "step" : undefined}>
              {n === 1 && done && menuHref ? (
                <Link href={menuHref} className="block hover:opacity-80">{content}</Link>
              ) : (
                <span className="block">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Step {current} of {STEPS.length}: {STEPS[current - 1]}</p>
    </nav>
  );
}
