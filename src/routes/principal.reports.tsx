import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, FileText, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/principal/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Principal Portal" },
      { name: "description", content: "School reports across attendance, academics, admissions and staffing." },
    ],
  }),
  component: ReportsPage,
});

type Report = {
  id: string;
  title: string;
  category: "Attendance" | "Academic" | "Admissions" | "Staff" | "Financial";
  period: string;
  updated: string;
  size: string;
};

const reports: Report[] = [
  { id: "R1", title: "Monthly Student Attendance", category: "Attendance", period: "July 2026", updated: "2026-07-25", size: "1.2 MB" },
  { id: "R2", title: "Staff Attendance & Payroll Hours", category: "Staff", period: "July 2026", updated: "2026-07-25", size: "820 KB" },
  { id: "R3", title: "Term 1 Academic Performance", category: "Academic", period: "Term 1", updated: "2026-07-20", size: "3.4 MB" },
  { id: "R4", title: "New Admissions Funnel", category: "Admissions", period: "Q3", updated: "2026-07-18", size: "640 KB" },
  { id: "R5", title: "Fee Collection Summary", category: "Financial", period: "July 2026", updated: "2026-07-24", size: "980 KB" },
  { id: "R6", title: "Class-wise Strength Report", category: "Academic", period: "2026-27", updated: "2026-07-10", size: "410 KB" },
  { id: "R7", title: "Circular Delivery Report", category: "Attendance", period: "July 2026", updated: "2026-07-25", size: "220 KB" },
];

function ReportsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const mq = !q || r.title.toLowerCase().includes(q.toLowerCase());
        const mc = cat === "all" || r.category === cat;
        return mq && mc;
      }),
    [q, cat],
  );

  const download = (r: Report, kind: "PDF" | "Excel") => {
    const csvContent = `data:text/csv;charset=utf-8,Report Title,Category,Period,Last Updated,Size\n"${r.title}","${r.category}","${r.period}","${r.updated}","${r.size}"`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${r.title.toLowerCase().replace(/\s+/g, "_")}_${kind.toLowerCase()}.${kind === "Excel" ? "csv" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${kind} report downloaded: ${r.title}`);
  };

  return (
    <div className="w-full max-w-none">
      <PageHeader title="Reports" description="Browse, filter and export school reports as PDF or Excel." />

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search reports" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Attendance">Attendance</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Admissions">Admissions</SelectItem>
              <SelectItem value="Staff">Staff</SelectItem>
              <SelectItem value="Financial">Financial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="max-h-[65vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Report</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-left px-4 py-3 font-medium">Updated</th>
                  <th className="text-left px-4 py-3 font-medium">Size</th>
                  <th className="text-right px-4 py-3 font-medium">Export</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{r.category}</Badge></td>
                    <td className="px-4 py-3">{r.period}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.updated}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.size}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => download(r, "PDF")}>
                          <FileText className="w-4 h-4 mr-1.5" /> PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => download(r, "Excel")}>
                          <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No reports found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {reports.length} reports</span>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-1.5" /> Bulk export
          </Button>
        </div>
      </div>
    </div>
  );
}
