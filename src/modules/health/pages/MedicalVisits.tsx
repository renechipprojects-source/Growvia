import { Stethoscope, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { medicalVisits } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { MedicalVisit } from "../types";

const columns: Column<MedicalVisit>[] = [
  { key: "student", header: "Student", cell: (v) => <span className="font-medium">{v.student}</span> },
  { key: "date", header: "Visit Date", cell: (v) => shortDate(v.visitDate) },
  { key: "complaint", header: "Complaint", cell: (v) => <span className="text-sm">{v.complaint}</span> },
  { key: "dx", header: "Diagnosis", cell: (v) => v.diagnosis },
  { key: "tx", header: "Treatment", cell: (v) => <span className="text-sm">{v.treatment}</span> },
  { key: "med", header: "Medicine", cell: (v) => <span className="text-sm">{v.medicine}</span> },
  { key: "doctor", header: "Doctor", cell: (v) => v.doctor },
  { key: "fu", header: "Follow-up", cell: (v) => v.followUpDate && v.followUpDate !== "—" ? shortDate(v.followUpDate) : "—" },
];

const filters: FilterDef<MedicalVisit>[] = [
  { key: "doctor", label: "Doctor", options: Array.from(new Set(medicalVisits.map((v) => v.doctor))), predicate: (r, v) => r.doctor === v },
];

export function MedicalVisitsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Medical Visits" description="Log of clinic visits, diagnosis and treatment."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Log Visit</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Visits" value={medicalVisits.length} icon={<Stethoscope className="h-5 w-5" />} />
        <StatCard label="With Follow-up" value={medicalVisits.filter((v) => v.followUpDate && v.followUpDate !== "—").length} tone="warning" icon={<Stethoscope className="h-5 w-5" />} />
        <StatCard label="Unique Students" value={new Set(medicalVisits.map((v) => v.student)).size} tone="info" icon={<Stethoscope className="h-5 w-5" />} />
        <StatCard label="Doctors" value={new Set(medicalVisits.map((v) => v.doctor)).size} icon={<Stethoscope className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<MedicalVisit>
          data={medicalVisits}
          columns={columns}
          rowKey={(v) => v.id}
          searchPlaceholder="Search student, diagnosis..."
          searchFields={["student", "complaint", "diagnosis", "doctor"]}
          filters={filters}
          onAdd={() => {}}
          addLabel="Log Visit"
        />
      </div>
    </div>
  );
}
