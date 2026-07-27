import { MapPinned, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { routes } from "../data/mockData";
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

export function RoutesPage() {
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader title="Routes" description="Manage transport routes and pickup / drop points."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Add Route</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Routes" value={routes.length} icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Active" value={routes.filter((r) => r.status === "Active").length} tone="success" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Students on Transport" value={routes.reduce((a, b) => a + b.students, 0)} tone="info" icon={<MapPinned className="h-5 w-5" />} />
        <StatCard label="Total Distance" value={`${routes.reduce((a, b) => a + b.distanceKm, 0)} km`} icon={<MapPinned className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Route>
          data={routes}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search route, driver, vehicle..."
          searchFields={["name", "driver", "vehicle"]}
          filters={filters}
          onAdd={() => {}}
          addLabel="Add Route"
        />
      </div>
    </div>
  );
}