import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
type ClassName = string;
type Section = string;
import { fetchStudents, fetchClassMarks, saveClassMarks, type Student, type MarkRecord } from "@/lib/supabaseService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, TrendingUp, Award, AlertTriangle, ArrowUpDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useClassAssignments } from "@/lib/classAssignmentContext";
import { getClassAssignments, getSubjectAssignments } from "@/lib/teacherContext";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/teacher/progress")({ component: Progression });

const DEFAULT_CLASSES: ClassName[] = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"];
const DEFAULT_SECTIONS: Section[] = ["A", "B", "C"];
const ASSESSMENTS = ["Unit Test 1", "Unit Test 2", "Mid Term", "Final Term"];
const SUBJECTS = ["English", "Mathematics", "EVS", "General Science", "Hindi"];

function gradeFor(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "D";
}

interface MarkRow {
  studentId: string;
  rollNo: number;
  name: string;
  outOf: number;
  score: number;
  remarks: string;
  dirty: boolean;
}

function useClassStudents(className: ClassName, section: Section) {
  const [all, setAll] = useState<Student[]>([]);
  useEffect(() => {
    fetchStudents().then(({ data }) => setAll((data as any) || []));
  }, []);
  return useMemo(() => all.filter((s) => s.className.toLowerCase() === className.toLowerCase() && (!section || s.section.toUpperCase() === section.toUpperCase())), [all, className, section]);
}

