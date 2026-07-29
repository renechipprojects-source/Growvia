import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Printer, Download, BarChart3, Filter } from "lucide-react";
import { useState } from "react";
import { exportToCSV } from "@/lib/exportUtils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

const REPORT_TYPES = [
  { id: "student-register", title: "Student Master Register", count: "124 Students" },
  { id: "staff-register", title: "Staff & Teacher Register", count: "18 Staff" },
  { id: "attendance-summary", title: "Monthly Attendance Summary", count: "96% Present Avg" },
  { id: "fee-collection", title: "Fee Collection & Outstanding Ledger", count: "₹8.5L Collected" },
  { id: "workload-report", title: "Teacher Workload & Allocation", count: "4 Teachers" },
  { id: "transport-manifest", title: "Transport Route & Bus Manifest", count: "3 Routes" },
  { id: "inventory-log", title: "Inventory Stock Ledger", count: "14 Items" },
  { id: "circular-stats", title: "Circular Delivery & Read Analytics", count: "12 Circulars" },
];

function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("student-register");
  const [format, setFormat] = useState("excel");

  const handleExport = (type: string) => {
    if (type === "student-register") {
      exportToCSV(
        "Student_Master_Register",
        ["Student ID", "Admission No", "Student Name", "Class", "Section", "Gender", "Parent Name", "Phone", "Status"],
        [
          ["STU1001", "ADM202601", "Aarav Sharma", "Nursery", "A", "Boy", "Rajesh Sharma", "+91 98765 43210", "Active"],
          ["STU1002", "ADM202602", "Diya Patel", "LKG", "A", "Girl", "Sanjay Patel", "+91 98765 43211", "Active"],
          ["STU1003", "ADM202603", "Vihaan Kumar", "UKG", "B", "Boy", "Ramesh Kumar", "+91 98765 43212", "Active"],
        ]
      );
      toast.success("Student Master Register exported to Excel/CSV!");
    } else if (type === "fee-collection") {
      exportToCSV(
        "Fee_Collection_Report",
        ["Receipt No", "Student Name", "Class", "Fee Component", "Amount", "Mode", "Date", "Status"],
        [
          ["REC-2026-001", "Aarav Sharma", "Nursery-A", "Tuition Fee Q1", "₹8,500", "Cash", "2026-07-28", "Paid"],
          ["REC-2026-002", "Diya Patel", "LKG-A", "Tuition Fee Q1", "₹8,500", "UPI", "2026-07-28", "Paid"],
        ]
      );
      toast.success("Fee Collection Report exported!");
    } else {
      exportToCSV(
        `Report_${type}`,
        ["ID", "Record Title", "Category", "Date Generated", "Status"],
        [["REC-101", `${type} Record #1`, "General", new Date().toISOString().slice(0, 10), "Verified"]]
      );
      toast.success(`${type} report exported successfully!`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Reports & Data Export Hub"
        subtitle="Generate, preview and export system-wide registers, ledgers, analytics, and summaries in Excel, PDF, or Print format."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelectedReport(r.id)}
            className={`p-4 rounded-2xl border transition cursor-pointer space-y-3 ${
              selectedReport === r.id ? "bg-indigo-50/70 border-indigo-300 shadow-md" : "bg-white border-slate-200 hover:border-indigo-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-white">
                {r.count}
              </Badge>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">{r.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Commercial Ready Export</div>
            </div>
          </div>
        ))}
      </div>

      <SectionCard title="Report Generation & Export Controls">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Selected Report:</span>{" "}
              <span className="font-bold text-slate-900 uppercase">{selectedReport.replace("-", " ")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleExport(selectedReport)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel/CSV
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="rounded-xl border-slate-200 bg-white">
                <Printer className="h-4 w-4 mr-2 text-slate-600" /> Print Report
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 overflow-x-auto">
            <table className="w-full text-xs bg-white rounded-xl overflow-hidden shadow-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 text-left">Record ID</th>
                  <th className="px-3 text-left">Entity Name / Description</th>
                  <th className="px-3 text-left">Category / Class</th>
                  <th className="px-3 text-left">Date</th>
                  <th className="px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold">REC-8001</td>
                  <td className="px-3 font-bold text-slate-900">Aarav Sharma</td>
                  <td className="px-3 text-slate-600">Nursery-A</td>
                  <td className="px-3 text-slate-500">{new Date().toISOString().slice(0, 10)}</td>
                  <td className="px-3 text-right"><Badge className="bg-emerald-100 text-emerald-800">Verified</Badge></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold">REC-8002</td>
                  <td className="px-3 font-bold text-slate-900">Diya Patel</td>
                  <td className="px-3 text-slate-600">LKG-A</td>
                  <td className="px-3 text-slate-500">{new Date().toISOString().slice(0, 10)}</td>
                  <td className="px-3 text-right"><Badge className="bg-emerald-100 text-emerald-800">Verified</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
