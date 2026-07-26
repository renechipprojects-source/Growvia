import { createFileRoute } from "@tanstack/react-router";
import { PartyPopper, CalendarDays, MapPin } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { events } from "@/lib/admin-mock-data";

export const Route = createFileRoute("/admin/events")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Events — TinySteps ERP" }] }),
});

function EventsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Events" description="View upcoming and past school events." />
      <div className="shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Upcoming" value={events.filter((e) => e.status === "Upcoming").length} tone="info" icon={<PartyPopper className="h-5 w-5" />} />
          <StatCard label="Completed" value={events.filter((e) => e.status === "Completed").length} tone="success" icon={<PartyPopper className="h-5 w-5" />} />
          <StatCard label="This Month" value={4} icon={<CalendarDays className="h-5 w-5" />} />
          <StatCard label="Locations" value={5} icon={<MapPin className="h-5 w-5" />} />
        </div>
        <FilterBar
          searchPlaceholder="Search event..."
          filters={[{ label: "Status", options: ["Upcoming", "Completed"] }]}
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <Card key={e.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{e.type}</Badge>
                  <StatusBadge status={e.status} />
                </div>
                <CardTitle className="mt-2">{e.title}</CardTitle>
                <CardDescription>{e.date} · {e.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 via-sky-100 to-purple-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
