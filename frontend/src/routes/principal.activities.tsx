import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { Sparkles, Calendar, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/principal/activities")({
  component: PrincipalActivitiesPage,
  head: () => ({ meta: [{ title: "School Activities — Sunshine Play School" }] }),
});

function PrincipalActivitiesPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-4">
      <PageHeader
        title="Student & School Activities"
        description="Monitor co-curricular events, sports day, arts & craft, and student activity logs."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Total Activities" value="12" tone="info" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Upcoming Events" value="4" tone="warning" icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Completed Activities" value="8" tone="success" icon={<PartyPopper className="h-5 w-5" />} />
      </div>
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-base mb-2">Activity Overview</h3>
        <p className="text-xs text-slate-500">Co-curricular activities are tracked directly under school events and teacher activity logs.</p>
      </div>
    </div>
  );
}
