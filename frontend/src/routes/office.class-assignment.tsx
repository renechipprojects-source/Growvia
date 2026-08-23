import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Power, BookOpen, GraduationCap, UserCheck, Search, Filter, RefreshCw, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useClassAssignments, type ClassAssignment, type AssignmentRole } from "@/lib/classAssignmentContext";
import { fetchTeachers, fetchStudents, updateStudent, type Student, type Teacher } from "@/lib/supabaseService";
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
  const { tab } = Route.useSearch();
  const { assignments, create, update, remove, toggle, getWorkload } = useClassAssignments();
  const [activeTab, setActiveTab] = useState<"teachers" | "student-mapping">(
    tab === "student-mapping" ? "student-mapping" : "teachers"
  );

  useEffect(() => {
    if (tab === "student-mapping" || tab === "teachers") {
      setActiveTab(tab as any);
    }
  }, [tab]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [liveTeachers, setLiveTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [masterClasses, setMasterClasses] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const { setFormEditing, triggerModuleRefresh } = useAutoRefresh();

  // Student Mapping State (Issue 2)
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetClass, setTargetClass] = useState<string>("Nursery");
  const [targetSection, setTargetSection] = useState<string>("A");
  const [isMapping, setIsMapping] = useState(false);

  // Single Student Reassign Dialog
  const [singleStudentModal, setSingleStudentModal] = useState<Student | null>(null);
  const [singleTargetClass, setSingleTargetClass] = useState<string>("Nursery");
  const [singleTargetSection, setSingleTargetSection] = useState<string>("A");

  const loadData = useCallback(() => {
    fetchTeachers().then(({ data }) => {
      if (data && data.length > 0) {
        setLiveTeachers(data.map((t) => ({ id: t.id, name: t.name })));
      }
    });
    fetchMasterClassesFromSupabase().then((mc) => setMasterClasses(mc || []));
  }, []);

  const loadStudentsList = useCallback(() => {
    setIsLoadingStudents(true);
    fetchStudents().then(({ data }) => {
      setStudents(data || []);
      setIsLoadingStudents(false);
    });
  }, []);

  useEffect(() => {
    loadData();
    loadStudentsList();
  }, [loadData, loadStudentsList]);

  useAutoRefresh("staff", loadData);
  useAutoRefresh("classes", loadData);
  useAutoRefresh("students", loadStudentsList);

  useEffect(() => {
    setFormEditing(open || !!singleStudentModal);
  }, [open, singleStudentModal, setFormEditing]);

  // Derived available classes & sections combining defaults + master classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    masterClasses.forEach((mc) => {
      if (mc.name) set.add(mc.name);
    });
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    if (set.size === 0) set.add("Nursery");
    return Array.from(set);
  }, [masterClasses, students]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    masterClasses.forEach((mc) => {
      if (mc.section) set.add(mc.section.toUpperCase());
    });
    students.forEach((s) => {
      if (s.section) set.add(s.section.toUpperCase());
    });
    if (set.size === 0) set.add("A");
    return Array.from(set);
  }, [masterClasses, students]);

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

  // Student Mapping Handlers (Issue 2)
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.parent || "").toLowerCase().includes(q);
      const matchCls = filterClass === "all" || s.className?.toLowerCase() === filterClass.toLowerCase();
      const matchSec = filterSection === "all" || (s.section || "A").toUpperCase() === filterSection.toUpperCase();
      return matchQ && matchCls && matchSec;
    });
  }, [students, studentSearch, filterClass, filterSection]);

  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => [...prev, id]);
    } else {
      setSelectedStudentIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBatchMapStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student to assign.");
      return;
    }
    if (!targetClass || !targetSection) {
      toast.error("Please select target class and section.");
      return;
    }

    try {
      setIsMapping(true);
      const promises = selectedStudentIds.map((id) =>
        updateStudent(id, { className: targetClass, section: targetSection })
      );
      await Promise.all(promises);

      toast.success(`Successfully mapped ${selectedStudentIds.length} student(s) to ${targetClass} - Section ${targetSection}!`);
      setSelectedStudentIds([]);
      loadStudentsList();
      triggerModuleRefresh("students");
      triggerModuleRefresh("classes");
    } catch (err: any) {
      toast.error("Failed to map students: " + (err?.message || "Unknown error"));
    } finally {
      setIsMapping(false);
    }
  };

  const handleOpenSingleReassign = (s: Student) => {
    setSingleStudentModal(s);
    setSingleTargetClass(s.className || "Nursery");
    setSingleTargetSection(s.section || "A");
  };

  const handleSaveSingleReassign = async () => {
    if (!singleStudentModal) return;
    try {
      setIsMapping(true);
      await updateStudent(singleStudentModal.id, {
        className: singleTargetClass,
        section: singleTargetSection,
      });
      toast.success(`Assigned ${singleStudentModal.name} to ${singleTargetClass} - Section ${singleTargetSection}!`);
      setSingleStudentModal(null);
      loadStudentsList();
      triggerModuleRefresh("students");
      triggerModuleRefresh("classes");
    } catch (err: any) {
      toast.error("Failed to update student class assignment: " + (err?.message || "Unknown error"));
    } finally {
      setIsMapping(false);
    }
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
        title="Class & Student Assignment Hub"
        subtitle="Operational source of truth for Class Teacher, Subject Teacher, and Student Class/Section mappings."
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1 rounded-2xl mb-4">
          <TabsTrigger value="teachers" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <UserCheck className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Teacher Allocations
          </TabsTrigger>
          <TabsTrigger value="student-mapping" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <GraduationCap className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Student Class Mapping
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TEACHER ALLOCATIONS */}
        <TabsContent value="teachers" className="space-y-6 mt-0">
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
        </TabsContent>

        {/* TAB 2: STUDENT CLASS & SECTION MAPPING (ISSUE 2 IMPLEMENTATION) */}
        <TabsContent value="student-mapping" className="space-y-4 mt-0">
          <SectionCard title="Student-to-Class & Section Allocation Matrix">
            {/* Filter & Batch Action Header */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search student name, ID, parent..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 bg-white text-xs h-9 rounded-xl border-slate-200"
                  />
                </div>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-[140px] h-9 bg-white text-xs rounded-xl border-slate-200">
                    <SelectValue placeholder="Current Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {availableClasses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-[130px] h-9 bg-white text-xs rounded-xl border-slate-200">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((s) => (
                      <SelectItem key={s} value={s}>Section {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                <Button size="sm" variant="outline" onClick={loadStudentsList} disabled={isLoadingStudents} className="h-9 text-xs rounded-xl bg-white">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoadingStudents ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </div>

            {/* Batch Allocation Bar */}
            {selectedStudentIds.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  <span>{selectedStudentIds.length} Student(s) Selected for Re-Assignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Assign To:</span>
                  <Select value={targetClass} onValueChange={setTargetClass}>
                    <SelectTrigger className="w-[130px] h-8 bg-white text-xs rounded-lg border-indigo-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={targetSection} onValueChange={setTargetSection}>
                    <SelectTrigger className="w-[110px] h-8 bg-white text-xs rounded-lg border-indigo-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((s) => (
                        <SelectItem key={s} value={s}>Sec {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button size="sm" onClick={handleBatchMapStudents} disabled={isMapping} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 rounded-lg shadow-sm">
                    {isMapping ? "Mapping..." : "Apply Class Assignment"}
                  </Button>
                </div>
              </div>
            )}

            {/* Student Mapping Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <Checkbox
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onCheckedChange={(c) => handleSelectAllFiltered(!!c)}
                      />
                    </th>
                    <th className="p-3 text-left">Student Details</th>
                    <th className="p-3 text-left">Admission No</th>
                    <th className="p-3 text-left">Assigned Class & Section</th>
                    <th className="p-3 text-left">Parent Contact</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No students found matching current search/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <tr key={s.id} className={`hover:bg-slate-50/80 transition ${isSelected ? "bg-indigo-50/40" : ""}`}>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => handleSelectStudent(s.id, !!c)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={s.avatar} />
                                <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">{s.name ? s.name[0] : "S"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-slate-900">{s.name}</div>
                                <div className="text-[11px] text-slate-500">{s.house || "Main House"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-600">{s.admissionNo || s.id}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                                {s.className || "Nursery"}
                              </Badge>
                              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold">
                                Sec {s.section || "A"}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600">
                            <div>{s.parent || "Parent"}</div>
                            <div className="text-[11px] font-mono text-slate-400">{s.phone}</div>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 hover:text-indigo-800" onClick={() => handleOpenSingleReassign(s)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Reassign
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Teacher Assignment Modal (Issue 1 fix: clean teacher name label display) */}
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

      {/* Single Student Reassign Modal */}
      <Dialog open={!!singleStudentModal} onOpenChange={(o) => { if (!o) setSingleStudentModal(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reassign Student Class & Section
            </DialogTitle>
          </DialogHeader>
          {singleStudentModal && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Avatar className="h-9 w-9 border">
                  <AvatarImage src={singleStudentModal.avatar} />
                  <AvatarFallback className="font-bold">{singleStudentModal.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{singleStudentModal.name}</div>
                  <div className="text-slate-500">ID: {singleStudentModal.admissionNo || singleStudentModal.id}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Target Class</Label>
                <Select value={singleTargetClass} onValueChange={setSingleTargetClass}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Target Section</Label>
                <Select value={singleTargetSection} onValueChange={setSingleTargetSection}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableSections.map((s) => (<SelectItem key={s} value={s}>Section {s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSingleStudentModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 text-white rounded-xl" onClick={handleSaveSingleReassign} disabled={isMapping}>
              {isMapping ? "Saving..." : "Save Student Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
