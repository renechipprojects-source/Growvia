import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Power, BookOpen, GraduationCap, UserCheck, BarChart3, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useClassAssignments, type ClassAssignment, type AssignmentRole } from "@/lib/classAssignmentContext";

export const Route = createFileRoute("/office/class-assignment")({ component: ClassAssignmentPage });

const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;
const SECTIONS = ["A", "B", "C"] as const;
const SUBJECTS = ["English", "Mathematics", "Rhymes & Phonics", "Environmental Studies", "Drawing & Art", "Physical Ed", "General Knowledge"] as const;

const TEACHERS = [
  { id: "TCH100", name: "Mrs. Priya" },
  { id: "TCH101", name: "Ms. Anjali" },
  { id: "TCH102", name: "Mr. Rakesh" },
  { id: "TCH103", name: "Mrs. Kavitha" },
];

type Draft = Omit<ClassAssignment, "id"> & { id?: string };

const EMPTY: Draft = {
  teacherId: "TCH100",
  teacherName: "Mrs. Priya",
  academicYear: "2026-27",
  role: "class",
  className: "Nursery",
  section: "A",
  subject: "English",
  status: "active",
};

function ClassAssignmentPage() {
  const { assignments, create, update, remove, toggle, getWorkload } = useClassAssignments();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const openNew = (role: AssignmentRole = "class") => {
    setDraft({ ...EMPTY, role });
    setOpen(true);
  };
  const openEdit = (a: ClassAssignment) => {
    setDraft({ ...a });
    setOpen(true);
  };

  const save = () => {
    if (!draft.teacherId || !draft.className || !draft.section) {
      toast.error("Please select a teacher, class, and section.");
      return;
    }
    if (draft.role === "subject" && !draft.subject) {
      toast.error("Subject assignments require a subject.");
      return;
    }
    const teacher = TEACHERS.find((t) => t.id === draft.teacherId);
    const payload: Omit<ClassAssignment, "id"> = {
      teacherId: draft.teacherId,
      teacherName: teacher?.name ?? draft.teacherName,
      academicYear: draft.academicYear,
      role: draft.role,
      className: draft.className,
      section: draft.section,
      subject: draft.role === "subject" ? draft.subject : undefined,
      status: draft.status,
    };

    if (draft.id) {
      update(draft.id, payload);
      toast.success("Teacher assignment updated successfully.");
    } else {
      create(payload);
      if (draft.role === "class") {
        toast.success(`Assigned ${payload.teacherName} as Class Teacher for ${payload.className}-${payload.section}. Any previous Class Teacher assignment replaced.`);
      } else {
        toast.success(`Assigned ${payload.teacherName} to teach ${payload.subject} in ${payload.className}-${payload.section}.`);
      }
    }
    setOpen(false);
  };

  const classTeacherAssignments = useMemo(
    () => assignments.filter((a) => a.role === "class"),
    [assignments]
  );
  const subjectAssignments = useMemo(
    () => assignments.filter((a) => a.role === "subject"),
    [assignments]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Assignment Hub (Office Managed)"
        subtitle="Single operational source of truth for Class Teacher & Subject Teacher allocations and workload monitoring."
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => openNew("class")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Assign Class Teacher
            </Button>
            <Button onClick={() => openNew("subject")} variant="outline" className="rounded-xl border-slate-200 bg-white">
              <Plus className="h-4 w-4 mr-2 text-indigo-600" /> Assign Subject
            </Button>
          </div>
        }
      />

      {/* 1. Teacher Workload Overview (Monitoring) */}
      <SectionCard title="Teacher Workload Overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEACHERS.map((t) => {
            const wl = getWorkload(t.id);
            return (
              <div key={t.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                    {wl.totalClasses} Classes
                  </Badge>
                </div>
                <div className="text-xs space-y-1.5 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium">Class Teacher Of:</span>{" "}
                    {wl.classTeacherOf ? (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{wl.classTeacherOf}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">None</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Subject Assignments:</span>{" "}
                    <span className="font-semibold text-slate-800">{wl.totalSubjects} subjects</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 2. Class Teacher Assignments (1 per class) */}
      <SectionCard title="Class Teacher Assignments (1 Active Per Class)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-left">Class & Section</th>
                <th className="px-3 text-left">Assigned Class Teacher</th>
                <th className="px-3 text-left">Academic Year</th>
                <th className="px-3 text-left">Status</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classTeacherAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-slate-900">{a.className} - {a.section}</td>
                  <td className="px-3">
                    <span className="font-bold text-indigo-700">{a.teacherName}</span>
                  </td>
                  <td className="px-3 font-mono text-slate-500">{a.academicYear}</td>
                  <td className="px-3">
                    <Badge className={a.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(a.id)}>
                      <Power className={`h-3.5 w-3.5 ${a.status === "active" ? "text-emerald-600" : "text-slate-400"}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { remove(a.id); toast.success("Assignment removed"); }}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 3. Subject Teacher Assignments */}
      <SectionCard title="Subject Teacher Assignments (Unlimited Multi-Class)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-left">Teacher Name</th>
                <th className="px-3 text-left">Subject</th>
                <th className="px-3 text-left">Target Class & Section</th>
                <th className="px-3 text-left">Academic Year</th>
                <th className="px-3 text-left">Status</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{a.teacherName}</td>
                  <td className="px-3"><Badge variant="outline" className="bg-sky-50 text-sky-700 font-semibold">{a.subject}</Badge></td>
                  <td className="px-3 font-semibold text-slate-800">{a.className} - {a.section}</td>
                  <td className="px-3 font-mono text-slate-500">{a.academicYear}</td>
                  <td className="px-3">
                    <Badge className={a.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(a.id)}>
                      <Power className={`h-3.5 w-3.5 ${a.status === "active" ? "text-emerald-600" : "text-slate-400"}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { remove(a.id); toast.success("Assignment removed"); }}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Assignment Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {draft.id ? "Edit Teacher Assignment" : draft.role === "class" ? "Assign Class Teacher" : "Assign Subject Teacher"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Assignment Category</Label>
              <Select value={draft.role} onValueChange={(v: AssignmentRole) => setDraft((d) => ({ ...d, role: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class Teacher (1 Active Per Class)</SelectItem>
                  <SelectItem value="subject">Subject Teacher (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Select Teacher</Label>
              <Select value={draft.teacherId} onValueChange={(v) => setDraft((d) => ({ ...d, teacherId: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEACHERS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Class</Label>
                <Select value={draft.className} onValueChange={(v) => setDraft((d) => ({ ...d, className: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Section</Label>
                <Select value={draft.section} onValueChange={(v) => setDraft((d) => ({ ...d, section: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (<SelectItem key={s} value={s}>Section {s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.role === "subject" && (
              <div>
                <Label className="text-xs font-semibold">Assigned Subject</Label>
                <Select value={draft.subject || "English"} onValueChange={(v) => setDraft((d) => ({ ...d, subject: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((sub) => (<SelectItem key={sub} value={sub}>{sub}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 text-white rounded-xl" onClick={save}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
