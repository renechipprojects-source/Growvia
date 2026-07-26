import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";

const HISTORY = [
  { id: 1, month: "June 2026", amount: 8500, status: "Paid", date: "2026-06-05", receipt: "SUN/26-27/210" },
  { id: 2, month: "May 2026", amount: 8500, status: "Paid", date: "2026-05-08", receipt: "SUN/26-27/158" },
  { id: 3, month: "Apr 2026", amount: 8500, status: "Paid", date: "2026-04-10", receipt: "SUN/26-27/110" },
];

export const Route = createFileRoute("/parent/fees")({ component: ParentFees });

function ParentFees() {
  const { t } = useT();
  const { activeChild } = useParent();
  return (
    <div>
      <PageHeader title={t("fees.title")} subtitle={t("fees.subtitle")} action={<ChildSwitcher />} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white p-6 shadow-xl lg:col-span-1">
          <div className="text-xs uppercase tracking-widest opacity-80">{t("fees.due")}</div>
          <div className="mt-2 text-4xl font-bold">₹8,500</div>
          <div className="mt-1 text-sm opacity-90">
            {t("fees.dueMeta", { name: activeChild.name, class: t(`className.${activeChild.className}`, activeChild.className) })}
          </div>
          <div className="mt-4 text-xs opacity-90">{t("fees.payOffice")}</div>
        </div>
        <SectionCard title={t("fees.history")} className="lg:col-span-2">
          <ul className="space-y-2">
            {HISTORY.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                <div><div className="font-medium">{h.month}</div><div className="text-xs text-muted-foreground">{h.receipt} · {h.date}</div></div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">{t(`status.${h.status.toLowerCase()}`, h.status)}</Badge>
                  <div className="font-semibold">₹{h.amount.toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
