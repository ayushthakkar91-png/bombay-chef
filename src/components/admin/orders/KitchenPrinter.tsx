"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { listPrintQueue, markTicketPrinted, type PrintTicket } from "@/app/admin/_actions/kitchen-print";

/**
 * Kitchen ticket printing from a PC.
 *
 * This page is the printer: it polls for orders that have not been printed,
 * lays each one out as a receipt, and asks the browser to print it. Run Chrome
 * with --kiosk-printing and there is no dialog — paper simply comes out, the
 * way the terminal used to do it.
 *
 * Deliberately one order at a time. Printing the whole queue in one pass would
 * be faster, but a jam halfway through leaves no way to tell which tickets made
 * it; per-order printing means `printed_at` is only ever written for paper that
 * actually came out.
 */

type Paper = "80mm" | "58mm" | "a4";

type Settings = {
  paper: Paper;
  copies: number;
  /** Seconds between copies, so a thermal head is not asked for two at once. */
  gapSeconds: number;
  auto: boolean;
  sound: boolean;
};

const DEFAULTS: Settings = { paper: "80mm", copies: 1, gapSeconds: 3, auto: true, sound: true };

const SETTINGS_KEY = "bbc.kitchen-print.settings";

/** Printable width per paper type — narrower than the roll, which has margins. */
const PAGE_CSS: Record<Paper, string> = {
  "80mm": "@page { size: 72mm auto; margin: 0; }",
  "58mm": "@page { size: 48mm auto; margin: 0; }",
  a4: "@page { size: A4; margin: 12mm; }",
};

const BODY_WIDTH: Record<Paper, string> = { "80mm": "72mm", "58mm": "48mm", a4: "186mm" };

/* ---- Settings, which really do live in localStorage --------------------
 *
 * Treated as what they are: state owned by this computer, not by React. A
 * module-level store means the polling loop can read the current settings
 * directly instead of chasing them through a ref, and the server renders the
 * defaults without ever touching `window`.
 */

let cached: Settings = DEFAULTS;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function currentSettings(): Settings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    /* private window, or site data blocked — the defaults still work */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
    } catch {
      cached = DEFAULTS; // something else wrote nonsense under our key
    }
  }
  return cached;
}

