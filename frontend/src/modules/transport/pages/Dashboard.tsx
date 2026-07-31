import { Bus, MapPinned, Users, GraduationCap, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { vehicles, routes, drivers, allocations, maintenance } from "../data/mockData";

export function TransportDashboard() {
  const maintenanceDue = maintenance.filter((m) => new Date(m.nextServiceDate) <= new Date("2026-08-01")).length;
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Transport Dashboard" description="Fleet overview, route utilisation and upcoming maintenance." />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Vehicles" value={vehicles.length} icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Active Routes" value={routes.filter((r) => r.status === "Active").length} tone="success" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Drivers" value={drivers.length} tone="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Students Using Transport" value={allocations.length} tone="info" icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Maintenance Due" value={maintenanceDue} tone="warning" icon={<Wrench className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle>Fleet Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {vehicles.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{v.name} <span className="ml-2 font-mono text-xs text-muted-foreground">{v.number}</span></div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{v.route} · {v.driver} · {v.capacity} seats</div>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Upcoming Maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {maintenance.slice(0, 5).map((m) => (
              <div key={m.id} className="rounded-xl border p-3">
                <div className="flex justify-between font-medium"><span className="font-mono text-xs">{m.vehicle}</span><span className="text-xs text-muted-foreground">{m.nextServiceDate}</span></div>
                <div className="mt-1 text-sm">{m.serviceType}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}