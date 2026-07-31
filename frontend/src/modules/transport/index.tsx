import { Bus, MapPinned, GraduationCap } from "lucide-react";
import { ModuleLayout, type NavItem } from "./components/ModuleLayout";
import { VehiclesPage } from "./pages/Vehicles";
import { DriversPage } from "./pages/Drivers";
import { RoutesPage } from "./pages/Routes";
import { StudentAllocationPage } from "./pages/StudentAllocation";
import { useState } from "react";

function VehicleAndDriverMerged({ readOnly }: { readOnly?: boolean }) {
  const [subTab, setSubTab] = useState<"vehicles" | "drivers">("vehicles");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setSubTab("vehicles")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === "vehicles" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Fleet Vehicles
        </button>
        <button
          onClick={() => setSubTab("drivers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === "drivers" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          Drivers Roster
        </button>
      </div>

      {subTab === "vehicles" ? <VehiclesPage readOnly={readOnly} /> : <DriversPage readOnly={readOnly} />}
    </div>
  );
}

export function TransportModule({ readOnly = false }: { readOnly?: boolean } = {}) {
  const nav: NavItem[] = [
    { key: "vehicles-drivers", label: "Vehicle & Driver", icon: <Bus className="h-4 w-4" />, page: <VehicleAndDriverMerged readOnly={readOnly} /> },
    { key: "routes", label: "Routes", icon: <MapPinned className="h-4 w-4" />, page: <RoutesPage readOnly={readOnly} /> },
    { key: "assignments", label: "Assignments", icon: <GraduationCap className="h-4 w-4" />, page: <StudentAllocationPage readOnly={readOnly} /> },
  ];
  return <ModuleLayout title="Transport Management" subtitle="Fleet management, driver roster & route assignments" nav={nav} />;
}

export { VehiclesPage, RoutesPage, DriversPage, StudentAllocationPage };