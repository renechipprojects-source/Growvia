import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { fetchDiaryEntries, type DiaryEntry } from "@/lib/supabaseService";

export const Route = createFileRoute("/parent/diary")({ component: ParentDiary });

function ParentDiary() {
  const { t } = useT();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const data = await fetchDiaryEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
    const handleRefresh = () => loadEntries();
    window.addEventListener("sunshine-auto-refresh-diary", handleRefresh);
    window.addEventListener("sunshine-auto-refresh", handleRefresh);
    return () => {
      window.removeEventListener("sunshine-auto-refresh-diary", handleRefresh);
      window.removeEventListener("sunshine-auto-refresh", handleRefresh);
    };
  }, []);

  return (
    <div>
      <PageHeader title={t("diary.title")} subtitle={t("diary.subtitle")} />
      <SectionCard title={t("diary.recent")}>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading diary entries...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No diary entries found.</div>
        ) : (
          <ul className="space-y-3">
            {entries.map((d) => (
              <li key={d.id} className="rounded-2xl bg-pink-50/70 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{d.date}</div>
                  <div className="text-2xl">{d.mood}</div>
                </div>
                <div className="mt-1 text-sm text-foreground/90">{d.note}</div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
