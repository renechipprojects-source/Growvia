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
import { cn } from "@/lib/utils";
import { fetchStudents, toCanonicalAdmissionNo, type Student } from "@/lib/supabaseService";
import { useLiveAttendance, getStudentAttendanceDetails, type StudentAttendanceEntry } from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/admin/attendance/students")({
  component: StudentAttendancePage,
  head: () => ({
    meta: [
      { title: "Student Attendance — Sunshine Play School" },
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const { attendance: liveAttendanceRecords } = useLiveAttendance(undefined, selectedDate);

  const loadData = () => {
    fetchStudents().then(({ data }) => {
      setStudentsList(data || []);
    });
  };

  useAutoRefresh("attendance", loadData);
  useAutoRefresh("students", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const classOptions = useMemo(() => {
    const list = Array.from(new Set(studentsList.map((s: any) => s.className || s.class_name || "Playgroup"))).filter(Boolean);
    return list.length > 0 ? list : ["Playgroup", "Nursery", "LKG", "UKG"];
  }, [studentsList]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cls = filterValues["Class"];
    const statusF = filterValues["Status"];

    return studentsList.filter((s: any) => {
      const className = s.className || s.class_name || "Playgroup";
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.admissionNo && s.admissionNo.toLowerCase().includes(q));
      const matchesClass = !cls || cls === "all" || className === cls;

      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      const st = live ? live.status : "unmarked";
      const matchesStatus = !statusF || statusF === "all" || (statusF === "unmarked" ? !live : st === statusF);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [studentsList, search, filterValues, liveAttendanceRecords]);

  // Calculate dynamic summary stats from filtered students & selected date records
  const metrics = useMemo(() => {
    let totalP = 0;
    let totalA = 0;
    let totalL = 0;
    let totalLv = 0;
    let totalMarked = 0;

    filteredStudents.forEach((s: any) => {
      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      if (live) {
        totalMarked++;
        const status = live.status;
        if (status === "P") totalP++;
        else if (status === "A") totalA++;
        else if (status === "L") totalL++;
        else if (status === "Lv") totalLv++;
      }
    });

    const totalStudents = filteredStudents.length;
    const pct = totalMarked > 0 ? Math.round(((totalP + totalL) / totalMarked) * 100) : 0;

    return {
      present: totalP,
      absent: totalA,
      late: totalL,
      leave: totalLv,
      pct,
      totalStudents,
      totalMarked,
    };
  }, [filteredStudents, liveAttendanceRecords]);

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = ["Student ID", "Admission No", "Student Name", "Class", "Section", `Status (${selectedDate})`, "Overall %"];
    const rows = filteredStudents.map((s: any) => {
      const details = getStudentAttendanceDetails(s.id, s);
      const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
      const status = live ? MARK_LABEL[live.status as Mark] : "Not Marked";
      return [s.id, toCanonicalAdmissionNo(s.admissionNo, s.id), s.name, s.className || "Playgroup", s.section || "A", status, `${details.percentage}%`];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row: any) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_attendance_${selectedDate}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Student Attendance Module"
          description="View class-wise attendance records, daily status summary, and detailed student reports."
        />
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard label="Total Students" value={metrics.totalStudents} tone="info" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Present" value={metrics.present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Absent" value={metrics.absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
          <StatCard label="Late" value={metrics.late} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="On Leave" value={metrics.leave} tone="warning" icon={<Plane className="h-5 w-5" />} />
          <StatCard label="Attendance %" value={`${metrics.pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Attendance Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex-1">
            <FilterBar
              searchPlaceholder="Search student by name or admission no..."
              filters={[
                { label: "Class", options: classOptions },
                { label: "Status", options: ["P", "A", "L", "Lv", "unmarked"] },
              ]}
              search={search}
              onSearchChange={setSearch}
              filterValues={filterValues}
              onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
              onExport={handleExportCSV}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <DataTable
          columns={["Student Name", "Adm No.", "Class & Sec", `Status (${selectedDate})`, "Overall %", "Action"]}
          total={filteredStudents.length}
        >
          {filteredStudents.map((s: any) => {
            const live = liveAttendanceRecords.find((r) => r.studentId === s.id);
            const statusMark: Mark | null = live ? (live.status as Mark) : null;
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
                <TableCell className="font-mono text-xs text-muted-foreground">{toCanonicalAdmissionNo(s.admissionNo, s.id)}</TableCell>
                <TableCell>{s.className || "Playgroup"} - {s.section || "A"}</TableCell>
                <TableCell>
                  {statusMark ? (
                    <StatusBadge mark={statusMark} />
                  ) : (
                    <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 text-xs font-normal">
                      Not Marked
                    </Badge>
                  )}
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
                  Adm No: <span className="font-mono">{toCanonicalAdmissionNo(student.admissionNo, student.id)}</span> · Roll No: <span className="font-semibold">{student.rollNo || 1}</span>
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

          {/* Key Metrics Breakdown (4 Tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <MetricTile label="Present Days" value={details.presentDays} color="text-emerald-600" />
            <MetricTile label="Absent Days" value={details.absentDays} color="text-rose-600" />
            <MetricTile label="Late Days" value={details.lateDays} color="text-amber-600" />
            <MetricTile label="Leave Days" value={details.leaveDays} color="text-purple-600" />
          </div>

          {/* Monthly Summary */}
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between shadow-xs">
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Monthly Attendance Report</h4>
              <div className="text-xs text-muted-foreground mt-1">
                Working Days: <b>{details.monthlyReport.workingDays}</b> · Present: <b className="text-emerald-700">{details.monthlyReport.presentDays}</b> · Absent: <b className="text-rose-700">{details.monthlyReport.absentDays}</b> · Late: <b className="text-amber-700">{details.monthlyReport.lateDays}</b> · Leave: <b className="text-purple-700">{details.monthlyReport.leaveDays}</b>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-emerald-700">{details.monthlyReport.percentage}%</div>
              <div className="text-[10px] text-muted-foreground font-medium">Monthly Avg</div>
            </div>
          </div>

          {/* Chronological Attendance History (Dedicated Scrollable Area) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Chronological Attendance History ({details.history.length})</h4>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 bg-white">
                Scrollable History
              </Badge>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white shadow-xs pr-1">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Day</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Marked By</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Time Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.history.length > 0 ? (
                    details.history.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-800">{r.date}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.day || "Weekday"}</td>
                        <td className="px-3 py-2"><StatusBadge mark={r.status} /></td>
                        <td className="px-3 py-2 text-slate-700">{r.markedBy || "Class Teacher"}</td>
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">
                          {r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "08:45 AM"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                        No attendance history records found.
                      </td>
                    </tr>
                  )}
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
