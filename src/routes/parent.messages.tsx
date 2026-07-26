import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { MESSAGES } from "@/lib/mockData";
import { useParent } from "@/lib/parentContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Inbox, Search } from "lucide-react";
import { useState } from "react";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/parent/messages")({ component: ParentMessages });

function ParentMessages() {
  const { t } = useT();
  const { activeChild } = useParent();
  const [search, setSearch] = useState("");
  const firstName = activeChild.name.split(" ")[0];

  const inbox = MESSAGES
    .filter((m) => m.direction === "outgoing" && m.studentId === activeChild.id)
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [m.fromName, m.subject, m.body].some((v) => v.toLowerCase().includes(q));
    });

  return (
    <div>
      <PageHeader
        title={t("msg.title")}
        subtitle={t("msg.subtitle", { name: firstName })}
        action={<ChildSwitcher />}
      />

      <SectionCard title={t("msg.inbox", { n: inbox.length })}>
        <div className="relative mb-3">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("msg.search")}
            className="pl-9 bg-white/70"
          />
        </div>
        {inbox.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("msg.empty", { name: firstName })}
          </div>
        ) : (
          <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {inbox.map((m) => (
              <li key={m.id} className="rounded-2xl bg-white/70 p-4 border border-white/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{m.fromName}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.priority === "High" && <Badge className="bg-rose-100 text-rose-700">{t("status.high")}</Badge>}
                    <div className="text-[11px] text-muted-foreground">{m.time}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold mt-1">{m.subject}</div>
                <div className="text-sm mt-1 text-slate-700">{m.body}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" /> {t("msg.readonly")}
        </div>
      </SectionCard>
    </div>
  );
}
