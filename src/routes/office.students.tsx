import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { STUDENTS, type Student } from "@/lib/mockData";
import { fetchStudents } from "@/lib/supabaseService";
import { StudentProfileModal } from "@/components/students/StudentProfileModal";
import { PromotionWizardModal } from "@/components/students/PromotionWizardModal";
import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, GraduationCap, Sparkles } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/office/students")({ component: OfficeStudents });

import { useAutoRefresh } from "@/lib/autoRefreshContext";

function OfficeStudents() {
  const [data, setData] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openPromotionModal, setOpenPromotionModal] = useState(false);

  const loadStudents = useCallback(() => {
    return fetchStudents().then(({ data: fetched }) => {
      setData(fetched && fetched.length > 0 ? fetched : STUDENTS);
    });
  }, []);

  useAutoRefresh("students", loadStudents);

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
    {
      header: "Actions",
      id: "actions",
      cell: (c) => {
        const s = c.row.original;
        return (
          <Button size="sm" variant="outline" onClick={() => setSelectedStudent(s)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View Profile
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3">
      <div className="shrink-0">
        <PageHeader
          title="Students Directory & Promotion Engine"
          subtitle="Directory of enrolled students, parents, fee ledgers, and academic session promotions."
          action={
            <Button
              onClick={() => setOpenPromotionModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs shadow-md font-semibold px-4 py-2"
            >
              <GraduationCap className="mr-2 h-4 w-4" /> Annual Promotion Wizard
            </Button>
          }
        />
      </div>

      <div className="flex-1 min-h-0">
        <DataTable data={data} columns={cols} searchKey="name" fillParent />
      </div>

      <StudentProfileModal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />

      <PromotionWizardModal
        open={openPromotionModal}
        onClose={() => setOpenPromotionModal(false)}
        onPromoteSuccess={loadStudents}
      />
    </div>
  );
}
