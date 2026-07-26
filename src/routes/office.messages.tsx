import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { MESSAGES, type Message } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MailOpen, Send } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/office/messages")({ component: Messages });

function Messages() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(MESSAGES[0]?.id ?? null);
  const [dialog, setDialog] = useState(false);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return MESSAGES.filter((m) => {
      if (filter === "unread" && m.read) return false;
      if (!term) return true;
      return (
        m.fromName.toLowerCase().includes(term) ||
        m.subject.toLowerCase().includes(term) ||
        m.body.toLowerCase().includes(term)
      );
    });
  }, [q, filter]);

  const selected = list.find((m) => m.id === selectedId) ?? list[0];
  const unread = MESSAGES.filter((m) => !m.read).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          title="Messages"
          subtitle={`${MESSAGES.length} total · ${unread} unread`}
          action={
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full">
              <Send className="h-4 w-4 mr-2" /> Compose
            </Button>
          }
        />
      </div>

      {/* Fixed filters */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="pl-9 bg-white/70" />
        </div>
        <Button size="sm" variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>All</Button>
        <Button size="sm" variant={filter === "unread" ? "default" : "secondary"} onClick={() => setFilter("unread")}>Unread ({unread})</Button>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* List — scrolls internally */}
        <div className="min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
          <div className="shrink-0 px-4 pt-4 pb-2 text-xs text-muted-foreground">
            {list.length} messages
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/50 px-2 pb-2">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => { setSelectedId(m.id); setDialog(true); }}
                  className={`w-full text-left px-3 py-3 rounded-2xl transition ${selected?.id === m.id ? "bg-orange-50" : "hover:bg-white/70"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2 w-2 rounded-full shrink-0 ${!m.read ? "bg-orange-500" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{m.fromName}</div>
                        <div className="ml-auto text-xs text-muted-foreground shrink-0">{m.time}</div>
                      </div>
                      <div className="text-sm truncate">
                        <span className="font-medium text-slate-700">{m.subject}:</span>{" "}
                        <span className="text-muted-foreground">{m.body}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="px-6 py-10 text-center text-sm text-muted-foreground">No messages match.</li>
            )}
          </ul>
        </div>

        {/* Detail — hidden on mobile (dialog used instead) */}
        <div className="hidden lg:flex min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex-col">
          {selected ? <MessageDetail m={selected} /> : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a message</div>
          )}
        </div>
      </div>

      {/* Mobile detail dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="lg:hidden max-w-lg">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && <MessageDetail m={selected} embedded />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageDetail({ m, embedded = false }: { m: Message; embedded?: boolean }) {
  return (
    <div className={embedded ? "" : "flex-1 min-h-0 flex flex-col"}>
      <div className={`shrink-0 ${embedded ? "" : "px-5 pt-5 pb-3 border-b border-white/60"}`}>
        <div className="flex items-center gap-2">
          <MailOpen className="h-4 w-4 text-muted-foreground" />
          <div className="font-semibold truncate">{m.subject}</div>
          <Badge className="ml-auto bg-slate-100 text-slate-700">{m.priority}</Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">From {m.fromName} · {m.time}</div>
      </div>
      <div className={`min-h-0 overflow-y-auto text-sm leading-relaxed ${embedded ? "mt-3" : "flex-1 p-5"}`}>
        {m.body}
      </div>
    </div>
  );
}
