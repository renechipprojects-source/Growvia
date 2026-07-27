import { HeartPulse, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { healthRecords } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { HealthRecord } from "../types";

const columns: Column<HealthRecord>[] = [
  { key: "student", header: "Student", cell: (r) => <span className="font-medium">{r.student}</span> },
  { key: "adm", header: "Admission No.", cell: (r) => <span className="font-mono text-xs">{r.admissionNumber}</span> },
  { key: "bg", header: "Blood Group", cell: (r) => <Badge variant="outline">{r.bloodGroup}</Badge> },
  { key: "h", header: "Height", cell: (r) => `${r.heightCm} cm` },
  { key: "w", header: "Weight", cell: (r) => `${r.weightKg} kg` },
  { key: "allergies", header: "Allergies", cell: (r) => <span className="text-sm">{r.allergies}</span> },
  { key: "conds", header: "Medical Conditions", cell: (r) => <span className="text-sm">{r.medicalConditions}</span> },
  { key: "doctor", header: "Doctor", cell: (r) => r.doctor },
  { key: "em", header: "Emergency Contact", cell: (r) => <span className="text-sm">{r.emergencyContact}</span> },
  { key: "last", header: "Last Checkup", cell: (r) => shortDate(r.lastCheckup) },
];

const filters: FilterDef<HealthRecord>[] = [
  { key: "bg", label: "Blood Group", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], predicate: (r, v) => r.bloodGroup === v },
  { key: "doctor", label: "Doctor", options: Array.from(new Set(healthRecords.map((r) => r.doctor))), predicate: (r, v) => r.doctor === v },
];

export function StudentHealthRecordsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Student Health Records" description="Blood group, allergies, conditions and emergency contacts."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Add Record</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Records" value={healthRecords.length} icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="With Allergies" value={healthRecords.filter((r) => r.allergies !== "—").length} tone="warning" icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="Chronic Conditions" value={healthRecords.filter((r) => r.medicalConditions !== "—").length} tone="danger" icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="Doctors" value={new Set(healthRecords.map((r) => r.doctor)).size} tone="info" icon={<HeartPulse className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<HealthRecord>
          data={healthRecords}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search student, admission no..."
          searchFields={["student", "admissionNumber", "doctor"]}
          filters={filters}
          onAdd={() => {}}
          addLabel="Add Record"
          actions={() => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