function saveSettings(next: Settings) {
  cached = next;
  cachedRaw = JSON.stringify(next);
  try {
    window.localStorage.setItem(SETTINGS_KEY, cachedRaw);
  } catch {
    /* not worth interrupting service over: the session keeps the change */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // A second window on the same till should follow the same settings.
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

const serverSettings = () => DEFAULTS;

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Two frames, so the ticket is on screen before the print dialog snapshots it. */
const painted = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function KitchenPrinter({ locationId, locationName }: { locationId: string; locationName: string }) {
  const settings = useSyncExternalStore(subscribe, currentSettings, serverSettings);
  const [queue, setQueue] = useState<PrintTicket[]>([]);
  const [sheet, setSheet] = useState<PrintTicket | null>(null);
  const [done, setDone] = useState<PrintTicket[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  // Guards the print loop: polling continues while printing, but must never
  // start a second pass over the same ticket.
  const busy = useRef(false);
  // How many were waiting last time, so the beep marks an arrival rather than
  // every poll that happens to find a queue.
  const lastCount = useRef(0);

  const update = (patch: Partial<Settings>) => saveSettings({ ...currentSettings(), ...patch });

  const beep = useCallback(() => {
    if (!currentSettings().sound) return;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      osc.onended = () => void ctx.close();
    } catch {
      /* no audio device, or autoplay blocked until the screen is first touched */
    }
  }, []);

  /** One pass of the browser's print dialog. */
  const printOnce = () =>
    new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("afterprint", finish);
        resolve();
      };
      window.addEventListener("afterprint", finish);
      window.print();
      // Chrome with --kiosk-printing fires afterprint; without it the dialog may
      // never report back. The timeout keeps the queue moving either way.
      setTimeout(finish, 6000);
    });

  const printTicket = useCallback(
    async (ticket: PrintTicket, mark: boolean) => {
      const { copies, gapSeconds } = currentSettings();
      setSheet(ticket);
      await painted();
      for (let i = 0; i < Math.max(1, copies); i++) {
        if (i > 0) await sleep(Math.max(0, gapSeconds) * 1000);
        await printOnce();
      }
      setSheet(null);
      if (!mark) return;
      const r = await markTicketPrinted(ticket.id, locationId);
      if (!r.ok) setProblem(`Printed ${ticket.code} but could not record it — it may print again.`);
      setDone((d) => [ticket, ...d].slice(0, 20));
      setQueue((q) => q.filter((x) => x.id !== ticket.id));
    },
    [locationId],
  );

  // Poll, then drain. Both live here so a slow print cannot stack up timers.
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const next = await listPrintQueue(locationId);
        if (!alive) return;
        setLastPoll(new Date());
        setProblem(null);
        if (next.length > lastCount.current) beep();
        lastCount.current = next.length;
        setQueue(next);

        if (!currentSettings().auto || busy.current) return;
        busy.current = true;
        try {
          for (const t of next) {
            if (!alive) break;
            await printTicket(t, true);
          }
        } finally {
          busy.current = false;
        }
      } catch (e) {
        if (alive) setProblem(e instanceof Error ? e.message : "Could not reach the server.");
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [locationId, beep, printTicket]);

  const reprint = async (t: PrintTicket) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await printTicket(t, false);
    } finally {
      busy.current = false;
    }
  };

  return (
    <>
      {/* Paper size has to be a real stylesheet: @page cannot come from an
          inline style, and it must change when the setting changes. */}
      <style>{`
        ${PAGE_CSS[settings.paper]}
        @media print {
          body > *:not(.print-root) { display: none !important; }
          .print-root { display: block !important; }
          .no-print { display: none !important; }
        }
        .print-root { display: none; }
      `}</style>

      <div className="no-print flex flex-col gap-6">
        <section className="rounded-lg border border-sand bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">{locationName}</p>
              <p className="text-xs text-body">
                {lastPoll ? `Checked ${lastPoll.toLocaleTimeString("en-GB")}` : "Connecting…"} · checks every 5 seconds
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={settings.auto} onChange={(e) => update({ auto: e.target.checked })} />
              Print new orders automatically
            </label>
          </div>

          {problem && <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{problem}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <label className="text-xs font-semibold text-text">
              Paper
              <select
                value={settings.paper}
                onChange={(e) => update({ paper: e.target.value as Paper })}
                className="mt-1 w-full rounded-md border border-sand bg-white px-2 py-1.5 text-sm font-normal"
              >
                <option value="80mm">80mm receipt roll</option>
                <option value="58mm">58mm receipt roll</option>
                <option value="a4">A4 sheet</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-text">
              Copies per order
              <select
                value={settings.copies}
                onChange={(e) => update({ copies: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-sand bg-white px-2 py-1.5 text-sm font-normal"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-text">
              Pause between copies
              <select
                value={settings.gapSeconds}
                onChange={(e) => update({ gapSeconds: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-sand bg-white px-2 py-1.5 text-sm font-normal"
              >
                {[0, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "None" : `${n} seconds`}</option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm text-text">
              <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
              Beep on a new order
            </label>
          </div>

          <p className="mt-4 text-xs text-body">
            Settings are saved on this computer. Leave this page open on the till — it prints on its own.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-text">
            Waiting to print {queue.length > 0 && <span className="text-primary">({queue.length})</span>}
          </h2>
          {queue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-sand p-6 text-center text-sm text-body">
              Nothing waiting. New orders print as they arrive.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-sand bg-surface px-4 py-3"
                >
                  <span className="text-sm text-text">
                    <strong>{t.code}</strong> · {t.fulfilment === "delivery" ? "Delivery" : "Collection"} ·{" "}
                    {money(t.totalPence)}
                    {t.cash && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">CASH</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => void reprint(t)}
                    className="rounded-md border border-sand px-3 py-1 text-xs text-body hover:border-primary hover:text-primary"
                  >
                    Print now
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-text">Printed</h2>
            <ul className="flex flex-col gap-2">
              {done.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-sand px-4 py-2">
                  <span className="text-sm text-body">
                    <strong className="text-text">{t.code}</strong> · {money(t.totalPence)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void reprint(t)}
                    className="rounded-md border border-sand px-3 py-1 text-xs text-body hover:border-primary hover:text-primary"
                  >
                    Print again
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="print-root" style={{ width: BODY_WIDTH[settings.paper] }}>
        {sheet && <Ticket ticket={sheet} wide={settings.paper === "a4"} />}
      </div>
    </>
  );
}

/**
 * The receipt itself.
 *
 * Black on white, no colour, no web font: a thermal head prints one colour and
 * renders a heavy typeface as mush. Everything a cook needs is in the top half,
 * because that is all that shows before the ticket is torn off.
 */
function Ticket({ ticket, wide }: { ticket: PrintTicket; wide: boolean }) {
  const base = wide ? 13 : 12;
  const placed = new Date(ticket.placedAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        fontFamily: "monospace",
        color: "#000",
        background: "#fff",
        fontSize: base,
        lineHeight: 1.35,
        padding: wide ? 0 : "4mm 2mm",
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: base + 4 }}>BOMBAY BICYCLE CHEF</div>
      <div style={{ textAlign: "center", fontSize: base - 1 }}>{placed}</div>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: base + 10, margin: "3mm 0 1mm" }}>
        {ticket.fulfilment === "delivery" ? "DELIVERY" : "COLLECTION"}
      </div>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: base + 6 }}>#{ticket.code}</div>

      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: base + 2,
          border: "2px solid #000",
          padding: "1mm",
          margin: "2mm 0",
        }}
      >
        {ticket.cash ? `COLLECT CASH ${money(ticket.totalPence)}` : "PAID ONLINE"}
      </div>

      <Rule />

      {ticket.items.map((i, n) => (
        <div key={n} style={{ marginBottom: "1.5mm" }}>
          <div style={{ display: "flex", gap: "2mm", fontWeight: 700, fontSize: base + 2 }}>
            <span>{i.qty} x</span>
            <span style={{ flex: 1 }}>{i.name}</span>
          </div>
          {i.modifiers.map((m, k) => (
            <div key={k} style={{ paddingLeft: "6mm" }}>+ {m}</div>
          ))}
          {i.notes && <div style={{ paddingLeft: "6mm", fontWeight: 700 }}>** {i.notes}</div>}
        </div>
      ))}

      <Rule />

      <Row label="Subtotal" value={money(ticket.subtotalPence)} size={base} />
      {ticket.deliveryFeePence > 0 && <Row label="Delivery" value={money(ticket.deliveryFeePence)} size={base} />}
      {ticket.discountPence > 0 && (
        <Row label={`Discount ${ticket.promoCode ?? ""}`.trim()} value={`-${money(ticket.discountPence)}`} size={base} />
      )}
      <Row label="TOTAL" value={money(ticket.totalPence)} size={base + 4} bold />

      <Rule />

      {ticket.contactName && <div style={{ fontWeight: 700 }}>{ticket.contactName}</div>}
      {ticket.contactPhone && <div style={{ fontWeight: 700, fontSize: base + 2 }}>{ticket.contactPhone}</div>}
      {ticket.fulfilment === "delivery" && ticket.address && (
        <div style={{ marginTop: "1mm", fontWeight: 700 }}>{ticket.address}</div>
      )}
      {ticket.notes && (
        <div style={{ marginTop: "2mm", border: "1px solid #000", padding: "1mm", fontWeight: 700 }}>
          NOTE: {ticket.notes}
        </div>
      )}

      {/* Blank space so the tear-off does not cut through the address. */}
      <div style={{ height: wide ? 0 : "12mm" }} />
    </div>
  );
}

const Rule = () => <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />;

function Row({ label, value, size, bold }: { label: string; value: string; size: number; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: size, fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
