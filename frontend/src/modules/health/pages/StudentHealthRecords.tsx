import { useState, useEffect } from "react";
import { HeartPulse, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { healthRecords as initialData } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { HealthRecord } from "../types";

const KEY = "sunshine.health.records.v1";

export function StudentHealthRecordsPage() {
  const [data, setData] = useState<HealthRecord[]>(() => {
    if (typeof window === "undefined") return initialData;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : initialData;
    } catch {
      return initialData;
    }
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);

  const [form, setForm] = useState<Omit<HealthRecord, "id">>({
    student: "",
    admissionNumber: "",
    bloodGroup: "O+",
    heightCm: 120,
    weightKg: 25,
    allergies: "None",
    medicalConditions: "None",
    doctor: "Dr. Mehta",
    emergencyContact: "",
    lastCheckup: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {}
    }
  }, [data]);

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({
      student: "",
      admissionNumber: "ADM-" + Math.floor(1000 + Math.random() * 9000),
      bloodGroup: "O+",
      heightCm: 120,
      weightKg: 25,
      allergies: "None",
      medicalConditions: "None",
      doctor: "Dr. Mehta",
      emergencyContact: "+91 98765 43210",
      lastCheckup: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const handleOpenEdit = (r: HealthRecord) => {
    setEditing(r);
    setForm(r);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this student health record?")) {
      setData((prev) => prev.filter((r) => r.id !== id));
      toast.success("Health record deleted");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student.trim()) return toast.error("Student name required");

    if (editing) {
      setData((prev) => prev.map((x) => (x.id === editing.id ? { ...form, id: editing.id } : x)));
      toast.success("Health record updated");
    } else {
      const newRec: HealthRecord = { ...form, id: "H-" + Date.now().toString().slice(-4) };
      setData((prev) => [newRec, ...prev]);
      toast.success("Health record added successfully");
    }
    setOpen(false);
  };

  const columns: Column<HealthRecord>[] = [
    { key: "student", header: "Student", cell: (r) => <span className="font-medium text-slate-800">{r.student}</span> },
    { key: "adm", header: "Admission No.", cell: (r) => <span className="font-mono text-xs">{r.admissionNumber}</span> },
    { key: "bg", header: "Blood Group", cell: (r) => <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{r.bloodGroup}</Badge> },
    { key: "h", header: "Height", cell: (r) => `${r.heightCm} cm` },
    { key: "w", header: "Weight", cell: (r) => `${r.weightKg} kg` },
    { key: "allergies", header: "Allergies", cell: (r) => <span className="text-sm">{r.allergies}</span> },
    { key: "conds", header: "Medical Conditions", cell: (r) => <span className="text-sm">{r.medicalConditions}</span> },
    { key: "doctor", header: "Doctor", cell: (r) => r.doctor },
    { key: "em", header: "Emergency Contact", cell: (r) => <span className="text-sm text-slate-600 font-mono">{r.emergencyContact}</span> },
    { key: "last", header: "Last Checkup", cell: (r) => shortDate(r.lastCheckup) },
  ];

  const filters: FilterDef<HealthRecord>[] = [
    { key: "bg", label: "Blood Group", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], predicate: (r, v) => r.bloodGroup === v },
  ];

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Student Health Records"
        description="Blood group, allergies, conditions and emergency contacts."
        actions={
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
            <Plus className="mr-2 h-4 w-4" /> Add Record
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Records" value={data.length} icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="With Allergies" value={data.filter((r) => r.allergies !== "—" && r.allergies !== "None").length} tone="warning" icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="Chronic Conditions" value={data.filter((r) => r.medicalConditions !== "—" && r.medicalConditions !== "None").length} tone="danger" icon={<HeartPulse className="h-5 w-5" />} />
        <StatCard label="Doctors" value={new Set(data.map((r) => r.doctor)).size} tone="info" icon={<HeartPulse className="h-5 w-5" />} />
      </div>

      <div className="mt-6">
        <DataTable<HealthRecord>
          data={data}
          columns={columns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search student, admission no, doctor..."
          searchFields={["student", "admissionNumber", "doctor", "allergies"]}
          filters={filters}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
            </div>
          )}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Health Record" : "Add Health Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label>Student Name</Label>
              <Input required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="e.g. Aarav Sharma" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Admission No</Label>
                <Input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value as any })} placeholder="e.g. O+" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Allergies</Label>
              <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Peanuts, Dust" />
            </div>
            <div>
              <Label>Medical Conditions</Label>
              <Input value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} placeholder="e.g. Asthma, None" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Doctor / Clinic</Label>
                <Input value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} />
              </div>
              <div>
                <Label>Emergency Contact</Label>
                <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 text-white">{editing ? "Save Changes" : "Create Record"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
