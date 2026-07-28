import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { STUDENTS, type Student } from "@/lib/mockData";
import { fetchStudents } from "@/lib/supabaseService";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, GraduationCap, UserCheck, ShieldCheck, CreditCard } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/office/students")({ component: OfficeStudents });

function OfficeStudents() {
  const [data, setData] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents().then(({ data: fetched }) => {
      setData(fetched && fetched.length > 0 ? fetched : STUDENTS);
    });
  }, []);

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
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Students" subtitle="Directory of enrolled students, parents, fee ledgers and submitted records." />
      </div>
      <div className="flex-1 min-h-0">
        <DataTable data={data} columns={cols} searchKey="name" fillParent />
      </div>

      {/* Student Profile Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={selectedStudent.avatar} />
                      <AvatarFallback>{selectedStudent.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-base">{selectedStudent.name}</DialogTitle>
                      <div className="text-xs text-muted-foreground">ID: {selectedStudent.id} · Class {selectedStudent.className}</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Enrolled</Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs mt-2">
                {/* 1. Student Details */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" /> Student Details
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Date of Birth:</span> 12 Jan 2021</div>
                    <div><span className="text-muted-foreground">Gender:</span> Male</div>
                    <div><span className="text-muted-foreground">Blood Group:</span> O+</div>
                    <div><span className="text-muted-foreground">Joined On:</span> {selectedStudent.admissionDate || "2024-06-01"}</div>
                  </div>
                </div>

                {/* 2. Parent Details */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-600" /> Parent Details
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Parent Name:</span> {selectedStudent.parent}</div>
                    <div><span className="text-muted-foreground">Mobile Phone:</span> {selectedStudent.phone || "+91 98765 43210"}</div>
                    <div><span className="text-muted-foreground">Email Address:</span> parent@school.com</div>
                    <div><span className="text-muted-foreground">Address:</span> Bengaluru, Karnataka</div>
                  </div>
                </div>

                {/* 3. Class & Attendance */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Class & Attendance Summary
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Class & Section:</span> {selectedStudent.className} - A</div>
                    <div><span className="text-muted-foreground">Attendance Rate:</span> <span className="font-bold text-emerald-700">96% Present</span></div>
                  </div>
                </div>

                {/* 4. Fee Status */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-amber-600" /> Fee Ledger Status
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Annual Expected:</span> ₹8,500</div>
                    <div><span className="text-muted-foreground">Paid Amount:</span> ₹8,500</div>
                    <div><span className="text-muted-foreground">Pending Balance:</span> ₹0</div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Paid (3/3)</Badge></div>
                  </div>
                </div>

                {/* 5. Documents */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> Submitted Documents
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 rounded border bg-background flex justify-between"><span>Birth Certificate</span> <span className="text-emerald-600 font-bold">✓ Verified</span></div>
                    <div className="p-1.5 rounded border bg-background flex justify-between"><span>Immunization Card</span> <span className="text-emerald-600 font-bold">✓ Verified</span></div>
                    <div className="p-1.5 rounded border bg-background flex justify-between"><span>Address Proof</span> <span className="text-emerald-600 font-bold">✓ Verified</span></div>
                    <div className="p-1.5 rounded border bg-background flex justify-between"><span>Transfer Certificate</span> <span className="text-sky-600 font-bold">✓ Submitted</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
