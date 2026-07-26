import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { payments } from "@/lib/admin-mock-data";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Payments — TinySteps ERP" }] }),
});

function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const m = filterValues["Method"];
    const st = filterValues["Status"];
    return payments.filter((p) => {
      if (q && !`${p.id} ${p.studentName} ${p.invoice}`.toLowerCase().includes(q)) return false;
      if (m && m !== "all" && p.method !== m) return false;
      if (st && st !== "all" && p.status !== st) return false;
      return true;
    });
  }, [search, filterValues]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Payments"
        description="View fee transactions across every student and payment method."
      />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search invoice, student, ID..."
          filters={[
            { label: "Method", options: ["Cash", "UPI", "Card", "Bank Transfer"] },
            { label: "Status", options: ["Success", "Pending", "Failed"] },
          ]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
        />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Payment ID", "Student", "Invoice", "Amount", "Method", "Date", "Status"]}
          total={filtered.length}
        >
          {filtered.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.id}</TableCell>
              <TableCell className="font-medium">{p.studentName}</TableCell>
              <TableCell className="font-mono text-xs">{p.invoice}</TableCell>
              <TableCell className="font-semibold">₹{p.amount.toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
              <TableCell className="text-sm">{p.date}</TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
