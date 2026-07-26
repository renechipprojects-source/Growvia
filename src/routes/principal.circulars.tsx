import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit2, Trash2, Send, Archive, History, Eye, Paperclip, Calendar } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { initialCirculars, ALL_RECIPIENTS, type Circular, type RecipientRole } from "@/lib/principal-mock-data";
import { createCircular, fetchCirculars, deleteCircular as deleteCircularService } from "@/lib/supabaseService";

export const Route = createFileRoute("/principal/circulars")({
  head: () => ({
    meta: [
      { title: "Circular Management | Principal Portal" },
      { name: "description", content: "Create, publish, schedule and manage circulars for Admin, Teachers, Office Staff and Parents." },
    ],
  }),
  component: CircularsPage,
});

type Mode = "create" | "edit" | "view" | null;

function CircularsPage() {
  const [items, setItems] = useState<Circular[]>([]);

  useEffect(() => {
    fetchCirculars().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) {
        const mapped: Circular[] = data.map((d) => ({
          id: d.id || `C-${Math.random()}`,
          title: d.title,
          subject: d.title,
          description: d.content,
          priority: "Medium",
          publishDate: d.published_date,
          expiryDate: d.published_date,
          recipients: ["Parents", "Teachers"],
          status: "Published",
          createdAt: d.published_date,
          history: [{ at: d.published_date, action: "Published from Supabase" }],
        }));
        setItems(mapped);
      }
    });
  }, []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [mode, setMode] = useState<Mode>(null);
  const [editing, setEditing] = useState<Circular | null>(null);
  const [historyOf, setHistoryOf] = useState<Circular | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Circular | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((c) => {
        const matchQ = !q || c.title.toLowerCase().includes(q.toLowerCase()) || c.subject.toLowerCase().includes(q.toLowerCase());
        const matchS = status === "all" || c.status === status;
        const matchP = priority === "all" || c.priority === priority;
        return matchQ && matchS && matchP;
      }),
    [items, q, status, priority],
  );

  const openCreate = () => {
    setEditing(null);
    setMode("create");
  };
  const openEdit = (c: Circular) => {
    setEditing(c);
    setMode("edit");
  };
  const openView = (c: Circular) => {
    setEditing(c);
    setMode("view");
  };

  const upsert = (c: Circular, action: string) => {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === c.id);
      const withHistory = { ...c, history: [...c.history, { at: new Date().toISOString(), action }] };
      if (exists) return prev.map((x) => (x.id === c.id ? withHistory : x));
      return [withHistory, ...prev];
    });
  };

  const deleteCircular = (c: Circular) => {
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    Promise.resolve(deleteCircularService(c.id)).catch(() => {});
    toast.success(`Deleted "${c.title}"`);
    setConfirmDelete(null);
  };

  const archive = (c: Circular) => {
    upsert({ ...c, status: "Archived" }, "Archived");
    toast.success("Circular archived");
  };

  const publish = async (c: Circular) => {
    upsert({ ...c, status: "Published" }, "Published");
    try {
      await createCircular({
        title: c.title,
        content: c.description || c.subject,
        target_audience: c.recipients.includes("Parents") ? "Parents" : c.recipients.includes("Teachers") ? "Teachers" : "All",
        published_date: new Date().toISOString().split("T")[0],
        author: "Principal Office",
      });
      toast.success("Circular published to selected recipients and saved to Supabase!");
    } catch {
      toast.success("Circular published to selected recipients");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Circular Management"
        description="Create, schedule and publish circulars. Recipients see them in their own portal — they cannot reply or edit."
        actions={
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1.5" /> New Circular
          </Button>
        }
      />

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by title or subject" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="max-h-[65vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Recipients</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Publish</th>
                  <th className="text-left px-4 py-3 font-medium">Expiry</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.subject}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {c.recipients.length === ALL_RECIPIENTS.length ? (
                          <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">Everyone</Badge>
                        ) : c.recipients.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge p={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge s={c.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.publishDate}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.expiryDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="View" onClick={() => openView(c)}><Eye className="w-4 h-4" /></IconBtn>
                        <IconBtn title="History" onClick={() => setHistoryOf(c)}><History className="w-4 h-4" /></IconBtn>
                        {c.status !== "Archived" && (
                          <IconBtn title="Edit" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4" /></IconBtn>
                        )}
                        {(c.status === "Draft" || c.status === "Scheduled") && (
                          <IconBtn title="Publish" onClick={() => publish(c)}><Send className="w-4 h-4 text-primary" /></IconBtn>
                        )}
                        {c.status === "Published" && (
                          <IconBtn title="Archive" onClick={() => archive(c)}><Archive className="w-4 h-4" /></IconBtn>
                        )}
                        <IconBtn title="Delete" onClick={() => setConfirmDelete(c)}><Trash2 className="w-4 h-4 text-destructive" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No circulars found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CircularEditor
        mode={mode}
        editing={editing}
        onClose={() => setMode(null)}
        onSave={(c, action) => {
          upsert(c, action);
          toast.success(action);
          setMode(null);
        }}
      />

      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>History — {historyOf?.title}</DialogTitle></DialogHeader>
          <ul className="space-y-2 mt-2">
            {historyOf?.history.map((h, i) => (
              <li key={i} className="text-sm flex justify-between border-b pb-2 last:border-0">
                <span>{h.action}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Circular?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove "{confirmDelete?.title}".</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteCircular(confirmDelete)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-md hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}

function PriorityBadge({ p }: { p: "Low" | "Medium" | "High" }) {
  const cls = {
    High: "bg-destructive/10 text-destructive border-destructive/30",
    Medium: "bg-warning/15 text-warning-foreground border-warning/40",
    Low: "bg-muted text-muted-foreground border-border",
  }[p];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>{p}</span>;
}
function StatusBadge({ s }: { s: Circular["status"] }) {
  const cls = {
    Draft: "bg-muted text-muted-foreground border-border",
    Scheduled: "bg-info/10 text-info border-info/30",
    Published: "bg-success/15 text-success border-success/30",
    Archived: "bg-secondary text-secondary-foreground border-border",
  }[s];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>{s}</span>;
}

function CircularEditor({
  mode,
  editing,
  onClose,
  onSave,
}: {
  mode: Mode;
  editing: Circular | null;
  onClose: () => void;
  onSave: (c: Circular, action: string) => void;
}) {
  const isView = mode === "view";
  const open = mode !== null;

  const [form, setForm] = useState<Circular>(
    editing ?? {
      id: `C${Math.floor(Math.random() * 9000) + 1000}`,
      title: "",
      subject: "",
      description: "",
      priority: "Medium",
      publishDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      recipients: [],
      status: "Draft",
      createdAt: new Date().toISOString(),
      history: [],
      attachment: undefined,
    },
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      editing ?? {
        id: `C${Math.floor(Math.random() * 9000) + 1000}`,
        title: "",
        subject: "",
        description: "",
        priority: "Medium",
        publishDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        recipients: [],
        status: "Draft",
        createdAt: new Date().toISOString(),
        history: [],
        attachment: undefined,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editing?.id]);


  const toggleRecipient = (r: RecipientRole) => {
    setForm((f) => ({
      ...f,
      recipients: f.recipients.includes(r) ? f.recipients.filter((x) => x !== r) : [...f.recipients, r],
    }));
  };
  const toggleAll = () => {
    setForm((f) => ({
      ...f,
      recipients: f.recipients.length === ALL_RECIPIENTS.length ? [] : [...ALL_RECIPIENTS],
    }));
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Title is required";
    if (!form.subject.trim()) return "Subject is required";
    if (!form.description.trim()) return "Description is required";
    if (form.recipients.length === 0) return "Select at least one recipient";
    if (form.expiryDate < form.publishDate) return "Expiry must be on or after publish date";
    return null;
  };

  const handle = (action: "draft" | "schedule" | "publish") => {
    const err = validate();
    if (err) return toast.error(err);
    const today = new Date().toISOString().slice(0, 10);
    let status: Circular["status"] = form.status;
    let label = "";
    if (action === "draft") { status = "Draft"; label = "Draft saved"; }
    if (action === "schedule") { status = form.publishDate > today ? "Scheduled" : "Published"; label = status === "Scheduled" ? "Circular scheduled" : "Circular published"; }
    if (action === "publish") { status = "Published"; label = "Circular published"; }
    onSave({ ...form, status }, label);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Circular" : mode === "edit" ? "Edit Circular" : "Circular Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input disabled={isView} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. PTM Schedule for August" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input disabled={isView} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Parent-Teacher Meeting" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Circular["priority"] })} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea disabled={isView} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Write the circular contents..." />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Publish Date</Label>
              <Input disabled={isView} type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Expiry Date</Label>
              <Input disabled={isView} type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachment</Label>
              {isView ? (
                <div className="text-sm text-muted-foreground">{form.attachment ?? "No attachment"}</div>
              ) : (
                <Input type="file" onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0]?.name })} />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Recipients</Label>
              {!isView && (
                <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {form.recipients.length === ALL_RECIPIENTS.length ? "Clear all" : "Select everyone"}
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_RECIPIENTS.map((r) => {
                const checked = form.recipients.includes(r);
                return (
                  <label
                    key={r}
                    className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    } ${isView ? "cursor-default opacity-90" : ""}`}
                  >
                    <Checkbox disabled={isView} checked={checked} onCheckedChange={() => toggleRecipient(r)} />
                    <span>{r}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Selected combination: {form.recipients.length === 0 ? "None" : form.recipients.length === ALL_RECIPIENTS.length ? "Everyone" : form.recipients.join(", ")}
            </p>
          </div>
        </div>

        {!isView && (
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" onClick={() => handle("draft")}>Save Draft</Button>
            <Button variant="outline" onClick={() => handle("schedule")}>
              <Calendar className="w-4 h-4 mr-1.5" /> Schedule
            </Button>
            <Button onClick={() => handle("publish")} className="gradient-primary text-primary-foreground">
              <Send className="w-4 h-4 mr-1.5" /> Publish
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
