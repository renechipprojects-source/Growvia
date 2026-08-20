import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, DoorOpen, Users, ExternalLink, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";
import { sanitizeTeacherName } from "@/lib/credentials";
import { getStoredMasterClasses, subscribeMasterClasses, fetchMasterClassesFromSupabase, type MasterClassItem } from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { addMasterClass, updateMasterClass, deleteMasterClass } from "@/lib/masterClassesStore";
import { toast } from "sonner";

export const Route = createFileRoute("/principal/classes")({
  head: () => ({
    meta: [
      { title: "Classes | Principal Portal" },
      { name: "description", content: "View and manage classes, sections, class teachers and class strength." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const navigate = useNavigate();
  const [masterClasses, setMasterClasses] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Add / Edit Class Modal State
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
    fetchMasterClassesFromSupabase().then((res) => setMasterClasses(res || []));
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
      fetchMasterClassesFromSupabase().then((res) => setMasterClasses(res || []));
    });
  }, []);

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

  const handleOpenEdit = (c: MasterClassItem, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDelete = (id: string, fullName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${fullName}?`)) {
      deleteMasterClass(id);
      toast.success(`Deleted ${fullName}`);
    }
  };

  const derivedClassesList = useMemo(() => {
    const normalize = (str: string) => (str || "").toLowerCase().replace(/[\s\-_]+/g, "");

    return masterClasses.map((m) => {
      const mClassNorm = normalize(m.name);
      const mSec = m.section.trim().toUpperCase();

      const studentsInClass = studentsList.filter((s) => {
        const sRaw = (s.className || (s as any).class_name || "").trim();
        const sNorm = normalize(sRaw);
        const classMatches = sNorm.includes(mClassNorm) || mClassNorm.includes(sNorm) || sNorm.startsWith(mClassNorm);
        let sSec = (s.section || "").trim().toUpperCase();
        if (!sSec) {
          if (/\b(b|sec-b|section-b)\b/i.test(sRaw) || sRaw.endsWith(" B")) sSec = "B";
          else if (/\b(c|sec-c|section-c)\b/i.test(sRaw) || sRaw.endsWith(" C")) sSec = "C";
          else sSec = "A";
        }
        return classMatches && sSec === mSec;
      });

      const teacher = teachersList.find((t) => t.name === m.classTeacher) ||
        teachersList.find((t) => t.className?.toLowerCase().includes(m.name.toLowerCase()) && t.className?.toUpperCase().includes(m.section.toUpperCase()));

      return {
        id: m.id,
        name: `${m.name} ${m.section}`,
        className: m.name,
        section: m.section,
        totalStudents: studentsInClass.length,
        matchedStudents: studentsInClass,
        capacity: m.capacity,
        classTeacher: m.classTeacher || (teacher ? teacher.name : "Unassigned"),
        teacherId: teacher ? teacher.id : "",
        room: m.room,
      };
    });
  }, [masterClasses, studentsList, teachersList]);

  const sections = useMemo(() => Array.from(new Set(derivedClassesList.map((c) => c.section))), [derivedClassesList]);

  const filtered = useMemo(
    () =>
      derivedClassesList.filter((c) => {
        const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.classTeacher.toLowerCase().includes(q.toLowerCase());
        const matchS = sec === "all" || c.section.toUpperCase() === sec.toUpperCase();
        return matchQ && matchS;
      }),
    [derivedClassesList, q, sec],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Classes Overview" description="Overview of every class, section, class teacher, and student list." />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate({ to: "/office/class-assignment", search: { tab: "student-mapping" } })}
            variant="outline"
            className="bg-white text-indigo-700 border-slate-200 rounded-xl text-xs font-semibold"
          >
            <UserCheck className="mr-1.5 h-4 w-4 text-indigo-600" /> Student Class Mapping
          </Button>
          <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Add Class
          </Button>
        </div>
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by class name or class teacher" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={sec} onValueChange={setSec}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-1">
          {filtered.map((c, idx) => {
            const matchedStudents = c.matchedStudents;
            const count = c.totalStudents;
            const teacher = c.classTeacher && c.classTeacher !== "Unassigned" ? c.classTeacher : teachersList[idx % (teachersList.length || 1)]?.name ?? "Assigned Teacher";

            return (
              <div
                key={c.id}
                onClick={() => setSelectedClass({ ...c, count, teacher, students: matchedStudents })}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase text-primary">Section {c.section}</div>
                    <div className="text-lg font-semibold mt-0.5 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {c.name}
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                      onClick={(e) => handleOpenEdit(masterClasses.find((m) => m.id === c.id) || { id: c.id, name: c.className, section: c.section, fullName: c.name, classTeacher: c.classTeacher, capacity: c.capacity, room: c.room }, e)}
                      title="Edit Class"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                      onClick={(e) => handleDelete(c.id, c.name, e)}
                      title="Delete Class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <DoorOpen className="w-3.5 h-3.5 text-indigo-500" /> {c.room || "Room 101"}
                      </span>
                      <span className="text-[11px] text-muted-foreground pl-5 font-normal">
                        {c.capacity ? `Capacity: ${c.capacity} students` : "Capacity: Not Assigned"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" /> {count} live students
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <div>
                      <div className="text-[11px] uppercase text-muted-foreground font-medium">Class Teacher</div>
                      <div className="text-sm mt-0.5 font-medium">{teacher}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">No classes match your filters.</div>
        )}
      </div>

      {selectedClass && (
        <ClassDetailsModal
          open={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          classInfo={selectedClass}
          studentsList={studentsList}
        />
      )}

      {/* Add / Edit Class Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingClass ? "Edit Class Details" : "Add New Class"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Class Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Nursery, Grade 1, Playgroup"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Section</label>
              <Input
                value={form.section}
                onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                placeholder="e.g. A, B, C, Rose"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Class Teacher</label>
              <Select
                value={form.classTeacher}
                onValueChange={(v) => setForm((p) => ({ ...p, classTeacher: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select Class Teacher" /></SelectTrigger>
                <SelectContent>
                  {teachersList.map((t) => (
                    <SelectItem key={t.id} value={sanitizeTeacherName(t.name, t.id)}>{sanitizeTeacherName(t.name, t.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Room Number</label>
                <Input
                  value={form.room}
                  onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
                  placeholder="e.g. Room 101"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Capacity</label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingClass ? "Save Changes" : "Create Class"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
