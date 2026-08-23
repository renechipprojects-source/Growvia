import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useClassAssignments, type ClassAssignment, type AssignmentRole } from "@/lib/classAssignmentContext";
import { fetchTeachers } from "@/lib/supabaseService";
import { sanitizeTeacherName } from "@/lib/credentials";
import { getStoredMasterClasses, fetchMasterClassesFromSupabase, type MasterClassItem } from "@/lib/masterClassesStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  tab: fallback(z.string(), "teachers").default("teachers"),
});

export const Route = createFileRoute("/office/class-assignment")({
  validateSearch: zodValidator(searchSchema),
  component: ClassAssignmentPage,
});

const DEFAULT_CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"] as const;
const DEFAULT_SECTIONS = ["A", "B", "C", "D"] as const;
const SUBJECTS = ["English", "Mathematics", "Rhymes & Phonics", "Environmental Studies", "Drawing & Art", "Physical Ed", "General Knowledge"] as const;

type Draft = Omit<ClassAssignment, "id"> & { id?: string };

const EMPTY: Draft = {
  teacherId: "",
  teacherName: "Select Teacher",
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
  const [liveTeachers, setLiveTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [masterClasses, setMasterClasses] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const { setFormEditing, triggerModuleRefresh } = useAutoRefresh();

  const loadData = useCallback(() => {
    fetchTeachers().then(({ data }) => {
      if (data && data.length > 0) {
        setLiveTeachers(data.map((t) => ({ id: t.id, name: t.name })));
      }
    });
    fetchMasterClassesFromSupabase().then((mc) => setMasterClasses(mc || []));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh("staff", loadData);
  useAutoRefresh("classes", loadData);

  useEffect(() => {
    setFormEditing(open);
  }, [open, setFormEditing]);

  // Derived available classes & sections from master classes & defaults
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    masterClasses.forEach((mc) => {
      if (mc.name) set.add(mc.name);
    });
    DEFAULT_CLASSES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [masterClasses]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    masterClasses.forEach((mc) => {
      if (mc.section) set.add(mc.section.toUpperCase());
    });
    DEFAULT_SECTIONS.forEach((s) => set.add(s));
    return Array.from(set);
  }, [masterClasses]);

  // Teacher Assignment Handlers
  const openNew = (role: AssignmentRole = "class") => {
    const initialTeacher = liveTeachers[0];
    setDraft({
      ...EMPTY,
      role,
      teacherId: initialTeacher?.id || "",
      teacherName: initialTeacher?.name || "Select Teacher",
      className: availableClasses[0] || "Nursery",
      section: availableSections[0] || "A",
    });
    setOpen(true);
  };

  const openEdit = (a: ClassAssignment) => {
    setDraft({ ...a });
    setOpen(true);
  };

  const saveTeacherAssignment = () => {
    if (!draft.teacherId || !draft.className || !draft.section) {
      toast.error("Please select a teacher, class, and section.");
      return;
    }
    if (draft.role === "subject" && !draft.subject) {
      toast.error("Subject assignments require a subject.");
      return;
    }
    const teacher = liveTeachers.find((t) => t.id === draft.teacherId);
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
        toast.success(`Assigned ${payload.teacherName} as Class Teacher for ${payload.className}-${payload.section}.`);
      } else {
        toast.success(`Assigned ${payload.teacherName} to teach ${payload.subject} in ${payload.className}-${payload.section}.`);
      }
    }
    triggerModuleRefresh("assignments");
    triggerModuleRefresh("staff");
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
        title="Class & Teacher Allocation Hub"
        subtitle="Operational source of truth for Class Teacher and Subject Teacher allocations."
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

      <div className="space-y-6">
        {/* 1. Teacher Workload Overview */}
        <SectionCard title="Teacher Workload Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveTeachers.map((t) => {
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

        {/* 2. Class Teacher Assignments */}
        <SectionCard title="Class Teacher Assignments (1 Active Per Class)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-slate-500 font-medium uppercase text-[10px]">
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
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-slate-500 font-medium uppercase text-[10px]">
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
                    <td className="py-3 px-3 font-semibold text-slate-900">{a.teacherName}</td>
                    <td className="px-3">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-semibold border-indigo-200">
                        {a.subject || "General"}
                      </Badge>
                    </td>
                    <td className="px-3 font-medium text-slate-700">{a.className} - {a.section}</td>
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
      </div>

      {/* Teacher Assignment Modal */}
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
              <Select
                value={draft.teacherId}
                onValueChange={(v) => {
                  const match = liveTeachers.find((t) => t.id === v || t.name === v);
                  const cleanName = sanitizeTeacherName(match?.name, v);
                  setDraft((d) => ({
                    ...d,
                    teacherId: v,
                    teacherName: cleanName,
                  }));
                }}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {liveTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{sanitizeTeacherName(t.name, t.id)}</SelectItem>
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
                    {availableClasses.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Section</Label>
                <Select value={draft.section} onValueChange={(v) => setDraft((d) => ({ ...d, section: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableSections.map((s) => (<SelectItem key={s} value={s}>Section {s}</SelectItem>))}
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
            <Button className="bg-indigo-600 text-white rounded-xl" onClick={saveTeacherAssignment}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
