import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { maintenance } from "../data/mockData";
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

const filters: FilterDef<Maintenance>[] = [
  { key: "type", label: "Service Type", options: Array.from(new Set(maintenance.map((m) => m.serviceType))), predicate: (r, v) => r.serviceType === v },
  { key: "vendor", label: "Vendor", options: Array.from(new Set(maintenance.map((m) => m.vendor))), predicate: (r, v) => r.vendor === v },
];

export function VehicleMaintenancePage({ readOnly }: { readOnly?: boolean }) {
  const totalCost = maintenance.reduce((s, m) => s + m.cost, 0);
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Vehicle Maintenance"
        description="Service history and upcoming service schedule."
        actions={!readOnly ? <Button><Plus className="mr-2 h-4 w-4" />Log Service</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Service Records" value={maintenance.length} icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Total Cost" value={currency(totalCost)} tone="warning" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Upcoming (30d)" value={maintenance.filter((m) => new Date(m.nextServiceDate) <= new Date("2026-08-01")).length} tone="info" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Vendors" value={new Set(maintenance.map((m) => m.vendor)).size} icon={<Wrench className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Maintenance>
          data={maintenance}
          columns={columns}
          rowKey={(m) => m.id}
          searchPlaceholder="Search vehicle, vendor, service..."
          searchFields={["vehicle", "vendor", "serviceType"]}
          filters={filters}
          onAdd={!readOnly ? () => {} : undefined}
          addLabel="Log Service"
        />
      </div>
    </div>
  );
}