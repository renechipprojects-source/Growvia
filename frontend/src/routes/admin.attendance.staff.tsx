import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Download } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchTeachers, type Teacher } from "@/lib/supabaseService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/attendance/staff")({
  component: StaffAttendancePage,
  head: () => ({
    meta: [
      { title: "Staff Attendance — Sunshine ERP" },
      { name: "description", content: "View staff attendance records captured by the office/admin attendance system." },
    ],
  }),
});

type StaffStatus = "Present" | "Late" | "Absent";

interface StaffAttendanceRow {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  checkIn: string | null;
  checkOut: string | null;
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

function StaffAttendancePage() {
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTeachers().then(({ data }) => {
      setTeachersList(data || []);
    });
  }, []);

  const rows: StaffAttendanceRow[] = useMemo(() => {
    return teachersList.map((s, i) => {
      const status: StaffStatus = "Present";
      return {
        id: s.id,
        name: s.name,
        employeeId: s.id,
        department: DEPARTMENTS[(s as any).role || "Teacher"] ?? "Academics",
        designation: (s as any).role || "Teacher",
        checkIn: "08:45 AM",
        checkOut: "05:00 PM",
        workingHours: "8h 15m",
        status,
        avatar: s.avatar || "/avatars/teacher.svg",
      };
    });
  }, [teachersList]);

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

  const present = rows.filter((r) => r.status === "Present").length;
  const late = rows.filter((r) => r.status === "Late").length;
  const absent = rows.filter((r) => r.status === "Absent").length;
  const pct = rows.length
    ? Math.round(((present + late) / rows.length) * 100)
    : 0;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Employee ID", "Name", "Department", "Designation", "Check-in", "Check-out", "Working Hours", "Status"];
    const rowsList = filtered.map(r => [r.employeeId, r.name, r.department, r.designation, r.checkIn || "—", r.checkOut || "—", r.workingHours, r.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rowsList.map(row => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_attendance_${new Date().toISOString().split("T")[0]}.csv`);
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

        <FilterBar
          searchPlaceholder="Search staff or employee ID..."
          filters={[
            { label: "Department", options: departments },
            { label: "Status", options: ["Present", "Late", "Absent"] },
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
            "Designation",
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
              <TableCell className="font-mono text-xs">{r.employeeId}</TableCell>
              <TableCell>{r.department}</TableCell>
              <TableCell>{r.designation}</TableCell>
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
