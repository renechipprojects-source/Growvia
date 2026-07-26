import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, UserCheck, UserX, GraduationCap, Cake, CalendarClock,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  students, payments, upcomingBirthdays, events, staff,
} from "@/lib/admin-mock-data";

import { fetchStudents, fetchTeachers } from "@/lib/supabaseService";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sunshine ERP" }] }),
});

function Dashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [teachersCount, setTeachersCount] = useState(0);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTotalStudents(data.length);
    });
    fetchTeachers().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTeachersCount(data.length);
    });
  }, []);

  const presentToday = Math.round(totalStudents * 0.95);
  const absentToday = totalStudents - presentToday;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Welcome back, Meera 👋"
        description="Here's what's happening at TinySteps today, 14 Nov 2025."
      />

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={totalStudents} delta="+8%" icon={<Users className="h-5 w-5" />} />
          <StatCard label="Present Today" value={presentToday} delta="+2%" icon={<UserCheck className="h-5 w-5" />} tone="success" />
          <StatCard label="Absent Today" value={absentToday} delta="-4%" icon={<UserX className="h-5 w-5" />} tone="danger" />
          <StatCard label="Teachers" value={teachersCount} icon={<GraduationCap className="h-5 w-5" />} tone="info" />
          <StatCard label="Upcoming Birthdays" value={upcomingBirthdays.length} icon={<Cake className="h-5 w-5" />} tone="info" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Recent Payments</CardTitle><CardDescription>Latest fee transactions</CardDescription></div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/fees/payments">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {payments.slice(0, 6).map((p) => (
                  <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.studentName}</div>
                      <div className="text-xs text-muted-foreground">{p.invoice} · {p.method} · {p.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">₹{p.amount.toLocaleString()}</div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Birthdays</CardTitle>
              <Cake className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBirthdays.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={b.avatar} /><AvatarFallback>{b.name[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">Turning {b.age} · {b.className}</div>
                  </div>
                  <Badge variant="secondary">{b.date}</Badge>
                </div>
              ))}
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
              {students.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={s.avatar} /><AvatarFallback>{s.name[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.className} · {s.admissionNo}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
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
