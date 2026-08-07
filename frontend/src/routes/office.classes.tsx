import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, DoorOpen, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";
import { getStoredMasterClasses, subscribeMasterClasses, updateMasterClass, addMasterClass, type MasterClassItem } from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/office/classes")({
  component: OfficeClassesPage,
  head: () => ({ meta: [{ title: "Classes Overview — Office Portal" }] }),
});

function OfficeClassesPage() {
  const [classesList, setClassesList] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterClassItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    section: "A",
    room: "",
    capacity: 30,
    classTeacher: "Unassigned",
  });

  const loadData = () => {
    setClassesList(getStoredMasterClasses());
    Promise.all([fetchStudents(), fetchTeachers()]).then(([{ data: st }, { data: tc }]) => {
      setStudentsList(st || []);
      setTeachersList((tc as any) || []);
    });
  };

  useAutoRefresh("students", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
    return subscribeMasterClasses(() => setClassesList(getStoredMasterClasses()));
  }, []);

  const handleOpenEdit = (c: MasterClassItem) => {
    setEditingItem(c);
    setFormData({
      name: c.name,
      section: c.section,
      room: c.room,
      capacity: c.capacity,
      classTeacher: c.classTeacher || "Unassigned",
    });
    setIsEditOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "Grade 1",
      section: "A",
      room: "Room 101",
      capacity: 30,
      classTeacher: "Unassigned",
    });
    setIsEditOpen(true);
  };

  const handleSaveClass = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    if (editingItem) {
      updateMasterClass(editingItem.id, {
        name: formData.name.trim(),
        section: formData.section.trim().toUpperCase(),
        room: formData.room.trim() || "Room 101",
        capacity: Number(formData.capacity) || 30,
        classTeacher: formData.classTeacher,
      });
      toast.success(`Updated ${formData.name} - Section ${formData.section}`);
    } else {
      addMasterClass({
        name: formData.name.trim(),
        section: formData.section.trim().toUpperCase(),
        room: formData.room.trim() || "Room 101",
        capacity: Number(formData.capacity) || 30,
        classTeacher: formData.classTeacher,
      });
      toast.success(`Created class ${formData.name} - Section ${formData.section}`);
    }

    setIsEditOpen(false);
    loadData();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classesList.filter((c) => {
      const matchQ = !q || c.fullName.toLowerCase().includes(q) || c.classTeacher.toLowerCase().includes(q);
      const matchSec = !sec || sec === "all" || c.section.toUpperCase() === sec.toUpperCase();
      return matchQ && matchSec;
    });
  }, [classesList, search, filterValues]);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Classes Overview & Management"
        description="View live school classes, sections, assigned class teachers, and edit class settings."
        action={
          <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow">
            <Plus className="w-4 h-4 mr-1.5" /> Add Class
          </Button>
        }
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
                      {c.classTeacher && !c.classTeacher.includes("Unassigned") && (
                        <AvatarImage src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(c.classTeacher)}`} />
                      )}
                      <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">{c.classTeacher[0] || "T"}</AvatarFallback>
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
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setSelectedClass(fullClassInfo)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
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

      {/* Office Edit / Add Class Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit Class — ${editingItem.fullName}` : "Add New Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <Label>Class Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Playgroup, Nursery, LKG, UKG, Grade 1"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Section</Label>
                <Select value={formData.section} onValueChange={(v) => setFormData((f) => ({ ...f, section: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData((f) => ({ ...f, capacity: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Room Number</Label>
              <Input
                value={formData.room}
                onChange={(e) => setFormData((f) => ({ ...f, room: e.target.value }))}
                placeholder="e.g. Room 101"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Class Teacher</Label>
              <Select value={formData.classTeacher} onValueChange={(v) => setFormData((f) => ({ ...f, classTeacher: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {teachersList.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveClass} className="bg-indigo-600 text-white">Save Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
