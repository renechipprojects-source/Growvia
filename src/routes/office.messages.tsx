import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { MESSAGES as SEED_MESSAGES, type Message } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MailOpen, Send, Plus, Reply } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { NotificationService } from "@/lib/notifications";

export const Route = createFileRoute("/office/messages")({ component: Messages });

function Messages() {
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(SEED_MESSAGES[0]?.id ?? null);
  const [dialog, setDialog] = useState(false);

  // Compose modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState("All Parents");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyText, setReplyText] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === "unread" && m.read) return false;
      if (!term) return true;
      return (
        m.fromName.toLowerCase().includes(term) ||
        m.subject.toLowerCase().includes(term) ||
        m.body.toLowerCase().includes(term)
      );
    });
  }, [messages, q, filter]);

  const selected = messages.find((m) => m.id === selectedId) ?? list[0];
  const unread = messages.filter((m) => !m.read).length;

  const handleSendMessage = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please provide both a subject and message body.");
      return;
    }

    const newMsg: Message = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      fromId: "USR-OFFICE",
      fromName: `Office -> ${recipient}`,
      studentId: "STD-ALL",
      toParentId: "PRT-ALL",
      subject,
      body,
      time: "Just now",
      read: true,
      priority: "Normal",
      direction: "outgoing",
    };

    setMessages((prev) => [newMsg, ...prev]);
    setSelectedId(newMsg.id);
    NotificationService.announcement(`Message to ${recipient}: ${subject}`);
    toast.success(`Message sent to ${recipient}`);

    setSubject("");
    setBody("");
    setComposeOpen(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selected) return;
    const replyMsg: Message = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      fromId: "USR-OFFICE",
      fromName: `Office -> ${selected.fromName}`,
      studentId: selected.studentId || "STD-001",
      toParentId: selected.toParentId || "PRT-001",
      subject: `Re: ${selected.subject}`,
      body: replyText,
      time: "Just now",
      read: true,
      priority: "Normal",
      direction: "outgoing",
    };

    setMessages((prev) => [replyMsg, ...prev]);
    setSelectedId(replyMsg.id);
    toast.success(`Reply sent to ${selected.fromName}`);
    setReplyText("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          title="Messages"
          subtitle={`${messages.length} total · ${unread} unread messages in inbox.`}
          action={
            <Button
              onClick={() => setComposeOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" /> New Message
            </Button>
          }
        />
      </div>

      {/* Fixed filters & Search */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="pl-9 bg-white/70" />
        </div>
        <Button size="sm" variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>All ({messages.length})</Button>
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
                  onClick={() => {
                    setSelectedId(m.id);
                    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
                    setDialog(true);
                  }}
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

        {/* Detail view */}
        <div className="hidden lg:flex min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex-col">
          {selected ? (
            <MessageDetail
              m={selected}
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={handleSendReply}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a message</div>
          )}
        </div>
      </div>

      {/* Mobile detail dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="lg:hidden max-w-lg">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <MessageDetail
              m={selected}
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={handleSendReply}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Message Modal */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send New Message</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Recipient</Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Parents">All Parents</SelectItem>
                  <SelectItem value="Class Teachers">Class Teachers</SelectItem>
                  <SelectItem value="Principal">Principal</SelectItem>
                  <SelectItem value="Transport In-Charge">Transport In-Charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject..." className="mt-1" />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." rows={4} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageDetail({
  m,
  replyText,
  setReplyText,
  onSendReply,
  embedded = false,
}: {
  m: Message;
  replyText: string;
  setReplyText: (v: string) => void;
  onSendReply: () => void;
  embedded?: boolean;
}) {
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

      <div className="shrink-0 p-3 border-t border-white/60 bg-white/50 space-y-2">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Reply to ${m.fromName}...`}
          rows={2}
          className="bg-white text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onSendReply} className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
            <Reply className="h-3.5 w-3.5 mr-1" /> Send Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
