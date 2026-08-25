import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/principal/messages")({
  beforeLoad: () => {
    throw redirect({ to: "/principal", replace: true });
  },
  component: () => null,
});

function PrincipalMessages() {
  const { messages, dispatchMessage } = useMessages();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);

  // Compose modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState<"parent" | "teacher" | "office" | "all">("all");
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
      toast.error("Please fill in subject and body.");
      return;
    }

    const created = dispatchMessage({
      fromId: "USR-PRINCIPAL",
      fromName: "Principal Office",
      recipientRole: recipient,
      subject,
      body,
    });

    setSelectedId(created.id);
    toast.success(`Message dispatched to ${recipient.toUpperCase()}`);
    setSubject("");
    setBody("");
    setComposeOpen(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selected) return;

    const reply = dispatchMessage({
      fromId: "USR-PRINCIPAL",
      fromName: "Principal Office",
      recipientRole: "all",
      subject: `Re: ${selected.subject}`,
      body: replyText,
    });

    setSelectedId(reply.id);
    toast.success(`Reply sent to ${selected.fromName}`);
    setReplyText("");
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <PageHeader
        title="Principal Message Center"
        subtitle={`${messages.length} total · ${unread} unread messages.`}
        action={
          <Button
            onClick={() => setComposeOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" /> New Message
          </Button>
        }
      />

      {/* Filter and Search */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages..." className="pl-9 bg-white/70" />
        </div>
        <Button size="sm" variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>All ({messages.length})</Button>
        <Button size="sm" variant={filter === "unread" ? "default" : "secondary"} onClick={() => setFilter("unread")}>Unread ({unread})</Button>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* Messages List */}
        <div className="min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg flex flex-col">
          <div className="shrink-0 px-4 pt-4 pb-2 text-xs text-muted-foreground">
            {list.length} messages
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/50 px-2 pb-2">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setSelectedId(m.id);
                    markMessageRead(m.id);
                    setDialog(true);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-2xl transition ${selected?.id === m.id ? "bg-emerald-50" : "hover:bg-white/70"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2 w-2 rounded-full shrink-0 ${!m.read ? "bg-emerald-500" : "bg-slate-300"}`} />
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
              <li className="px-6 py-10 text-center text-sm text-muted-foreground">No messages found.</li>
            )}
          </ul>
        </div>

        {/* Message Detail View */}
        <div className="hidden lg:flex min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg flex-col">
          {selected ? (
            <PrincipalMessageDetail m={selected} />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a message</div>
          )}
        </div>
      </div>

      {/* Message Detail Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{selected?.subject || "Message Details"}</DialogTitle></DialogHeader>
          {selected && (
            <PrincipalMessageDetail m={selected} />
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Message Modal */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Principal Broadcast / Direct Message</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Target Recipient</Label>
              <Select value={recipient} onValueChange={(v: any) => setRecipient(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone (All Roles)</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="office">Office Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject..." className="mt-1" />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write message..." rows={4} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} className="bg-emerald-600 text-white">
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrincipalMessageDetail({
  m,
}: {
  m: Message;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 p-5 space-y-4">
      <div className="border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg text-slate-900">{m.subject}</div>
          <Badge variant="outline">{m.priority || "Normal"}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
          <span>From: {m.fromName} · {m.time}</span>
          <span className={`font-semibold ${m.read ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"}`}>
            {m.read ? "✓ Read" : "○ Unread"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto text-sm text-slate-800 leading-relaxed bg-white/50 p-4 rounded-2xl border">
        {m.body}
      </div>
    </div>
  );
}
