import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAlerts, type AlertPriority } from "@/lib/alertsContext";
import { Megaphone, Check, Paperclip } from "lucide-react";
import { CURRENT_TEACHER } from "@/lib/teacherContext";

export const Route = createFileRoute("/teacher/alerts")({ component: TeacherAlerts });

const priorityChip: Record<AlertPriority, string> = {
  Urgent: "bg-rose-100 text-rose-700",
  High: "bg-amber-100 text-amber-700",
  Normal: "bg-sky-100 text-sky-700",
  Low: "bg-slate-100 text-slate-700",
};

function TeacherAlerts() {
  const { liveFor, markRead } = useAlerts();
  const alerts = liveFor("teachers");
  const unread = alerts.filter((a) => !a.readBy.includes(CURRENT_TEACHER.id)).length;

  return (
    <div>
      <PageHeader
        title="Alerts & Circulars"
        subtitle="Latest updates from the Principal."
        action={<Badge className="bg-sky-100 text-sky-700">{unread} unread</Badge>}
      />
      <SectionCard title="Live alerts">
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No live alerts right now.</div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => {
              const read = a.readBy.includes(CURRENT_TEACHER.id);
              return (
                <li key={a.id} className={read ? "rounded-2xl bg-white/60 p-4" : "rounded-2xl bg-sky-50/70 p-4 border border-sky-100"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-sky-600 shrink-0" />
                        <div className="font-semibold truncate">{a.title}</div>
                        <Badge className={priorityChip[a.priority]}>{a.priority}</Badge>
                        {!read && <Badge className="bg-pink-100 text-pink-700">New</Badge>}
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap">{a.description}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span>Published {a.publishDate}</span>
                        <span>Expires {a.expiryDate}</span>
                        {a.attachmentName && (
                          <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{a.attachmentName}</span>
                        )}
                      </div>
                    </div>
                    {!read && (
                      <Button size="sm" variant="outline" onClick={() => markRead(a.id, CURRENT_TEACHER.id)}>
                        <Check className="h-3.5 w-3.5 mr-1" />Mark as read
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
