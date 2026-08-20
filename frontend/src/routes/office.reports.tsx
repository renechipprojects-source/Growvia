import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FileText, DollarSign, Users, Receipt } from "lucide-react";

export const Route = createFileRoute("/office/reports")({
  component: OfficeReportsPage,
  head: () => ({ meta: [{ title: "Institutional Reports — Sunshine Play School" }] }),
});

function OfficeReportsPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-4">
      <PageHeader
        title="Office Reports & Summary Statements"
        description="Comprehensive reports for admissions, daily fee collection, expense statements, and student rosters."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Admission Statements" value="Ready" tone="info" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Daily Fee Collection" value="Active" tone="success" icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Expense Ledger" value="Updated" tone="warning" icon={<Receipt className="h-5 w-5" />} />
      </div>
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-base mb-2">Available Reports</h3>
        <p className="text-xs text-slate-500">Exportable CSV and summary reports are generated directly within the Fee Collection, Admissions, and Operating Expenses modules.</p>
      </div>
    </div>
  );
}
