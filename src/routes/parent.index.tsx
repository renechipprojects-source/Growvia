import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { UserCheck, BookOpen, NotebookPen, DollarSign, ImageIcon, ArrowRight, Users } from "lucide-react";
import { DIARY, GALLERY, HOMEWORK } from "@/lib/mockData";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { fetchFees, type FeeLedgerItem } from "@/lib/supabaseService";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

export const Route = createFileRoute("/parent/")({ component: Dash });

function Dash() {
  const { t } = useT();
  const { activeChild: child, children, household, setActiveChildId } = useParent();
  const parentFirstName = household.primaryContact.split(" ")[0];

  const [feeRecord, setFeeRecord] = useState<FeeLedgerItem | null>(null);

  useEffect(() => {
    fetchFees().then(({ data }) => {
      const match = data.find((f) => f.studentId === child.id || f.studentName === child.name);
      if (match) setFeeRecord(match);
    });
  }, [child]);

  const dueAmount = feeRecord ? Math.max(0, (feeRecord.amount ?? 8500) - (feeRecord.paid ?? 0)) : 8500;
  const childHW = HOMEWORK.filter((h) => h.className === child.className && (!h.section || h.section === child.section));
  const className = t(`className.${child.className}`, child.className);

  return (
    <div>
      <PageHeader title={`${t("dash.hello")} ${parentFirstName}`} action={<ChildSwitcher />} />

      {/* Child cover card */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-pink-100 via-fuchsia-100 to-purple-100 border border-white/60 shadow-lg p-6 flex items-center gap-5 mb-6">
        <img src={child.avatar} className="h-20 w-20 rounded-3xl bg-white shadow" alt="" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest text-pink-700">{t("dash.myLittleOne")}</div>
          <div className="text-2xl font-bold">{child.name}</div>
          <div className="text-sm text-muted-foreground">
            {className}-{child.section} · {t("label.age")} {child.age} · {t("label.roll")} {String(child.rollNo).padStart(2, "0")} · {child.house} {t("label.house")}
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-xs text-muted-foreground">{t("dash.attendance")}</div>
          <div className="text-2xl font-bold text-pink-700">{child.attendance}%</div>
        </div>
      </div>

      {children.length > 1 && (
        <div className="mb-6">
          <SectionCard title={`${t("label.yourChildren")} · ${children.length}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChildId(c.id)}
                  className={`text-left rounded-2xl border p-3 shadow-sm transition-colors ${c.id === child.id ? "bg-pink-100 border-pink-300" : "bg-white/70 border-white/60 hover:bg-pink-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <img src={c.avatar} className="h-10 w-10 rounded-full bg-white" alt="" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{t(`className.${c.className}`, c.className)}-{c.section}</div>
                    </div>
                  </div>
                  {c.id === child.id && (
                    <Badge className="mt-2 bg-pink-100 text-pink-700"><Users className="h-3 w-3 mr-1" />{t("label.viewing")}</Badge>
                  )}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label={t("dash.attendance")} value={`${child.attendance}%`} icon={UserCheck} gradient="from-pink-500 to-fuchsia-500" />
        <StatCard label={t("dash.homework")} value={childHW.length} icon={BookOpen} gradient="from-fuchsia-500 to-purple-500" sub={t("dash.homeworkActive")} />
        <StatCard label={t("dash.todaysDiary")} value="1" icon={NotebookPen} gradient="from-purple-500 to-pink-500" sub={t("dash.todaysDiaryJustNow")} />
        <StatCard label={t("dash.feeDue")} value={`₹${dueAmount.toLocaleString()}`} icon={DollarSign} gradient="from-rose-500 to-pink-500" sub={t("dash.feeDueSub")} />
        <StatCard label={t("dash.recentPhotos")} value={GALLERY.length} icon={ImageIcon} gradient="from-pink-400 to-purple-400" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <SectionCard title={t("dash.todaysDiary")} className="lg:col-span-2">
          <div className="rounded-2xl bg-pink-50/70 p-4">
            <div className="text-xs text-muted-foreground">{DIARY[0].date} {DIARY[0].mood}</div>
            <div className="mt-1">{DIARY[0].note}</div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {GALLERY.slice(0, 4).map((g, i) => (
              <img key={i} src={g} className="h-20 w-full object-cover rounded-2xl" alt="" />
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title={t("dash.homework")}
          action={
            <Link to="/parent/homework" className="text-xs font-medium text-pink-600 hover:text-pink-700 inline-flex items-center gap-1">
              {t("dash.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {childHW.slice(0, 6).map((h) => (
              <li key={h.id} className="rounded-2xl bg-white/70 p-3 border border-white/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{h.subject} · {h.teacher}</div>
                    <div className="font-medium truncate">{h.title}</div>
                  </div>
                  <Badge className={h.status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {t(`status.${h.status.toLowerCase()}`, h.status)}
                  </Badge>
                </div>
                <div className="text-xs bg-pink-100 text-pink-700 rounded-full px-2 py-0.5 inline-block mt-2">{t("hw.due", { date: h.due })}</div>
              </li>
            ))}
            {childHW.length === 0 && (
              <li className="text-sm text-muted-foreground">{t("dash.homeworkNone")}</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title={t("dash.skills")}>
          <div className="grid sm:grid-cols-2 gap-x-8">
            {[
              { key: "dash.skill.language", v: 82 },
              { key: "dash.skill.motor", v: 76 },
              { key: "dash.skill.social", v: 90 },
              { key: "dash.skill.creativity", v: 84 },
            ].map((s) => (
              <div key={s.key} className="mb-3 text-sm">
                <div className="flex justify-between"><span>{t(s.key)}</span><span className="text-muted-foreground">{s.v}%</span></div>
                <Progress value={s.v} className="h-2 mt-1" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <RecentCircularWidget role="parent" viewAllLink="/parent/circulars" />
      </div>
    </div>
  );
}
