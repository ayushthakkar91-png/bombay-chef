import { requireRole } from "@/lib/auth/dal";
import { listCampaigns, getSegments } from "@/lib/repositories/admin-marketing";
import { PageHeader } from "@/components/admin/ui";
import { Th, Td } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/admin/primitives";
import { CampaignComposer, SendCampaignButton } from "@/components/admin/marketing/Campaigns";

const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(iso));

export default async function CampaignsPage() {
  await requireRole("restaurant_manager");
  const [campaigns, segments] = await Promise.all([listCampaigns(), getSegments()]);
  const segName = new Map(segments.map((s) => [s.id, s.name]));

  return (
    <>
      <PageHeader title="Campaigns" description="Compose a message and send it to all subscribers or a segment. Only opted-in contacts receive it." />
      <div className="mb-8"><CampaignComposer segments={segments} /></div>

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" description="Draft your first campaign above." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr><Th>Name</Th><Th>Audience</Th><Th>Status</Th><Th className="text-right">Sent</Th><Th className="w-px" /></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{c.name}<span className="block text-xs text-body">{c.subject}</span></Td>
                  <Td className="text-body">{c.segmentId ? segName.get(c.segmentId) ?? c.segmentId : "All subscribers"}</Td>
                  <Td><Badge tone={c.status === "sent" ? "on" : c.status === "sending" ? "accent" : "neutral"}>{c.status}</Badge></Td>
                  <Td className="text-right text-body">{c.sentAt ? `${c.recipients ?? 0} · ${dt(c.sentAt)}` : "—"}</Td>
                  <Td className="text-right">{c.status === "draft" && <SendCampaignButton id={c.id} />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
