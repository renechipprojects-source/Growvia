import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/office/receipts")({
  component: ReceiptsPage,
});

import { useDeveloperSettings } from "@/lib/developerSettingsStore";

function ReceiptsPage() {
  const [list, setList] = useState<any[]>([]);
  const { settings } = useDeveloperSettings();

  useEffect(() => {
    async function loadReceiptsFromSupabase() {
      try {
        const { data, error } = await supabase
          .from("gv_fees_payments")
          .select("*")
          .eq("record_type", "payment")
          .order("date", { ascending: false });

        if (error || !data) return;

        const mapped = data.map((d: any) => ({
          id: d.id,
          receiptNo: d.id,
          studentName: d.student_name || "Student",
          amount: d.amount_paid || d.amount_due || 0,
          mode: d.payment_method || "Cash",
          date: d.date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          collectedBy: "Office",
        }));
        setList(mapped);
      } catch (err) {
        console.warn("Error loading receipts from Supabase:", err);
      }
    }
    loadReceiptsFromSupabase();
  }, []);

  const cols: ColumnDef<any>[] = [
    { accessorKey: "receiptNo", header: "Receipt #" },
    { accessorKey: "studentName", header: "Student" },
    {
      accessorKey: "amount",
      header: "Amount Paid",
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600">
          ₹{row.original.amount.toLocaleString()}
        </span>
      ),
    },
    { accessorKey: "mode", header: "Payment Mode", cell: ({ row }) => <Badge variant="outline">{row.original.mode}</Badge> },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "collectedBy", header: "Collected By" },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={() => alert(`Printing Receipt #${row.original.receiptNo}`)}>
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Receipts" subtitle="View and print official fee payment receipts" />
      <DataTable columns={cols} data={list} searchKey="studentName" searchPlaceholder="Search student or receipt..." />
    </div>
  );
}
