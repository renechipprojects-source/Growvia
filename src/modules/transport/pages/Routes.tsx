import { useState } from "react";
import { MapPinned, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { routes as initialRoutes } from "../data/mockData";
import type { Route } from "../types";

const columns: Column<Route>[] = [
  { key: "name", header: "Route", cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: "pickup", header: "Pickup Points", cell: (r) => <span className="text-sm">{r.pickupPoints.join(", ")}</span> },
  { key: "drop", header: "Drop Points", cell: (r) => <span className="text-sm">{r.dropPoints.join(", ")}</span> },
  { key: "distance", header: "Distance", cell: (r) => `${r.distanceKm} km` },
  { key: "vehicle", header: "Vehicle", cell: (r) => <span className="font-mono text-xs">{r.vehicle}</span> },
  { key: "driver", header: "Driver", cell: (r) => r.driver },
  { key: "students", header: "Assigned Students", cell: (r) => r.students },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterDef<Route>[] = [
  { key: "status", label: "Status", options: ["Active", "Inactive"], predicate: (r, v) => r.status === v },
];

export function RoutesPage({ readOnly }: { readOnly?: boolean }) {
  const [routeList, setRouteList] = useState<Route[]>(initialRoutes);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    pickup: "",
    drop: "",
    distanceKm: 12,
    vehicle: "KA-04-B-1001",
    driver: "Driver Name",
    students: 15,
  });

  const handleOpenAdd = () => {
    setForm({
      name: `Route #${routeList.length + 1}`,
      pickup: "Station A, Stop B",
      drop: "School Gate 1",
      distanceKm: 15,
      vehicle: "KA-04-B-1001",
      driver: "Assigned Driver",
      students: 10,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Route name is required.");
      return;
    }
    const newRoute: Route = {
      id: `RT-${Date.now().toString().slice(-4)}`,
      name: form.name,
      pickupPoints: form.pickup.split(",").map((s) => s.trim()).filter(Boolean),
      dropPoints: form.drop.split(",").map((s) => s.trim()).filter(Boolean),
      distanceKm: Number(form.distanceKm),
      vehicle: form.vehicle,
      driver: form.driver,
      students: Number(form.students),
      status: "Active",
    };
    setRouteList((prev) => [newRoute, ...prev]);
    toast.success(`Route ${form.name} created!`);
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setRouteList((prev) => prev.filter((r) => r.id !== id));
    toast.success(`Route ${name} deleted`);
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Routes"
        description="Manage transport routes and pickup / drop points."
        actions={!readOnly ? <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" />Add Route</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Routes" value={routeList.length} icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Active" value={routeList.filter((r) => r.status === "Active").length} tone="success" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Students on Transport" value={routeList.reduce((a, b) => a + b.students, 0)} tone="info" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Total Distance" value={`${routeList.reduce((a, b) => a + b.distanceKm, 0)} km`} icon={<MapPinned className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Route>
          data={routeList}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search route, driver, vehicle..."
          searchFields={["name", "driver", "vehicle"]}
          filters={filters}
          actions={!readOnly ? (r) => (
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleDelete(r.id, r.name)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Route Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Route 5 - Indiranagar" />
            </div>
            <div>
              <Label>Pickup Points (comma separated)</Label>
              <Input value={form.pickup} onChange={(e) => setForm((f) => ({ ...f, pickup: e.target.value }))} placeholder="Stop A, Stop B, Stop C" />
            </div>
            <div>
              <Label>Drop Points (comma separated)</Label>
              <Input value={form.drop} onChange={(e) => setForm((f) => ({ ...f, drop: e.target.value }))} placeholder="School Main Gate" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vehicle</Label>
                <Input value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
              </div>
              <div>
                <Label>Distance (km)</Label>
                <Input type="number" value={form.distanceKm} onChange={(e) => setForm((f) => ({ ...f, distanceKm: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}