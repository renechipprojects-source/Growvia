import { LayoutDashboard, HeartPulse, Syringe, Stethoscope, AlertTriangle, Ruler, FileText } from "lucide-react";
import { ModuleLayout, type NavItem } from "./components/ModuleLayout";
import { HealthDashboard } from "./pages/Dashboard";
import { StudentHealthRecordsPage } from "./pages/StudentHealthRecords";
import { VaccinationsPage } from "./pages/Vaccinations";
import { MedicalVisitsPage } from "./pages/MedicalVisits";
import { HealthAlertsPage } from "./pages/HealthAlerts";
import { BMIGrowthPage } from "./pages/BMIGrowth";
import { HealthReportsPage } from "./pages/HealthReports";

const nav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, page: <HealthDashboard /> },
  { key: "records", label: "Health Records", icon: <HeartPulse className="h-4 w-4" />, page: <StudentHealthRecordsPage /> },
  { key: "vax", label: "Vaccinations", icon: <Syringe className="h-4 w-4" />, page: <VaccinationsPage /> },
  { key: "visits", label: "Medical Visits", icon: <Stethoscope className="h-4 w-4" />, page: <MedicalVisitsPage /> },
  { key: "alerts", label: "Health Alerts", icon: <AlertTriangle className="h-4 w-4" />, page: <HealthAlertsPage /> },
  { key: "bmi", label: "BMI & Growth", icon: <Ruler className="h-4 w-4" />, page: <BMIGrowthPage /> },
  { key: "reports", label: "Health Reports", icon: <FileText className="h-4 w-4" />, page: <HealthReportsPage /> },
];

export function HealthModule() {
  return <ModuleLayout title="Health" subtitle="Student wellbeing" nav={nav} />;
}

export { HealthDashboard, StudentHealthRecordsPage, VaccinationsPage, MedicalVisitsPage, HealthAlertsPage, BMIGrowthPage, HealthReportsPage };
