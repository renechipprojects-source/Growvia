import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { DataTable } from "@/components/DataTable";
import { type Student } from "@/lib/mockData";
import { fetchStudents } from "@/lib/supabaseService";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { healthRecords } from "@/modules/health/data/mockData";
import { NotificationService } from "@/lib/notifications";
import type { HealthRecord } from "@/modules/health/types";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/office/students")({ component: OfficeStudents });

function OfficeStudents() {
  const [data, setData] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [healthForm, setHealthForm] = useState<Partial<HealthRecord>>({
    bloodGroup: "O+",
    heightCm: 115,
    weightKg: 20,
    allergies: "None",
    medicalConditions: "None",
    doctor: "Dr. Mehta",
    emergencyContact: "",
  });

  useEffect(() => {
    fetchStudents().then(({ data: fetched, isFromSupabase }) => {
      if (isFromSupabase) setData(fetched);
    });
  }, []);

  const openHealthModal = (student: Student) => {
    setEditingStudent(student);
    const existing = healthRecords.find(
      (h) => h.student.toLowerCase() === student.name.toLowerCase() || h.admissionNumber === student.admissionNo
    );
    if (existing) {
      setHealthForm({ ...existing });
    } else {
      setHealthForm({
        bloodGroup: ((student as any).bloodGroup as any) || "O+",
        heightCm: 115,
        weightKg: 20,
        allergies: "None",
        medicalConditions: "None",
        doctor: "Family Doctor",
        emergencyContact: student.phone || "",
      });
    }
  };

  const handleSaveHealthRecord = () => {
    if (!editingStudent) return;

    const index = healthRecords.findIndex(
      (h) => h.student.toLowerCase() === editingStudent.name.toLowerCase() || h.admissionNumber === editingStudent.admissionNo
    );

    const updatedRecord: HealthRecord = {
      id: index >= 0 ? healthRecords[index].id : `H-${Date.now().toString().slice(-4)}`,
      student: editingStudent.name,
      admissionNumber: editingStudent.admissionNo || "ADM-2026",
      bloodGroup: (healthForm.bloodGroup as any) || "O+",
      heightCm: Number(healthForm.heightCm || 115),
      weightKg: Number(healthForm.weightKg || 20),
      allergies: healthForm.allergies || "None",
      medicalConditions: healthForm.medicalConditions || "None",
      doctor: healthForm.doctor || "Family Doctor",
      emergencyContact: healthForm.emergencyContact || editingStudent.phone,
      lastCheckup: new Date().toISOString().slice(0, 10),
    };

    if (index >= 0) {
      healthRecords[index] = updatedRecord;
    } else {
      healthRecords.unshift(updatedRecord);
    }

    NotificationService.healthAlert(
      editingStudent.name,
      `Blood Group: ${updatedRecord.bloodGroup}, Allergies: ${updatedRecord.allergies}, Conditions: ${updatedRecord.medicalConditions}`
    );
    toast.success(`Updated Medical Record for ${editingStudent.name}`);
    setEditingStudent(null);
  };

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
          <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => openHealthModal(s)}>
            <HeartPulse className="mr-1.5 h-3.5 w-3.5 text-rose-600" /> Edit Health Record
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Students" subtitle="Manage enrolled students and medical records linked with admissions." />
      </div>
      <div className="flex-1 min-h-0">
        <DataTable data={data} columns={cols} searchKey="name" fillParent />
      </div>

      {/* Edit Health Record Dialog (Office Exclusive Editable Controls) */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-900">
              <HeartPulse className="h-5 w-5 text-rose-600" /> Edit Health Record — {editingStudent?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Blood Group</Label>
                <Select value={healthForm.bloodGroup || "O+"} onValueChange={(v) => setHealthForm((p) => ({ ...p, bloodGroup: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  value={healthForm.heightCm || ""}
                  onChange={(e) => setHealthForm((p) => ({ ...p, heightCm: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={healthForm.weightKg || ""}
                  onChange={(e) => setHealthForm((p) => ({ ...p, weightKg: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Doctor / Pediatrician</Label>
                <Input
                  value={healthForm.doctor || ""}
                  onChange={(e) => setHealthForm((p) => ({ ...p, doctor: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Known Allergies</Label>
              <Input
                value={healthForm.allergies || ""}
                onChange={(e) => setHealthForm((p) => ({ ...p, allergies: e.target.value }))}
                placeholder="e.g. Peanuts, Dust, None"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Medical Conditions / Illness</Label>
              <Input
                value={healthForm.medicalConditions || ""}
                onChange={(e) => setHealthForm((p) => ({ ...p, medicalConditions: e.target.value }))}
                placeholder="e.g. Asthma, Diabetes, None"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Emergency Medical Phone</Label>
              <Input
                value={healthForm.emergencyContact || ""}
                onChange={(e) => setHealthForm((p) => ({ ...p, emergencyContact: e.target.value }))}
                placeholder="+91 98000 00000"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleSaveHealthRecord}>
              Save Health Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
