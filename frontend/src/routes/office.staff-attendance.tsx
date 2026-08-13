import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Save, Download, Search, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { fetchStaffAttendanceFromSupabase, saveStaffAttendanceRecord } from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { StaffProfileModal } from "@/components/staff/StaffProfileModal";

export const Route = createFileRoute("/office/staff-attendance")({
  component: OfficeStaffAttendancePage,
  head: () => ({
    meta: [
      { title: "Staff Attendance Register — Office Portal" },
      { name: "description", content: "Mark staff attendance with In Time, Out Time, working hours and status." },
    ],
  }),
});

type StaffStatus = "Not Marked" | "Present" | "Late" | "Absent" | "Leave";

interface StaffRowState {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: StaffStatus;
  avatar: string;
}

const DEPARTMENTS: Record<string, string> = {
  Teacher: "Academics",
  Caretaker: "Child Care",
  Helper: "Support",
  Admin: "Administration",
};

function OfficeStaffAttendancePage() {
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, { status: string; checkIn: string; checkOut: string }>>({});
  const [rowEdits, setRowEdits] = useState<Record<string, { checkIn: string; checkOut: string; status: StaffStatus }>>({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const { triggerModuleRefresh } = useAutoRefresh();

  const loadData = useCallback(() => {
    fetchTeachers().then(({ data }) => {
      setTeachersList(data || []);
    });
    fetchStaffAttendanceFromSupabase().then((res) => {
      setLiveAttendanceMap(res || {});
    });
  }, []);

  useAutoRefresh("attendance", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEffectiveState = useCallback((sId: string, sName: string) => {
    const rec = liveAttendanceMap[sId] || liveAttendanceMap[sName];
    const edited = rowEdits[sId];

    if (edited) {
      return edited;
    }

    const hasRecord = Boolean(rec && rec.status);
    const status = hasRecord ? (rec.status as StaffStatus) : "Not Marked";
    const checkIn = rec?.checkIn || (status === "Present" ? "08:30 AM" : status === "Late" ? "09:15 AM" : "—");
    const checkOut = rec?.checkOut || (status === "Present" || status === "Late" ? "04:30 PM" : "—");

    return { status, checkIn, checkOut };
  }, [liveAttendanceMap, rowEdits]);

  const handleUpdateRow = (staffId: string, staffName: string, field: "status" | "checkIn" | "checkOut", value: string) => {
    const current = getEffectiveState(staffId, staffName);
    let nextStatus = current.status;
    let nextIn = current.checkIn;
    let nextOut = current.checkOut;

    if (field === "status") {
      nextStatus = value as StaffStatus;
      if (nextStatus === "Present") {
        if (nextIn === "—") nextIn = "08:30 AM";
        if (nextOut === "—") nextOut = "04:30 PM";
      } else if (nextStatus === "Late") {
        if (nextIn === "—") nextIn = "09:15 AM";
        if (nextOut === "—") nextOut = "04:30 PM";
      } else if (nextStatus === "Absent" || nextStatus === "Leave" || nextStatus === "Not Marked") {
        nextIn = "—";
        nextOut = "—";
      }
    } else if (field === "checkIn") {
      nextIn = value;
    } else if (field === "checkOut") {
      nextOut = value;
    }

    setRowEdits((prev) => ({
      ...prev,
      [staffId]: {
        status: nextStatus,
        checkIn: nextIn,
        checkOut: nextOut,
      },
    }));
  };

  const handleSaveStaffAttendance = async (staffId: string, staffName: string) => {
    const currentState = getEffectiveState(staffId, staffName);
    if (!currentState.status || currentState.status === "Not Marked") {
      toast.error(`Please select an attendance status for ${staffName} before saving.`);
      return;
    }
    if ((currentState.status === "Present" || currentState.status === "Late") && (!currentState.checkIn || currentState.checkIn === "—" || !currentState.checkOut || currentState.checkOut === "—")) {
      toast.error(`Please provide valid Check In and Check Out times for ${staffName}.`);
      return;
    }
    await saveStaffAttendanceRecord(staffId, staffName, currentState.status, currentState.checkIn, currentState.checkOut);
    setLiveAttendanceMap((prev) => ({
      ...prev,
      [staffId]: {
        status: currentState.status,
        checkIn: currentState.checkIn,
        checkOut: currentState.checkOut,
      },
    }));
    triggerModuleRefresh("attendance");
    toast.success(`Saved attendance for ${staffName} (${currentState.status})`);
  };

  const handleSaveAll = async () => {
    const invalidList = teachersList.filter((t, idx) => {
      const sId = t.id || `STF-${idx}`;
      const state = getEffectiveState(sId, t.name);
      if (!state.status || state.status === "Not Marked") return true;
      if ((state.status === "Present" || state.status === "Late") && (!state.checkIn || state.checkIn === "—" || !state.checkOut || state.checkOut === "—")) return true;
      return false;
    });

    if (invalidList.length > 0) {
      toast.error(`Please select a status and valid timings for all staff members before saving (Found ${invalidList.length} incomplete).`);
      return;
    }

    const entries = teachersList.map((t, idx) => {
      const sId = t.id || `STF-${idx}`;
      const state = getEffectiveState(sId, t.name);
      return saveStaffAttendanceRecord(sId, t.name, state.status, state.checkIn, state.checkOut);
    });
    await Promise.all(entries);
    triggerModuleRefresh("attendance");
    toast.success(`Saved all staff attendance records successfully!`);
  };

  const rows: StaffRowState[] = useMemo(() => {
    return teachersList.map((s, i) => {
      const sId = s.id || `STF-${i}`;
      const state = getEffectiveState(sId, s.name);

      let workingHours = "—";
      if (state.status === "Present") workingHours = "8h 00m";
      else if (state.status === "Late") workingHours = "7h 15m";
      else if (state.status === "Absent" || state.status === "Leave") workingHours = "0h 00m";

      return {
        id: sId,
        name: s.name,
        employeeId: sId,
        department: (s as any).department || "Not Assigned",
        designation: (s as any).role || "Teacher",
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        workingHours,
        status: state.status,
        avatar: s.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`,
      };
    });
  }, [teachersList, getEffectiveState]);

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dept = filterValues["Department"];
    const status = filterValues["Status"];
    return rows.filter((r) => {
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.employeeId.toLowerCase().includes(q)
      )
        return false;
      if (dept && dept !== "all" && r.department !== dept) return false;
      if (status && status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [rows, search, filterValues]);

  const markedRows = rows.filter((r) => r.status !== "Not Marked");
  const present = rows.filter((r) => r.status === "Present").length;
  const late = rows.filter((r) => r.status === "Late").length;
  const absent = rows.filter((r) => r.status === "Absent").length;
  const pct = markedRows.length
    ? Math.round(((present + late) / markedRows.length) * 100)
    : 0;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Employee ID", "Name", "Department", "Designation", "In Time (Check-In)", "Out Time (Check-Out)", "Working Hours", "Status"];
    const rowsList = filtered.map(r => [r.employeeId, r.name, r.department, r.designation, r.checkIn, r.checkOut, r.workingHours, r.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rowsList.map(row => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `office_staff_attendance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Staff Attendance Register"
          description="Mark staff attendance with In Time, Out Time, working hours and status."
        />
        <Button onClick={handleSaveAll} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
          <Save className="mr-1.5 h-4 w-4" /> Save All Attendance
        </Button>
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Present" value={present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Absent" value={absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
          <StatCard label="Late" value={late} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Attendance %" value={`${pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
        </div>

        <FilterBar
          searchPlaceholder="Search staff or employee ID..."
          filters={[
            { label: "Department", options: departments },
            { label: "Status", options: ["Present", "Late", "Absent", "Not Marked"] },
          ]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <DataTable
          columns={[
            "Staff",
            "Employee ID",
            "Department",
            "Status",
            "In Time (Check-In)",
            "Out Time (Check-Out)",
            "Working Hours",
            "Action",
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
                    <div className="text-[11px] text-muted-foreground">{r.designation}</div>
                  </div>
                </button>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.employeeId}</TableCell>
              <TableCell>{r.department}</TableCell>
              <TableCell>
                <Select value={r.status} onValueChange={(val) => handleUpdateRow(r.id, r.name, "status", val)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs font-semibold bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Marked">Not Marked</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={r.checkIn}
                  onChange={(e) => handleUpdateRow(r.id, r.name, "checkIn", e.target.value)}
                  placeholder="08:30 AM"
                  className="w-24 h-8 text-xs font-mono bg-white"
                  disabled={r.status === "Absent" || r.status === "Leave" || r.status === "Not Marked"}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={r.checkOut}
                  onChange={(e) => handleUpdateRow(r.id, r.name, "checkOut", e.target.value)}
                  placeholder="04:30 PM"
                  className="w-24 h-8 text-xs font-mono bg-white"
                  disabled={r.status === "Absent" || r.status === "Leave" || r.status === "Not Marked"}
                />
              </TableCell>
              <TableCell className="font-mono text-xs font-semibold text-slate-700">{r.workingHours}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveStaffAttendance(r.id, r.name)}
                  className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Save
                </Button>
              </TableCell>
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
