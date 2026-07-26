import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, UserCheck, UserX, GraduationCap, Cake, CalendarClock, CreditCard,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { events } from "@/lib/admin-mock-data";
import { fetchStudents, fetchTeachers, fetchExpenses, fetchFees, type Student } from "@/lib/supabaseService";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sunshine ERP" }] }),
});

function Dashboard() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setStudentsList(data);
    });
    fetchTeachers().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTeachersCount(data.length);
    });
    fetchFees().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setPaymentsList(data);
      }
    });
  }, []);

  const totalStudents = studentsList.length;
  const presentToday = Math.round(totalStudents * 0.95);
  const absentToday = totalStudents - presentToday;

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Admin Control Center"
        description="Real-time overview of school operations, student enrollment, and financial metrics."
      />

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Students" value={totalStudents} delta="+8%" icon={<Users className="h-5 w-5" />} />
          <StatCard label="Present Today" value={presentToday} delta="+2%" icon={<UserCheck className="h-5 w-5" />} tone="success" />
          <StatCard label="Absent Today" value={absentToday} delta="-4%" icon={<UserX className="h-5 w-5" />} tone="danger" />
          <StatCard label="Teachers" value={teachersCount} icon={<GraduationCap className="h-5 w-5" />} tone="info" />
          <StatCard label="Birthdays Today/Tmr" value={upcomingBirthdaysList.length} icon={<Cake className="h-5 w-5" />} tone="info" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Recent Payments</CardTitle><CardDescription>Latest fee transactions in database</CardDescription></div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/fees/payments">View all</Link></Button>
            </CardHeader>
            <CardContent>
              {paymentsList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No recent payment transactions found.</div>
              ) : (
                <div className="divide-y">
                  {paymentsList.slice(0, 6).map((p) => (
                    <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.studentName || p.student_name}</div>
                        <div className="text-xs text-muted-foreground">{p.id} · {p.month || "Current"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold">₹{Number(p.amount || 0).toLocaleString()}</div>
                        <StatusBadge status={p.status || "Paid"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Birthdays Today & Tomorrow</CardTitle>
              <Cake className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBirthdaysList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No birthdays today or tomorrow.</div>
              ) : (
                upcomingBirthdaysList.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarImage src={b.avatar || "/avatars/student.svg"} /><AvatarFallback>{b.name[0]}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.className}-{b.section} · Roll #{b.rollNo}</div>
                    </div>
                    <Badge variant="secondary">Birthday</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Recent Admissions</CardTitle></div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/students">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentsList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No enrolled students yet.</div>
              ) : (
                studentsList.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
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

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/events">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.filter((e) => e.status === "Upcoming").slice(0, 5).map((e) => (
                <div key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.type} · {e.location}</div>
                  </div>
                  <Badge variant="secondary">{e.date}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
