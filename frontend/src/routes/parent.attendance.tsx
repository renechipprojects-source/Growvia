import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";
import { useLiveAttendance, getStudentAttendanceDetails } from "@/lib/attendanceStore";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/parent/attendance")({
  component: ParentAttendance,
});

function ParentAttendance() {
  const { activeChild: CHILD } = useParent();
  const { t } = useT();
  const { attendance: liveRecords } = useLiveAttendance(CHILD.id);

  const details = getStudentAttendanceDetails(CHILD.id, CHILD);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("att.title")}
        subtitle={`${CHILD.name} · ${CHILD.className}-${CHILD.section} · ${details.percentage}% Attendance`}
        action={<ChildSwitcher />}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white p-5 shadow-lg">
          <div className="text-xs uppercase tracking-widest opacity-80">{t("att.present")}</div>
          <div className="text-3xl font-bold mt-1">{details.presentDays}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.absent")}</div>
          <div className="text-3xl font-bold mt-1 text-rose-600">{details.absentDays}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Late / Leave</div>
          <div className="text-3xl font-bold mt-1 text-amber-600">{details.lateDays} <span className="text-base text-purple-600">/ {details.leaveDays}</span></div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.percent")}</div>
          <div className="text-3xl font-bold mt-1 text-pink-700">{details.percentage}%</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.total")}</div>
          <div className="text-3xl font-bold mt-1">{details.totalSchoolDays}</div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <SectionCard title="Weekly Attendance Breakdown">
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {details.weeklyReport.days.map((d, idx) => (
            <div key={d.id || idx} className="rounded-2xl border bg-white/60 p-3 shadow-sm">
              <div className="font-semibold text-slate-800">{d.day || `Day ${idx + 1}`}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{d.date}</div>
              <div className="mt-2">
                <Badge
                  className={
                    d.status === "P"
                      ? "bg-emerald-100 text-emerald-700"
                      : d.status === "A"
                      ? "bg-rose-100 text-rose-700"
                      : d.status === "L"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-purple-100 text-purple-700"
                  }
                >
                  {d.status === "P" ? "Present" : d.status === "A" ? "Absent" : d.status === "L" ? "Late" : "Leave"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Chronological History Log */}
      <SectionCard title={t("att.daily")}>
        <ul className="divide-y">
          {details.history.slice(0, 15).map((r, idx) => (
            <li key={r.id || idx} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="text-slate-800 font-medium">{r.date} · {r.day || "Weekday"}</div>
                <div className="text-xs text-muted-foreground">Marked by {r.markedBy || "Class Teacher"}</div>
              </div>
              <Badge
                className={
                  r.status === "P"
                    ? "bg-emerald-100 text-emerald-700"
                    : r.status === "A"
                    ? "bg-rose-100 text-rose-700"
                    : r.status === "L"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-purple-100 text-purple-700"
                }
              >
                {r.status === "P" ? "Present" : r.status === "A" ? "Absent" : r.status === "L" ? "Late" : "Leave"}
              </Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
