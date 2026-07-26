import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { DIARY } from "@/lib/mockData";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/parent/diary")({ component: ParentDiary });

function ParentDiary() {
  const { t } = useT();
  return (
    <div>
      <PageHeader title={t("diary.title")} subtitle={t("diary.subtitle")} />
      <SectionCard title={t("diary.recent")}>
        <ul className="space-y-3">
          {DIARY.map((d) => (
            <li key={d.id} className="rounded-2xl bg-pink-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{d.date}</div>
                <div className="text-2xl">{d.mood}</div>
              </div>
              <div className="mt-1">{d.note}</div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
