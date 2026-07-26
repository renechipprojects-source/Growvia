import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { MESSAGES, STUDENTS, studentsBy, type ClassName, type Section, type Message } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Search, Plus, Inbox, ArrowUpRight, FileText, Paperclip, User, Users2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getClassAssignments } from "@/lib/teacherContext";
import { sendMessage } from "@/lib/supabaseService";

export const Route = createFileRoute("/teacher/messages")({ component: TeacherMessages });

type Folder = "Inbox" | "Sent" | "Drafts";
type RecipientType = "class" | "multiple" | "single";

function TeacherMessages() {
  const assignments = getClassAssignments();
  const primary = assignments[0];
  const defaultCls = (primary?.className as ClassName) ?? "Nursery";
  const defaultSec = (primary?.section as Section) ?? "A";

  const [folder, setFolder] = useState<Folder>("Inbox");
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [local, setLocal] = useState<Message[]>([]);

  const allMessages = useMemo(() => [...local, ...MESSAGES], [local]);
  const filtered = allMessages
    .filter((m) =>
      folder === "Inbox" ? m.direction === "incoming" :
      folder === "Sent" ? m.direction === "outgoing" :
      false,
    )
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [m.fromName, m.subject, m.body].some((v) => v.toLowerCase().includes(q));
    });

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Message individual parents, groups, or the whole class."
        action={
          <Button onClick={() => setComposeOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> New Message
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <SectionCard title="Folders">
          <ul className="space-y-1">
            {(["Inbox", "Sent", "Drafts"] as Folder[]).map((f) => (
              <li key={f}>
                <button
                  onClick={() => setFolder(f)}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm flex items-center gap-2 transition ${
                    folder === f ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow" : "hover:bg-white"
                  }`}
                >
                  {f === "Inbox" && <Inbox className="h-4 w-4" />}
                  {f === "Sent" && <ArrowUpRight className="h-4 w-4" />}
                  {f === "Drafts" && <FileText className="h-4 w-4" />}
                  <span className="flex-1">{f}</span>
                  <Badge className={folder === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}>
                    {allMessages.filter((m) =>
                      f === "Inbox" ? m.direction === "incoming" :
                      f === "Sent" ? m.direction === "outgoing" : false,
                    ).length}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* List */}
        <SectionCard title={`${folder} · ${filtered.length}`}>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="pl-9 bg-white/70"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No messages in {folder}.</div>
          ) : (
            <ul className="divide-y divide-white/60 max-h-[60vh] sm:max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((m) => {
                const student = STUDENTS.find((s) => s.id === m.studentId);
                return (
                  <li key={m.id} className="py-3 flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 rounded-full ${!m.read ? "bg-sky-500" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{m.fromName}</div>
                        <div className="ml-auto text-xs text-muted-foreground">{m.time}</div>
                      </div>
                      <div className="text-sm font-medium truncate">{m.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.body}</div>
                      {student && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Re: {student.name} · {student.className}-{student.section} · {m.priority === "High" && <Badge className="bg-rose-100 text-rose-700 ml-1">High</Badge>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultClass={defaultCls}
        defaultSection={defaultSec}
        onSend={(m) => setLocal((prev) => [m, ...prev])}
      />
    </div>
  );
}

// ── Compose Dialog ──────────────────────────────────────────────────────────

function ComposeDialog({
  open, onClose, defaultClass, defaultSection, onSend,
}: {
  open: boolean;
  onClose: () => void;
  defaultClass: ClassName;
  defaultSection: Section;
  onSend: (m: Message) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [recipientType, setRecipientType] = useState<RecipientType>("class");
  const [cls, setCls] = useState<ClassName>(defaultClass);
  const [sec, setSec] = useState<Section>(defaultSection);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High">("Normal");

  const classList = useMemo(() => studentsBy(cls, sec), [cls, sec]);
  const searched = classList.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return [s.name, s.rollNo, s.admissionNo, s.parent].some((v) => String(v).toLowerCase().includes(q));
  });

  const recipientsCount =
    recipientType === "class" ? classList.length :
    recipientType === "multiple" ? selectedIds.size :
    selectedIds.size === 1 ? 1 : 0;

  function reset() {
    setStep(1);
    setRecipientType("class");
    setSelectedIds(new Set());
    setStudentSearch("");
    setSubject("");
    setBody("");
    setPriority("Normal");
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (recipientType === "single") {
        next.clear();
        next.add(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please add a subject and message.");
      return;
    }
    if (recipientsCount === 0) {
      toast.error("Select at least one recipient.");
      return;
    }
    const targets =
      recipientType === "class"
        ? classList
        : classList.filter((s) => selectedIds.has(s.id));
    // Create one outbound message per recipient (for the Sent folder).
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    for (const s of targets) {
      onSend({
        id: `MSG-L-${s.id}-${Date.now()}`,
        fromId: "TCH100",
        fromName: "Miss Priya (Me)",
        studentId: s.id,
        toParentId: s.parentId,
        subject,
        body,
        time: stamp,
        priority,
        read: true,
        direction: "outgoing",
      });
      sendMessage({
        sender_id: "TCH101",
        sender_name: "Miss Priya",
        sender_role: "teacher",
        receiver_id: s.parentId,
        receiver_role: "parent",
        message_text: `${subject}: ${body}`,
      }).catch(() => {});
    }
    toast.success(
      recipientType === "class"
        ? `Sent to all ${targets.length} parents in ${cls}-${sec}.`
        : `Sent to ${targets.length} parent${targets.length === 1 ? "" : "s"}.`,
    );
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "New message — choose recipients" : "New message — write"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {/* Recipient type */}
            <div className="grid grid-cols-3 gap-2">
              <RecipientCard
                icon={<Users2 className="h-4 w-4" />}
                label="Entire class"
                active={recipientType === "class"}
                onClick={() => { setRecipientType("class"); setSelectedIds(new Set()); }}
              />
              <RecipientCard
                icon={<UserPlus className="h-4 w-4" />}
                label="Multiple students"
                active={recipientType === "multiple"}
                onClick={() => { setRecipientType("multiple"); setSelectedIds(new Set()); }}
              />
              <RecipientCard
                icon={<User className="h-4 w-4" />}
                label="Single student"
                active={recipientType === "single"}
                onClick={() => { setRecipientType("single"); setSelectedIds(new Set()); }}
              />
            </div>

            {/* Class / section */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Class</Label>
                <Select value={cls} onValueChange={(v) => setCls(v as ClassName)}>
                  <SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Playgroup", "Nursery", "LKG", "UKG"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={sec} onValueChange={(v) => setSec(v as Section)}>
                  <SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{["A", "B"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {recipientType !== "class" && (
              <div>
                <Label>Select students</Label>
                <div className="relative mt-1.5">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name, roll, admission or parent…"
                    className="pl-9 bg-white"
                  />
                </div>
                <div className="mt-2 max-h-[280px] overflow-y-auto rounded-2xl border border-white/60 bg-white/60 divide-y divide-white/60">
                  {searched.map((s) => {
                    const checked = selectedIds.has(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white">
                        <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                        <img src={s.avatar} className="h-9 w-9 rounded-full bg-white" alt="" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">Roll {String(s.rollNo).padStart(2, "0")} · {s.className}-{s.section} · Parent: {s.parent}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Recipients: <b className="text-slate-700">{recipientsCount}</b> parent
              {recipientsCount === 1 ? "" : "s"}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Card className="rounded-2xl bg-white/70 p-3 text-xs text-muted-foreground border-white/60">
              <b className="text-slate-700">Recipients:</b>{" "}
              {recipientType === "class"
                ? `Entire class · ${cls}-${sec} · ${classList.length} parents`
                : `${recipientsCount} selected parent${recipientsCount === 1 ? "" : "s"}`}
            </Card>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Homework update, PTM reminder…" className="mt-1.5 bg-white" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Type your message…" className="mt-1.5 bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as "Normal" | "High")}>
                  <SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Attachment</Label>
                <Button type="button" variant="outline" className="mt-1.5 w-full justify-start">
                  <Paperclip className="h-4 w-4 mr-2" /> Add file (optional)
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button
                disabled={recipientType !== "class" && recipientsCount === 0}
                onClick={() => setStep(2)}
                className="bg-gradient-to-r from-sky-500 to-blue-500 text-white"
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSend} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white">
                <Send className="h-4 w-4 mr-2" /> Send
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientCard({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-3 text-left transition border ${
        active
          ? "bg-gradient-to-br from-sky-500 to-blue-500 text-white border-transparent shadow-lg"
          : "bg-white border-white/60 hover:bg-white/80"
      }`}
    >
      <div className="flex items-center gap-2">{icon}<span className="text-sm font-semibold">{label}</span></div>
    </button>
  );
}
