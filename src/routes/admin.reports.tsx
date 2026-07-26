import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — TinySteps ERP" }] }),
});

const reports = [
  { name: "Admissions Report", desc: "New admissions across months", format: "PDF / CSV" },
  { name: "Attendance Report", desc: "Daily & monthly attendance", format: "PDF / CSV" },
  { name: "Fee Collection", desc: "Revenue by class and method", format: "PDF / CSV" },
  { name: "Outstanding Fees", desc: "Overdue students and amounts", format: "PDF / CSV" },
  { name: "Revenue Report", desc: "Financial summary", format: "PDF" },
  { name: "Student Report", desc: "Complete student directory", format: "CSV" },
  { name: "Teacher Report", desc: "Staff performance and attendance", format: "PDF" },
  { name: "Inventory Report", desc: "Stock levels and purchases", format: "CSV" },
];

function ReportsPage() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fmt = filterValues["Format"];
    return reports.filter((r) => {
      if (q && !`${r.name} ${r.desc}`.toLowerCase().includes(q)) return false;
      if (fmt && fmt !== "all" && !r.format.includes(fmt)) return false;
      return true;
    });
  }, [search, filterValues]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Reports" description="Generate and export reports across every module." />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search report..."
          filters={[{ label: "Format", options: ["PDF", "CSV"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((r) => (
            <Card key={r.name} className="rounded-2xl transition hover:shadow-md">
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                <CardTitle className="text-base">{r.name}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.format}</span>
                <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
