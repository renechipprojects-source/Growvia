import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { drivers } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { Driver } from "../types";

const columns: Column<Driver>[] = [
  { key: "name", header: "Driver Name", cell: (d) => <span className="font-medium">{d.name}</span> },
  { key: "emp", header: "Employee ID", cell: (d) => <span className="font-mono text-xs">{d.employeeId}</span> },
  { key: "mobile", header: "Mobile", cell: (d) => d.mobile },
  { key: "license", header: "License", cell: (d) => <span className="font-mono text-xs">{d.license}</span> },
  { key: "expiry", header: "License Expiry", cell: (d) => shortDate(d.licenseExpiry) },
  { key: "vehicle", header: "Vehicle", cell: (d) => <span className="font-mono text-xs">{d.vehicle}</span> },
  { key: "route", header: "Route", cell: (d) => d.route },
  { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
];

const filters: FilterDef<Driver>[] = [
  { key: "status", label: "Status", options: ["Active", "On Leave", "Inactive"], predicate: (r, v) => r.status === v },
];

export function DriversPage({ readOnly }: { readOnly?: boolean }) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Drivers"
        description="Driver roster, license and assignment."
        actions={!readOnly ? <Button><Plus className="mr-2 h-4 w-4" />Add Driver</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Drivers" value={drivers.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active" value={drivers.filter((d) => d.status === "Active").length} tone="success" icon={<Users className="h-5 w-5" />} />
        <StatCard label="On Leave" value={drivers.filter((d) => d.status === "On Leave").length} tone="warning" icon={<Users className="h-5 w-5" />} />
        <StatCard label="License Expiring Soon" value={drivers.filter((d) => new Date(d.licenseExpiry) < new Date("2027-01-01")).length} tone="danger" icon={<Users className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Driver>
          data={drivers}
          columns={columns}
          rowKey={(d) => d.id}
          searchPlaceholder="Search driver, ID, license..."
          searchFields={["name", "employeeId", "license", "mobile"]}
          filters={filters}
          onAdd={!readOnly ? () => {} : undefined}
          addLabel="Add Driver"
          actions={!readOnly ? () => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ) : undefined}
        />
      </div>
    </div>
  );
}