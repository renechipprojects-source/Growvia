import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { eventsList as seedEvents } from "@/lib/principal-mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/principal/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar | Principal Portal" },
      { name: "description", content: "Interactive calendar to manage school events and holidays." },
    ],
  }),
  component: CalendarPage,
});

type CalEvent = {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string;
  location: string;
  description?: string;
};

const STORAGE_KEY = "sunshine.principal.calendar-events";

function loadEvents(): CalEvent[] {
  if (typeof window === "undefined") {
    return seedEvents.map((e) => ({ ...e, description: "" }));
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CalEvent[];
  } catch {
    /* ignore */
  }
  const initial: CalEvent[] = seedEvents.map((e) => ({
    id: e.id, title: e.title, date: e.date, time: e.time, location: e.location, description: "",
  }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1));
  const [events, setEvents] = useState<CalEvent[]>(() => loadEvents());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const { grid, monthLabel } = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startWeekday }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return { grid: cells, monthLabel: cursor.toLocaleDateString("en", { month: "long", year: "numeric" }) };
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [events]);

  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const openNew = useCallback((date?: string) => {
    setEditing({
      id: "",
      title: "",
      date: date ?? iso(new Date()),
      time: "09:00",
      location: "",
      description: "",
    });
    setDialogOpen(true);
  }, []);

  const openEdit = (e: CalEvent) => {
    setEditing(e);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!editing.date) {
      toast.error("Please pick a date.");
      return;
    }
    setEvents((list) => {
      if (editing.id) {
        return list.map((x) => (x.id === editing.id ? editing : x));
      }
      return [...list, { ...editing, id: `E-${Date.now()}` }];
    });
    toast.success(editing.id ? "Event updated" : "Event added");
    setDialogOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!editing?.id) return;
    setEvents((list) => list.filter((x) => x.id !== editing.id));
    toast.success("Event deleted");
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Calendar"
        description="Add, edit and delete school events — changes save immediately."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium min-w-40 text-center">{monthLabel}</div>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button onClick={() => openNew()} className="ml-2">
              <Plus className="w-4 h-4 mr-1" /> Add Event
            </Button>
          </div>
        }
      />

      <div className="card-elevated p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-muted/60 text-[11px] uppercase font-medium text-muted-foreground text-center py-2">{d}</div>
          ))}
          {grid.map((d, i) => {
            const dateStr = d ? iso(d) : "";
            const dayEvents = d ? eventsByDate.get(dateStr) ?? [] : [];
            const today = d && dateStr === iso(new Date());
            return (
              <div
                key={i}
                className={cn(
                  "bg-card min-h-24 md:min-h-28 p-2 text-xs relative group",
                  d ? "cursor-pointer hover:bg-muted/40 transition-colors" : "bg-muted/20",
                )}
                onClick={() => d && openNew(dateStr)}
              >
                {d && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        today ? "bg-primary text-primary-foreground" : "text-foreground",
                      )}>
                        {d.getDate()}
                      </div>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openEdit(e);
                          }}
                          className="w-full truncate text-left px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20"
                          title={`${e.title} · ${e.time}`}
                        >
                          {e.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing?.id ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing?.id ? "Edit Event" : "Add Event"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="ev-title">Title</Label>
                <Input
                  id="ev-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Sports Day"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ev-date">Date</Label>
                  <Input
                    id="ev-date"
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ev-time" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time</Label>
                  <Input
                    id="ev-time"
                    type="time"
                    value={/^\d{2}:\d{2}/.test(editing.time) ? editing.time.slice(0, 5) : "09:00"}
                    onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ev-loc">Location</Label>
                <Input
                  id="ev-loc"
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="e.g. Main Ground"
                />
              </div>
              <div>
                <Label htmlFor="ev-desc">Description</Label>
                <Textarea
                  id="ev-desc"
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Optional details…"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.id ? (
              <Button variant="destructive" onClick={handleDelete} type="button">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => { setDialogOpen(false); setEditing(null); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} type="button">Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