function Progression() {
  const myClassAsgs = getClassAssignments();
  const mySubAsgs = getSubjectAssignments();
  const initialAsg = myClassAsgs[0] || mySubAsgs[0];

  const [className, setClassName] = useState<ClassName>(initialAsg?.className || "Nursery");
  const [section, setSection] = useState<Section>(initialAsg?.section || "A");
  const [subject, setSubject] = useState<string>(initialAsg?.subject || "English");
  const [assessment, setAssessment] = useState<string>("Unit Test 1");

  return (
    <div className="flex flex-col h-full min-h-[520px]">
      <div className="shrink-0">
        <PageHeader title="Student Progress" subtitle="Track, evaluate, and celebrate every little win." />
      </div>
      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="marks" className="rounded-xl">Marks Entry</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl">Assessment History</TabsTrigger>
          <TabsTrigger value="analysis" className="rounded-xl">Performance Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 min-h-0 mt-4 outline-none">
          <OverviewTab className={className} section={section} subject={subject}
            onClass={setClassName} onSection={setSection} onSubject={setSubject} />
        </TabsContent>
        <TabsContent value="marks" className="flex-1 min-h-0 mt-4 outline-none">
          <MarksEntryTab className={className} section={section} subject={subject} assessment={assessment}
            onClass={setClassName} onSection={setSection} onSubject={setSubject} onAssessment={setAssessment} />
        </TabsContent>
        <TabsContent value="history" className="flex-1 min-h-0 mt-4 outline-none">
          <HistoryTab className={className} section={section} />
        </TabsContent>
        <TabsContent value="analysis" className="flex-1 min-h-0 mt-4 outline-none">
          <AnalysisTab className={className} section={section} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Filters({ className, section, subject, assessment, onClass, onSection, onSubject, onAssessment }: {
  className: ClassName; section: Section; subject?: string; assessment?: string;
  onClass: (c: ClassName) => void; onSection: (s: Section) => void;
  onSubject?: (v: string) => void; onAssessment?: (v: string) => void;
}) {
  const { getSubjectTeachers } = useClassAssignments();
  const assignedSubs = getSubjectTeachers(className, section).map((st) => st.subject).filter(Boolean) as string[];
  const dynamicSubjects = Array.from(new Set([
    ...assignedSubs,
    "English", "Mathematics", "EVS", "Rhymes", "Art", "General Awareness", "Language", "Phonics", "Tamil", "Science", "Computer"
  ]));

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center w-full">
      <Select value={className} onValueChange={(v) => onClass(v as ClassName)}>
        <SelectTrigger className="w-full sm:w-[140px] bg-white/70"><SelectValue /></SelectTrigger>
        <SelectContent>{DEFAULT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={section} onValueChange={(v) => onSection(v as Section)}>
        <SelectTrigger className="w-full sm:w-[110px] bg-white/70"><SelectValue /></SelectTrigger>
        <SelectContent>{DEFAULT_SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
      </Select>
      {onSubject && subject !== undefined && (
        <Select value={subject} onValueChange={onSubject}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/70"><SelectValue /></SelectTrigger>
          <SelectContent>{dynamicSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {onAssessment && assessment !== undefined && (
        <Select value={assessment} onValueChange={onAssessment}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/70"><SelectValue /></SelectTrigger>
          <SelectContent>{ASSESSMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}

/* ─── Overview (read-only) ─── */
function OverviewTab({ className, section, subject, onClass, onSection, onSubject }: {
  className: ClassName; section: Section; subject: string;
  onClass: (c: ClassName) => void; onSection: (s: Section) => void; onSubject: (v: string) => void;
}) {
  const students = useClassStudents(className, section);
  const [classMarks, setClassMarks] = useState<MarkRecord[]>([]);
  const { getSubjectTeachers } = useClassAssignments();

  useEffect(() => {
    fetchClassMarks(className, section).then((marks) => setClassMarks(marks));
    const handleRefresh = () => {
      fetchClassMarks(className, section).then((marks) => setClassMarks(marks));
    };
    window.addEventListener("sunshine-auto-refresh-marks", handleRefresh);
    window.addEventListener("sunshine-auto-refresh", handleRefresh);
    return () => {
      window.removeEventListener("sunshine-auto-refresh-marks", handleRefresh);
      window.removeEventListener("sunshine-auto-refresh", handleRefresh);
    };
  }, [className, section]);

  const assignedSubs = getSubjectTeachers(className, section).map((st) => st.subject).filter(Boolean) as string[];
  const recordedSubs = classMarks.map((m) => m.subject).filter(Boolean);
  const activeSubjectList = Array.from(new Set([
    ...assignedSubs,
    ...recordedSubs,
    "English", "Mathematics", "EVS", "Rhymes", "Art"
  ]));

  const subjectAvgs = activeSubjectList.map((sub) => {
    const rows = classMarks.filter((m) => m.subject.toLowerCase() === sub.toLowerCase());
    const avg = rows.length ? rows.reduce((n, r) => n + (r.score / r.outOf) * 100, 0) / rows.length : 0;
    return { subject: sub, avg: Math.round(avg) };
  });
  const scoredSubjects = subjectAvgs.filter((s) => s.avg > 0);
  const overallAvg = scoredSubjects.length ? Math.round(scoredSubjects.reduce((n, r) => n + r.avg, 0) / scoredSubjects.length) : 0;
  const attendanceAvg = students.length ? Math.round(students.reduce((n, s) => n + (s.attendance || 95), 0) / students.length) : 95;

  const perStudent = students.map((s) => {
    const rows = classMarks.filter((m) => m.studentId === s.id && (subject === "All" || m.subject === subject));
    const pct = rows.length ? Math.round(rows.reduce((n, r) => n + (r.score / r.outOf) * 100, 0) / rows.length) : 0;
    return { student: s, pct };
  });
  const top = [...perStudent].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const needs = [...perStudent].filter((r) => r.pct > 0 && r.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 5);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0">
        <Filters className={className} section={section} subject={subject} onClass={onClass} onSection={onSection} onSubject={onSubject} />
      </div>
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatMini icon={TrendingUp} label="Class Average" value={`${overallAvg}%`} tone="sky" />
        <StatMini icon={Award} label="Top Score" value={`${Math.max(...perStudent.map((p) => p.pct), 0)}%`} tone="emerald" />
        <StatMini icon={AlertTriangle} label="Need Support" value={String(needs.length)} tone="amber" />
        <StatMini icon={TrendingUp} label="Attendance" value={`${attendanceAvg}%`} tone="indigo" />
      </div>
      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">
        <SectionCard title="Subject Averages" className="flex flex-col min-h-0">
          <div className="space-y-3 overflow-y-auto pr-1 -mr-1">
            {subjectAvgs.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm"><span>{s.subject}</span><span className="text-muted-foreground">{s.avg}%</span></div>
                <Progress value={s.avg} className="h-2 mt-1" />
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Top Performers" className="flex flex-col min-h-0">
          <ul className="space-y-2 overflow-y-auto pr-1 -mr-1">
            {top.map(({ student, pct }) => (
              <li key={student.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2.5">
                <img src={student.avatar} className="h-9 w-9 rounded-full" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{student.name}</div>
                  <div className="text-xs text-muted-foreground">Roll {String(student.rollNo).padStart(2, "0")}</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">{pct}%</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Needs Improvement" className="flex flex-col min-h-0">
          <ul className="space-y-2 overflow-y-auto pr-1 -mr-1">
            {needs.length === 0 && <li className="text-sm text-muted-foreground">Everyone is on track. 🌟</li>}
            {needs.map(({ student, pct }) => (
              <li key={student.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2.5">
                <img src={student.avatar} className="h-9 w-9 rounded-full" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{student.name}</div>
                  <div className="text-xs text-muted-foreground">Roll {String(student.rollNo).padStart(2, "0")}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-700">{pct}%</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: string; tone: "sky" | "emerald" | "amber" | "indigo" }) {
  const map = {
    sky: "from-sky-500 to-blue-500",
    emerald: "from-emerald-500 to-green-500",
    amber: "from-amber-500 to-orange-500",
    indigo: "from-indigo-500 to-purple-500",
  };
  return (
    <div className="rounded-2xl bg-white/70 border border-white/60 backdrop-blur-xl p-3 flex items-center gap-3 shadow-sm">
      <div className={`h-8 w-8 rounded-xl grid place-items-center text-white bg-gradient-to-br ${map[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

/* ─── Marks Entry (editable) ─── */
function MarksEntryTab({ className, section, subject, assessment, onClass, onSection, onSubject, onAssessment }: {
  className: ClassName; section: Section; subject: string; assessment: string;
  onClass: (c: ClassName) => void; onSection: (s: Section) => void;
  onSubject: (v: string) => void; onAssessment: (v: string) => void;
}) {
  const students = useClassStudents(className, section);
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [rows, setRows] = useState<Record<string, MarkRow>>({});
  const [baselineMap, setBaselineMap] = useState<Record<string, { outOf: number; score: number; remarks: string }>>({});
  const [saving, setSaving] = useState(false);
  const { setFormEditing } = useAutoRefresh();

  // Seed rows for current class/section/subject/assessment from Supabase
  const seededKey = `${className}-${section}-${subject}-${assessment}`;

  const loadData = useCallback(() => {
    if (!students || students.length === 0) return;
    fetchClassMarks(className, section).then((allMarks) => {
      const currentMap: Record<string, MarkRecord> = {};
      (allMarks || [])
        .filter(
          (m) =>
            m.subject.toLowerCase().trim() === subject.toLowerCase().trim() &&
            m.assessment.toLowerCase().trim() === assessment.toLowerCase().trim()
        )
        .forEach((m) => {
          if (m.studentId) currentMap[m.studentId.toLowerCase()] = m;
        });

      const nextRows: Record<string, MarkRow> = {};
      const nextBase: Record<string, { outOf: number; score: number; remarks: string }> = {};

      students.forEach((s) => {
        const sIdKey = (s.id || "").toLowerCase();
        const sAdmKey = (s.admissionNo || "").toLowerCase();
        const existing = currentMap[sIdKey] || currentMap[sAdmKey];

        const outOf = existing ? Number(existing.outOf ?? 100) : 100;
        const score = existing ? Number(existing.score ?? 0) : 0;
        const remarks = existing ? (existing.remarks || "") : "";

        nextBase[s.id] = { outOf, score, remarks };
        nextRows[s.id] = {
          studentId: s.id,
          rollNo: s.rollNo,
          name: s.name,
          outOf,
          score,
          remarks,
          dirty: false,
        };
      });

      setBaselineMap(nextBase);
      setRows(nextRows);
    });
  }, [className, section, subject, assessment, students]);

  useEffect(() => {
    loadData();
  }, [seededKey, students.length]);

  const visible = useMemo(() => {
    const list = students
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || String(s.rollNo).includes(query))
      .sort((a, b) => (sortAsc ? a.rollNo - b.rollNo : b.rollNo - a.rollNo));
    return list;
  }, [students, query, sortAsc]);

  const update = (id: string, patch: Partial<MarkRow>) => {
    setRows((prev) => {
      const curr = prev[id] || {
        studentId: id,
        rollNo: 1,
        name: "Student",
        outOf: 100,
        score: 0,
        remarks: "",
        dirty: false,
      };

      const nextRow = { ...curr, ...patch };
      const base = baselineMap[id] || { outOf: 100, score: 0, remarks: "" };
      const isDirty =
        Number(nextRow.outOf) !== Number(base.outOf) ||
        Number(nextRow.score) !== Number(base.score) ||
        String(nextRow.remarks || "").trim() !== String(base.remarks || "").trim();

      return {
        ...prev,
        [id]: {
          ...nextRow,
          dirty: isDirty,
        },
      };
    });
  };

  const dirtyCount = useMemo(() => {
    return Object.values(rows).filter((r) => r.dirty).length;
  }, [rows]);

  useEffect(() => {
    setFormEditing(dirtyCount > 0);
  }, [dirtyCount, setFormEditing]);

  const save = async () => {
    const toSave = Object.values(rows)
      .filter((r) => r.dirty)
      .map((r) => ({
        studentId: r.studentId,
        studentName: r.name,
        rollNo: r.rollNo,
        className,
        section,
        subject,
        assessment,
        outOf: Number(r.outOf || 100),
        score: Number(r.score || 0),
        remarks: r.remarks || "",
      }));

    if (toSave.length === 0) return;

    setSaving(true);
    try {
      const { count, error } = await saveClassMarks(toSave);
      if (error) throw new Error(error);
      toast.success(`Saved ${count} update${count === 1 ? "" : "s"} for ${subject} · ${assessment}`);

      const updatedBase = { ...baselineMap };
      toSave.forEach((s) => {
        updatedBase[s.studentId] = { outOf: s.outOf, score: s.score, remarks: s.remarks };
      });
      setBaselineMap(updatedBase);

      setRows((prev) => {
        const next = { ...prev };
        toSave.forEach((s) => {
          if (next[s.studentId]) {
            next[s.studentId] = { ...next[s.studentId], dirty: false };
          }
        });
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    loadData();
    toast.message("Changes discarded");
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <Filters className={className} section={section} subject={subject} assessment={assessment}
          onClass={onClass} onSection={onSection} onSubject={onSubject} onAssessment={onAssessment} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student…" className="pl-9 w-full sm:w-48 bg-white/70" />
          </div>
          <Button variant="outline" onClick={cancel} disabled={!dirtyCount || saving} className="rounded-full h-10">
            <RotateCcw className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button onClick={save} disabled={!dirtyCount || saving} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full h-10 shadow-md transition-all">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save {dirtyCount ? `(${dirtyCount})` : ""}
          </Button>
        </div>
      </div>
      <SectionCard title={`${subject} · ${assessment} — ${className}-${section}`} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/60">
          <Table className="min-w-[720px]">
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur z-10">
              <TableRow>
                <TableHead className="w-20">
                  <button className="inline-flex items-center gap-1" onClick={() => setSortAsc((v) => !v)}>
                    Roll <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-24">Max</TableHead>
                <TableHead className="w-28">Obtained</TableHead>
                <TableHead className="w-20">Grade</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((s) => {
                const r = rows[s.id];
                if (!r) return null;
                const pct = r.outOf ? (r.score / r.outOf) * 100 : 0;
                const pass = pct >= 40;
                return (
                  <TableRow key={s.id} className={r.dirty ? "bg-sky-50/80 font-medium" : undefined}>
                    <TableCell className="font-mono text-xs">{String(r.rollNo).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img src={s.avatar} className="h-8 w-8 rounded-full" alt="" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{subject}</TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={r.outOf === 0 ? "" : r.outOf}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          update(s.id, { outOf: isNaN(val) ? 0 : val });
                        }}
                        className="h-8 w-20 bg-white/70" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} max={r.outOf || 100} value={r.score === 0 ? "" : r.score}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          update(s.id, { score: isNaN(val) ? 0 : val });
                        }}
                        className="h-8 w-24 bg-white/70" />
                    </TableCell>
                    <TableCell>
                      <Badge className={pct >= 60 ? "bg-emerald-100 text-emerald-700" : pct >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>
                        {gradeFor(pct)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input value={r.remarks} onChange={(e) => update(s.id, { remarks: e.target.value })}
                        placeholder="Add a note…" className="h-8 bg-white/70" />
                    </TableCell>
                    <TableCell>
                      <Badge className={pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                        {pass ? "Pass" : "Needs Improvement"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No students match your search.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Assessment History ─── */
function HistoryTab({ className, section }: { className: ClassName; section: Section }) {
  const students = useClassStudents(className, section);
  const [classMarks, setClassMarks] = useState<MarkRecord[]>([]);

  const loadData = useCallback(() => {
    fetchClassMarks(className, section).then((marks) => setClassMarks(marks || []));
  }, [className, section]);

  useAutoRefresh("marks", loadData);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("sunshine-auto-refresh-marks", handleRefresh);
    return () => window.removeEventListener("sunshine-auto-refresh-marks", handleRefresh);
  }, [loadData]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0">
        <Filters className={className} section={section} onClass={() => {}} onSection={() => {}} />
      </div>
      <SectionCard title="Recent assessments" className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/60">
          <Table className="min-w-[640px]">
            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur z-10">
              <TableRow>
                <TableHead>Student</TableHead>
                {SUBJECTS.map((s) => <TableHead key={s} className="text-right">{s}</TableHead>)}
                <TableHead className="text-right">Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((st) => {
                const marks = SUBJECTS.map((sub) => {
                  const subMarks = classMarks.filter(
                    (m) =>
                      (m.studentId === st.id || m.studentId === st.admissionNo) &&
                      m.subject.toLowerCase() === sub.toLowerCase()
                  );
                  return subMarks.length
                    ? Math.round((subMarks.reduce((acc, curr) => acc + (curr.score / curr.outOf) * 100, 0) / subMarks.length))
                    : 0;
                });
                const scoredCount = marks.filter((m) => m > 0).length;
                const avg = scoredCount ? Math.round(marks.reduce((a, b) => a + b, 0) / scoredCount) : 0;
                return (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    {marks.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v ? `${v}%` : "—"}</TableCell>)}
                    <TableCell className="text-right font-semibold tabular-nums">{avg ? `${avg}%` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Performance Analysis ─── */
function AnalysisTab({ className, section }: { className: ClassName; section: Section }) {
  const students = useClassStudents(className, section);
  const [classMarks, setClassMarks] = useState<MarkRecord[]>([]);

  const loadData = useCallback(() => {
    fetchClassMarks(className, section).then((marks) => setClassMarks(marks || []));
  }, [className, section]);

  useAutoRefresh("marks", loadData);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("sunshine-auto-refresh-marks", handleRefresh);
    return () => window.removeEventListener("sunshine-auto-refresh-marks", handleRefresh);
  }, [loadData]);

  const studentAvgs = students.map((s) => {
    const studentMarks = classMarks.filter((m) => m.studentId === s.id);
    const pct = studentMarks.length
      ? Math.round(studentMarks.reduce((acc, curr) => acc + (curr.score / curr.outOf) * 100, 0) / studentMarks.length)
      : 0;
    return { student: s, pct };
  });

  const buckets = { excellent: 0, good: 0, average: 0, needs: 0 };
  studentAvgs.forEach(({ pct }) => {
    if (pct >= 85) buckets.excellent++;
    else if (pct >= 70) buckets.good++;
    else if (pct >= 55) buckets.average++;
    else buckets.needs++;
  });

  const total = students.length || 1;
  const bar = (label: string, count: number, tone: string) => (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{count} · {Math.round((count / total) * 100)}%</span></div>
      <div className="h-2 mt-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${(count / total) * 100}%` }} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0">
        <Filters className={className} section={section} onClass={() => {}} onSection={() => {}} />
      </div>
      <div className="flex-1 min-h-0 grid md:grid-cols-2 gap-4">
        <SectionCard title="Performance Distribution">
          <div className="space-y-3">
            {bar("Excellent (85–100%)", buckets.excellent, "bg-emerald-500")}
            {bar("Good (70–84%)", buckets.good, "bg-sky-500")}
            {bar("Average (55–69%)", buckets.average, "bg-amber-500")}
            {bar("Needs Support (<55%)", buckets.needs, "bg-rose-500")}
          </div>
        </SectionCard>
        <SectionCard title="Class snapshot" className="flex flex-col min-h-0">
          <div className="text-sm text-muted-foreground mb-3">
            {className}-{section} · {students.length} students
          </div>
          <ul className="space-y-2 overflow-y-auto pr-1 -mr-1">
            {studentAvgs.map(({ student, pct }) => (
              <li key={student.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2.5">
                <img src={student.avatar} className="h-8 w-8 rounded-full" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{student.name}</div>
                  <Progress value={pct} className="h-1.5 mt-1" />
                </div>
                <span className="text-sm font-semibold tabular-nums w-10 text-right">{pct}%</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
