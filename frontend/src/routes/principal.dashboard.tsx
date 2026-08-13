import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { fetchStudents, fetchTeachers, fetchReceipts, type Student } from "@/lib/supabaseService";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  UserCheck,
  CreditCard,
  UserPlus,
  Bus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveAttendance } from "@/lib/attendanceStore";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";
import { requireAuthGuard } from "@/lib/auth";
import { getPrincipalDashboardStats } from "@/lib/dashboardStatsService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { AnnualPromotionLifecycleSection } from "@/components/promotion/AnnualPromotionLifecycleSection";

import { syncTransportFromSupabase, getStoredVehicles, getStoredRoutes } from "@/modules/transport/transportStore";

export const Route = createFileRoute("/principal/dashboard")({
  beforeLoad: () => {
    requireAuthGuard("principal");
  },
  head: () => ({
    meta: [
      { title: "Principal Dashboard | Sunshine Play School" },
      { name: "description", content: "Overview of school operations, attendance, circulars and enrollment." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient = "from-blue-500 to-sky-500",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  gradient?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 min-w-0">
      <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10 bg-gradient-to-br ${gradient} blur-2xl pointer-events-none group-hover:opacity-25 transition-opacity duration-300`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{label}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500 font-medium truncate">{sub}</div>}
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md shadow-slate-900/10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [vehiclesCount, setVehiclesCount] = useState<number | null>(null);
  const [routesCount, setRoutesCount] = useState<number | null>(null);
  const [transportLoading, setTransportLoading] = useState(true);
  const [currentDateStr, setCurrentDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic daily refresh check (resets at midnight / date change)
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = new Date().toISOString().slice(0, 10);
      if (nowStr !== currentDateStr) {
        setCurrentDateStr(nowStr);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  const { attendance: liveToday } = useLiveAttendance(undefined, currentDateStr);

  const loadData = () => {
    fetchStudents().then(({ data }) => setStudentsList(data || []));
    fetchTeachers().then(({ data }) => setTeachersCount(data?.length || 0));
    fetchReceipts().then(({ data }) => setPaymentsList(data || []));
    syncTransportFromSupabase().then(() => {
      setVehiclesCount(getStoredVehicles().length);
      setRoutesCount(getStoredRoutes().length);
      setTransportLoading(false);
    });
  };

  useAutoRefresh("students", loadData);
  useAutoRefresh("attendance", loadData);
  useAutoRefresh("staff", loadData);
  useAutoRefresh("fees", loadData);
  useAutoRefresh("transport", loadData);

  useEffect(() => {
    loadData();
    window.addEventListener("sunshine-transport-update", loadData);
    return () => {
      window.removeEventListener("sunshine-transport-update", loadData);
    };
  }, [currentDateStr]);

  const totalStudents = studentsList.length;
  const studentPresentCount = liveToday.filter((r) => r.status === "P" || r.status === "L").length;
  const studentAttendancePct = liveToday.length > 0 ? Math.round((studentPresentCount / liveToday.length) * 100) : 0;

  // Filter Today's Payments only
  const todayPayments = useMemo(() => {
    return paymentsList.filter((pay: any) => {
      const payDate = (pay.date || pay.paymentDate || pay.payment_date || pay.created_at || "").slice(0, 10);
      const amount = Number(pay.amountPaid ?? pay.amount_paid ?? pay.amount ?? 0);
      return payDate === currentDateStr && amount > 0;
    });
  }, [paymentsList, currentDateStr]);

  // Filter Today's Admissions only
  const todayAdmissions = useMemo(() => {
    return studentsList.filter((s) => {
      const aDate = s.admissionDate?.slice(0, 10);
      return aDate === currentDateStr;
    });
  }, [studentsList, currentDateStr]);

  return (
    <div className="w-full max-w-none flex flex-1 min-h-0 flex-col overflow-y-auto space-y-6 pr-1">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Total Students" value={totalStudents} sub={`${totalStudents} Enrolled`} gradient="from-blue-500 to-sky-500" />
        <StatCard icon={Users} label="Total Teachers" value={teachersCount} sub={`${teachersCount} Active staff`} gradient="from-purple-500 to-indigo-500" />
        <StatCard icon={CalendarCheck} label="Student Attendance" value={`${studentAttendancePct}%`} sub={`${studentPresentCount} present today`} gradient="from-emerald-500 to-teal-500" />
        <Link to="/principal/transport" className="min-w-0 block">
          <StatCard
            icon={Bus}
            label="Transport Fleet"
            value={transportLoading ? "..." : `${vehiclesCount ?? 0} ${vehiclesCount === 1 ? "Vehicle" : "Vehicles"}`}
            sub={transportLoading ? "Loading fleet..." : `${routesCount ?? 0} Active ${routesCount === 1 ? "Route" : "Routes"}`}
            gradient="from-amber-500 to-orange-500"
          />
        </Link>
      </div>

      {/* Main Grid: Today's Payments & Admissions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Payments */}
        <Card className="rounded-3xl border-white/60 bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Payments</CardTitle>
              <CardDescription>Fee receipts recorded today.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/principal/fees">View all</Link>
            </Button>
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
                      <div className="text-xs text-muted-foreground">{p.receipt_number || p.id} · Today</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-600">₹{(p.amount_paid || p.amount || 0).toLocaleString()}</div>
                    <Badge variant="outline" className="text-[10px]">Paid</Badge>
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
            <Button variant="ghost" size="sm" asChild>
              <Link to="/principal/students">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAdmissions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No new admissions recorded today.</div>
            ) : (
              todayAdmissions.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.avatar || "/avatars/student.svg"} />
                    <AvatarFallback>{s.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.className}-{s.section} · {s.admissionNo}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>


      {/* Principal Circulars Manager & Broadcast Widget */}
      <div className="w-full">
        <RecentCircularWidget role="principal" viewAllLink="/principal/circulars" />
      </div>
    </div>
  );
}
