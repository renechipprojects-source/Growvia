import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/office/messages")({
  beforeLoad: () => {
    throw redirect({ to: "/office", replace: true });
  },
  component: () => null,
});

function Messages() {
  const { messages, dispatchMessage, markRead } = useMessages();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const [dialog, setDialog] = useState(false);

  // Compose modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState<"parent" | "teacher" | "principal" | "all">("all");
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

  const selected = useMemo(() => {
    return messages.find((m) => m.id === selectedId) || list.find((m) => m.id === selectedId) || list[0] || null;
  }, [messages, list, selectedId]);

  const unread = messages.filter((m) => !m.read).length;

  const handleOpenMessage = (m: Message) => {
    setSelectedId(m.id);
    markRead(m.id);
    setDialog(true);
  };

  const handleSendMessage = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please provide both a subject and message body.");
      return;
    }

    const created = dispatchMessage({
      fromId: "USR-OFFICE",
      fromName: "Office Staff",
      recipientRole: recipient,
      subject,
      body,
    });

    setSelectedId(created.id);
    toast.success(`Message sent to ${recipient.toUpperCase()}`);

    setSubject("");
    setBody("");
    setComposeOpen(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selected) return;

    const reply = dispatchMessage({
      fromId: "USR-OFFICE",
      fromName: "Office Staff",
      recipientRole: "all",
      subject: `Re: ${selected.subject}`,
      body: replyText,
    });

    setSelectedId(reply.id);
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
          <div className="shrink-0 px-4 pt-4 pb-2 text-xs text-muted-foreground font-medium">
            {list.length} messages
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/50 p-2 space-y-2">
            {list.map((m) => {
              const isSelected = selected?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => handleOpenMessage(m)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all border ${
                      isSelected
                        ? "bg-orange-50/90 border-orange-200 shadow-sm"
                        : "bg-white/40 hover:bg-white/80 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-semibold text-slate-900 truncate text-sm">
                          {m.fromName}
                        </div>
                        {m.priority === "High" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground shrink-0">{m.time}</div>
                    </div>

                    <div className="mt-1 text-sm font-medium text-slate-800 truncate">
                      {m.subject}
                    </div>

                    <div className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {m.body}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Target: {m.recipientRole ? m.recipientRole.toUpperCase() : "ALL"}
                      </span>
                      {!m.read ? (
                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                          ● Unread
                        </Badge>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                          ✓ Read
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
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

      {/* Message detail dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-slate-900">
              <MailOpen className="h-5 w-5 text-orange-600" />
              <span>{selected?.subject || "Message Details"}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <MessageDetail
              m={selected}
              embedded
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={() => {
                handleSendReply();
                setDialog(false);
              }}
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
              <Label>Recipient Target</Label>
              <Select value={recipient} onValueChange={(v: any) => setRecipient(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone (All Portals)</SelectItem>
                  <SelectItem value="parent">All Parents</SelectItem>
                  <SelectItem value="nursery_a">Parents of Nursery A</SelectItem>
                  <SelectItem value="nursery_b">Parents of Nursery B</SelectItem>
                  <SelectItem value="lkg_a">Parents of LKG A</SelectItem>
                  <SelectItem value="ukg_a">Parents of UKG A</SelectItem>
                  <SelectItem value="playgroup_a">Parents of Playgroup A</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
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
  embedded = false,
  replyText = "",
  setReplyText,
  onSendReply,
}: {
  m: Message;
  embedded?: boolean;
  replyText?: string;
  setReplyText?: (v: string) => void;
  onSendReply?: () => void;
}) {
  return (
    <div className={embedded ? "space-y-4" : "flex-1 min-h-0 flex flex-col"}>
      <div className={`shrink-0 ${embedded ? "bg-slate-50 p-3 rounded-2xl border" : "px-5 pt-5 pb-3 border-b border-white/60"}`}>
        <div className="flex items-center gap-2">
          <MailOpen className="h-4 w-4 text-orange-500 shrink-0" />
          <div className="font-semibold text-slate-900 truncate">{m.subject}</div>
          <Badge className="ml-auto bg-slate-100 text-slate-700">{m.priority}</Badge>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>From <strong className="text-slate-800">{m.fromName}</strong> · {m.time}</span>
          <span className={`font-semibold ${m.read ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"}`}>
            {m.read ? "✓ Read" : "○ Unread"}
          </span>
        </div>
        {m.recipientRole && (
          <div className="mt-1 text-[11px] text-slate-500">
            Target Audience: <span className="font-medium text-slate-700">{m.recipientRole.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className={`min-h-0 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap ${embedded ? "bg-white p-4 rounded-2xl border text-slate-800" : "flex-1 p-5 text-slate-800"}`}>
        {m.body}
      </div>

      {/* Quick Reply Box */}
      {setReplyText && onSendReply && (
        <div className={`shrink-0 ${embedded ? "pt-2" : "p-4 border-t border-white/60 bg-white/40"}`}>
          <Label className="text-xs text-slate-600 flex items-center gap-1 mb-1.5">
            <Reply className="h-3.5 w-3.5 text-orange-500" /> Quick Reply to {m.fromName}
          </Label>
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type reply message here..."
              rows={2}
              className="text-xs bg-white/90"
            />
            <Button
              onClick={onSendReply}
              disabled={!replyText.trim()}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white self-end shrink-0"
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
