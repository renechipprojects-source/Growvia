import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Info } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentAttendance } from "@/lib/principal-mock-data";

export const Route = createFileRoute("/principal/attendance/students")({
  head: () => ({
    meta: [
      { title: "Student Attendance | Principal Portal" },
      { name: "description", content: "View student attendance marked by teachers." },
    ],
  }),
  component: StudentAttendancePage,
});

function StatusPill({ s }: { s: "P" | "A" | "L" }) {
  const map = {
    P: "bg-success/15 text-success border-success/30",
    A: "bg-destructive/10 text-destructive border-destructive/30",
    L: "bg-warning/20 text-warning-foreground border-warning/40",
  } as const;
  const label = { P: "Present", A: "Absent", L: "Late" }[s];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[s]}`}>{s} · {label}</span>;
}

function StudentAttendancePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      studentAttendance.filter((r) => {
        const matchQ = !q || r.name.toLowerCase().includes(q.toLowerCase());
        const matchS = status === "all" || r.status === status;
        return matchQ && matchS;
      }),
    [q, status],
  );

  const summary = useMemo(() => {
    const p = studentAttendance.filter((x) => x.status === "P").length;
    const a = studentAttendance.filter((x) => x.status === "A").length;
    const l = studentAttendance.filter((x) => x.status === "L").length;
    return { p, a, l, total: studentAttendance.length };
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Student Attendance"
        description="View-only. Teachers mark attendance from their portal. Data shown for today."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Total" value={summary.total} tint="bg-primary/10 text-primary" />
        <SummaryCard label="Present" value={summary.p} tint="bg-success/15 text-success" />
        <SummaryCard label="Absent" value={summary.a} tint="bg-destructive/10 text-destructive" />
        <SummaryCard label="Late" value={summary.l} tint="bg-warning/20 text-warning-foreground" />
      </div>

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student name" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="P">Present</SelectItem>
              <SelectItem value="A">Absent</SelectItem>
              <SelectItem value="L">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 rounded-md bg-info/10 border border-info/30 text-info-foreground text-xs px-3 py-2 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-info" />
          Principals have read-only access to attendance. Changes must be made by the class teacher.
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-left px-4 py-3 font-medium">Class</th>
                  <th className="text-left px-4 py-3 font-medium">Section</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.className}</td>
                    <td className="px-4 py-3">{r.section}</td>
                    <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No records match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="card-elevated p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase">{label}</div>
      <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-md text-lg font-semibold ${tint}`}>{value}</div>
    </div>
  );
}
