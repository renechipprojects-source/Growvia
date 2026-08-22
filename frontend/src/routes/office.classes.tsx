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
import { sanitizeTeacherName } from "@/lib/credentials";
import { getStoredMasterClasses, subscribeMasterClasses, updateMasterClass, addMasterClass, fetchMasterClassesFromSupabase, type MasterClassItem } from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { useClassAssignments } from "@/lib/classAssignmentContext";

export const Route = createFileRoute("/office/classes")({
  component: OfficeClassesPage,
  head: () => ({ meta: [{ title: "Classes Overview — Office Portal" }] }),
});

function OfficeClassesPage() {
  const { getClassTeacher, create: createAssignment } = useClassAssignments();
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

  const [isCustomClassName, setIsCustomClassName] = useState(false);
  const [isCustomSection, setIsCustomSection] = useState(false);

  const PRESET_CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
  const PRESET_SECTIONS = ["A", "B", "C", "D", "E"];

  const handleOpenEdit = (c: MasterClassItem) => {
    setEditingItem(c);
    setFormData({
      name: c.name,
      section: c.section,
      room: c.room,
      capacity: c.capacity,
      classTeacher: c.classTeacher || "Unassigned",
    });
    setIsCustomClassName(!PRESET_CLASSES.includes(c.name));
    setIsCustomSection(!PRESET_SECTIONS.includes(c.section));
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
    setIsCustomClassName(false);
    setIsCustomSection(false);
    setIsEditOpen(true);
  };

  const handleSaveClass = async () => {
    if (!formData.name.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (!formData.section.trim()) {
      toast.error("Section is required");
      return;
    }
    if (Number(formData.capacity) <= 0) {
      toast.error("Capacity must be greater than 0");
      return;
    }

    if (!editingItem) {
      const isDuplicate = classesList.some(
        (c) =>
          c.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
          c.section.trim().toUpperCase() === formData.section.trim().toUpperCase()
      );
      if (isDuplicate) {
        toast.error(`Class ${formData.name.trim()} - Section ${formData.section.trim().toUpperCase()} already exists.`);
        return;
      }
    }

    if (formData.classTeacher && formData.classTeacher !== "Unassigned") {
      const matchTeach = teachersList.find((t) => t.name === formData.classTeacher || t.id === formData.classTeacher);
      const selectedTeacherName = matchTeach?.name || formData.classTeacher;
      const selectedTeacherId = matchTeach?.id || `TCH-${Date.now()}`;
      createAssignment({
        teacherId: selectedTeacherId,
        teacherName: selectedTeacherName,
        academicYear: "2026-27",
        role: "class",
        className: formData.name.trim(),
        section: formData.section.trim(),
        status: "active",
      });
    }

    const teacherMatch = teachersList.find((t) => t.name === formData.classTeacher || t.id === formData.classTeacher);

    if (editingItem) {
      await updateMasterClass(editingItem.id, {
        name: formData.name.trim(),
        section: formData.section.trim(),
        room: formData.room.trim() || "Room 101",
        capacity: Number(formData.capacity) || 30,
        classTeacher: teacherMatch?.name || formData.classTeacher,
        teacherId: teacherMatch?.id || "",
      });
      toast.success(`Updated ${formData.name} - Section ${formData.section}`);
    } else {
      await addMasterClass({
        name: formData.name.trim(),
        section: formData.section.trim(),
        room: formData.room.trim() || "Room 101",
        capacity: Number(formData.capacity) || 30,
        classTeacher: teacherMatch?.name || formData.classTeacher,
        teacherId: teacherMatch?.id || "",
      });
      toast.success(`Added new class ${formData.name} - Section ${formData.section}`);
    }

    const updated = await fetchMasterClassesFromSupabase();
    setClassesList(updated || []);
    setIsEditOpen(false);
    loadData();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classesList.filter((c) => {
      const matchQ = !q || c.fullName.toLowerCase().includes(q) || c.classTeacher.toLowerCase().includes(q);
      const matchSec = !sec || sec === "all" || c.section.trim().toLowerCase() === sec.trim().toLowerCase();
      return matchQ && matchSec;
    });
  }, [classesList, search, filterValues]);

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    classesList.forEach((c) => {
      if (c.section && typeof c.section === "string" && c.section.trim()) {
        set.add(c.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [classesList]);

  return (
    <div className="space-y-4 w-full max-w-none">
      <PageHeader
        title="Classes Overview & Management"
        description="View live school classes, sections, assigned class teachers, and edit class settings."
        actions={
          <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow font-medium">
            <Plus className="w-4 h-4 mr-1.5" /> Add Class
          </Button>
        }
      />

      <div>
        <FilterBar
          searchPlaceholder="Search class name, section, teacher..."
          filters={[{ label: "Section", options: sectionOptions }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          hideExport={true}
        />
      </div>

      <div className="mt-2 w-full">
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

            const canonicalAss = getClassTeacher(c.name, c.section);
            const displayTeacher = canonicalAss && canonicalAss.status === "active"
              ? canonicalAss.teacherName
              : (c.classTeacher || "Unassigned");

            return (
              <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                <TableCell className="font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-indigo-50 text-indigo-600 font-bold">
                      {c.name[0]}
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
                      {displayTeacher && !displayTeacher.includes("Unassigned") && (
                        <AvatarImage src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(displayTeacher)}`} />
                      )}
                      <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">{displayTeacher[0] || "T"}</AvatarFallback>
                    </Avatar>
                    <span>{displayTeacher}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <DoorOpen className="w-3.5 h-3.5 text-indigo-500" /> {c.room || "Room 101"}
                    </div>
                    <div className="text-[11px] text-slate-500 pl-5 font-normal">
                      {c.capacity ? `Capacity: ${c.capacity} students` : "Capacity: Not Assigned"}
                    </div>
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
              <div className="flex items-center justify-between">
                <Label>Class Name</Label>
                {isCustomClassName && (
                  <button
                    type="button"
                    onClick={() => { setIsCustomClassName(false); setFormData((f) => ({ ...f, name: PRESET_CLASSES[0] })); }}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    Select from presets
                  </button>
                )}
              </div>
              {!isCustomClassName ? (
                <Select
                  value={formData.name}
                  onValueChange={(v) => {
                    if (v === "__CUSTOM__") {
                      setIsCustomClassName(true);
                      setFormData((f) => ({ ...f, name: "" }));
                    } else {
                      setFormData((f) => ({ ...f, name: v }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select class name" /></SelectTrigger>
                  <SelectContent>
                    {PRESET_CLASSES.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                    <SelectItem value="__CUSTOM__" className="font-semibold text-indigo-600">+ Custom Class Name...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Grade 10, Robotics Club, Pre-K Special"
                  className="mt-1"
                  autoFocus
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Section</Label>
                  {isCustomSection && (
                    <button
                      type="button"
                      onClick={() => { setIsCustomSection(false); setFormData((f) => ({ ...f, section: PRESET_SECTIONS[0] })); }}
                      className="text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      Presets
                    </button>
                  )}
                </div>
                {!isCustomSection ? (
                  <Select
                    value={formData.section}
                    onValueChange={(v) => {
                      if (v === "__CUSTOM__") {
                        setIsCustomSection(true);
                        setFormData((f) => ({ ...f, section: "" }));
                      } else {
                        setFormData((f) => ({ ...f, section: v }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {PRESET_SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                      <SelectItem value="__CUSTOM__" className="font-semibold text-indigo-600">+ Custom Section...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.section}
                    onChange={(e) => setFormData((f) => ({ ...f, section: e.target.value }))}
                    placeholder="e.g. Rose, 1, 101, Alpha"
                    className="mt-1"
                  />
                )}
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
                placeholder="e.g. Room 101, Lab 3"
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
                    <SelectItem key={t.id} value={sanitizeTeacherName(t.name, t.id)}>{sanitizeTeacherName(t.name, t.id)}</SelectItem>
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
