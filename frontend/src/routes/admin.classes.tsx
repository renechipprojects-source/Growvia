import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Plus, Pencil, Trash2, GraduationCap, DoorOpen } from "lucide-react";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";
import {
  getStoredMasterClasses,
  addMasterClass,
  updateMasterClass,
  deleteMasterClass,
  subscribeMasterClasses,
  fetchMasterClassesFromSupabase,
  type MasterClassItem,
} from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { toast } from "sonner";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/admin/classes")({
  component: ClassesPage,
  head: () => ({ meta: [{ title: "Classes — Sunshine Play School" }] }),
});

function ClassesPage() {
  const [classesList, setClassesList] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<MasterClassItem | null>(null);
  const [form, setForm] = useState({
    name: "Nursery",
    section: "A",
    classTeacher: "Ananya Sen",
    room: "Room 101",
    capacity: 30,
  });

  const loadData = () => {
    fetchMasterClassesFromSupabase().then((res) => setClassesList(res || []));
    Promise.all([fetchStudents(), fetchTeachers()]).then(([{ data: st }, { data: tc }]) => {
      setStudentsList(st || []);
      setTeachersList((tc as any) || []);
    });
  };

  useAutoRefresh("classes", loadData);
  useAutoRefresh("students", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
    return subscribeMasterClasses(() => {
      fetchMasterClassesFromSupabase().then((res) => setClassesList(res || []));
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classesList.filter((c) => {
      const matchQ = !q || c.fullName.toLowerCase().includes(q) || c.classTeacher.toLowerCase().includes(q);
      const matchSec = !sec || sec === "all" || c.section.toUpperCase() === sec.toUpperCase();
      return matchQ && matchSec;
    });
  }, [classesList, search, filterValues]);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setForm({
      name: "Nursery",
      section: "A",
      classTeacher: teachersList[0]?.name || "Ananya Sen",
      room: "Room 101",
      capacity: 30,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: MasterClassItem) => {
    setEditingClass(c);
    setForm({
      name: c.name,
      section: c.section,
      classTeacher: c.classTeacher,
      room: c.room,
      capacity: c.capacity,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Class name is required.");
      return;
    }
    if (editingClass) {
      updateMasterClass(editingClass.id, form);
      toast.success(`Updated ${form.name} Section ${form.section}`);
    } else {
      addMasterClass(form);
      toast.success(`Added new class ${form.name} Section ${form.section}`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, fullName: string) => {
    if (confirm(`Are you sure you want to delete ${fullName}?`)) {
      deleteMasterClass(id);
      toast.success(`Deleted ${fullName}`);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Classes Overview"
        description="Master school classes, sections, assigned class teachers, and student capacity."
      />

      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search class name, section, teacher..."
          filters={[{ label: "Section", options: ["A", "B", "C", "D"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          hideExport={true}
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Class Name", "Section", "Live Student Count", "Class Teacher", "Room & Capacity", "Action"]}
          total={filtered.length}
        >
          {filtered.map((c) => {
            const count = studentsList.filter(
              (s) =>
                s.className?.trim().toLowerCase() === c.name.trim().toLowerCase() &&
                (s.section ? s.section.trim().toUpperCase() : "A") === c.section.toUpperCase()
            ).length;
            const fullClassInfo = { ...c, strength: count };

            return (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-slate-800 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    {c.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold text-xs">
                    Section {c.section}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100">
                    {count} / {c.capacity} Students
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Avatar className="h-7 w-7 border">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{c.classTeacher[0] || "T"}</AvatarFallback>
                    </Avatar>
                    <span>{c.classTeacher}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <DoorOpen className="w-3.5 h-3.5 text-indigo-500" /> {c.room}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setSelectedClass(fullClassInfo)}>
                    <Eye className="w-4 h-4 mr-1" /> View Class
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      <ClassDetailsModal
        open={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        classInfo={selectedClass}
        studentsList={studentsList}
      />

      {/* Add / Edit Class Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              {editingClass ? "Edit Class Details" : "Add New Class & Section"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="font-semibold text-slate-700">Class Name / Grade</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Nursery, Playgroup, Grade 1"
                className="mt-1 bg-white rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold text-slate-700">Section</Label>
                <Input
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value.toUpperCase() }))}
                  placeholder="A, B, C..."
                  className="mt-1 bg-white rounded-xl uppercase"
                />
              </div>
              <div>
                <Label className="font-semibold text-slate-700">Classroom No.</Label>
                <Input
                  value={form.room}
                  onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="Room 101"
                  className="mt-1 bg-white rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold text-slate-700">Assigned Class Teacher</Label>
              <Select value={form.classTeacher} onValueChange={(v) => setForm((f) => ({ ...f, classTeacher: v }))}>
                <SelectTrigger className="mt-1 bg-white rounded-xl">
                  <SelectValue placeholder="Select class teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachersList.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name} ({t.subject || "Teacher"})
                    </SelectItem>
                  ))}
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold text-slate-700">Student Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value || 30) }))}
                className="mt-1 bg-white rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" onClick={handleSave}>
              Save Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
