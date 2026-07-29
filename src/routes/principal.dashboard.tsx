import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchStudents, fetchTeachers, fetchCirculars, fetchEvents } from "@/lib/supabaseService";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Megaphone,
  Bell,
  Activity,
  ClipboardList,
  ArrowRight,
  Bus,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  students,
  teachers,
  classesList,
  initialCirculars,
  eventsList as initialEvents,
  leaveRequests,
  notifications,
  recentActivities,
  staffAttendance,
  studentAttendance,
} from "@/lib/principal-mock-data";
import { Badge } from "@/components/ui/badge";

import { useLiveAttendance } from "@/lib/attendanceStore";

import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/principal/dashboard")({
  beforeLoad: () => {
    requireAuthGuard("principal");
  },
  head: () => ({
    meta: [
      { title: "Principal Dashboard | Bright Bloom" },
      { name: "description", content: "Overview of school operations, attendance, circulars and events." },
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
  tint?: string;
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
  const [totalStudents, setTotalStudents] = useState(120);
  const [totalTeachers, setTotalTeachers] = useState(18);
  const [recentCirculars, setRecentCirculars] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>(initialEvents);
  const [liveNotifications, setLiveNotifications] = useState<any[]>(notifications);

  const todayStr = new Date().toISOString().slice(0, 10);
  const { attendance: liveToday } = useLiveAttendance(undefined, todayStr);

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      if (data && data.length > 0) setTotalStudents(data.length);
    });
    fetchTeachers().then(({ data }) => {
      if (data && data.length > 0) setTotalTeachers(data.length);
    });
    fetchEvents().then(({ data }) => {
      if (data && data.length > 0) setEventsList(data);
    });
    fetchCirculars().then(({ data }) => {
      setRecentCirculars(data || []);
    });
  }, []);

  const totalClasses = 15;
  const presentFromLive = liveToday.filter((r) => r.status === "P" || r.status === "L").length;
  const studentPresentCount = liveToday.length > 0 ? presentFromLive : Math.round(totalStudents * 0.95);
  const staffPresentCount = Math.round(totalTeachers * 0.95);
  const studentAttendancePct = Math.round((studentPresentCount / (totalStudents || 1)) * 100);
  const staffAttendancePct = Math.round((staffPresentCount / (totalTeachers || 1)) * 100);
  const upcoming = eventsList.slice(0, 4);

  return (
    <div className="w-full max-w-none flex flex-1 min-h-0 flex-col overflow-y-auto space-y-6 pr-1">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 auto-rows-fr">
        <StatCard icon={GraduationCap} label="Total Students" value={totalStudents} sub="Enrolled" gradient="from-blue-500 to-sky-500" />
        <StatCard icon={Users} label="Total Teachers" value={totalTeachers} sub="Active staff" gradient="from-purple-500 to-indigo-500" />
        <StatCard icon={BookOpen} label="Total Classes" value={totalClasses} sub="Across sections" gradient="from-emerald-500 to-teal-500" />
        <StatCard icon={CalendarCheck} label="Student Attendance" value={`${studentAttendancePct}%`} sub={`${studentPresentCount} present today`} gradient="from-amber-500 to-orange-500" />
        <StatCard icon={UserCheck} label="Staff Attendance" value={`${staffAttendancePct}%`} sub={`${staffPresentCount} on duty`} gradient="from-sky-500 to-cyan-500" />
        <Link to="/principal/transport">
          <StatCard icon={Bus} label="Transport Fleet" value="4 Buses" sub="Active routes" gradient="from-cyan-500 to-teal-500" />
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 auto-rows-fr">
        {/* Read-Only Academic Promotion Statistics */}
        <div className="xl:col-span-3 min-w-0">
          <div className="card-elevated p-5 space-y-3 bg-white/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <GraduationCap className="h-4.5 w-4.5 text-indigo-600" /> Read-Only Academic Session Promotion Statistics
              </div>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-xs">
                Academic Year 2026-2027 (Active)
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border">
                <div className="text-slate-500 font-medium">Students Promoted</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">27</div>
                <div className="text-[10px] text-slate-400">Progression Logged</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border">
                <div className="text-slate-500 font-medium">Students Retained</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">2</div>
                <div className="text-[10px] text-slate-400">Same Class Repeat</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border">
                <div className="text-slate-500 font-medium">Students Graduated</div>
                <div className="text-lg font-bold text-purple-700 mt-0.5">5</div>
                <div className="text-[10px] text-slate-400">Alumni Directory</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border">
                <div className="text-slate-500 font-medium">Transferred (TC)</div>
                <div className="text-lg font-bold text-rose-700 mt-0.5">1</div>
                <div className="text-[10px] text-slate-400">History Preserved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Circulars */}
        <div className="xl:col-span-2 min-w-0">
          <RecentCircularWidget role="principal" viewAllLink="/principal/circulars" />
        </div>

        {/* Notifications */}
        <div className="card-elevated p-5 min-w-0 h-full flex flex-col">
          <SectionHeading icon={Bell} title="Live Recent Notifications" />
          <ul className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
            {liveNotifications.map((n) => (
              <li key={n.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.text}</div>
                  <div className="text-xs text-muted-foreground">{n.time || "Just now"}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Upcoming events */}
        <div className="card-elevated p-5 min-w-0 h-full flex flex-col">
          <SectionHeading icon={CalendarDays} title="Upcoming Events" to="/principal/events" />
          <ul className="mt-4 space-y-3">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <div className="w-12 shrink-0 rounded-lg bg-primary/10 text-primary text-center py-1.5">
                  <div className="text-[10px] uppercase font-medium">{new Date(e.date).toLocaleDateString("en", { month: "short" })}</div>
                  <div className="text-lg font-semibold leading-tight">{new Date(e.date).getDate()}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.time} · {e.location}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent activities */}
        <div className="card-elevated p-5 min-w-0 h-full flex flex-col">
          <SectionHeading icon={Activity} title="Recent Student Activities" />
          <ul className="mt-4 space-y-3">
            {recentActivities.map((a) => (
              <li key={a.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                  {a.student.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="text-sm"><span className="font-medium">{a.student}</span> — {a.activity}</div>
                  <div className="text-xs text-muted-foreground">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Leaves */}
        <div className="card-elevated p-5 min-w-0 h-full flex flex-col">
          <SectionHeading icon={ClipboardList} title="Pending Leave Requests" />
          <ul className="mt-4 space-y-3">
            {leaveRequests.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{l.applicant} <span className="text-xs text-muted-foreground">· {l.role}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{l.reason}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{l.from} → {l.to}</div>
                </div>
                <Badge variant="outline" className="text-warning-foreground border-warning/50 bg-warning/10 shrink-0">Pending</Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* Overview */}
        <div className="card-elevated p-5 xl:col-span-3 min-w-0">
          <SectionHeading icon={TrendingUp} title="Quick School Overview" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <MiniStat label="Avg. Attendance" value="94.2%" trend="+1.4%" positive />
            <MiniStat label="Fee Collection" value="87%" trend="+3.1%" positive />
            <MiniStat label="Active Circulars" value={String(recentCirculars.filter((c) => c.status === "Published" || !c.status).length)} trend="This week" />
            <MiniStat label="Open Issues" value="4" trend="-2 today" positive />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  to?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {to && (
        <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function MiniStat({ label, value, trend, positive }: { label: string; value: string; trend?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border p-4">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {trend && (
        <div className={`text-[11px] mt-1 ${positive ? "text-success" : "text-muted-foreground"}`}>{trend}</div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "Low" | "Medium" | "High" }) {
  const cls = {
    High: "bg-destructive/10 text-destructive border-destructive/30",
    Medium: "bg-warning/15 text-warning-foreground border-warning/40",
    Low: "bg-muted text-muted-foreground border-border",
  }[priority];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>{priority}</span>;
}
