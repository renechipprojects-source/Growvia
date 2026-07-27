import { Wallet } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { transportFees } from "../data/mockData";
import { currency } from "../utils/format";
import type { TransportFee } from "../types";

const columns: Column<TransportFee>[] = [
  { key: "student", header: "Student", cell: (f) => <span className="font-medium">{f.student}</span> },
  { key: "route", header: "Route", cell: (f) => f.route },
  { key: "monthly", header: "Monthly Fee", cell: (f) => currency(f.monthlyFee) },
  { key: "paid", header: "Paid", cell: (f) => <span className="text-emerald-700">{currency(f.paid)}</span> },
  { key: "pending", header: "Pending", cell: (f) => <span className={f.pending > 0 ? "text-rose-700" : ""}>{currency(f.pending)}</span> },
  { key: "status", header: "Status", cell: (f) => <StatusBadge status={f.status} /> },
];

const filters: FilterDef<TransportFee>[] = [
  { key: "status", label: "Status", options: ["Paid", "Partial", "Due"], predicate: (r, v) => r.status === v },
  { key: "route", label: "Route", options: Array.from(new Set(transportFees.map((f) => f.route))), predicate: (r, v) => r.route === v },
];

export function TransportFeesPage({ readOnly }: { readOnly?: boolean } = {}) {
  const totalPaid = transportFees.reduce((s, f) => s + f.paid, 0);
  const totalPending = transportFees.reduce((s, f) => s + f.pending, 0);
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Transport Fees" description="Track transport fee collection by student and route." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={transportFees.length} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Collected" value={currency(totalPaid)} tone="success" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Pending" value={currency(totalPending)} tone="danger" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Fully Paid" value={transportFees.filter((f) => f.status === "Paid").length} tone="info" icon={<Wallet className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<TransportFee>
          data={transportFees}
          columns={columns}
          rowKey={(f) => f.id}
          searchPlaceholder="Search student, route..."
          searchFields={["student", "route"]}
          filters={filters}
        />
      </div>
    </div>
  );
}