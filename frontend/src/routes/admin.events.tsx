import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PartyPopper, CalendarDays, MapPin, Eye, Clock, Users, Sparkles } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fetchEvents, createEvent, updateEvent, deleteEvent, type SchoolEvent } from "@/lib/supabaseService";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/events")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Events — Admin Portal" }] }),
});

function EventsPage() {
  const [eventsList, setEventsList] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Add / Edit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    location: "Main Auditorium",
    type: "Academic" as const,
  });

  const loadEvents = async () => {
    try {
      const { data } = await fetchEvents();
      setEventsList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const handleRefresh = () => loadEvents();
    window.addEventListener("sunshine-auto-refresh-events", handleRefresh);
    window.addEventListener("sunshine-auto-refresh", handleRefresh);
    return () => {
      window.removeEventListener("sunshine-auto-refresh-events", handleRefresh);
      window.removeEventListener("sunshine-auto-refresh", handleRefresh);
    };
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      location: "Main Auditorium",
      type: "Academic",
    });
    setDialogOpen(true);
  };

  const openEdit = (e: SchoolEvent) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description || "",
      date: e.date,
      time: e.time || "09:00",
      location: e.location || "Main Auditorium",
      type: (e.type as any) || "Academic",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Event title is required.");
      return;
    }
    try {
      if (editingId) {
        await updateEvent(editingId, form);
        toast.success("Event updated.");
      } else {
        await createEvent({ ...form, audience: ["All"] as any });
        toast.success("Event created.");
      }
      setDialogOpen(false);
      loadEvents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save event.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(id);
        toast.success("Event deleted.");
        loadEvents();
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete event.");
      }
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = filterValues["Status"];
    return eventsList.filter((e) => {
      if (q && !`${e.title} ${e.type} ${e.location}`.toLowerCase().includes(q)) return false;
      if (st && st !== "all" && e.status !== st) return false;
      return true;
    });
  }, [eventsList, search, filterValues]);

  const upcomingCount = eventsList.filter((e) => e.status === "Upcoming" || !e.status).length;
  const completedCount = eventsList.filter((e) => e.status === "Completed").length;
  const uniqueLocations = Array.from(new Set(eventsList.map((e) => e.location || "Main Campus"))).length;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none">
      <div className="flex items-center justify-between mb-2">
        <PageHeader title="Events" description="Manage school events, schedules, and activities." />
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Add New Event
        </Button>
      </div>
      
      <div className="shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Upcoming Events" value={upcomingCount} tone="info" icon={<PartyPopper className="h-5 w-5" />} />
          <StatCard label="Completed" value={completedCount} tone="success" icon={<PartyPopper className="h-5 w-5" />} />
          <StatCard label="Total Events" value={eventsList.length} icon={<CalendarDays className="h-5 w-5" />} />
          <StatCard label="Locations" value={uniqueLocations} icon={<MapPin className="h-5 w-5" />} />
        </div>
        <FilterBar
          searchPlaceholder="Search event title, type, location..."
          filters={[{ label: "Status", options: ["Upcoming", "Completed"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          hideExport={true}
        />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading school events...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No events found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <Card key={e.id} className="rounded-2xl transition-all hover:shadow-md flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{e.type || "Event"}</Badge>
                    <StatusBadge status={e.status || "Upcoming"} />
                  </div>
                  <CardTitle className="mt-2 text-lg font-bold">{e.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5" /> {e.date} · {e.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/15 via-sky-100 to-indigo-100 flex flex-col items-center justify-center p-4 text-center">
                    <Sparkles className="h-8 w-8 text-primary mb-1 animate-pulse" />
                    <span className="text-xs font-semibold text-primary/80">{e.title}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                    {e.description || "School event scheduled for campus students and guardians."}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs font-medium"
                    onClick={() => setSelectedEvent(e)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-slate-600 hover:text-indigo-600"
                    onClick={() => openEdit(e)}
                    title="Edit Event"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-slate-600 hover:text-rose-600"
                    onClick={() => handleDelete(e.id)}
                    title="Delete Event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Event Details Dialog Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedEvent?.type || "Event"}</Badge>
              <StatusBadge status={selectedEvent?.status || "Upcoming"} />
            </div>
            <DialogTitle className="mt-2 text-xl font-bold">{selectedEvent?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              Full details and schedule information.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 text-sm mt-2">
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="font-semibold">Date & Time:</span> {selectedEvent.date || "15 Aug 2026"}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span className="font-semibold">Location:</span> {selectedEvent.location || "Main Auditorium"}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span className="font-semibold">Audience:</span> {selectedEvent.audience || "All Students & Parents"}</div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</h4>
                <p className="text-xs leading-relaxed text-foreground rounded-lg bg-card border p-3">
                  {selectedEvent.description || "Grand annual day cultural extravaganza featuring music, drama, dance performances, student talent showcases, and annual academic award presentations."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Event Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? "Edit School Event" : "Create New School Event"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Event Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Annual Sports Day 2026"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Event description and details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                <Input
                  value={form.time}
                  onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                  placeholder="09:00 AM"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Location / Venue</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Main Auditorium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                <Select
                  value={form.type}
                  onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Cultural">Cultural</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingId ? "Save Event Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
