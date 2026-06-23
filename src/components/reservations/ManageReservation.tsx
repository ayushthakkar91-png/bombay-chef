"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { modifyReservation, cancelReservation } from "@/app/reservations/manage/actions";
import { EXPERIENCES, OCCASIONS, STATUS_LABEL, type ReservationStatus } from "@/lib/reservations/constants";

export type ManageProps = {
  token: string;
  status: ReservationStatus;
  reference: string;
  locationName: string;
  locationSlug: string;
  experience: string | null;
  occasion: string | null;
  guestName: string | null;
  dateLabel: string;
  timeLabel: string;
  dateISO: string;
  partySize: number;
  requests: string | null;
};

const GOLD = "text-[#B08A3E]";
const modifiable = (s: ReservationStatus) => s === "confirmed" || s === "pending";

export function ManageReservation(props: ManageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [dateISO, setDateISO] = useState(props.dateISO);
  const [time, setTime] = useState(props.timeLabel);
  const [guests, setGuests] = useState(props.partySize);
  const [requests, setRequests] = useState(props.requests ?? "");

  // Availability is derived from a signature match (see StepDateTime) so the
  // effect only setState()s asynchronously.
  const sig = editing ? `${props.locationSlug}|${dateISO}|${props.experience ?? ""}` : "";
  const [avail, setAvail] = useState<{ sig: string; times: string[] }>({ sig: "", times: [] });
  const loadingTimes = sig !== "" && avail.sig !== sig;
  const times = avail.sig === sig ? avail.times : [];

  const experienceLabel = EXPERIENCES.find((e) => e.id === props.experience)?.label;
  const occasionLabel = OCCASIONS.find((o) => o.id === props.occasion)?.label;

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ location: props.locationSlug, date: dateISO });
    if (props.experience) params.set("experience", props.experience);
    fetch(`/api/reservations/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { times?: string[] }) => setAvail({ sig, times: d.times ?? [] }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setAvail({ sig, times: [] });
      });
    return () => controller.abort();
  }, [editing, dateISO, props.locationSlug, props.experience, sig]);

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await modifyReservation(props.token, { dateISO, time, guests, requests });
      if (r.ok) {
        setEditing(false);
        setMessage({ ok: true, text: "Your booking has been updated." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.error ?? "Something went wrong." });
      }
    });
  };

  const cancel = () => {
    if (!window.confirm("Cancel this reservation? This can't be undone.")) return;
    setMessage(null);
    startTransition(async () => {
      const r = await cancelReservation(props.token);
      if (r.ok) {
        setMessage({ ok: true, text: "Your reservation has been cancelled." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.error ?? "Something went wrong." });
      }
    });
  };

  const field = "w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[16px] text-[#2B221D] font-serif focus:outline-none focus:border-[#B08A3E] transition-colors";

  return (
    <div className="bg-white border border-[#2A211C]/10 p-8 lg:p-12">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2A211C]/10">
        <div>
          <p className={`${GOLD} text-[11px] tracking-[0.2em] uppercase font-semibold font-sans`}>Reference</p>
          <p className="font-serif text-[24px] text-[#2B221D] tracking-wide">{props.reference}</p>
        </div>
        <span
          className={`text-[11px] tracking-[0.15em] uppercase font-sans font-semibold px-3 py-1.5 ${
            props.status === "cancelled" || props.status === "no_show"
              ? "bg-[#5D0925]/10 text-[#5D0925]"
              : props.status === "completed"
                ? "bg-[#2A211C]/10 text-[#2A211C]"
                : "bg-[#B08A3E]/15 text-[#7a5e23]"
          }`}
        >
          {STATUS_LABEL[props.status]}
        </span>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-6 text-[14px] font-sans ${message.ok ? "text-[#3a6b2e]" : "text-[#5D0925]"}`}
        >
          {message.text}
        </p>
      )}

      {!editing ? (
        <>
          <dl className="grid grid-cols-2 gap-y-8 gap-x-6">
            <Detail label="Location" value={props.locationName} />
            <Detail label="Guests" value={String(props.partySize)} />
            <Detail label="Date" value={props.dateLabel} />
            <Detail label="Time" value={props.timeLabel} />
            {experienceLabel && <Detail label="Experience" value={experienceLabel} />}
            {occasionLabel && <Detail label="Occasion" value={occasionLabel} />}
            {props.requests && <Detail label="Requests" value={props.requests} full />}
          </dl>

          {modifiable(props.status) && (
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500"
              >
                Modify Booking
              </button>
              <button
                onClick={cancel}
                disabled={pending}
                className="inline-flex items-center justify-center h-[52px] px-8 border border-[#5D0925]/30 text-[#5D0925] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#5D0925]/5 transition-colors disabled:opacity-50"
              >
                Cancel Booking
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-7">
          <div className="grid sm:grid-cols-2 gap-7">
            <label className="flex flex-col gap-2">
              <span className={`${GOLD} text-[11px] tracking-[0.15em] uppercase font-sans font-semibold`}>Date</span>
              <input
                type="date"
                value={dateISO}
                min={minDate}
                onChange={(e) => { setDateISO(e.target.value); setTime(""); }}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={`${GOLD} text-[11px] tracking-[0.15em] uppercase font-sans font-semibold`}>Guests</span>
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={`${field} appearance-none cursor-pointer`}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}{i === 9 ? "+" : ""}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className={`${GOLD} text-[11px] tracking-[0.15em] uppercase font-sans font-semibold`}>Time</span>
            {loadingTimes ? (
              <p className="text-[#5A524B] text-[14px] font-sans py-3 animate-pulse">Checking availability…</p>
            ) : times.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {times.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`h-[42px] text-[13px] font-sans border transition-colors ${
                      time === t ? "bg-[#2A211C] border-[#2A211C] text-[#F6F2EA]" : "border-[#2A211C]/20 text-[#2B221D] hover:border-[#B08A3E]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[#5A524B] text-[14px] font-sans py-3">No availability for this date — try another.</p>
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className={`${GOLD} text-[11px] tracking-[0.15em] uppercase font-sans font-semibold`}>Special requests</span>
            <textarea value={requests} onChange={(e) => setRequests(e.target.value)} rows={2} className={`${field} resize-none`} />
          </label>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={save}
              disabled={pending || !time}
              className="inline-flex items-center justify-center h-[52px] px-8 bg-[#B08A3E] text-[#2A211C] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => { setEditing(false); setMessage(null); }} disabled={pending} className="inline-flex items-center justify-center h-[52px] px-8 text-[#2B221D] text-[12px] tracking-[0.15em] uppercase font-sans hover:text-[#B08A3E] transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-2">{label}</dt>
      <dd className="text-[#2B221D] font-serif text-[20px]">{value}</dd>
    </div>
  );
}
