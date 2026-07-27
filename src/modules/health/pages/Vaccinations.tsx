import { Syringe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { vaccinations } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { Vaccination } from "../types";

const columns: Column<Vaccination>[] = [
  { key: "student", header: "Student", cell: (v) => <span className="font-medium">{v.student}</span> },
  { key: "vaccine", header: "Vaccine", cell: (v) => v.vaccine },
  { key: "dose", header: "Dose", cell: (v) => v.dose },
  { key: "date", header: "Vaccination Date", cell: (v) => shortDate(v.vaccinationDate) },
  { key: "next", header: "Next Due Date", cell: (v) => shortDate(v.nextDueDate) },
  { key: "hospital", header: "Hospital", cell: (v) => v.hospital },
  { key: "remarks", header: "Remarks", cell: (v) => <span className="text-sm text-muted-foreground">{v.remarks}</span> },
];

const filters: FilterDef<Vaccination>[] = [
  { key: "vaccine", label: "Vaccine", options: Array.from(new Set(vaccinations.map((v) => v.vaccine))), predicate: (r, v) => r.vaccine === v },
  { key: "hospital", label: "Hospital", options: Array.from(new Set(vaccinations.map((v) => v.hospital))), predicate: (r, v) => r.hospital === v },
];

export function VaccinationsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Vaccinations" description="Vaccination records and upcoming due dates."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Add Vaccination</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Records" value={vaccinations.length} icon={<Syringe className="h-5 w-5" />} />
        <StatCard label="Due (6 months)" value={vaccinations.filter((v) => new Date(v.nextDueDate) <= new Date("2026-12-31")).length} tone="warning" icon={<Syringe className="h-5 w-5" />} />
        <StatCard label="Vaccines Tracked" value={new Set(vaccinations.map((v) => v.vaccine)).size} tone="info" icon={<Syringe className="h-5 w-5" />} />
        <StatCard label="Hospitals" value={new Set(vaccinations.map((v) => v.hospital)).size} icon={<Syringe className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Vaccination>
          data={vaccinations}
          columns={columns}
          rowKey={(v) => v.id}
          searchPlaceholder="Search student, vaccine..."
          searchFields={["student", "vaccine", "hospital"]}
          filters={filters}
          onAdd={() => {}}
          addLabel="Add Vaccination"
        />
      </div>
    </div>
  );
}
