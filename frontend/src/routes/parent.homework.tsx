import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchQuery, matchesSearch } from "@/lib/searchContext";
import { Info } from "lucide-react";
import { useT } from "@/lib/i18n";

import { useHomework, type Homework } from "@/lib/homeworkStore";

export const Route = createFileRoute("/parent/homework")({
  component: ParentHomework,
});

function ParentHomework() {
  const { t } = useT();
  const q = useSearchQuery();
  const { homework } = useHomework();
  const items = homework.filter((h: Homework) => matchesSearch(q, h.title, h.subject, h.className));
  const matchLabel = q
    ? ` · ${items.length === 1 ? t("hw.matchOne", { n: items.length }) : t("hw.matchMany", { n: items.length })}`
    : "";
  return (
    <div>
      <PageHeader title={t("hw.title")} subtitle={t("hw.subtitle")} />
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> {t("hw.viewOnly")}
      </div>
      <SectionCard title={`${t("hw.active")}${matchLabel}`}>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">{t("hw.noMatch")}</div>
        ) : (
          <ul className="space-y-2">
            {items.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-4">
                <Checkbox className="h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.subject} · {t("hw.due", { date: h.due })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
