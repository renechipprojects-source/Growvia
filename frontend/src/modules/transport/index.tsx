import { Bus, MapPinned, Users } from "lucide-react";
import { ModuleLayout, type NavItem } from "./components/ModuleLayout";
import { VehiclesPage } from "./pages/Vehicles";
import { DriversPage } from "./pages/Drivers";
import { RoutesPage } from "./pages/Routes";
import { StudentAllocationPage } from "./pages/StudentAllocation";
import { useState } from "react";

function OperationsAndFleetPage({ readOnly }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"routes" | "buses" | "drivers">("routes");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setSubTab("routes")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "routes"
              ? "bg-pink-600 text-white shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <MapPinned className="inline-block h-3.5 w-3.5 mr-1.5" />
          Bus Routes & Stops
        </button>
        <button
          type="button"
          onClick={() => setSubTab("buses")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "buses"
              ? "bg-pink-600 text-white shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Bus className="inline-block h-3.5 w-3.5 mr-1.5" />
          Buses & Vehicles
        </button>
        <button
          type="button"
          onClick={() => setSubTab("drivers")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "drivers"
              ? "bg-pink-600 text-white shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="inline-block h-3.5 w-3.5 mr-1.5" />
          Drivers & Staff
        </button>
      </div>

      {subTab === "routes" && <RoutesPage readOnly={readOnly} />}
      {subTab === "buses" && <VehiclesPage readOnly={readOnly} />}
      {subTab === "drivers" && <DriversPage readOnly={readOnly} />}
    </div>
  );
}

export function TransportModule({ readOnly = false }: { readOnly?: boolean } = {}) {
  const nav: NavItem[] = [
    {
      key: "operations-fleet",
      label: "1. Routes, Vehicles & Drivers",
      icon: <MapPinned className="h-4 w-4" />,
      page: <OperationsAndFleetPage readOnly={readOnly} />,
    },
    {
      key: "student-allocation",
      label: "2. Student Transport Allocation",
      icon: <Bus className="h-4 w-4" />,
      page: <StudentAllocationPage readOnly={readOnly} />,
    },
  ];

  return (
    <ModuleLayout
      title="Transport Management"
      subtitle="Manage transport routes, vehicles, drivers, and dynamic student transport allocations."
      nav={nav}
    />
  );
}

export { VehiclesPage, RoutesPage, DriversPage, StudentAllocationPage };