import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Download, Eye, FileText, Calendar, CheckCircle2, XCircle, AlertCircle, Plane } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { students as mockStudents } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { useLiveAttendance, getStudentAttendanceDetails, type StudentAttendanceEntry } from "@/lib/attendanceStore";

export const Route = createFileRoute("/admin/attendance/students")({
  component: StudentAttendancePage,
  head: () => ({
    meta: [
      { title: "Student Attendance — Sunshine ERP" },
      { name: "description", content: "View student attendance records submitted by class teachers. Read-only for admins." },
    ],
  }),
});

type Mark = "P" | "L" | "A" | "Lv";
const MARK_LABEL: Record<Mark, string> = { P: "Present", L: "Late", A: "Absent", Lv: "Leave" };

function StudentAttendancePage() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const { attendance: liveAttendanceRecords } = useLiveAttendance();

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        setStudentsList(data);
      }
    });
  }, []);

  const activeStudents = useMemo(() => {
    return studentsList.length > 0 ? studentsList : (mockStudents as any);
  }, [studentsList]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cls = filterValues["Class"];
    return activeStudents.filter((s: any) => {
      const className = s.className || s.class_name || "Playgroup";
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.admissionNo && s.admissionNo.toLowerCase().includes(q));
      const matchesClass = !cls || cls === "all" || className === cls;
      return matchesSearch && matchesClass;
    });
  }, [activeStudents, search, filterValues]);

  // Calculate dynamic dashboard stats based on filtered student list
  const metrics = useMemo(() => {
    let totalP = 0;
    let totalA = 0;
    let totalL = 0;
    let totalLv = 0;

    filteredStudents.forEach((s: any) => {
      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      const status = live ? live.status : "P";
      if (status === "P") totalP++;
      else if (status === "A") totalA++;
      else if (status === "L") totalL++;
      else if (status === "Lv") totalLv++;
    });

    const totalStudents = filteredStudents.length;
    const pct = totalStudents ? Math.round(((totalP + totalL) / totalStudents) * 100) : 0;

    return {
      present: totalP,
      absent: totalA,
      late: totalL,
      leave: totalLv,
      pct,
      totalStudents,
    };
  }, [filteredStudents, liveAttendanceRecords]);

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = ["Student ID", "Admission No", "Student Name", "Class", "Section", "Status", "Attendance %"];
    const rows = filteredStudents.map((s: any) => {
      const details = getStudentAttendanceDetails(s.id, s);
      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      const status = live ? MARK_LABEL[live.status] : "Present";
      return [s.id, s.admissionNo || "ADM-1001", s.name, s.className || "Playgroup", s.section || "A", status, `${details.percentage}%`];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row: any) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_attendance_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none">
      <PageHeader
        title="Student Attendance Module"
        description="View class-wise attendance records, weekly/monthly breakdown, and detailed student reports."
      />

      <div className="shrink-0 space-y-4">
        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard label="Total Students" value={metrics.totalStudents} tone="info" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Present" value={metrics.present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Absent" value={metrics.absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
          <StatCard label="Late" value={metrics.late} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="On Leave" value={metrics.leave} tone="warning" icon={<Plane className="h-5 w-5" />} />
          <StatCard label="Attendance %" value={`${metrics.pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
        </div>

        <FilterBar
          searchPlaceholder="Search student by name or admission no..."
          filters={[{ label: "Class", options: ["Playgroup", "Nursery", "LKG", "UKG"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Student Name", "Adm No.", "Class & Sec", "Today Status", "Overall %", "Action"]}
          total={filteredStudents.length}
        >
          {filteredStudents.map((s: any) => {
            const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
            const status: Mark = live ? (live.status as Mark) : "P";
            const details = getStudentAttendanceDetails(s.id, s);

            return (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="font-medium py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.avatar} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <span>{s.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{s.admissionNo || s.id}</TableCell>
                <TableCell>{s.className || "Playgroup"} - {s.section || "A"}</TableCell>
                <TableCell>
                  <StatusBadge mark={status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">{details.percentage}%</span>
                    <Progress value={details.percentage} className="h-1.5 w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingStudent(s)}
                    className="text-sky-600 hover:text-sky-700"
                  >
                    <Eye className="mr-1.5 h-4 w-4" /> View Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
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

function StatusBadge({ mark }: { mark: Mark }) {
  const meta: Record<Mark, { label: string; cls: string }> = {
    P: { label: "Present", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    A: { label: "Absent", cls: "bg-rose-100 text-rose-700 border-rose-300" },
    L: { label: "Late", cls: "bg-amber-100 text-amber-700 border-amber-300" },
    Lv: { label: "Leave", cls: "bg-purple-100 text-purple-700 border-purple-300" },
  };
  const item = meta[mark] || meta.P;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-semibold", item.cls)}>
      {item.label}
    </Badge>
  );
}

export function AttendanceDetailsModal({
  student,
  onClose,
}: {
  student: any;
  onClose: () => void;
}) {
  const details = getStudentAttendanceDetails(student.id, student);

  const handleExportStudentHistory = () => {
    const headers = ["Date", "Day", "Status", "Marked By", "Recorded At"];
    const rows = details.history.map((r) => [
      r.date,
      r.day || "Weekday",
      MARK_LABEL[r.status] || r.status,
      r.markedBy || "Teacher",
      new Date(r.updatedAt).toLocaleTimeString(),
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_history_${student.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Student Attendance Details</span>
            <Button size="sm" variant="outline" onClick={handleExportStudentHistory}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Report
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm mt-2">
          {/* Header Tile */}
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 border border-sky-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-sky-300">
                <AvatarImage src={student.avatar} />
                <AvatarFallback>{student.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-base font-bold text-slate-900">{student.name}</div>
                <div className="text-xs text-muted-foreground">
                  Adm No: <span className="font-mono">{student.admissionNo || `ADM-${student.id}`}</span> · Roll No: <span className="font-semibold">{student.rollNo || 1}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Class: {student.className || "Playgroup"} - {student.section || "A"} · Parent: {student.parent || "Parent"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-sky-700">{details.percentage}%</div>
              <div className="text-[11px] text-muted-foreground">Overall Attendance</div>
            </div>
          </div>

          {/* Key Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <MetricTile label="Present Days" value={details.presentDays} color="text-emerald-600" />
            <MetricTile label="Absent Days" value={details.absentDays} color="text-rose-600" />
            <MetricTile label="Late Days" value={details.lateDays} color="text-amber-600" />
            <MetricTile label="Leave Days" value={details.leaveDays} color="text-purple-600" />
            <MetricTile label="Attendance %" value={`${details.percentage}%`} color="text-sky-600" />
          </div>

          {/* Weekly Report */}
          <div className="rounded-2xl border p-4 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Weekly Attendance Summary</h4>
              <Badge className="bg-sky-100 text-sky-700 text-[10px]">{details.weeklyReport.percentage}% Weekly Attendance</Badge>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center pt-2">
              {details.weeklyReport.days.map((d, i) => (
                <div key={d.id || i} className="rounded-xl border p-2 bg-slate-50/50">
                  <div className="text-[10px] text-muted-foreground font-medium">{d.day || `Day ${i + 1}`}</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{d.date}</div>
                  <div className="mt-1.5">
                    <StatusBadge mark={d.status} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t mt-2">
              <span>Present: <b>{details.weeklyReport.totalPresent}</b></span>
              <span>Absent: <b>{details.weeklyReport.totalAbsent}</b></span>
              <span>Late: <b>{details.weeklyReport.totalLate}</b></span>
              <span>Leave: <b>{details.weeklyReport.totalLeave}</b></span>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Monthly Attendance Report</h4>
              <div className="text-xs text-muted-foreground mt-1">
                Working Days: <b>{details.monthlyReport.workingDays}</b> · Present: <b className="text-emerald-700">{details.monthlyReport.presentDays}</b> · Absent: <b className="text-rose-700">{details.monthlyReport.absentDays}</b> · Late: <b className="text-amber-700">{details.monthlyReport.lateDays}</b>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-700">{details.monthlyReport.percentage}%</div>
              <div className="text-[10px] text-muted-foreground">Monthly Avg</div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Chronological Attendance History</h4>
            <div className="max-h-48 overflow-y-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Day</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Marked By</th>
                    <th className="px-3 py-2 text-right font-medium">Time Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {details.history.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{r.date}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.day || "Weekday"}</td>
                      <td className="px-3 py-2"><StatusBadge mark={r.status} /></td>
                      <td className="px-3 py-2">{r.markedBy || "Class Teacher"}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "08:45 AM"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-2.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-base font-bold mt-0.5", color)}>{value}</div>
    </div>
  );
}
