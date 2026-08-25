import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Download } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, getLocalDateString, computeStaffStatus } from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { cn } from "@/lib/utils";

import { readAssignments } from "@/lib/classAssignmentContext";
import { getStoredMasterClasses } from "@/lib/masterClassesStore";

export const Route = createFileRoute("/admin/attendance/staff")({
  component: StaffAttendancePage,
  head: () => ({
    meta: [
      { title: "Staff Attendance — Sunshine Play School" },
      { name: "description", content: "View staff attendance records captured by the office/admin attendance system." },
    ],
  }),
});

type StaffStatus = "Not Marked" | "Present" | "Late" | "Absent" | "Leave" | "Checked Out";

interface StaffAttendanceRow {
  id: string;
  name: string;
  assignedClass: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string;
  status: StaffStatus;
  avatar: string;
}

export function getClassTeacherAssignment(teacherId: string, teacherName: string): string {
  const assignments = readAssignments();
  const activeCT = assignments.find(
    (a) =>
      a.role === "class" &&
      a.status === "active" &&
      (a.teacherId === teacherId || a.teacherName.toLowerCase() === teacherName.toLowerCase())
  );
  if (activeCT) {
    return `${activeCT.className} - ${activeCT.section}`;
  }

  const masterClasses = getStoredMasterClasses();
  const masterCT = masterClasses.find(
    (m) =>
      m.classTeacher &&
      m.classTeacher !== "Unassigned" &&
      (m.classTeacher.toLowerCase() === teacherName.toLowerCase() || (m as any).teacherId === teacherId)
  );
  if (masterCT) {
    return `${masterCT.name || masterCT.className} - ${masterCT.section || "A"}`;
  }

  return "Not Assigned";
}

function StaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string; checkInTimestamp?: string }>>({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const loadData = useCallback(() => {
    fetchTeachers().then(({ data }) => {
      setTeachersList(data || []);
    });
    fetchStaffAttendanceFromSupabase(selectedDate).then((res) => {
      setLiveAttendanceMap(res || {});
    });
  }, [selectedDate]);

  useAutoRefresh("attendance", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
  }, [loadData, selectedDate]);

  const rows: StaffAttendanceRow[] = useMemo(() => {
    return teachersList.map((s, i) => {
      const sId = s.id || `STF-${i}`;
      const rec = liveAttendanceMap[sId] || liveAttendanceMap[s.name];
      const res = computeStaffStatus(rec, selectedDate);

      return {
        id: sId,
        name: s.name,
        assignedClass: getClassTeacherAssignment(sId, s.name),
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        workingHours: res.workingHours,
        status: res.status as StaffStatus,
        avatar: s.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`,
      };
    });
  }, [teachersList, liveAttendanceMap, selectedDate]);

  const classOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.assignedClass))).filter((c) => c !== "Not Assigned"),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const assignedC = filterValues["Class Assigned"];
    const status = filterValues["Status"];
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (assignedC && assignedC !== "all" && r.assignedClass !== assignedC) return false;
      if (status && status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [rows, search, filterValues]);

  const present = filtered.filter((r) => r.status === "Present" || r.status === "Checked Out").length;
  const late = filtered.filter((r) => r.status === "Late").length;
  const absent = filtered.filter((r) => r.status === "Absent").length;
  const total = filtered.length;
  const attended = present + late;
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Staff Name", "Class Assigned (Class Teacher)", "Check-in", "Check-out", "Working Hours", `Status (${selectedDate})`];
    const rowsList = filtered.map(r => [r.name, r.assignedClass, r.checkIn || "—", r.checkOut || "—", r.workingHours, r.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rowsList.map(row => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Staff Attendance"
          description="View real-time staff attendance recorded by the office attendance system."
        />
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Present" value={present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Absent" value={absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
          <StatCard label="Late" value={late} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Attendance %" value={`${pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || getLocalDateString())}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex-1">
            <FilterBar
              searchPlaceholder="Search staff by name..."
              filters={[
                { label: "Class Assigned", options: classOptions },
                { label: "Status", options: ["Present", "Late", "Absent", "Not Marked"] },
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
          columns={[
            "Staff",
            "Class Assigned (Class Teacher)",
            "Check-in",
            "Check-out",
            "Working Hours",
            "Status",
          ]}
          total={filtered.length}
        >
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.avatar} />
                    <AvatarFallback>{r.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>{r.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={r.assignedClass !== "Not Assigned" ? "bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-medium" : "bg-slate-50 text-slate-500 border-slate-200 text-xs font-normal"}>
                  {r.assignedClass}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.checkIn ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{r.checkOut ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{r.workingHours}</TableCell>
              <TableCell>
                <StatusPill status={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StaffStatus }) {
  if (status === "Not Marked") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-normal text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Not Marked
      </span>
    );
  }
  const dot =
    status === "Present"
      ? "bg-emerald-500"
      : status === "Late"
        ? "bg-amber-500"
        : "bg-rose-500";
  const text =
    status === "Present"
      ? "text-emerald-700"
      : status === "Late"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        text,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {status}
    </span>
  );
}
