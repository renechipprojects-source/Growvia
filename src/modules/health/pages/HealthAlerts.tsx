import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { healthAlerts } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { HealthAlert } from "../types";

const groups: HealthAlert["category"][] = ["Allergy", "Chronic Disease", "Emergency Note", "Special Care"];

export function HealthAlertsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Health Alerts" description="Allergies, chronic diseases, emergency notes and special care flags." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Alerts" value={healthAlerts.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Critical" value={healthAlerts.filter((a) => a.severity === "Critical").length} tone="danger" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Monitoring" value={healthAlerts.filter((a) => a.severity === "Monitoring").length} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Resolved" value={healthAlerts.filter((a) => a.severity === "Resolved").length} tone="success" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const items = healthAlerts.filter((a) => a.category === g);
          return (
            <Card key={g} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{g}</CardTitle>
                <StatusBadge status={g} />
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 && <div className="text-sm text-muted-foreground">No alerts.</div>}
                {items.map((a) => (
                  <div key={a.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.student}</div>
                      <StatusBadge status={a.severity} />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{a.detail}</div>
                    <div className="mt-2 text-xs text-muted-foreground">Updated {shortDate(a.updated)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
