"use client";

import { useActionState } from "react";
import { updateProfile, updateConsent, requestDataExport, requestAccountDeletion } from "@/app/account/_actions/profile";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

type Props = {
  email: string | null;
  fullName: string | null;
  phone: string | null;
  birthday: string | null;
  marketingEmail: boolean;
  marketingSms: boolean;
};

export function PreferencesForm({ email, fullName, phone, birthday, marketingEmail, marketingSms }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSection email={email} fullName={fullName} phone={phone} birthday={birthday} />
      <ConsentSection marketingEmail={marketingEmail} marketingSms={marketingSms} />
      <GdprSection />
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#2A211C]/10 p-6">
      <h2 className="font-serif text-[22px] text-[#2B221D]">{title}</h2>
      {description && <p className="text-[#5A524B] text-[14px] font-sans mt-1 mb-4">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function ProfileSection({ email, fullName, phone, birthday }: { email: string | null; fullName: string | null; phone: string | null; birthday: string | null }) {
  const [state, action] = useActionState(updateProfile, IDLE);
  return (
    <Panel title="Profile">
      <form action={action} className="flex flex-col gap-4">
        <AccountBanner state={state} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Name</label>
            <input id="fullName" name="fullName" defaultValue={state.values?.fullName ?? fullName ?? ""} className={accountField} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={state.values?.phone ?? phone ?? ""} className={accountField} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthday" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Birthday <span className="lowercase tracking-normal text-[#B08A3E]">· for a birthday treat</span></label>
            <input id="birthday" name="birthday" type="date" defaultValue={birthday ?? ""} className={accountField} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Email</label>
          <p className="text-[#2B221D] font-sans text-[15px] py-2">{email}</p>
        </div>
        <div className="flex justify-end"><AccountSubmit className="h-[48px]">Save profile</AccountSubmit></div>
      </form>
    </Panel>
  );
}

function ConsentSection({ marketingEmail, marketingSms }: { marketingEmail: boolean; marketingSms: boolean }) {
  const [state, action] = useActionState(updateConsent, IDLE);
  return (
    <Panel title="Marketing preferences" description="Separate from your account — change them any time. We only contact you for orders and bookings unless you opt in here.">
      <form action={action} className="flex flex-col gap-4">
        <AccountBanner state={state} />
        <label className="flex items-start gap-3 text-[14px] font-sans text-[#2B221D]">
          <input type="checkbox" name="marketingEmail" defaultChecked={marketingEmail} className="mt-0.5 h-4 w-4 accent-[#B08A3E]" />
          <span>Email me news and offers</span>
        </label>
        <label className="flex items-start gap-3 text-[14px] font-sans text-[#2B221D]">
          <input type="checkbox" name="marketingSms" defaultChecked={marketingSms} className="mt-0.5 h-4 w-4 accent-[#B08A3E]" />
          <span>Text me news and offers</span>
        </label>
        <div className="flex justify-end"><AccountSubmit className="h-[48px]">Save preferences</AccountSubmit></div>
      </form>
    </Panel>
  );
}

function GdprSection() {
  const [exportState, exportAction] = useActionState(() => requestDataExport(), IDLE);
  const [deleteState, deleteAction] = useActionState(() => requestAccountDeletion(), IDLE);
  return (
    <Panel title="Your data" description="You control your personal data. Requests are handled within 30 days.">
      <div className="flex flex-col gap-5">
        <div>
          <AccountBanner state={exportState} />
          <form action={exportAction} className="mt-2">
            <button type="submit" className="inline-flex items-center justify-center h-[46px] px-6 border border-[#2A211C]/25 text-[#2B221D] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C]/5 transition-colors">
              Request data export
            </button>
          </form>
        </div>
        <div className="border-t border-[#2A211C]/10 pt-5">
          <AccountBanner state={deleteState} />
          <form action={deleteAction} onSubmit={(e) => { if (!window.confirm("Request deletion of your account and personal data? Some records are kept where the law requires (e.g. tax). We'll confirm by email.")) e.preventDefault(); }} className="mt-2">
            <button type="submit" className="inline-flex items-center justify-center h-[46px] px-6 border border-[#5D0925]/30 text-[#5D0925] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#5D0925]/5 transition-colors">
              Request account deletion
            </button>
          </form>
        </div>
      </div>
    </Panel>
  );
}
