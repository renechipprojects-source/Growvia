import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { RECEIPTS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

const cols: ColumnDef<(typeof RECEIPTS)[number]>[] = [
  { accessorKey: "receiptNo", header: "Receipt #" },
  { accessorKey: "studentName", header: "Student" },
  { accessorKey: "amount", header: "Amount", cell: (c) => <span className="font-semibold">₹{c.getValue<number>().toLocaleString()}</span> },
  { accessorKey: "mode", header: "Mode", cell: (c) => <Badge variant="secondary">{c.getValue<string>()}</Badge> },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "collectedBy", header: "Collected by" },
  { id: "action", header: "", cell: () => <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button> },
];

export const Route = createFileRoute("/office/receipts")({
  component: () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Fee Receipts" subtitle="All collections, one place." />
      </div>
      <div className="flex-1 min-h-0">
        <DataTable data={RECEIPTS} columns={cols} searchKey="studentName" fillParent />
      </div>
    </div>
  ),
});
