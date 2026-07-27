import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import {
  eventsList as seedEvents,
  ALL_EVENT_AUDIENCES,
  type EventItem,
  type EventAudience,
} from "@/lib/principal-mock-data";
import { MapPin, Clock, Tag, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/principal/events")({
  head: () => ({
    meta: [
      { title: "Events | Principal Portal" },
      { name: "description", content: "Create, edit, and delete school events with targeted audiences." },
      { property: "og:title", content: "Events | Principal Portal" },
      { property: "og:description", content: "Manage every scheduled school event." },
    ],
  }),
  component: EventsPage,
});

const typeColor: Record<EventItem["type"], string> = {
  Academic: "bg-info/10 text-info border-info/30",
  Cultural: "bg-primary/10 text-primary border-primary/30",
  Sports: "bg-success/15 text-success border-success/30",
  Holiday: "bg-warning/20 text-warning-foreground border-warning/40",
  Meeting: "bg-accent text-accent-foreground border-accent",
};

const EVENT_TYPES: EventItem["type"][] = ["Academic", "Cultural", "Sports", "Holiday", "Meeting"];

type FormState = Omit<EventItem, "id">;

const emptyForm: FormState = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00 AM",
  location: "",
  type: "Academic",
  audience: ["Teachers", "Parents"],
};

function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(seedEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description ?? "",
      date: e.date,
      time: e.time,
      location: e.location,
      type: e.type,
      audience: [...e.audience],
    });
    setDialogOpen(true);
  };

  const toggleAudience = (a: EventAudience, checked: boolean) => {
    setForm((f) => ({
      ...f,
      audience: checked ? [...new Set([...f.audience, a])] : f.audience.filter((x) => x !== a),
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.date) return toast.error("Date is required.");
    if (form.audience.length === 0) return toast.error("Select at least one audience.");

    if (editingId) {
      setEvents((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...form } : e)));
      toast.success("Event updated.");
    } else {
      const id = `E${Date.now().toString(36).toUpperCase()}`;
      setEvents((prev) => [...prev, { id, ...form }]);
      toast.success("Event added.");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    setEvents((prev) => prev.filter((e) => e.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    toast.success("Event deleted.");
  };

  return (
    <div className="w-full max-w-none flex h-full min-h-0 flex-col">
      <PageHeader
        title="Events"
        description="Create, edit and delete school events; choose the audience for each."
      />
      <div className="mb-4 flex items-center justify-between gap-2 shrink-0">
        <div className="text-sm text-muted-foreground">{sorted.length} event(s)</div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Event" : "Add New Event"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Venue</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as EventItem["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Audience</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ALL_EVENT_AUDIENCES.map((a) => {
                    const checked = form.audience.includes(a);
                    return (
                      <label
                        key={a}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleAudience(a, Boolean(v))}
                        />
                        {a}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any combination works. Select all four for “Everyone”.
                </p>
              </div>
              <div>
                <Label>Event Banner / Poster (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setForm({ ...form, image: ev.target.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="mt-1.5"
                />
                {form.image && (
                  <img src={form.image} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-xl border" />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingId ? "Save changes" : "Add event"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
          {sorted.map((e) => (
            <div key={e.id} className="card-elevated p-5 flex flex-col">
              {e.image && (
                <img src={e.image} alt={e.title} className="mb-3 h-32 w-full object-cover rounded-xl border shrink-0" />
              )}
              <div className="flex items-start gap-4">
                <div className="w-14 rounded-lg gradient-primary text-primary-foreground text-center py-2 shrink-0">
                  <div className="text-[10px] uppercase tracking-wide">
                    {new Date(e.date).toLocaleDateString("en", { month: "short" })}
                  </div>
                  <div className="text-xl font-semibold leading-tight">{new Date(e.date).getDate()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{e.title}</div>
                  {e.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</div>
                  )}
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {e.time}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {e.location}</div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeColor[e.type]}`}>
                        {e.type}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.audience.map((a) => (
                      <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(e.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
