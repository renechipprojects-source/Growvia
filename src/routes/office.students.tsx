import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { STUDENTS, type Student } from "@/lib/mockData";
import { fetchStudents } from "@/lib/supabaseService";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

const cols: ColumnDef<Student>[] = [
  { header: "ID", accessorKey: "id" },
  {
    header: "Student", accessorKey: "name",
    cell: (c) => {
      const s = c.row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9"><AvatarImage src={s.avatar} /><AvatarFallback>{s.name ? s.name[0] : "S"}</AvatarFallback></Avatar>
          <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.parent}</div></div>
        </div>
      );
    },
  },
  { accessorKey: "className", header: "Class" },
  { accessorKey: "admissionDate", header: "Joined" },
  {
    accessorKey: "feeStatus", header: "Fees",
    cell: (c) => {
      const v = c.getValue<string>();
      return <Badge className={v === "Paid" ? "bg-emerald-100 text-emerald-700" : v === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>{v || "Pending"}</Badge>;
    },
  },
  { accessorKey: "phone", header: "Phone" },
];

export const Route = createFileRoute("/office/students")({ component: OfficeStudents });

function OfficeStudents() {
  const [data, setData] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data: fetched, isFromSupabase }) => {
      if (isFromSupabase) setData(fetched);
    });
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Students" subtitle="Manage enrolled students." />
      </div>
      <div className="flex-1 min-h-0">
        <DataTable data={data} columns={cols} searchKey="name" fillParent />
      </div>
    </div>
  );
}
