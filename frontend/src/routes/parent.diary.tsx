import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useT } from "@/lib/i18n";
import { useState } from "react";

export const Route = createFileRoute("/parent/diary")({ component: ParentDiary });

function ParentDiary() {
  const { t } = useT();
  const [entries] = useState<any[]>([]);

  return (
    <div>
      <PageHeader title={t("diary.title")} subtitle={t("diary.subtitle")} />
      <SectionCard title={t("diary.recent")}>
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No diary entries found.</div>
        ) : (
          <ul className="space-y-3">
            {entries.map((d) => (
              <li key={d.id} className="rounded-2xl bg-pink-50/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{d.date}</div>
                  <div className="text-2xl">{d.mood}</div>
                </div>
                <div className="mt-1">{d.note}</div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
