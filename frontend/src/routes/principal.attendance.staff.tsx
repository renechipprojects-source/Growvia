import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, saveStaffAttendanceRecord } from "@/lib/attendanceStore";

export const Route = createFileRoute("/principal/attendance/staff")({
  head: () => ({
    meta: [
      { title: "Staff Attendance | Principal Portal" },
      { name: "description", content: "View staff attendance including check-in, check-out and working hours." },
    ],
  }),
  component: StaffAttendancePage,
});

function StatusBadge({ s }: { s: "Present" | "Absent" | "Half Day" | "Leave" }) {
  const map = {
    Present: "bg-success/15 text-success border-success/30",
    Absent: "bg-destructive/10 text-destructive border-destructive/30",
    "Half Day": "bg-warning/20 text-warning-foreground border-warning/40",
    Leave: "bg-muted text-muted-foreground border-border",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${map[s] || map.Present}`}>{s}</span>;
}

function StaffAttendancePage() {
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string }>>({});
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");

  const loadData = () => {
    fetchTeachers().then(({ data }) => {
      setTeachersList((data as any) || []);
    });
    fetchStaffAttendanceFromSupabase().then((res) => {
      setLiveAttendanceMap(res || {});
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = (staffId: string, staffName: string, newStatus: string) => {
    setLiveAttendanceMap((prev) => ({
      ...prev,
      [staffId]: {
        status: newStatus,
        checkIn: prev[staffId]?.checkIn || "08:30 AM",
        checkOut: prev[staffId]?.checkOut || "04:30 PM",
      },
    }));
    saveStaffAttendanceRecord(staffId, staffName, newStatus);
  };

  const staffData = useMemo(() => {
    return teachersList.map((t, idx) => {
      const sId = t.id || `STF-${idx}`;
      const rec = liveAttendanceMap[sId] || liveAttendanceMap[t.name];
      return {
        id: sId,
        name: t.name,
        department: (t as any).department || (idx % 3 === 0 ? "Academic" : idx % 3 === 1 ? "Administration" : "Sports"),
        checkIn: rec?.checkIn || "08:30 AM",
        checkOut: rec?.checkOut || "04:30 PM",
        workingHours: "8h 00m",
        status: (rec?.status || "Present") as "Present" | "Absent" | "Half Day" | "Leave",
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
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Staff</th>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium">Check In</th>
                  <th className="text-left px-4 py-3 font-medium">Check Out</th>
                  <th className="text-left px-4 py-3 font-medium">Working Hours</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                    </td>
                    <td className="px-4 py-3">{r.department}</td>
                    <td className="px-4 py-3">{r.checkIn}</td>
                    <td className="px-4 py-3">{r.checkOut}</td>
                    <td className="px-4 py-3">{r.workingHours}</td>
                    <td className="px-4 py-3"><StatusBadge s={r.status} /></td>
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
