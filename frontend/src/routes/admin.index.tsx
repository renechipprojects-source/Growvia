import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, UserCheck, UserX, GraduationCap, CreditCard, UserPlus, Sparkles,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchStudents, fetchTeachers, fetchReceipts, type Student } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";
import { useLiveAttendance } from "@/lib/attendanceStore";
import { useEffect, useState, useMemo } from "react";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Sunshine Play School" }] }),
});

function Dashboard() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [currentDateStr, setCurrentDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic daily refresh check
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== currentDateStr) {
        setCurrentDateStr(today);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  const loadData = () => {
    fetchStudents().then(({ data }) => setStudentsList(data || []));
    fetchTeachers().then(({ data }) => setTeachersCount(data?.length || 0));
    fetchReceipts().then(({ data }) => setPaymentsList(data || []));
  };

  // Register real-time auto refresh for students, attendance & fees modules
  useAutoRefresh("students", loadData);
  useAutoRefresh("attendance", loadData);
  useAutoRefresh("staff", loadData);
  useAutoRefresh("fees", loadData);

  useEffect(() => {
    loadData();
  }, [currentDateStr]);

  const totalStudents = studentsList.length;
  const { attendance: liveTodayRecords } = useLiveAttendance(undefined, currentDateStr);
  const presentToday = liveTodayRecords.filter((r) => r.status === "P" || r.status === "L").length;
  const absentToday = liveTodayRecords.filter((r) => r.status === "A" || r.status === "Lv").length;
  const attendancePct = totalStudents > 0 && liveTodayRecords.length > 0 ? Math.round((presentToday / liveTodayRecords.length) * 100) : 0;

  // Filter Today's Payments ONLY
  const todayPayments = useMemo(() => {
    return paymentsList.filter((p) => {
      const pDate = (p.date || p.payment_date || p.paymentDate || p.created_at || "").slice(0, 10);
      const amount = Number(p.amountPaid || p.amount_paid || p.amount || 0);
      return pDate === currentDateStr && amount > 0;
    });
  }, [paymentsList, currentDateStr]);

  // Filter Today's Admissions ONLY
  const todayAdmissions = useMemo(() => {
    return studentsList.filter((s) => {
      const aDate = s.admissionDate?.slice(0, 10);
      return aDate === currentDateStr;
    });
  }, [studentsList, currentDateStr]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto pr-1 w-full max-w-none">
      <PageHeader
        title="Admin Control Center"
        description="Real-time overview of school operations, student enrollment, and financial metrics."
      />

      <div className="mt-4 space-y-6 pb-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Students" value={totalStudents} icon={<Users className="h-5 w-5" />} tone="default" sub={`${totalStudents} Enrolled`} />
          <StatCard label="Present Today" value={presentToday} tone="success" icon={<UserCheck className="h-5 w-5" />} sub={`${attendancePct}% Attendance`} />
          <StatCard label="Absent Today" value={absentToday} tone="warning" icon={<UserX className="h-5 w-5" />} sub={totalStudents > 0 ? "Action required" : "No absences"} />
          <StatCard label="Total Staff" value={teachersCount} tone="purple" icon={<GraduationCap className="h-5 w-5" />} sub={`${teachersCount} Active staff`} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Today's Payments */}
          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Today's Payments</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live dynamic feed" />
                </CardTitle>
                <CardDescription>Fee receipts and collection records recorded today.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/fees/payments">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayPayments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No payments recorded today.</div>
              ) : (
                todayPayments.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/60 p-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.student_name || p.studentName || "Student Payment"}</div>
                        <div className="text-xs text-muted-foreground">{p.receipt_number || p.receiptNo || p.id} · Today</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-600">₹{Number(p.amount_paid || p.amount || 0).toLocaleString()}</div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Today's Admissions */}
          <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today's Admissions</CardTitle>
                <CardDescription>Newly enrolled student profiles today.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/admin/students">View all</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayAdmissions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No new admissions recorded today.</div>
              ) : (
                todayAdmissions.slice(0, 6).map((s) => (
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
        </div>

        <div className="w-full">
          <RecentCircularWidget role="admin" viewAllLink="/admin/circulars" />
        </div>
      </div>
    </div>
  );
}

