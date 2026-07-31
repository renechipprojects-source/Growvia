import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
type ClassName = string;
type Section = string;
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, TrendingUp, Award, AlertTriangle, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/progress")({ component: Progression });

const CLASSES: ClassName[] = ["Playgroup", "Nursery", "LKG", "UKG"];
const SECTIONS: Section[] = ["A", "B"];
const SUBJECTS = ["Language", "Math", "Art", "Phonics", "General Awareness"];
const ASSESSMENTS = ["Unit Test 1", "Unit Test 2", "Mid Term", "Final Term"];

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
  return useMemo(() => all.filter((s) => s.className === className && (!section || s.section === section)), [all, className, section]);
}

function Progression() {
  const [className, setClassName] = useState<ClassName>("Nursery");
  const [section, setSection] = useState<Section>("A");
  const [subject, setSubject] = useState<string>("Language");
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
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center w-full">
      <Select value={className} onValueChange={(v) => onClass(v as ClassName)}>
        <SelectTrigger className="w-full sm:w-[140px] bg-white/70"><SelectValue /></SelectTrigger>
        <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={section} onValueChange={(v) => onSection(v as Section)}>
        <SelectTrigger className="w-full sm:w-[110px] bg-white/70"><SelectValue /></SelectTrigger>
        <SelectContent>{SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
      </Select>
      {onSubject && subject !== undefined && (
        <Select value={subject} onValueChange={onSubject}>
          <SelectTrigger className="w-full sm:w-[160px] bg-white/70"><SelectValue /></SelectTrigger>
          <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
  const classMarks: any[] = [];

  const subjectAvgs = SUBJECTS.map((sub) => {
    const rows = classMarks.filter((m) => m.subject === sub);
    const avg = rows.length ? rows.reduce((n, r) => n + (r.score / r.outOf) * 100, 0) / rows.length : 0;
    return { subject: sub, avg: Math.round(avg) };
  });
  const overallAvg = Math.round(subjectAvgs.reduce((n, r) => n + r.avg, 0) / (subjectAvgs.length || 1));
  const attendanceAvg = students.length ? Math.round(students.reduce((n, s) => n + s.attendance, 0) / students.length) : 0;

  const perStudent = students.map((s) => {
    const rows = classMarks.filter((m) => m.studentId === s.id && (subject === "All" || m.subject === subject));
    const pct = rows.length ? Math.round(rows.reduce((n, r) => n + (r.score / r.outOf) * 100, 0) / rows.length) : 0;
    return { student: s, pct };
  });
  const top = [...perStudent].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const needs = [...perStudent].filter((r) => r.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 5);

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

  // Seed rows for current class/section/subject/assessment
  const seededKey = `${className}-${section}-${subject}-${assessment}`;
  useEffect(() => {
    const next: Record<string, MarkRow> = {};
    students.forEach((s) => {
      next[s.id] = {
        studentId: s.id,
        rollNo: s.rollNo,
        name: s.name,
        outOf: 100,
        score: 0,
        remarks: "",
        dirty: false,
      };
    });
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededKey]);

  const visible = useMemo(() => {
    const list = students
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || String(s.rollNo).includes(query))
      .sort((a, b) => (sortAsc ? a.rollNo - b.rollNo : b.rollNo - a.rollNo));
    return list;
  }, [students, query, sortAsc]);

  const dirtyCount = Object.values(rows).filter((r) => r.dirty).length;

  const update = (id: string, patch: Partial<MarkRow>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch, dirty: true } }));

  const save = () => {
    toast.success(`Saved ${dirtyCount} update${dirtyCount === 1 ? "" : "s"} for ${subject} · ${assessment}`);
    setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, dirty: false }])));
  };
  const cancel = () => {
    setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, dirty: false }])));
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
          <Button variant="outline" onClick={cancel} disabled={!dirtyCount} className="rounded-full h-10">
            <RotateCcw className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button onClick={save} disabled={!dirtyCount} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full h-10">
            <Save className="h-4 w-4 mr-2" />Save {dirtyCount ? `(${dirtyCount})` : ""}
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
                  <TableRow key={s.id} className={r.dirty ? "bg-sky-50/60" : undefined}>
                    <TableCell className="font-mono text-xs">{String(r.rollNo).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img src={s.avatar} className="h-8 w-8 rounded-full" alt="" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{subject}</TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={r.outOf}
                        onChange={(e) => update(s.id, { outOf: Number(e.target.value) || 0 })}
                        className="h-8 w-20 bg-white/70" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} max={r.outOf} value={r.score}
                        onChange={(e) => update(s.id, { score: Math.min(Number(e.target.value) || 0, r.outOf) })}
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
                const marks = SUBJECTS.map(() => 0);
                const avg = 0;
                return (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    {marks.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v}</TableCell>)}
                    <TableCell className="text-right font-semibold tabular-nums">{avg}</TableCell>
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
  const buckets = { excellent: 0, good: 0, average: 0, needs: 0 };
  students.forEach(() => {
    buckets.needs++;
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
            {students.map((s) => {
              const pct = 0;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2.5">
                  <img src={s.avatar} className="h-8 w-8 rounded-full" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <Progress value={pct} className="h-1.5 mt-1" />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-10 text-right">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
