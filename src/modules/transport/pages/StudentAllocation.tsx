import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { allocations } from "../data/mockData";
import { currency } from "../utils/format";
import type { Allocation } from "../types";

const columns: Column<Allocation>[] = [
  { key: "student", header: "Student", cell: (a) => <span className="font-medium">{a.student}</span> },
  { key: "class", header: "Class", cell: (a) => a.className },
  { key: "section", header: "Section", cell: (a) => a.section },
  { key: "route", header: "Route", cell: (a) => a.route },
  { key: "pickup", header: "Pickup Point", cell: (a) => a.pickupPoint },
  { key: "drop", header: "Drop Point", cell: (a) => a.dropPoint },
  { key: "vehicle", header: "Vehicle", cell: (a) => <span className="font-mono text-xs">{a.vehicle}</span> },
  { key: "driver", header: "Driver", cell: (a) => a.driver },
  { key: "fee", header: "Monthly Fee", cell: (a) => currency(a.monthlyFee) },
];

const filters: FilterDef<Allocation>[] = [
  { key: "route", label: "Route", options: Array.from(new Set(allocations.map((a) => a.route))), predicate: (r, v) => r.route === v },
  { key: "class", label: "Class", options: Array.from(new Set(allocations.map((a) => a.className))), predicate: (r, v) => r.className === v },
];

export function StudentAllocationPage({ readOnly }: { readOnly?: boolean }) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Student Transport Allocation"
        description="Assign students to routes, vehicles and pickup points."
        actions={!readOnly ? <Button><Plus className="mr-2 h-4 w-4" />Allocate Student</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Allocated Students" value={allocations.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Routes in Use" value={new Set(allocations.map((a) => a.route)).size} tone="info" icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Est. Monthly Revenue" value={currency(allocations.reduce((s, a) => s + a.monthlyFee, 0))} tone="success" icon={<GraduationCap className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Allocation>
          data={allocations}
          columns={columns}
          rowKey={(a) => a.id}
          searchPlaceholder="Search student, route..."
          searchFields={["student", "route", "vehicle"]}
          filters={filters}
          onAdd={!readOnly ? () => {} : undefined}
          addLabel="Allocate Student"
        />
      </div>
    </div>
  );
}