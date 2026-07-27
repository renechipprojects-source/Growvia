import { LayoutDashboard, Bus, MapPinned, Users, GraduationCap, Wallet, Wrench } from "lucide-react";
import { ModuleLayout, type NavItem } from "./components/ModuleLayout";
import { TransportDashboard } from "./pages/Dashboard";
import { VehiclesPage } from "./pages/Vehicles";
import { RoutesPage } from "./pages/Routes";
import { DriversPage } from "./pages/Drivers";
import { StudentAllocationPage } from "./pages/StudentAllocation";
import { TransportFeesPage } from "./pages/TransportFees";
import { VehicleMaintenancePage } from "./pages/VehicleMaintenance";

const nav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, page: <TransportDashboard /> },
  { key: "vehicles", label: "Vehicles", icon: <Bus className="h-4 w-4" />, page: <VehiclesPage /> },
  { key: "routes", label: "Routes", icon: <MapPinned className="h-4 w-4" />, page: <RoutesPage /> },
  { key: "drivers", label: "Drivers", icon: <Users className="h-4 w-4" />, page: <DriversPage /> },
  { key: "allocation", label: "Student Allocation", icon: <GraduationCap className="h-4 w-4" />, page: <StudentAllocationPage /> },
  { key: "fees", label: "Transport Fees", icon: <Wallet className="h-4 w-4" />, page: <TransportFeesPage /> },
  { key: "maintenance", label: "Vehicle Maintenance", icon: <Wrench className="h-4 w-4" />, page: <VehicleMaintenancePage /> },
];

export function TransportModule({ readOnly = false }: { readOnly?: boolean } = {}) {
  const nav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, page: <TransportDashboard /> },
    { key: "vehicles", label: "Vehicles", icon: <Bus className="h-4 w-4" />, page: <VehiclesPage readOnly={readOnly} /> },
    { key: "routes", label: "Routes", icon: <MapPinned className="h-4 w-4" />, page: <RoutesPage readOnly={readOnly} /> },
    { key: "drivers", label: "Drivers", icon: <Users className="h-4 w-4" />, page: <DriversPage readOnly={readOnly} /> },
    { key: "allocation", label: "Student Allocation", icon: <GraduationCap className="h-4 w-4" />, page: <StudentAllocationPage readOnly={readOnly} /> },
    { key: "fees", label: "Transport Fees", icon: <Wallet className="h-4 w-4" />, page: <TransportFeesPage readOnly={readOnly} /> },
    { key: "maintenance", label: "Vehicle Maintenance", icon: <Wrench className="h-4 w-4" />, page: <VehicleMaintenancePage readOnly={readOnly} /> },
  ];
  return <ModuleLayout title="Transport" subtitle="Fleet management & route allocation" nav={nav} />;
}

export { TransportDashboard, VehiclesPage, RoutesPage, DriversPage, StudentAllocationPage, TransportFeesPage, VehicleMaintenancePage };