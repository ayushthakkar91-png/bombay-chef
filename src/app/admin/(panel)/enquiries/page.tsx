import { requireStaff } from "@/lib/auth/dal";
import { listEnquiries } from "@/lib/repositories/enquiries";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { EnquiryToggle } from "@/components/admin/enquiries/EnquiryToggle";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function EnquiriesPage() {
  await requireStaff();
  const enquiries = await listEnquiries(200);
  const open = enquiries.filter((e) => !e.handled).length;

  return (
    <>
      <PageHeader title="Contact enquiries" description="Messages sent through the website contact form." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={enquiries.length} />
        <Stat label="Open" value={open} hint="Not yet handled" />
        <Stat label="Handled" value={enquiries.length - open} />
      </div>

      {enquiries.length === 0 ? (
        <Panel><p className="px-5 py-8 text-center text-sm text-body">No enquiries yet.</p></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {enquiries.map((e) => (
            <Panel key={e.id} className={e.handled ? "opacity-70" : ""}>
              <div className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">
                      {e.name}{" "}
                      <a href={`mailto:${e.email}`} className="text-sm font-normal text-brass hover:underline">&lt;{e.email}&gt;</a>
                    </p>
                    {e.subject && <p className="text-sm text-body">{e.subject}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap text-xs text-body/70">{when(e.createdAt)}</span>
                    <EnquiryToggle id={e.id} handled={e.handled} />
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{e.message}</p>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
