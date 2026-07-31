import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/office/receipts")({
  component: ReceiptsPage,
});

import { useDeveloperSettings } from "@/lib/developerSettingsStore";

function ReceiptsPage() {
  const [list, setList] = useState<any[]>([]);
  const { settings } = useDeveloperSettings();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("SUNSHINE_RECEIPTS");
        if (raw) {
          const stored = JSON.parse(raw);
          if (Array.isArray(stored)) {
            const mapped = stored.map((s: any) => ({
              id: s.receiptNo || s.id,
              receiptNo: s.receiptNo,
              studentName: s.studentName,
              amount: s.amountPaid || s.amount || 0,
              mode: s.method || s.mode || "Cash",
              date: s.date,
              collectedBy: s.collectedBy || "Office",
            }));
            setList(mapped);
          }
        }
      } catch (err) {
        console.warn("Error loading stored receipts:", err);
      }
    }
  }, []);

  const cols: ColumnDef<any>[] = [
    { accessorKey: "receiptNo", header: "Receipt #" },
    { accessorKey: "studentName", header: "Student" },
    {
      accessorKey: "amount",
      header: "Amount Paid",
      cell: (c) => <span className="font-semibold text-emerald-700">₹{(c.getValue<number>() || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: "mode",
      header: "Mode",
      cell: (c) => <Badge variant="secondary">{c.getValue<string>() || "Cash"}</Badge>,
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "collectedBy", header: "Collected By" },
    {
      id: "action",
      header: "",
      cell: () => (
        <Button size="sm" variant="ghost" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title={settings.branding.receiptHeader} subtitle={`All fee collections and generated payment receipts for ${settings.branding.schoolName}.`} />
      </div>
      <div className="flex-1 min-h-0">
        <DataTable data={list} columns={cols} searchKey="studentName" fillParent />
      </div>
    </div>
  );
}
