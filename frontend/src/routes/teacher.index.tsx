import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { UserCheck, BookOpen, NotebookPen, Sparkles, PartyPopper, ChevronRight, Baby, Users, UserX, Clock, Plane, ClipboardCheck } from "lucide-react";
type ClassName = string;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClassAssignments } from "@/lib/classAssignmentContext";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { useActivities } from "@/lib/activitiesStore";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

import { getSession } from "@/lib/auth";

import { useLiveAttendance } from "@/lib/attendanceStore";

export const Route = createFileRoute("/teacher/")({ component: Dash });

function Dash() {
  const session = getSession();
  const teacherName = session?.name || "Teacher";
  const teacherId = session?.linkId || session?.loginId || "TCH100";
  const { activities: liveActivities } = useActivities();
  const { getClassTeacher, getWorkload, assignments } = useClassAssignments();
  
  const workload = getWorkload(teacherId);
  const classTeacherOfStr = workload.classTeacherOf || "Nursery-A";
  const [classNameStr, sectionStr = "A"] = classTeacherOfStr.split("-");
  const primaryClass = { className: classNameStr, section: sectionStr };
  const classAssignments = [primaryClass];
  const subjectAssignments = workload.subjectAssignments;

  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const { attendance: todayAttendanceRecords } = useLiveAttendance(undefined, todayStr);

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      setStudentsList(data || []);
    });
  }, []);

  const myClass = studentsList;
  const recMap = new Map(todayAttendanceRecords.map((r) => [r.studentId, r.status]));

  const total = myClass.length;
  const boys = myClass.filter((s) => s.gender === "Boy" || (s as any).gender === "Male").length;
  const girls = myClass.filter((s) => s.gender === "Girl" || (s as any).gender === "Female").length;
  const presentCount = myClass.filter((s) => recMap.get(s.id) === "P" || recMap.get(s.id) === "Present").length;
  const absentCount = myClass.filter((s) => recMap.get(s.id) === "A" || recMap.get(s.id) === "Absent").length;
  const lateCount = myClass.filter((s) => recMap.get(s.id) === "L" || recMap.get(s.id) === "Late").length;
  const leaveCount = myClass.filter((s) => recMap.get(s.id) === "Lv" || recMap.get(s.id) === "Leave").length;
  const classHomework: any[] = [];
  const hwPending = 0;
  const hwSubmitted = 0;

  return (
    <div>
      <PageHeader
        title={`Good morning, ${teacherName} ☀️`}
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
                      <div className="text-xs text-muted-foreground">{studentsList.length} students · Full access</div>
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
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini icon={Users} label="Total Students" value={total} sub={`${boys}B / ${girls}G`} tone="sky" />
        <StatMini icon={UserCheck} label="Present Today" value={presentCount} tone="emerald" />
        <StatMini icon={UserX} label="Absent / Leave" value={absentCount + leaveCount} tone="rose" />
        <StatMini icon={Clock} label="Late Arrivals" value={lateCount} tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Class Roster Cards */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            title="Class Roster & Today's Attendance"
            action={
              <Badge className="bg-sky-100 text-sky-700">
                {presentCount}/{total} Present ({total ? Math.round((presentCount / total) * 100) : 0}%)
              </Badge>
            }
          >
            <div className="h-[420px] overflow-y-auto pr-1 -mr-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {myClass.map((s) => {
                  const rawStatus = recMap.get(s.id);
                  const isAbsent = rawStatus === "A" || rawStatus === "Lv" || rawStatus === "Absent" || rawStatus === "Leave";
                  const isLate = rawStatus === "L" || rawStatus === "Late";
                  const displayStatus = rawStatus === "P" ? "Present" : rawStatus === "A" ? "Absent" : rawStatus === "L" ? "Late" : rawStatus === "Lv" ? "Leave" : rawStatus || "Not Marked";

                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl p-2 text-center ${
                        isAbsent ? "bg-rose-50/70" : isLate ? "bg-amber-50/70" : rawStatus === "P" ? "bg-emerald-50/70" : "bg-slate-50/70"
                      }`}
                    >
                      <img src={s.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`} className="h-12 w-12 rounded-full mx-auto bg-white" alt="" />
                      <div className="mt-1 text-xs font-medium truncate">{s.name.split(" ")[0]}</div>
                      <div className="text-[10px] text-muted-foreground">Roll {String(s.rollNo || 1).padStart(2, "0")}</div>
                      <div
                        className={`text-[10px] mt-0.5 font-medium ${
                          isAbsent ? "text-rose-600" : isLate ? "text-amber-700" : rawStatus === "P" ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {displayStatus}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        </div>
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
            {liveActivities.slice(0, 4).map((a: any) => (
              <div key={a.id} className="rounded-2xl overflow-hidden bg-white shadow-sm">
                <img src={a.cover} className="h-24 w-full object-cover" alt="" />
                <div className="p-2 text-sm font-medium truncate">{a.title}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Upcoming events">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-sm text-muted-foreground col-span-2 py-6 text-center">No upcoming events scheduled.</div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <RecentCircularWidget role="teacher" viewAllLink="/teacher/circulars" />
      </div>
    </div>
  );
}
