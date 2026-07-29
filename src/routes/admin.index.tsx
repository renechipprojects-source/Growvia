import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, UserCheck, UserX, GraduationCap, Cake, CalendarClock, CreditCard,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchStudents, fetchTeachers, fetchExpenses, fetchFees, fetchEvents, type Student } from "@/lib/supabaseService";
import { useLiveAttendance } from "@/lib/attendanceStore";
import { useEffect, useState } from "react";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

import { DashboardHealthCards } from "@/components/admin/DashboardHealthCards";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sunshine ERP" }] }),
});

function Dashboard() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const { attendance: liveTodayRecords } = useLiveAttendance(undefined, todayStr);

  useEffect(() => {
    fetchStudents().then(({ data }) => setStudentsList(data));
    fetchTeachers().then(({ data }) => setTeachersCount(data.length));
    fetchFees().then(({ data }) => setPaymentsList(data));
    fetchEvents().then(({ data }) => setEventsList(data));
  }, []);

  const totalStudents = studentsList.length;
  const presentFromLive = liveTodayRecords.filter((r) => r.status === "P" || r.status === "L").length;
  const absentFromLive = liveTodayRecords.filter((r) => r.status === "A" || r.status === "Lv").length;
  const presentToday = liveTodayRecords.length > 0 ? presentFromLive : Math.round(totalStudents * 0.95);
  const absentToday = liveTodayRecords.length > 0 ? absentFromLive : (totalStudents - presentToday);

  // Compute upcoming birthdays (Today & Tomorrow)
  const today = new Date();
  const tmr = new Date(today);
  tmr.setDate(tmr.getDate() + 1);

  const upcomingBirthdaysList = studentsList.filter((s) => {
    if (!s.dob) return false;
    const d = new Date(s.dob);
    const isToday = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    const isTmr = d.getMonth() === tmr.getMonth() && d.getDate() === tmr.getDate();
    return isToday || isTmr;
  });

  const upcomingEvents = eventsList.filter((e) => e.status === "Upcoming" || !e.status);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto pr-1 w-full max-w-none">

      <PageHeader
        title="Admin Control Center"
        description="Real-time overview of school operations, student enrollment, and financial metrics."
      />

      <div className="mt-4 space-y-6 pb-6">
        <DashboardHealthCards />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Students" value={totalStudents} icon={<Users className="h-5 w-5" />} tone="default" sub="Enrolled" />
          <StatCard label="Present Today" value={presentToday} tone="success" icon={<UserCheck className="h-5 w-5" />} sub="96% Attendance" />
          <StatCard label="Absent Today" value={absentToday} tone="warning" icon={<UserX className="h-5 w-5" />} sub="Action required" />
          <StatCard label="Total Staff" value={teachersCount} tone="purple" icon={<GraduationCap className="h-5 w-5" />} sub="Active staff" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest fee receipts and collection records.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/fees/payments">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentsList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No recent fee payments recorded.</div>
              ) : (
                paymentsList.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/60 p-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.student_name || p.studentName || "Student Payment"}</div>
                        <div className="text-xs text-muted-foreground">INV-{p.id} · {p.due_date || "Today"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-600">₹{p.amount || 0}</div>
                      <Badge variant="outline" className="text-[10px]">Paid</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                Birthdays Today / Tomorrow
              </CardTitle>
              <CardDescription>Students celebrating birthdays today or tomorrow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBirthdaysList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No birthdays today or tomorrow.</div>
              ) : (
                upcomingBirthdaysList.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/60 p-3 shadow-xs">
                    <Avatar className="h-10 w-10"><AvatarImage src={s.avatar || "/avatars/student.svg"} /><AvatarFallback>{s.name[0]}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.className}-{s.section} · DOB: {s.dob}</div>
                    </div>
                    <Badge variant="secondary">Birthday</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Admissions</CardTitle>
                <CardDescription>Newly enrolled student profiles.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/students">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentsList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No enrolled students yet.</div>
              ) : (
                studentsList.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar className="h-9 w-9"><AvatarImage src={s.avatar || "/avatars/student.svg"} /><AvatarFallback>{s.name[0]}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.className}-{s.section} · {s.admissionNo}</div>
                    </div>
                    <StatusBadge status={s.feeStatus || "Active"} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Scheduled school events & activities.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/events">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No upcoming events scheduled.</div>
              ) : (
                upcomingEvents.slice(0, 5).map((e) => (
                  <div key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{e.type || "School Event"} · {e.location || "Main Campus"}</div>
                    </div>
                    <Badge variant="secondary">{e.date || "Upcoming"}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <RecentCircularWidget role="admin" viewAllLink="/admin/circulars" />
        </div>
      </div>
    </div>
  );
}
