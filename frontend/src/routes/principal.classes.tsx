import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, DoorOpen, Users, ExternalLink, UserCheck, BookOpen, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";
import { getStoredMasterClasses, subscribeMasterClasses, type MasterClassItem } from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

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
  const [masterClasses, setMasterClasses] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  const loadData = () => {
    setMasterClasses(getStoredMasterClasses());
    Promise.all([fetchStudents(), fetchTeachers()]).then(([{ data: st }, { data: tc }]) => {
      setStudentsList(st || []);
      setTeachersList((tc as any) || []);
    });
  };

  useAutoRefresh("students", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
    return subscribeMasterClasses(() => setMasterClasses(getStoredMasterClasses()));
  }, []);

  const derivedClassesList = useMemo(() => {
    const normalize = (str: string) => (str || "").toLowerCase().replace(/[\s\-_]+/g, "");

    return masterClasses.map((m) => {
      const targetNameNorm = normalize(m.name);
      const targetSecNorm = m.section.trim().toUpperCase();

      const studentsInClass = studentsList.filter((s) => {
        const sRawClass = (s.className || "").trim();
        const sRawSec = (s.section || "").trim().toUpperCase();
        const sNormFull = normalize(`${sRawClass} ${sRawSec}`);
        const sNormClass = normalize(sRawClass);
        const targetNormFull = normalize(`${m.name} ${m.section}`);

        if (sNormFull === targetNormFull || sNormClass === targetNormFull) return true;

        const nameMatches = sNormClass.includes(targetNameNorm) || targetNameNorm.includes(sNormClass);
        const secMatches = !sRawSec || sRawSec === targetSecNorm || sNormClass.endsWith(targetSecNorm.toLowerCase());

        return nameMatches && secMatches;
      });

      const teacher = teachersList.find((t) => t.name === m.classTeacher) ||
        teachersList.find((t) => t.className?.toLowerCase().includes(m.name.toLowerCase()) && t.className?.toUpperCase().includes(m.section.toUpperCase()));

      return {
        id: m.id,
        name: `${m.name} ${m.section}`,
        className: m.name,
        section: m.section,
        totalStudents: studentsInClass.length,
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
        <ClassDetailsModal
          open={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          classInfo={selectedClass}
          studentsList={studentsList}
        />
      )}
    </div>
  );
}
