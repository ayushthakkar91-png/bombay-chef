import { requireRole } from "@/lib/auth/dal";
import { getMessagingStats, getConsentStats, listMessages, listPreferences } from "@/lib/repositories/messaging";
import { isMessagingConfigured } from "@/lib/messaging/provider";
import { CHANNEL_LABEL, CATEGORY_LABEL, MESSAGE_STATUS_LABEL, type Channel, type Category } from "@/lib/messaging/constants";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { Badge, Banner } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";
import { RunNowButton } from "@/components/admin/messaging/RunNowButton";
import { ConsentPanel } from "@/components/admin/messaging/ConsentPanel";

const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const tone = (s: string) => (["delivered", "read"].includes(s) ? "on" : s === "failed" ? "off" : s === "skipped" ? "neutral" : "accent") as "on" | "off" | "neutral" | "accent";

export default async function MessagingPage() {
  await requireRole("restaurant_manager");
  // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
  const from = new Date(Date.now() - 30 * 86400000).toISOString();
  const [stats, consent, messages, preferences] = await Promise.all([getMessagingStats(from), getConsentStats(), listMessages({ limit: 40 }), listPreferences(50)]);

  return (
    <>
      <PageHeader title="Messaging" description="SMS & WhatsApp delivery, consent and reporting (last 30 days)." actions={<RunNowButton />} />

      {!isMessagingConfigured() && (
        <div className="mb-6"><Banner state={{ ok: false, message: "No SMS/WhatsApp provider configured — messages log to the console. Set TWILIO_* or WHATSAPP_CLOUD_* env vars to send for real." }} /></div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sent" value={stats.sent} hint={`${stats.total} total`} />
        <Stat label="Delivery rate" value={`${stats.deliveryRate}%`} hint={`${stats.delivered} delivered`} />
        <Stat label="Read rate" value={`${stats.readRate}%`} hint="WhatsApp" />
        <Stat label="Click rate" value={`${stats.clickRate}%`} hint={`${stats.clicked} clicks`} />
        <Stat label="Failed" value={stats.failed} />
        <Stat label="Skipped" value={stats.skipped} hint="no consent" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Consent records" value={consent.total} />
        <Stat label="SMS opt-in" value={consent.sms} />
        <Stat label="WhatsApp opt-in" value={consent.whatsapp} />
        <Stat label="Marketing opt-in" value={consent.marketing} />
        <Stat label="Opted out" value={consent.optedOut} />
      </div>

      <div className="mt-8">
        <Panel title="Recent messages">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-sand bg-bg/40"><tr><Th>To</Th><Th>Channel</Th><Th>Type</Th><Th>Template</Th><Th>Status</Th><Th>When</Th></tr></thead>
              <tbody className="divide-y divide-sand">
                {messages.length === 0 ? (
                  <tr><Td className="text-body">No messages yet. Use “Run queue now” after capturing consent.</Td><Td /><Td /><Td /><Td /><Td /></tr>
                ) : messages.map((m) => (
                  <tr key={m.id} className="hover:bg-bg/30">
                    <Td className="font-mono text-sm">{m.toPhone}</Td>
                    <Td className="text-body">{CHANNEL_LABEL[m.channel as Channel] ?? m.channel}</Td>
                    <Td className="text-body">{CATEGORY_LABEL[m.category as Category] ?? m.category}</Td>
                    <Td className="font-mono text-xs text-body">{m.templateKey ?? "—"}</Td>
                    <Td><Badge tone={tone(m.status)}>{MESSAGE_STATUS_LABEL[m.status] ?? m.status}</Badge>{m.error ? <span className="ml-2 text-xs text-primary">{m.error}</span> : null}</Td>
                    <Td className="text-body">{dt(m.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-serif text-xl text-text">Customer preferences</h2>
        <ConsentPanel preferences={preferences} />
      </section>
    </>
  );
}
