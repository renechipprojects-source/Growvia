import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Info, Eye } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { studentAttendance as initialAttendance } from "@/lib/principal-mock-data";
import { useLiveAttendance, getStudentAttendanceDetails } from "@/lib/attendanceStore";
import { AttendanceDetailsModal } from "@/routes/admin.attendance.students";

export const Route = createFileRoute("/principal/attendance/students")({
  head: () => ({
    meta: [
      { title: "Student Attendance | Principal Portal" },
      { name: "description", content: "View student attendance marked by teachers." },
    ],
  }),
  component: StudentAttendancePage,
});

function StatusPill({ s }: { s: "P" | "A" | "L" | "Lv" }) {
  const map = {
    P: "bg-success/15 text-success border-success/30",
    A: "bg-destructive/10 text-destructive border-destructive/30",
    L: "bg-warning/20 text-warning-foreground border-warning/40",
    Lv: "bg-purple-100 text-purple-700 border-purple-300",
  } as const;
  const label = { P: "Present", A: "Absent", L: "Late", Lv: "Leave" }[s];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[s]}`}>{s} · {label}</span>;
}

function StudentAttendancePage() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [viewingStudent, setViewingStudent] = useState<any | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const { attendance: liveAttendanceRecords } = useLiveAttendance();

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      if (data && data.length > 0) setStudentsList(data);
    });
  }, []);

  const attendanceData = useMemo(() => {
    const list = studentsList.length > 0 ? studentsList : (initialAttendance as any);
    return list.map((s: any, idx: number) => {
      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      const st = live ? live.status : "P";
      return {
        id: s.id || `ATT-${idx}`,
        name: s.name,
        className: s.className || "Nursery",
        section: s.section || "A",
        status: st as "P" | "A" | "L" | "Lv",
        admissionNo: s.admissionNo || `ADM-${1000 + idx}`,
        rollNo: s.rollNo || idx + 1,
        parent: s.parent || "Parent",
        rawStudent: s,
      };
    });
  }, [studentsList, liveAttendanceRecords]);

  const filtered = useMemo(
    () =>
      attendanceData.filter((r: any) => {
        const matchQ = !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.className.toLowerCase().includes(q.toLowerCase());
        const matchS = status === "all" || r.status === status;
        const matchC = selectedClass === "all" || r.className === selectedClass;
        return matchQ && matchS && matchC;
      }),
    [attendanceData, q, status, selectedClass],
  );

  const summary = useMemo(() => {
    const p = filtered.filter((x: any) => x.status === "P").length;
    const a = filtered.filter((x: any) => x.status === "A").length;
    const l = filtered.filter((x: any) => x.status === "L").length;
    const lv = filtered.filter((x: any) => x.status === "Lv").length;
    const total = filtered.length;
    const pct = total ? Math.round(((p + l) / total) * 100) : 0;
    return { p, a, l, lv, total, pct };
  }, [filtered]);

  return (
    <div className="w-full max-w-none space-y-4">
      <PageHeader
        title="Student Attendance Module"
        description="Live view of student attendance with class-wise statistics and comprehensive reporting."
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SummaryCard label="Total Students" value={summary.total} tint="bg-primary/10 text-primary" />
        <SummaryCard label="Present" value={summary.p} tint="bg-success/15 text-success" />
        <SummaryCard label="Absent" value={summary.a} tint="bg-destructive/10 text-destructive" />
        <SummaryCard label="Late" value={summary.l} tint="bg-warning/20 text-warning-foreground" />
        <SummaryCard label="On Leave" value={summary.lv} tint="bg-purple-100 text-purple-700" />
        <SummaryCard label="Attendance %" value={`${summary.pct}%`} tint="bg-sky-100 text-sky-700" />
      </div>

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student name or class..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="Playgroup">Playgroup</SelectItem>
              <SelectItem value="Nursery">Nursery</SelectItem>
              <SelectItem value="LKG">LKG</SelectItem>
              <SelectItem value="UKG">UKG</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="P">Present</SelectItem>
              <SelectItem value="A">Absent</SelectItem>
              <SelectItem value="L">Late</SelectItem>
              <SelectItem value="Lv">Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 rounded-md bg-info/10 border border-info/30 text-info-foreground text-xs px-3 py-2 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-info shrink-0" />
          Live synchronized attendance data across all classes. Click "View Details" to view student historical reports.
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-left px-4 py-3 font-medium">Class & Sec</th>
                  <th className="text-left px-4 py-3 font-medium">Today Status</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.className} - {r.section}</td>
                    <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setViewingStudent(r.rawStudent || r)} className="text-sky-600">
                        <Eye className="w-4 h-4 mr-1" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewingStudent && (
        <AttendanceDetailsModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        <div className="text-2xl font-bold mt-0.5">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${tint}`}>
        {value}
      </div>
    </div>
  );
}
