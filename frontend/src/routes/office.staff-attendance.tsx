import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Download, Search, ShieldCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, getLocalDateString, computeStaffStatus } from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { cn } from "@/lib/utils";

import { getClassTeacherAssignment } from "@/routes/admin.attendance.staff";
import { StaffProfileModal } from "@/components/staff/StaffProfileModal";

export const Route = createFileRoute("/office/staff-attendance")({
  component: OfficeStaffAttendancePage,
  head: () => ({
    meta: [
      { title: "Staff Attendance Register — Office Portal" },
      { name: "description", content: "View real-time staff attendance, Time In, Time Out, and working hours." },
    ],
  }),
});

export type StaffStatus = "Present" | "Late" | "Absent" | "Leave" | "Checked Out" | "Not Marked";

export interface StaffRowState {
  id: string;
  name: string;
  assignedClass: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: StaffStatus;
  avatar: string;
}

function OfficeStaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string; checkInTimestamp?: string }>>({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

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

  const rows: StaffRowState[] = useMemo(() => {
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
    const headers = ["Staff Name", "Class Assigned (Class Teacher)", "Status", "Time In", "Time Out", "Working Hours", "Date"];
    const rowsCsv = filtered.map((r) => [
      `"${r.name}"`,
      `"${r.assignedClass}"`,
      `"${r.status}"`,
      `"${r.checkIn}"`,
      `"${r.checkOut}"`,
      `"${r.workingHours}"`,
      `"${selectedDate}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rowsCsv.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `office_staff_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Staff Attendance Register"
          description="Read-only monitoring register of staff self-service Time In and Time Out records."
        />
        <Badge variant="outline" className="py-1.5 px-3 bg-slate-50 border-slate-200 text-slate-700 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Read-Only View
        </Badge>
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Present / Active" value={present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
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
                { label: "Status", options: ["Present", "Late", "Checked Out", "Absent", "Not Marked"] },
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
            "Status",
            "Time In (Check-In)",
            "Time Out (Check-Out)",
            "Working Hours",
          ]}
          total={filtered.length}
        >
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedStaffId(r.id)}
                  className="flex items-center gap-2 text-left hover:text-primary transition-colors group focus:outline-none"
                  title="View Authoritative Staff Profile"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={r.avatar} />
                    <AvatarFallback>{r.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-primary">{r.name}</div>
                  </div>
                </button>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={r.assignedClass !== "Not Assigned" ? "bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-medium" : "bg-slate-50 text-slate-500 border-slate-200 text-xs font-normal"}>
                  {r.assignedClass}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 border",
                    r.status === "Present"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r.status === "Late"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : r.status === "Checked Out"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : r.status === "Absent"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  )}
                >
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.checkIn}</TableCell>
              <TableCell className="font-mono text-xs">{r.checkOut}</TableCell>
              <TableCell className="font-mono text-xs font-semibold text-slate-700">{r.workingHours}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>

      <StaffProfileModal
        open={Boolean(selectedStaffId)}
        onClose={() => setSelectedStaffId(null)}
        staffId={selectedStaffId || undefined}
        readOnly={true}
      />
    </div>
  );
}
