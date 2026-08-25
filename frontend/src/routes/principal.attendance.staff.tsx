import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Search } from "lucide-react";
import { StatCard, PageHeader } from "@/components/admin/page-primitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, getLocalDateString, computeStaffStatus } from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { getClassTeacherAssignment } from "@/routes/admin.attendance.staff";

export const Route = createFileRoute("/principal/attendance/staff")({
  head: () => ({
    meta: [
      { title: "Staff Attendance | Principal Portal" },
      { name: "description", content: "View staff attendance including check-in, check-out and working hours." },
    ],
  }),
  component: StaffAttendancePage,
});

function StatusBadge({ s }: { s: "Present" | "Absent" | "Half Day" | "Leave" | "Late" | "Checked Out" | "Not Marked" }) {
  const map = {
    Present: "bg-success/15 text-success border-success/30",
    "Checked Out": "bg-indigo-100 text-indigo-700 border-indigo-300",
    Absent: "bg-destructive/10 text-destructive border-destructive/30",
    "Half Day": "bg-warning/20 text-warning-foreground border-warning/40",
    Leave: "bg-purple-100 text-purple-700 border-purple-300",
    Late: "bg-amber-100 text-amber-700 border-amber-300",
    "Not Marked": "bg-slate-100 text-slate-600 border-slate-300",
  } as const;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${(map as any)[s] || map["Not Marked"]}`}>{s}</span>;
}

function StaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string; checkInTimestamp?: string }>>({});
  const [q, setQ] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  const loadData = () => {
    fetchTeachers().then(({ data }) => {
      setTeachersList((data as any) || []);
    });
    fetchStaffAttendanceFromSupabase(selectedDate).then((res) => {
      setLiveAttendanceMap(res || {});
    });
  };

  useAutoRefresh("attendance", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const staffData = useMemo(() => {
    return teachersList.map((t, idx) => {
      const sId = t.id || `STF-${idx}`;
      const rec = liveAttendanceMap[sId] || liveAttendanceMap[t.name];
      const res = computeStaffStatus(rec, selectedDate);

      return {
        id: sId,
        name: t.name,
        assignedClass: getClassTeacherAssignment(sId, t.name),
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        workingHours: res.workingHours,
        status: res.status,
      };
    });
  }, [teachersList, liveAttendanceMap, selectedDate]);

  const classOptions = useMemo(() => Array.from(new Set(staffData.map((s) => s.assignedClass))).filter((c) => c !== "Not Assigned"), [staffData]);
  const filtered = useMemo(
    () =>
      staffData.filter((r) => {
        const matchQ = !q || r.name.toLowerCase().includes(q.toLowerCase());
        const matchC = selectedClass === "all" || r.assignedClass === selectedClass;
        return matchQ && matchC;
      }),
    [staffData, q, selectedClass],
  );

  const present = filtered.filter((r) => r.status === "Present" || r.status === "Checked Out").length;
  const late = filtered.filter((r) => r.status === "Late").length;
  const absent = filtered.filter((r) => r.status === "Absent").length;
  const total = filtered.length;
  const attended = present + late;
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader title="Staff Attendance" description="Live staff attendance overview for today." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Present / Active" value={present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Absent" value={absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
        <StatCard label="Late" value={late} tone="warning" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Attendance %" value={`${pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || getLocalDateString())}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff by name" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Class Assigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-260px)] rounded-lg border">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-100/95 backdrop-blur-md text-xs uppercase text-muted-foreground sticky top-0 z-20">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Staff</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Class Assigned (Class Teacher)</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Check In</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Check Out</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Working Hours</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Status ({selectedDate})</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={r.assignedClass !== "Not Assigned" ? "bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-medium" : "bg-slate-50 text-slate-500 border-slate-200 text-xs font-normal"}>
                      {r.assignedClass}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.checkIn}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.checkOut}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.workingHours}</td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status as any} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
