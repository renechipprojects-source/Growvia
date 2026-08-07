import { Bus, MapPinned } from "lucide-react";
import { ModuleLayout, type NavItem } from "./components/ModuleLayout";
import { VehiclesPage } from "./pages/Vehicles";
import { DriversPage } from "./pages/Drivers";
import { RoutesPage } from "./pages/Routes";
import { StudentAllocationPage } from "./pages/StudentAllocation";
import { useState } from "react";

function RoutesAndStudentsMerged({ readOnly }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"routes" | "students">("routes");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setSubTab("routes")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === "routes"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Bus Routes & Stops
        </button>
        <button
          onClick={() => setSubTab("students")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === "students"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Student Bus Assignments
        </button>
      </div>

      {subTab === "routes" ? <RoutesPage readOnly={readOnly} /> : <StudentAllocationPage readOnly={readOnly} />}
    </div>
  );
}

function BusesAndDriversMerged({ readOnly }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"buses" | "drivers">("buses");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setSubTab("buses")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === "buses"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Buses & Vehicles
        </button>
        <button
          onClick={() => setSubTab("drivers")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === "drivers"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Drivers & Staff
        </button>
      </div>

      {subTab === "buses" ? <VehiclesPage readOnly={readOnly} /> : <DriversPage readOnly={readOnly} />}
    </div>
  );
}

export function TransportModule({ readOnly = false }: { readOnly?: boolean } = {}) {
  const nav: NavItem[] = [
    {
      key: "routes-students",
      label: "Bus Routes & Students",
      icon: <MapPinned className="h-4 w-4" />,
      page: <RoutesAndStudentsMerged readOnly={readOnly} />,
    },
    {
      key: "buses-drivers",
      label: "Buses & Drivers",
      icon: <Bus className="h-4 w-4" />,
      page: <BusesAndDriversMerged readOnly={readOnly} />,
    },
  ];

  return (
    <ModuleLayout
      title="Transport Management"
      subtitle="School bus routes, student transport assignments, vehicles, and driver management."
      nav={nav}
    />
  );
}

export { VehiclesPage, RoutesPage, DriversPage, StudentAllocationPage };