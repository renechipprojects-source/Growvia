import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, DoorOpen, Users, ExternalLink, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { classesList } from "@/lib/principal-mock-data";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";

export const Route = createFileRoute("/principal/classes")({
  head: () => ({
    meta: [
      { title: "Classes | Principal Portal" },
      { name: "description", content: "View classes, sections, class teachers and class strength." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      if (data && data.length > 0) setStudentsList(data);
    });
    fetchTeachers().then(({ data }) => {
      if (data && data.length > 0) setTeachersList(data as any);
    });
  }, []);

  const sections = useMemo(() => Array.from(new Set(classesList.map((c) => c.section))), []);

  const filtered = useMemo(
    () =>
      classesList.filter((c) => {
        const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.classTeacher.toLowerCase().includes(q.toLowerCase());
        const matchS = sec === "all" || c.section === sec;
        return matchQ && matchS;
      }),
    [q, sec],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader title="Classes" description="Overview of every class, section, class teacher, and student list. Click any card to view full class details." />

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
            const matchedStudents = studentsList.filter(
              (s) =>
                (s.className?.toLowerCase() === c.name.toLowerCase() || (s as any).class_name?.toLowerCase() === c.name.toLowerCase()) &&
                (s.section?.toUpperCase() === c.section || !s.section)
            );
            const count = matchedStudents.length;
            const teacher = teachersList[idx % (teachersList.length || 1)]?.name ?? c.classTeacher ?? "Assigned Teacher";

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
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {c.section}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><DoorOpen className="w-3.5 h-3.5" /> Room {c.room || "101"}</span>
                    <span className="flex items-center gap-1.5 font-semibold text-foreground"><Users className="w-3.5 h-3.5 text-primary" /> {count} live students</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-[11px] uppercase text-muted-foreground font-medium">Class Teacher</div>
                    <div className="text-sm mt-0.5 font-medium">{teacher}</div>
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
        <ClassDetailsModal classItem={selectedClass} onClose={() => setSelectedClass(null)} />
      )}
    </div>
  );
}

function ClassDetailsModal({
  classItem,
  onClose,
}: {
  classItem: any;
  onClose: () => void;
}) {
  const subjectTeachers = [
    { subject: "English & Literacy", teacher: classItem.teacher || "Priya Sharma" },
    { subject: "Mathematics & Logic", teacher: "Rajesh Verma" },
    { subject: "Environmental Studies", teacher: "Anita Sen" },
    { subject: "Art & Physical Ed", teacher: "Sunil Kumar" },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-4">
            <span>Class Details — {classItem.name} ({classItem.section})</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
              Section {classItem.section}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs mt-2">
          {/* Header Summary */}
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 border border-sky-200/60 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-slate-900">{classItem.name} — Section {classItem.section}</div>
              <div className="text-muted-foreground mt-0.5">
                Class Teacher: <b>{classItem.teacher}</b> · Room: <b>{classItem.room || "101"}</b>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-sky-700">{classItem.count || classItem.students?.length || 0}</div>
              <div className="text-[11px] text-muted-foreground font-medium">Enrolled Students</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border p-2.5 bg-card">
              <div className="text-muted-foreground text-[10px]">Average Attendance</div>
              <div className="font-bold text-sm text-emerald-700 mt-0.5">96% Present</div>
            </div>
            <div className="rounded-xl border p-2.5 bg-card">
              <div className="text-muted-foreground text-[10px]">Today's Present</div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">{Math.max(0, (classItem.count || 20) - 1)} Students</div>
            </div>
            <div className="rounded-xl border p-2.5 bg-card">
              <div className="text-muted-foreground text-[10px]">Absent / On Leave</div>
              <div className="font-bold text-sm text-rose-600 mt-0.5">1 Absent</div>
            </div>
          </div>

          {/* Subject Teachers */}
          <div className="rounded-xl border p-3 bg-card space-y-2">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Subject Teachers Roster
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subjectTeachers.map((st, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border">
                  <span className="font-medium text-slate-700">{st.subject}</span>
                  <span className="font-bold text-slate-900">{st.teacher}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Roster List */}
          <div className="rounded-xl border p-3 bg-card space-y-2">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-sky-600" /> Enrolled Student Roster</span>
              <span>Total: {classItem.students?.length || classItem.count || 0}</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 uppercase text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Student Name</th>
                    <th className="text-left px-3 py-2">Adm No</th>
                    <th className="text-left px-3 py-2">Roll No</th>
                    <th className="text-right px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {(classItem.students && classItem.students.length > 0
                    ? classItem.students
                    : [
                        { name: "Aarav Sharma", admissionNo: "ADM-1001", rollNo: 1, status: "Active" },
                        { name: "Vivaan Gupta", admissionNo: "ADM-1002", rollNo: 2, status: "Active" },
                        { name: "Diya Patel", admissionNo: "ADM-1003", rollNo: 3, status: "Active" },
                      ]
                  ).map((s: any, idx: number) => (
                    <tr key={s.id || idx} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{s.admissionNo || `ADM-100${idx + 1}`}</td>
                      <td className="px-3 py-2">{s.rollNo || idx + 1}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
