import { Ruler, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { bmiRecords } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { BMIRecord } from "../types";

export function BMIGrowthPage() {
  const [selected, setSelected] = useState<BMIRecord>(bmiRecords[0]);

  const columns: Column<BMIRecord>[] = [
    { key: "student", header: "Student", cell: (r) => (
      <button className="font-medium text-left hover:underline text-foreground" onClick={() => setSelected(r)}>{r.student}</button>
    ) },
    { key: "class", header: "Class", cell: (r) => r.className },
    { key: "h", header: "Height", cell: (r) => `${r.heightCm} cm` },
    { key: "w", header: "Weight", cell: (r) => `${r.weightKg} kg` },
    { key: "bmi", header: "BMI", cell: (r) => <span className="font-mono">{r.bmi}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "when", header: "Measured On", cell: (r) => shortDate(r.measuredOn) },
  ];
  const filters: FilterDef<BMIRecord>[] = [
    { key: "status", label: "Status", options: ["Underweight", "Normal", "Overweight", "Obese"], predicate: (r, v) => r.status === v },
    { key: "class", label: "Class", options: Array.from(new Set(bmiRecords.map((r) => r.className))), predicate: (r, v) => r.className === v },
  ];

  const maxBmi = Math.max(...selected.history.map((h) => h.bmi), 30);

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="BMI & Growth" description="Track height, weight, BMI and growth history."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Record Measurement</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students Tracked" value={bmiRecords.length} icon={<Ruler className="h-5 w-5" />} />
        <StatCard label="Normal" value={bmiRecords.filter((r) => r.status === "Normal").length} tone="success" icon={<Ruler className="h-5 w-5" />} />
        <StatCard label="Under/Overweight" value={bmiRecords.filter((r) => r.status === "Underweight" || r.status === "Overweight").length} tone="warning" icon={<Ruler className="h-5 w-5" />} />
        <StatCard label="Obese" value={bmiRecords.filter((r) => r.status === "Obese").length} tone="danger" icon={<Ruler className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable<BMIRecord>
            data={bmiRecords}
            columns={columns}
            rowKey={(r) => r.id}
            searchPlaceholder="Search student..."
            searchFields={["student", "className"]}
            filters={filters}
          />
        </div>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Growth History — {selected.student}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selected.history.map((h) => (
              <div key={h.date} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{shortDate(h.date)}</span>
                  <span className="text-muted-foreground">{h.heightCm} cm · {h.weightKg} kg · BMI {h.bmi}</span>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, (h.bmi / maxBmi) * 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-3 text-xs text-muted-foreground">Click a student in the table to view their growth history.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
