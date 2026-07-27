import { Bus, Wrench, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { vehicles } from "../data/mockData";
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
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Vehicles"
        description="Fleet, drivers and vehicle status."
        actions={!readOnly ? <Button><Plus className="mr-2 h-4 w-4" />Add Vehicle</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Vehicles" value={vehicles.length} icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Active" value={vehicles.filter((v) => v.status === "Active").length} tone="success" icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Maintenance" value={vehicles.filter((v) => v.status === "Maintenance").length} tone="warning" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Total Capacity" value={vehicles.reduce((a, b) => a + b.capacity, 0)} tone="info" icon={<Bus className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Vehicle>
          data={vehicles}
          columns={columns}
          rowKey={(v) => v.id}
          searchPlaceholder="Search vehicle number, name, driver..."
          searchFields={["number", "name", "driver", "route"]}
          filters={filters}
          onAdd={!readOnly ? () => {} : undefined}
          addLabel="Add Vehicle"
          actions={!readOnly ? () => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ) : undefined}
        />
      </div>
    </div>
  );
}