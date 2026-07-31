import { useState } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { allocations as initialAllocations } from "../data/mockData";
import { currency } from "../utils/format";
import type { Allocation } from "../types";

const columns: Column<Allocation>[] = [
  { key: "student", header: "Student", cell: (a) => <span className="font-medium">{a.student}</span> },
  { key: "class", header: "Class", cell: (a) => a.className },
  { key: "section", header: "Section", cell: (a) => a.section },
  { key: "route", header: "Route", cell: (a) => a.route },
  { key: "pickup", header: "Pickup Point", cell: (a) => a.pickupPoint },
  { key: "drop", header: "Drop Point", cell: (a) => a.dropPoint },
  { key: "vehicle", header: "Vehicle", cell: (a) => <span className="font-mono text-xs">{a.vehicle}</span> },
  { key: "driver", header: "Driver", cell: (a) => a.driver },
  { key: "fee", header: "Monthly Fee", cell: (a) => currency(a.monthlyFee) },
];

export function StudentAllocationPage({ readOnly }: { readOnly?: boolean }) {
  const [allocationList, setAllocationList] = useState<Allocation[]>(initialAllocations);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    student: "",
    className: "Nursery",
    section: "A",
    route: "Route 1",
    pickupPoint: "Stop A",
    dropPoint: "School Gate 1",
    monthlyFee: 1500,
  });

  const handleOpenAdd = () => {
    setForm({
      student: `Aarav Sharma #${allocationList.length + 1}`,
      className: "Nursery",
      section: "A",
      route: "Route 1",
      pickupPoint: "Indiranagar Stop B",
      dropPoint: "School Main Gate",
      monthlyFee: 1500,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.student) {
      toast.error("Student name is required.");
      return;
    }
    const newAlloc: Allocation = {
      id: `ALC-${Date.now().toString().slice(-4)}`,
      student: form.student,
      className: form.className,
      section: form.section,
      route: form.route,
      pickupPoint: form.pickupPoint,
      dropPoint: form.dropPoint,
      vehicle: "KA-04-B-1001",
      driver: "Assigned Driver",
      monthlyFee: Number(form.monthlyFee),
    };
    setAllocationList((prev) => [newAlloc, ...prev]);
    toast.success(`Transport allocated for ${form.student}!`);
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setAllocationList((prev) => prev.filter((a) => a.id !== id));
    toast.success(`Transport allocation for ${name} removed`);
  };

  const filters: FilterDef<Allocation>[] = [
    { key: "route", label: "Route", options: Array.from(new Set(allocationList.map((a) => a.route))), predicate: (r, v) => r.route === v },
    { key: "class", label: "Class", options: Array.from(new Set(allocationList.map((a) => a.className))), predicate: (r, v) => r.className === v },
  ];

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Student Transport Allocation"
        description="Assign students to routes, vehicles and pickup points."
        actions={!readOnly ? <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" />Allocate Student</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Allocated Students" value={allocationList.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Routes in Use" value={new Set(allocationList.map((a) => a.route)).size} tone="info" icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Est. Monthly Revenue" value={currency(allocationList.reduce((s, a) => s + a.monthlyFee, 0))} tone="success" icon={<GraduationCap className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Allocation>
          data={allocationList}
          columns={columns}
          rowKey={(a) => a.id}
          searchPlaceholder="Search student, route..."
          searchFields={["student", "route", "vehicle"]}
          filters={filters}
          actions={!readOnly ? (a) => (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, a.student)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Student to Transport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student Full Name</Label>
              <Input value={form.student} onChange={(e) => setForm((f) => ({ ...f, student: e.target.value }))} placeholder="e.g. Aarav Sharma" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class</Label>
                <Input value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} />
              </div>
              <div>
                <Label>Section</Label>
                <Input value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Route Name</Label>
                <Input value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} />
              </div>
              <div>
                <Label>Monthly Fee (₹)</Label>
                <Input type="number" value={form.monthlyFee} onChange={(e) => setForm((f) => ({ ...f, monthlyFee: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Pickup Point</Label>
              <Input value={form.pickupPoint} onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Allocate Transport</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}