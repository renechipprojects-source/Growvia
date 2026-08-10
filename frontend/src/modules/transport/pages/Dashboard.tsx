import { useState, useEffect, useCallback } from "react";
import { Bus, MapPinned, Users, GraduationCap, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import {
  getStoredVehicles,
  getStoredRoutes,
  getStoredDrivers,
  getStoredAllocations,
  syncTransportFromSupabase,
} from "../transportStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export function TransportDashboard() {
  const [vehicles, setVehicles] = useState(getStoredVehicles);
  const [routes, setRoutes] = useState(getStoredRoutes);
  const [drivers, setDrivers] = useState(getStoredDrivers);
  const [allocations, setAllocations] = useState(getStoredAllocations);

  const loadData = useCallback(() => {
    syncTransportFromSupabase().then(() => {
      setVehicles(getStoredVehicles());
      setRoutes(getStoredRoutes());
      setDrivers(getStoredDrivers());
      setAllocations(getStoredAllocations());
    });
  }, []);

  useAutoRefresh("transport", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Transport Dashboard" description="Fleet overview, route utilisation and live assignments." />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Vehicles" value={vehicles.length} icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Active Routes" value={routes.filter((r) => r.status === "Active").length} tone="success" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Drivers" value={drivers.length} tone="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Students Using Transport" value={allocations.length} tone="info" icon={<GraduationCap className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-1">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Fleet Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No vehicles registered in fleet yet.</div>
            ) : (
              vehicles.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{v.name} <span className="ml-2 font-mono text-xs text-muted-foreground">{v.number}</span></div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{v.capacity} seats</div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}