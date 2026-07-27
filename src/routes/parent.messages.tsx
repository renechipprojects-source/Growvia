import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useParent } from "@/lib/parentContext";
import { useLiveMessages } from "@/lib/messagesStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Search, Plus, Send } from "lucide-react";
import { useState } from "react";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/messages")({ component: ParentMessages });

function ParentMessages() {
  const { t } = useT();
  const { activeChild } = useParent();
  const { messages, sendMessage } = useLiveMessages();
  const [search, setSearch] = useState("");
  const firstName = activeChild.name.split(" ")[0];

  const [openCompose, setOpenCompose] = useState(false);
  const [recipient, setRecipient] = useState<"teacher" | "office" | "principal">("teacher");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const inbox = messages.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [m.fromName, m.subject, m.body].some((v) => v.toLowerCase().includes(q));
  });

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      return toast.error("Please fill in subject and body");
    }

    sendMessage({
      fromId: activeChild.id,
      fromName: `${activeChild.name}'s Parent`,
      recipientRole: recipient,
      subject,
      body,
      studentId: activeChild.id,
    });

    toast.success(`Message sent to ${recipient.toUpperCase()}!`);
    setSubject("");
    setBody("");
    setOpenCompose(false);
  };

  return (
    <div>
      <PageHeader
        title={t("msg.title")}
        subtitle={t("msg.subtitle", { name: firstName })}
        action={
          <div className="flex gap-2">
            <ChildSwitcher />
            <Button onClick={() => setOpenCompose(true)} className="bg-sky-600 hover:bg-sky-700 text-white rounded-full">
              <Plus className="h-4 w-4 mr-1" /> New Message
            </Button>
          </div>
        }
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
              <li key={m.id} className="rounded-2xl bg-white/70 p-4 border border-white/60 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-slate-900 truncate">{m.fromName}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.priority === "High" && <Badge className="bg-rose-100 text-rose-700">{t("status.high")}</Badge>}
                    <div className="text-[11px] text-muted-foreground">{m.time}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold mt-1 text-slate-800">{m.subject}</div>
                <div className="text-sm mt-1 text-slate-700 leading-relaxed">{m.body}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" /> All messages are synced live across School Portals.
        </div>
      </SectionCard>

      <Dialog open={openCompose} onOpenChange={setOpenCompose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to School</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Send To</label>
              <Select value={recipient} onValueChange={(v: any) => setRecipient(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Class Teacher</SelectItem>
                  <SelectItem value="office">Office Staff</SelectItem>
                  <SelectItem value="principal">Principal Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Leave note, Fee query" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase">Message</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message here..." rows={4} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenCompose(false)}>Cancel</Button>
            <Button onClick={handleSend} className="bg-sky-600 text-white">
              <Send className="h-4 w-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
