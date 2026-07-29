import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { UserCheck, BookOpen, NotebookPen, Sparkles, PartyPopper, ChevronRight, Baby, Users, UserX, Clock, Plane, ClipboardCheck } from "lucide-react";
import { HOMEWORK, EVENTS, ACTIVITIES, studentsBy, todayAttendanceFor, type ClassName } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClassAssignments } from "@/lib/classAssignmentContext";
import { useEffect, useState } from "react";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { useLiveActivities } from "@/lib/activitiesStore";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

export const Route = createFileRoute("/teacher/")({ component: Dash });

function Dash() {
  const { activities: liveActivities } = useLiveActivities();
  const { getClassTeacher, getWorkload, assignments } = useClassAssignments();
  
  // Teacher Mrs. Priya (TCH100) assignments
  const workload = getWorkload("TCH100");
  const classTeacherOfStr = workload.classTeacherOf || "Nursery-A";
  const [classNameStr, sectionStr = "A"] = classTeacherOfStr.split("-");
  const primaryClass = { className: classNameStr, section: sectionStr };
  const classAssignments = [primaryClass];
  const subjectAssignments = workload.subjectAssignments;

  const [studentsList, setStudentsList] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setStudentsList(data);
      }
    });
  }, []);

  const fallbackClass = primaryClass
    ? studentsBy(primaryClass.className as ClassName, primaryClass.section as "A" | "B" | undefined)
    : [];

  const myClass = studentsList.length > 0 ? studentsList : fallbackClass;
  const { recs } = primaryClass
    ? todayAttendanceFor(primaryClass.className as ClassName, primaryClass.section as "A" | "B" | undefined)
    : { recs: [] };
  const recMap = new Map(recs.map((r) => [r.studentId, r.status]));

  const total = myClass.length;
  const boys = myClass.filter((s) => s.gender === "Boy" || (s as any).gender === "Male").length;
  const girls = myClass.filter((s) => s.gender === "Girl" || (s as any).gender === "Female").length;
  const presentCount = myClass.filter((s) => recMap.get(s.id) === "Present").length;
  const absentCount = myClass.filter((s) => recMap.get(s.id) === "Absent").length;
  const lateCount = myClass.filter((s) => recMap.get(s.id) === "Late").length;
  const leaveCount = myClass.filter((s) => recMap.get(s.id) === "Leave").length;
  const classHomework = primaryClass
    ? HOMEWORK.filter((h) => h.className === primaryClass.className && (!h.section || h.section === primaryClass.section))
    : [];
  const hwPending = classHomework.filter((h) => h.status === "Pending").length;
  const hwSubmitted = classHomework.reduce((n, h) => n + h.submitted, 0);

  return (
    <div>
      <PageHeader
        title="Good morning, Mrs. Priya ☀️"
        subtitle={
          primaryClass
            ? `Your ${primaryClass.className}-${primaryClass.section} class · ${total} students`
            : "Ready for another beautiful day."
        }
        action={
          <Link to="/teacher/attendance">
            <Button className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg">
              <UserCheck className="h-4 w-4 mr-2" />Mark Attendance
            </Button>
          </Link>
        }
      />

      {/* Counters — dynamic */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard label="Total Students" value={total} icon={Users} gradient="from-sky-500 to-blue-500" />
        <StatCard label="Boys" value={boys} icon={Baby} gradient="from-blue-500 to-indigo-500" />
        <StatCard label="Girls" value={girls} icon={Baby} gradient="from-pink-500 to-fuchsia-500" />
        <StatCard label="Present Today" value={presentCount} icon={UserCheck} gradient="from-emerald-500 to-green-500" />
        <StatCard label="Absent" value={absentCount} icon={UserX} gradient="from-rose-500 to-red-500" />
        <StatCard label="Late" value={lateCount} icon={Clock} gradient="from-amber-500 to-orange-500" />
        <StatCard label="HW Pending" value={hwPending} icon={BookOpen} gradient="from-indigo-500 to-purple-500" sub={`${hwSubmitted} submissions`} />
        <StatCard label="Leaves" value={leaveCount} icon={Plane} gradient="from-cyan-500 to-sky-500" />
      </div>

      {/* Role context cards: My Class + My Subjects */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <SectionCard title="My Class (Class Teacher)">
          {classAssignments.length === 0 ? (
            <div className="text-sm text-muted-foreground">Not assigned as class teacher.</div>
          ) : (
            <div className="space-y-2">
              {classAssignments.map((a, idx) => (
                <Link
                  key={`${a.className}-${a.section}-${idx}`}
                  to="/teacher/my-class"
                  className="flex items-center justify-between rounded-2xl bg-white/60 p-3 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white grid place-items-center">
                      <Baby className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{a.className}-{a.section}</div>
                      <div className="text-xs text-muted-foreground">{studentsBy(a.className as ClassName, a.section as "A" | "B").length} students · Full access</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="My Subjects (Subject Teacher)">
          {subjectAssignments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No subject assignments.</div>
          ) : (
            <div className="space-y-2">
              {subjectAssignments.map((a, idx) => (
                <Link
                  key={`${a.className}-${a.section}-${a.subject}-${idx}`}
                  to="/teacher/my-class"
                  className="flex items-center justify-between rounded-2xl bg-white/60 p-3 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-items-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{a.subject} · {a.className}-{a.section}</div>
                      <div className="text-xs text-muted-foreground">Subject-only access</div>
                    </div>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">{a.subject}</Badge>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <SectionCard
          title="My class today"
          className="lg:col-span-2"
          action={
            <Badge className="bg-sky-100 text-sky-700">
              <ClipboardCheck className="h-3 w-3 mr-1" /> {presentCount}/{total} present
            </Badge>
          }
        >
          {/* Fixed height with internal scrolling — never grows and breaks layout */}
          <div className="h-[420px] overflow-y-auto pr-1 -mr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {myClass.map((s) => {
                const status = recMap.get(s.id);
                const isAbsent = status === "Absent" || status === "Leave";
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl p-2 text-center ${
                      isAbsent ? "bg-rose-50/70" : status === "Late" ? "bg-amber-50/70" : "bg-sky-50/70"
                    }`}
                  >
                    <img src={s.avatar} className="h-12 w-12 rounded-full mx-auto bg-white" alt="" />
                    <div className="mt-1 text-xs font-medium truncate">{s.name.split(" ")[0]}</div>
                    <div className="text-[10px] text-muted-foreground">Roll {String(s.rollNo).padStart(2, "0")}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        status === "Absent" ? "text-rose-600" :
                        status === "Leave" ? "text-purple-600" :
                        status === "Late" ? "text-amber-700" : "text-emerald-600"
                      }`}
                    >
                      {status ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Homework due">
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {classHomework.slice(0, 8).map((h) => (
              <li key={h.id} className="rounded-2xl bg-white/60 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{h.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{h.subject} · {h.submitted}/{h.total} submitted</div>
                </div>
                <div className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-1 shrink-0">Due {h.due.slice(5)}</div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <SectionCard title="Recent activities">
          <div className="grid grid-cols-2 gap-3">
            {liveActivities.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-2xl overflow-hidden bg-white shadow-sm">
                <img src={a.cover} className="h-24 w-full object-cover" alt="" />
                <div className="p-2 text-sm font-medium truncate">{a.title}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Upcoming events">
          <div className="grid grid-cols-2 gap-3">
            {EVENTS.map((e) => (
              <div key={e.id} className="rounded-2xl bg-white/60 p-3">
                <div className="text-xs text-muted-foreground">{e.date}</div>
                <div className="font-semibold">{e.title}</div>
                <div className={`inline-block mt-2 text-[10px] rounded-full px-2 py-0.5 ${e.color}`}>{e.type}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <RecentCircularWidget role="teacher" viewAllLink="/teacher/circulars" />
      </div>
    </div>
  );
}
