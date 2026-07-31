import { useState } from "react";
import { Bus, Wrench, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { vehicles as initialVehicles } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { Vehicle } from "../types";

const columns: Column<Vehicle>[] = [
  { key: "number", header: "Vehicle Number", cell: (v) => <span className="font-mono text-xs">{v.number}</span> },
  { key: "name", header: "Vehicle Name", cell: (v) => <span className="font-medium">{v.name}</span> },
  { key: "type", header: "Type", cell: (v) => v.type },
  { key: "capacity", header: "Capacity", cell: (v) => `${v.capacity} seats` },
  { key: "driver", header: "Driver", cell: (v) => v.driver },
  { key: "route", header: "Route", cell: (v) => v.route },
  { key: "status", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
  { key: "lastService", header: "Last Service", cell: (v) => shortDate(v.lastService) },
  { key: "nextService", header: "Next Service", cell: (v) => shortDate(v.nextService) },
];

const filters: FilterDef<Vehicle>[] = [
  { key: "status", label: "Status", options: ["Active", "Inactive", "Maintenance"], predicate: (r, v) => r.status === v },
  { key: "type", label: "Type", options: ["Bus", "Van", "Mini Bus"], predicate: (r, v) => r.type === v },
];

export function VehiclesPage({ readOnly }: { readOnly?: boolean }) {
  const [vehicleList, setVehicleList] = useState<Vehicle[]>(initialVehicles);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const [form, setForm] = useState({
    number: "",
    name: "",
    type: "Bus" as Vehicle["type"],
    capacity: 30,
    driver: "",
    route: "",
    status: "Active" as Vehicle["status"],
  });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({
      number: `KA-04-B-${Math.floor(1000 + Math.random() * 8999)}`,
      name: `Yellow Bus #${vehicleList.length + 1}`,
      type: "Bus",
      capacity: 30,
      driver: "Driver Name",
      route: "Route 1",
      status: "Active",
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.number) {
      toast.error("Vehicle name and number are required.");
      return;
    }

    if (editing) {
      setVehicleList((prev) =>
        prev.map((v) => (v.id === editing.id ? { ...v, ...form } : v))
      );
      toast.success(`Vehicle ${form.name} updated!`);
    } else {
      const newVehicle: Vehicle = {
        id: `VEH-${Date.now().toString().slice(-4)}`,
        number: form.number,
        name: form.name,
        type: form.type,
        capacity: Number(form.capacity),
        driver: form.driver || "Unassigned",
        route: form.route || "Unassigned",
        status: form.status,
        lastService: new Date().toISOString().split("T")[0],
        nextService: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      };
      setVehicleList((prev) => [newVehicle, ...prev]);
      toast.success(`New vehicle ${form.name} added to fleet!`);
    }
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setVehicleList((prev) => prev.filter((v) => v.id !== id));
    toast.success(`Vehicle ${name} removed`);
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Vehicles"
        description="Fleet, drivers and vehicle status."
        actions={!readOnly ? <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Vehicles" value={vehicleList.length} icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Active" value={vehicleList.filter((v) => v.status === "Active").length} tone="success" icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Maintenance" value={vehicleList.filter((v) => v.status === "Maintenance").length} tone="warning" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Total Capacity" value={vehicleList.reduce((a, b) => a + b.capacity, 0)} tone="info" icon={<Bus className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Vehicle>
          data={vehicleList}
          columns={columns}
          rowKey={(v) => v.id}
          searchPlaceholder="Search vehicle number, name, driver..."
          searchFields={["number", "name", "driver", "route"]}
          filters={filters}
          actions={!readOnly ? (v) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit"
                onClick={() => {
                  setEditing(v);
                  setForm({
                    number: v.number,
                    name: v.name,
                    type: v.type,
                    capacity: v.capacity,
                    driver: v.driver,
                    route: v.route,
                    status: v.status,
                  });
                  setOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleDelete(v.id, v.name)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : undefined}
        />
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Vehicle Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Yellow Bus #1" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="e.g. KA-04-B-1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seat Capacity</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned Driver</Label>
                <Input value={form.driver} onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))} placeholder="Driver name" />
              </div>
              <div>
                <Label>Assigned Route</Label>
                <Input value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} placeholder="Route name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}