import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";
import { useLiveAttendance } from "@/lib/attendanceStore";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/parent/attendance")({
  component: ParentAttendance,
});

function ParentAttendance() {
  const { activeChild: CHILD } = useParent();
  const { t } = useT();
  const { attendance: liveRecords } = useLiveAttendance(CHILD.id);

  // Combine live saved records with fallback monthly attendance days
  const baseDays = Array.from({ length: 30 }).map((_, i) => {
    const dayStr = `2026-07-${String(i + 1).padStart(2, "0")}`;
    const live = liveRecords.find((r) => r.date === dayStr);
    const isPresent = live ? (live.status === "P" || live.status === "L") : ((i + 2) % 7 !== 0 && (i * 17) % 11 !== 0);
    const statusText = live ? (live.status === "P" ? "Present" : live.status === "A" ? "Absent" : live.status === "L" ? "Late" : "Leave") : (isPresent ? "Present" : "Absent");
    return {
      d: i + 1,
      date: dayStr,
      p: isPresent,
      statusText,
    };
  });

  const present = baseDays.filter((d) => d.p).length;
  const absent = baseDays.length - present;
  const pct = Math.round((present / baseDays.length) * 100);

  return (
    <div>
      <PageHeader
        title={t("att.title")}
        subtitle={`${CHILD.name} · ${CHILD.className}-${CHILD.section} · ${pct}% Attendance`}
        action={<ChildSwitcher />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white p-5 shadow-lg">
          <div className="text-xs uppercase tracking-widest opacity-80">{t("att.present")}</div>
          <div className="text-3xl font-bold mt-1">{present}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.absent")}</div>
          <div className="text-3xl font-bold mt-1 text-rose-600">{absent}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.percent")}</div>
          <div className="text-3xl font-bold mt-1 text-pink-700">{pct}%</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-5 shadow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("att.total")}</div>
          <div className="text-3xl font-bold mt-1">{baseDays.length}</div>
        </div>
      </div>

      <SectionCard title={t("att.thisMonth")}>
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {baseDays.map((d) => (
            <div
              key={d.d}
              title={`${d.date}: ${d.statusText}`}
              className={`aspect-square rounded-lg grid place-items-center font-medium ${d.p ? "bg-pink-500 text-white" : "bg-rose-100 text-rose-700"}`}
            >
              {d.d}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-pink-500" />
            {t("att.presentLegend")}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-rose-100 border border-rose-300" />
            {t("att.absentLegend")}
          </div>
        </div>
      </SectionCard>

      <div className="mt-4">
        <SectionCard title={t("att.daily")}>
          <ul className="divide-y">
            {baseDays
              .slice()
              .reverse()
              .slice(0, 10)
              .map((d) => (
                <li key={d.d} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700 font-medium">July {d.d}, 2026</span>
                  <Badge className={d.p ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                    {d.statusText}
                  </Badge>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
