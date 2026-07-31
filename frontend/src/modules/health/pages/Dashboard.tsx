import { Users, HeartPulse, Syringe, AlertTriangle, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { healthRecords, vaccinations, healthAlerts, medicalVisits } from "../data/mockData";
import { shortDate } from "../utils/format";

export function HealthDashboard() {
  const dueVax = vaccinations.filter((v) => new Date(v.nextDueDate) <= new Date("2026-12-31")).length;
  const criticalAlerts = healthAlerts.filter((a) => a.severity === "Critical").length;
  const recentVisits = medicalVisits.slice(0, 5);
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Health Dashboard" description="Health records, vaccinations, alerts and recent medical visits." />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={healthRecords.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Health Records" value={healthRecords.length} tone="info" icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="Vaccinations Due" value={dueVax} tone="warning" icon={<Syringe className="h-5 w-5" />} />
        <StatCard label="Medical Alerts" value={criticalAlerts} tone="danger" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Sick Students" value={medicalVisits.filter((v) => v.followUpDate && v.followUpDate !== "—").length} tone="warning" icon={<Thermometer className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle>Recent Medical Visits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentVisits.map((v) => (
              <div key={v.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{v.student}</div>
                  <span className="text-xs text-muted-foreground">{shortDate(v.visitDate)}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{v.complaint} · <span className="text-foreground">{v.diagnosis}</span></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Critical Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {healthAlerts.filter((a) => a.severity === "Critical").slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.student}</div>
                  <StatusBadge status={a.category} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
