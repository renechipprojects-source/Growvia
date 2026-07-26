import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/parent/attendance")({
  component: ParentAttendance,
});

function ParentAttendance() {
  const { activeChild: CHILD } = useParent();
  const { t } = useT();
  const days = Array.from({ length: 30 }).map((_, i) => ({
    d: i + 1,
    p: (i + 2) % 7 !== 0 && (i * 17) % 11 !== 0,
  }));
  const present = days.filter((d) => d.p).length;
  const absent = days.length - present;
  const pct = Math.round((present / days.length) * 100);

  return (
    <div>
      <PageHeader
        title={t("att.title")}
        subtitle={`${CHILD.name} · ${CHILD.attendance}${t("att.termSuffix")}`}
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
          <div className="text-3xl font-bold mt-1">{days.length}</div>
        </div>
      </div>

      <SectionCard title={t("att.thisMonth")}>
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {days.map((d) => (
            <div
              key={d.d}
              className={`aspect-square rounded-lg grid place-items-center ${d.p ? "bg-pink-500 text-white" : "bg-slate-200 text-slate-500"}`}
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
            <span className="h-3 w-3 rounded bg-slate-200" />
            {t("att.absentLegend")}
          </div>
        </div>
      </SectionCard>

      <div className="mt-4">
        <SectionCard title={t("att.daily")}>
          <ul className="divide-y">
            {days
              .slice()
              .reverse()
              .slice(0, 10)
              .map((d) => (
                <li key={d.d} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{t("att.dayN", { n: d.d })}</span>
                  <span
                    className={
                      d.p
                        ? "text-emerald-600 font-medium"
                        : "text-rose-600 font-medium"
                    }
                  >
                    {d.p ? t("status.present") : t("status.absent")}
                  </span>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
