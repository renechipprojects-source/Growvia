import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PartyPopper, CalendarDays, MapPin } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { events as initialEvents } from "@/lib/admin-mock-data";
import { fetchEvents } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/events")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Events — Sunshine ERP" }] }),
});

function EventsPage() {
  const [eventsList, setEventsList] = useState<any[]>(initialEvents);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

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
    <div className="flex h-full min-h-0 flex-col">
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
              <Card key={e.id} className="rounded-2xl transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{e.type}</Badge>
                    <StatusBadge status={e.status} />
                  </div>
                  <CardTitle className="mt-2">{e.title}</CardTitle>
                  <CardDescription>{e.date} · {e.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 via-sky-100 to-purple-100 flex items-center justify-center p-4 text-center">
                    <PartyPopper className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
