"use client";

import { useActionState } from "react";

import type { DayHours } from "@/lib/ordering/hours";
import { IDLE } from "@/lib/admin/validation";
import { saveOrderingHours } from "@/app/admin/_actions/ordering-hours";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, SubmitButton } from "@/components/admin/primitives";

/**
 * When this branch takes online orders.
 *
 * Laid out as the week, because that is how somebody thinks about it — not as
 * a list of rows to add. Collection and delivery sit side by side on each day
 * so the difference between them is visible at a glance: the counter hands
 * food over after the drivers have stopped, and that is easy to forget when
 * the two are on separate screens.
 */

const DAYS = [
  { weekday: 1, name: "Monday" },
  { weekday: 2, name: "Tuesday" },
  { weekday: 3, name: "Wednesday" },
  { weekday: 4, name: "Thursday" },
  { weekday: 5, name: "Friday" },
  { weekday: 6, name: "Saturday" },
  { weekday: 0, name: "Sunday" },
];

const FULFILMENTS = [
  { key: "collection" as const, label: "Collection" },
  { key: "delivery" as const, label: "Delivery" },
];

function find(hours: DayHours[], weekday: number, fulfilment: "collection" | "delivery"): DayHours {
  return (
    hours.find((h) => h.weekday === weekday && h.fulfilment === fulfilment) ?? {
      weekday,
      fulfilment,
      opensAt: "17:30",
      closesAt: fulfilment === "collection" ? "22:45" : "22:30",
      isOpen: true,
    }
  );
}

export function OrderingHours({
  locationId,
  locationName,
  hours,
}: {
  locationId: string;
  locationName: string;
  hours: DayHours[];
}) {
  const [state, action] = useActionState(saveOrderingHours, IDLE);
  useActionResult(state);

  return (
    <form action={action} className="rounded-lg border border-sand bg-surface p-5">
      <input type="hidden" name="locationId" value={locationId} />

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">Ordering hours — {locationName}</h3>
        <p className="mt-1 text-xs text-body">
          Outside these hours the website stops taking orders for now, and offers customers a later time today instead.
          Times are London time.
        </p>
      </div>

      <Banner state={state} />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand text-left">
              <th className="pb-2 pr-3 font-medium text-body">Day</th>
              {FULFILMENTS.map((f) => (
                <th key={f.key} className="pb-2 pr-3 font-medium text-body">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(({ weekday, name }) => (
              <tr key={weekday} className="border-b border-sand/60 last:border-0">
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-text">{name}</th>
                {FULFILMENTS.map((f) => {
                  const h = find(hours, weekday, f.key);
                  const id = `${f.key}-${weekday}`;
                  return (
                    <td key={f.key} className="py-2.5 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="time"
                          name={`${id}-opens`}
                          defaultValue={h.opensAt}
                          aria-label={`${name} ${f.label} opens`}
                          className="rounded-md border border-sand bg-white px-2 py-1 text-sm tabular-nums"
                        />
                        <span className="text-body">–</span>
                        <input
                          type="time"
                          name={`${id}-closes`}
                          defaultValue={h.closesAt}
                          aria-label={`${name} ${f.label} closes`}
                          className="rounded-md border border-sand bg-white px-2 py-1 text-sm tabular-nums"
                        />
                        <label className="ml-1 flex items-center gap-1 text-xs text-body">
                          <input
                            type="checkbox"
                            name={`${id}-open`}
                            defaultChecked={h.isOpen}
                            aria-label={`${name} ${f.label} available`}
                          />
                          on
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-body">
          Unticking a day stops that kind of order entirely — the times are kept, so you can switch it back on later.
        </p>
        <SubmitButton>Save hours</SubmitButton>
      </div>
    </form>
  );
}
