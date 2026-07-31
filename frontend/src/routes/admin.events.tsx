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
import { fetchEvents } from "@/lib/supabaseService";

const defaultSampleEvents = [
  {
    id: "EVT-ANNUAL-2026",
    title: "Annual Day Celebration 2026",
    type: "Cultural",
    date: "15 Aug 2026",
    location: "Main Auditorium",
    status: "Upcoming",
    audience: "All Students, Parents & Staff",
    description: "Grand annual day cultural extravaganza featuring music, drama, dance performances, student talent showcases, and annual academic award presentations.",
  },
];

export const Route = createFileRoute("/admin/events")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Events — Sunshine ERP" }] }),
});

function EventsPage() {
  const [eventsList, setEventsList] = useState<any[]>(defaultSampleEvents);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    fetchEvents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setEventsList(data);
      }
    });
  }, []);

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
      <PageHeader title="Events" description="View upcoming and past school events and activities." />
      
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
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No events matching your search criteria.</div>
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
                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-medium"
                    onClick={() => setSelectedEvent(e)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Full Details
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
    </div>
  );
}
