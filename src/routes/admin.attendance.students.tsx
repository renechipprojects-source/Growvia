import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, UserCheck, UserX, Clock, Download, Eye } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { attendanceToday, students, parents } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/attendance/students")({
  component: StudentAttendancePage,
  head: () => ({
    meta: [
      { title: "Student Attendance — TinySteps ERP" },
      {
        name: "description",
        content:
          "View student attendance records submitted by class teachers. Read-only for admins.",
      },
      { property: "og:title", content: "Student Attendance — TinySteps ERP" },
      {
        property: "og:description",
        content:
          "View student attendance records submitted by class teachers. Read-only for admins.",
      },
    ],
  }),
});

type Mark = "P" | "L" | "A";
const MARK_LABEL: Record<Mark, string> = { P: "Present", L: "Late", A: "Absent" };

function statusToMark(s: string): Mark {
  if (s === "Late") return "L";
  if (s === "Absent") return "A";
  return "P";
}

function StudentAttendancePage() {
  const marks: Record<string, Mark> = useMemo(
    () =>
      Object.fromEntries(
        attendanceToday.map((r) => [r.studentId, statusToMark(r.status)]),
      ),
    [],
  );
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cls = filterValues["Class"];
    return attendanceToday.filter((r) => {
      if (q && !r.studentName.toLowerCase().includes(q)) return false;
      if (cls && cls !== "all" && r.className !== cls) return false;
      return true;
    });
  }, [search, filterValues]);

  const present = Object.values(marks).filter((m) => m === "P").length;
  const late = Object.values(marks).filter((m) => m === "L").length;
  const absent = Object.values(marks).filter((m) => m === "A").length;
  const pct = attendanceToday.length
    ? Math.round(((present + late) / attendanceToday.length) * 100)
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Student Attendance"
        description="View attendance records submitted by class teachers."
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Register
          </Button>
        }
      />

      <div className="shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Present" value={present} tone="success" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Absent" value={absent} tone="danger" icon={<UserX className="h-5 w-5" />} />
          <StatCard label="Late" value={late} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Attendance %" value={`${pct}%`} tone="info" icon={<CalendarCheck className="h-5 w-5" />} />
        </div>

        <FilterBar
          searchPlaceholder="Search student..."
          filters={[{ label: "Class", options: ["Play Group", "Nursery", "LKG", "UKG"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Student", "Class", "In Time", "Attendance", "Action"]}
          total={filtered.length}
        >
          {filtered.map((r) => (
            <TableRow key={r.studentId}>
              <TableCell className="font-medium">{r.studentName}</TableCell>
              <TableCell>{r.className}</TableCell>
              <TableCell className="font-mono text-xs">{r.inTime ?? "—"}</TableCell>
              <TableCell>
                <AttendanceIndicator value={marks[r.studentId]} />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingId(r.studentId)}
                >
                  <Eye className="mr-2 h-4 w-4" />View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>

      <StudentQuickView
        studentId={viewingId}
        onClose={() => setViewingId(null)}
      />
    </div>
  );
}

function AttendanceIndicator({ value }: { value: Mark | undefined }) {
  const items: { key: Mark; base: string; active: string }[] = [
    { key: "P", base: "text-emerald-700", active: "bg-emerald-500 text-white" },
    { key: "L", base: "text-amber-700", active: "bg-amber-500 text-white" },
    { key: "A", base: "text-rose-700", active: "bg-rose-500 text-white" },
  ];
  return (
    <div
      className="inline-flex overflow-hidden rounded-full border"
      role="group"
      aria-label="Attendance status"
    >
      {items.map((it) => {
        const isActive = value === it.key;
        return (
          <span
            key={it.key}
            aria-label={MARK_LABEL[it.key]}
            title={MARK_LABEL[it.key]}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "grid h-7 w-8 place-items-center text-xs font-semibold",
              isActive ? it.active : it.base,
            )}
          >
            {it.key}
          </span>
        );
      })}
    </div>
  );
}

function StudentQuickView({
  studentId,
  onClose,
}: {
  studentId: string | null;
  onClose: () => void;
}) {
  const student = studentId ? students.find((s) => s.id === studentId) : undefined;
  if (!student) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const parent = parents.find((p) => p.children.includes(student.name)) ?? parents[0];
  const idx = students.indexOf(student);
  const attendancePct = 85 + ((idx * 3) % 14);
  const subjects = [
    { name: "Language", score: 78 + (idx % 15) },
    { name: "Numbers", score: 72 + (idx % 20) },
    { name: "Art & Craft", score: 80 + (idx % 12) },
    { name: "Rhymes", score: 85 + (idx % 10) },
  ];
  const homework = ["Submitted", "Pending", "Submitted"][idx % 3];
  const remarks = [
    "Very active in class discussions.",
    "Improving steadily in group activities.",
    "Needs a little more practice with numbers.",
    "Excellent in creative work.",
  ][idx % 4];
  const activities = ["Painting Club", "Music", "Storytelling", "Yoga"][idx % 4];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Quick View</DialogTitle>
        </DialogHeader>

        <section className="mt-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Personal Information
          </h3>
          <div className="mt-3 flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={student.avatar} />
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">{student.name}</div>
              <div className="text-xs text-muted-foreground">
                Admission {student.admissionNo}
              </div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Info label="Roll No." value={String(idx + 1).padStart(3, "0")} />
            <Info label="Class" value={student.className} />
            <Info label="Section" value={student.section} />
            <Info label="Date of Birth" value={student.dob} />
            <Info label="Gender" value={student.gender} />
            <Info label="Blood Group" value={student.bloodGroup} />
            <Info label="Parent" value={student.parent} />
            <Info label="Parent Contact" value={student.phone} />
            <Info label="Emergency" value={parent.emergencyContact} />
          </dl>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Academic Information
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile label="Attendance" value={`${attendancePct}%`} />
            <SummaryTile label="Recent" value={`${Math.round(attendancePct / 5)}/20 days`} />
            <SummaryTile label="Homework" value={homework} />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Subject-wise Performance
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <Badge key={s.name} variant="secondary">
                  {s.name} · {s.score}%
                </Badge>
              ))}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <Info label="Latest Assessment" value={`${70 + (idx % 25)} / 100`} />
            <Info label="Extracurricular" value={activities} />
            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">
                Teacher Remarks
              </div>
              <div className="mt-1 rounded-md bg-muted/50 p-2 text-sm">{remarks}</div>
            </div>
          </dl>
        </section>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="secondary" disabled>View Full Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
