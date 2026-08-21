import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, getLocalDateString } from "@/lib/attendanceStore";

import { useAutoRefresh } from "@/lib/autoRefreshContext";

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
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string }>>({});
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");

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

      let status = "Not Marked";
      let checkIn = "—";
      let checkOut = "—";
      let workingHours = "—";

      if (rec && rec.checkIn && rec.checkIn !== "—") {
        checkIn = rec.checkIn;
        checkOut = rec.checkOut || "—";
        workingHours = rec.workingHours || "—";

        if (rec.checkOut && rec.checkOut !== "—") {
          status = "Checked Out";
        } else {
          status = rec.status || "Present";
        }
      }

      return {
        id: sId,
        name: t.name,
        department: (t as any).department || "Not Assigned",
        checkIn,
        checkOut,
        workingHours,
        status,
      };
    });
  }, [teachersList, liveAttendanceMap]);

  const departments = useMemo(() => Array.from(new Set(staffData.map((s) => s.department))), [staffData]);
  const filtered = useMemo(
    () =>
      staffData.filter((r) => {
        const matchQ = !q || r.name.toLowerCase().includes(q.toLowerCase());
        const matchD = dept === "all" || r.department === dept;
        return matchQ && matchD;
      }),
    [staffData, q, dept],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none">
      <PageHeader title="Staff Attendance" description="Live staff attendance overview for today." />

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff by name" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || getLocalDateString())}
            className="md:w-44 h-10 bg-white text-xs font-semibold border-slate-300 shadow-sm"
          />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-260px)] rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-100/95 backdrop-blur-md text-xs uppercase text-muted-foreground sticky top-0 z-20">
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Staff</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Department</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Check In</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Check Out</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Working Hours</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                    </td>
                    <td className="px-4 py-3">{r.department}</td>
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
