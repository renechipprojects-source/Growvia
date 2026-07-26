import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  students,
  teachers,
  classesList,
  initialCirculars,
  eventsList,
  leaveRequests,
  notifications,
  recentActivities,
  staffAttendance,
  studentAttendance,
} from "@/lib/principal-mock-data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/principal/dashboard")({
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
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  tint: string;
}) {
  return (
    <div className="card-elevated h-full p-5 flex items-start gap-4 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-snug break-words">
          {label}
        </div>
        <div className="text-2xl font-semibold mt-1 leading-tight break-words">{value}</div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-1 leading-snug break-words">{sub}</div>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classesList.length;
  const studentPresent = studentAttendance.filter((s) => s.status === "P").length;
  const staffPresent = staffAttendance.filter((s) => s.status === "Present").length;
  const upcoming = eventsList.slice(0, 4);
  const recentCirculars = initialCirculars.filter((c) => c.status === "Published").slice(0, 4);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 auto-rows-fr">
        <StatCard icon={GraduationCap} label="Total Students" value={totalStudents} sub="Enrolled" tint="bg-primary/10 text-primary" />
        <StatCard icon={Users} label="Total Teachers" value={totalTeachers} sub="Active staff" tint="bg-info/10 text-info" />
        <StatCard icon={BookOpen} label="Total Classes" value={totalClasses} sub="Across sections" tint="bg-accent/40 text-accent-foreground" />
        <StatCard icon={CalendarCheck} label="Student Attendance" value={`${Math.round((studentPresent / studentAttendance.length) * 100)}%`} sub={`${studentPresent} present today`} tint="bg-success/10 text-success" />
        <StatCard icon={UserCheck} label="Staff Attendance" value={`${Math.round((staffPresent / staffAttendance.length) * 100)}%`} sub={`${staffPresent} on duty`} tint="bg-warning/20 text-warning-foreground" />
        <StatCard icon={CalendarDays} label="Upcoming Events" value={eventsList.length} sub="This month" tint="bg-destructive/10 text-destructive" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 auto-rows-fr">
        {/* Circulars */}
        <div className="card-elevated p-5 xl:col-span-2 min-w-0">
          <SectionHeading icon={Megaphone} title="Recent Circulars" to="/principal/circulars" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Recipients</th>
                  <th className="py-2 pr-4 font-medium">Priority</th>
                  <th className="py-2 font-medium">Published</th>
                </tr>
              </thead>
              <tbody>
                {recentCirculars.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {c.recipients.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3 text-muted-foreground text-xs whitespace-nowrap">{c.publishDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-elevated p-5 min-w-0 h-full flex flex-col">
          <SectionHeading icon={Bell} title="Recent Notifications" />
          <ul className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <li key={n.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm">{n.text}</div>
                  <div className="text-xs text-muted-foreground">{n.time}</div>
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
            <MiniStat label="Active Circulars" value={String(initialCirculars.filter((c) => c.status === "Published").length)} trend="This week" />
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
