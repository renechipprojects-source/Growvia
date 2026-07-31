import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { useEnquiries } from "@/lib/enquiryContext";
import { Calendar, Phone } from "lucide-react";

export const Route = createFileRoute("/office/visits")({ component: Visits });

function Visits() {
  const { enquiries } = useEnquiries();
  const visits = enquiries.filter(
    (e) => e.status === "Visit Scheduled" || e.status === "Visit Completed",
  );
  const scheduled = visits.filter((v) => v.status === "Visit Scheduled").length;
  const done = visits.filter((v) => v.status === "Visit Completed").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          title="Today's Visits"
          subtitle={`${visits.length} visits · ${scheduled} scheduled · ${done} completed`}
        />
      </div>

      <div className="flex-1 min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="font-semibold">Schedule</h3>
          <span className="text-xs text-muted-foreground">{visits.length} entries</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {visits.map((e, i) => (
              <div key={e.id} className="rounded-2xl bg-white/70 border border-white/60 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">{e.childName}</div>
                  <Badge className={e.status === "Visit Completed" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                    {e.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Parent: {e.parentName}</div>
                <div className="text-xs text-muted-foreground">Interested in: {e.interestedClass}</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-slate-700">
                    <Calendar className="h-3.5 w-3.5" />
                    {["10:30 am", "11:15 am", "12:00 pm", "3:30 pm"][i % 4]}
                  </span>
                  <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 text-xs text-sky-700">
                    <Phone className="h-3.5 w-3.5" />
                    {e.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
