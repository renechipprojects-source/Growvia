import { useState } from "react";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { maintenance as initialMaintenance } from "../data/mockData";
import { currency, shortDate } from "../utils/format";
import type { Maintenance } from "../types";

const columns: Column<Maintenance>[] = [
  { key: "vehicle", header: "Vehicle", cell: (m) => <span className="font-mono text-xs">{m.vehicle}</span> },
  { key: "serviceDate", header: "Service Date", cell: (m) => shortDate(m.serviceDate) },
  { key: "type", header: "Service Type", cell: (m) => <span className="font-medium">{m.serviceType}</span> },
  { key: "vendor", header: "Vendor", cell: (m) => m.vendor },
  { key: "cost", header: "Cost", cell: (m) => currency(m.cost) },
  { key: "next", header: "Next Service", cell: (m) => shortDate(m.nextServiceDate) },
  { key: "notes", header: "Notes", cell: (m) => <span className="text-sm text-muted-foreground">{m.notes}</span> },
];

export function VehicleMaintenancePage({ readOnly }: { readOnly?: boolean }) {
  const [maintenanceList, setMaintenanceList] = useState<Maintenance[]>(initialMaintenance);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    vehicle: "KA-04-B-1001",
    serviceType: "General Service",
    vendor: "Sri Sai Garage",
    cost: 4500,
    notes: "Oil change, brake pad inspection and air filter cleaning",
  });

  const handleOpenAdd = () => {
    setForm({
      vehicle: "KA-04-B-1001",
      serviceType: "General Service",
      vendor: "Sri Sai Garage",
      cost: 4500,
      notes: "Oil change, brake pad inspection and air filter cleaning",
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.serviceType) {
      toast.error("Service type is required.");
      return;
    }
    const newMaint: Maintenance = {
      id: `MNT-${Date.now().toString().slice(-4)}`,
      vehicle: form.vehicle,
      serviceDate: new Date().toISOString().split("T")[0],
      serviceType: form.serviceType,
      vendor: form.vendor,
      cost: Number(form.cost),
      nextServiceDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      notes: form.notes,
    };
    setMaintenanceList((prev) => [newMaint, ...prev]);
    toast.success(`Service record logged for vehicle ${form.vehicle}!`);
    setOpen(false);
  };

  const handleDelete = (id: string, vehicle: string) => {
    setMaintenanceList((prev) => prev.filter((m) => m.id !== id));
    toast.success(`Maintenance record for ${vehicle} deleted`);
  };

  const totalCost = maintenanceList.reduce((s, m) => s + m.cost, 0);

  const filters: FilterDef<Maintenance>[] = [
    { key: "type", label: "Service Type", options: Array.from(new Set(maintenanceList.map((m) => m.serviceType))), predicate: (r, v) => r.serviceType === v },
    { key: "vendor", label: "Vendor", options: Array.from(new Set(maintenanceList.map((m) => m.vendor))), predicate: (r, v) => r.vendor === v },
  ];

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Vehicle Maintenance"
        description="Service history and upcoming service schedule."
        actions={!readOnly ? <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" />Log Service</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Service Records" value={maintenanceList.length} icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Total Cost" value={currency(totalCost)} tone="warning" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Upcoming (30d)" value={maintenanceList.filter((m) => new Date(m.nextServiceDate) <= new Date("2026-08-01")).length} tone="info" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Vendors" value={new Set(maintenanceList.map((m) => m.vendor)).size} icon={<Wrench className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Maintenance>
          data={maintenanceList}
          columns={columns}
          rowKey={(m) => m.id}
          searchPlaceholder="Search vehicle, vendor, service..."
          searchFields={["vehicle", "vendor", "serviceType"]}
          filters={filters}
          onAdd={!readOnly ? handleOpenAdd : undefined}
          addLabel="Log Service"
          actions={!readOnly ? (m) => (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.vehicle)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Vehicle Maintenance Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vehicle Number</Label>
                <Input value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
              </div>
              <div>
                <Label>Service Type</Label>
                <Input value={form.serviceType} onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))} placeholder="e.g. Oil Change, Tyre Replacement" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor / Garage</Label>
                <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
              </div>
              <div>
                <Label>Service Cost (₹)</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Service Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Log Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}