import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { studentsBy, ATTENDANCE_RECORDS, type ClassName, type Section } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Clock, Plane, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NotificationService } from "@/lib/notifications";
import { getClassAssignments, getSubjectAssignments, type TeacherAssignment } from "@/lib/teacherContext";
import { useSearchQuery, matchesSearch } from "@/lib/searchContext";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const searchSchema = z.object({ a: z.string().optional() });

export const Route = createFileRoute("/teacher/attendance")({
  validateSearch: searchSchema,
  component: Att,
});

type Status = "P" | "A" | "L" | "Lv";

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  P: { label: "Present", cls: "bg-emerald-500" },
  A: { label: "Absent", cls: "bg-rose-500" },
  L: { label: "Late", cls: "bg-amber-500" },
  Lv: { label: "Leave", cls: "bg-purple-500" },
};

function assignmentLabel(a: TeacherAssignment) {
  return a.type === "class"
    ? `${a.className}-${a.section} · Class Teacher`
    : `${a.subject} · ${a.className}-${a.section}`;
}

function Att() {
  const { a: activeId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const assignments: TeacherAssignment[] = [...getClassAssignments(), ...getSubjectAssignments()];

  if (assignments.length === 0) {
    return (
      <div>
        <PageHeader title="Attendance" subtitle="No classes assigned to you yet." />
      </div>
    );
  }

  const active =
    (activeId && assignments.find((x) => x.id === activeId)) || assignments[0];
  // URL param that points to an unassigned entry is blocked
  if (activeId && !assignments.find((x) => x.id === activeId)) {
    throw notFound();
  }

  const [date, setDate] = useState("2026-07-22");
  const [localSearch, setLocalSearch] = useState("");
  const headerQuery = useSearchQuery();
  const q = headerQuery || localSearch;

  const cls = active.className as ClassName;
  const sec = active.section as Section;
  const list = useMemo(() => studentsBy(cls, sec), [cls, sec]);

  const seed = useMemo(() => {
    const recs = ATTENDANCE_RECORDS.filter((r) => r.date === date);
    const map = new Map(recs.map((r) => [r.studentId, r.status]));
    const out: Record<string, Status> = {};
    for (const s of list) {
      const st = map.get(s.id);
      out[s.id] = st === "Absent" ? "A" : st === "Late" ? "L" : st === "Leave" ? "Lv" : "P";
    }
    return out;
  }, [list, date]);

  const [state, setState] = useState<Record<string, Status>>(seed);
  useEffect(() => { setState(seed); }, [seed]);

  const filtered = list.filter((s) =>
    matchesSearch(q, s.name, s.rollNo, s.admissionNo, s.parent),
  );

  const counts = {
    total: list.length,
    P: Object.values(state).filter((v) => v === "P").length,
    A: Object.values(state).filter((v) => v === "A").length,
    L: Object.values(state).filter((v) => v === "L").length,
    Lv: Object.values(state).filter((v) => v === "Lv").length,
  };
  const pct = counts.total ? Math.round((counts.P / counts.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          title="Attendance"
          subtitle={`${date} · ${active.type === "subject" ? `${active.subject} · ` : ""}${cls}-${sec} · ${counts.P}/${counts.total} present (${pct}%)`}
          action={
            <Button
              onClick={() => {
                NotificationService.attendanceMarked(`${cls}-${sec}`);
                toast.success("Attendance saved");
              }}
              className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full"
            >
              Save
            </Button>
          }
        />
      </div>

      {/* Assignment picker — only shows classes assigned to this teacher */}
      <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
        {assignments.map((asg) => {
          const isActive = asg.id === active.id;
          return (
            <button
              key={asg.id}
              onClick={() => navigate({ search: { a: asg.id } })}
              className={`text-xs sm:text-sm rounded-full px-3 py-1.5 transition ${
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow"
                  : "bg-white/60 text-slate-600 hover:bg-white"
              }`}
            >
              {assignmentLabel(asg)}
            </button>
          );
        })}
        <Badge className="ml-auto bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-3 w-3 mr-1" /> Restricted to your assignments
        </Badge>
      </div>

      {/* Fixed filters + counters */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        <div className="rounded-3xl bg-white/70 border border-white/60 p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Class</div>
          <div className="mt-1 font-semibold">{cls}-{sec}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Role</div>
          <div className="mt-1 font-semibold capitalize">
            {active.type === "class" ? "Class Teacher" : active.subject}
          </div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Date</div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 bg-white" />
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-500 text-white p-4 shadow">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Present</div>
          <div className="text-2xl font-bold">{counts.P}</div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-red-500 text-white p-4 shadow">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Absent</div>
          <div className="text-2xl font-bold">{counts.A}</div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 shadow">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Late · Leave</div>
          <div className="text-2xl font-bold">{counts.L}<span className="text-base opacity-80"> · {counts.Lv}</span></div>
        </div>
      </div>

      {/* Roster scroll area */}
      <div className="flex-1 min-h-0">
        <SectionCard title={`Roster · ${filtered.length}/${list.length}`} className="h-full flex flex-col">
          <div className="shrink-0 flex flex-wrap items-center gap-2 mb-4">
            <div className="relative w-full sm:flex-1 sm:w-auto sm:min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by name, roll no…"
                className="pl-9 bg-white/70"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button size="sm" variant="secondary" className="flex-1 sm:flex-none h-10" onClick={() => setState(Object.fromEntries(list.map((s) => [s.id, "P"])))}>All Present</Button>
              <Button size="sm" variant="secondary" className="flex-1 sm:flex-none h-10" onClick={() => setState(Object.fromEntries(list.map((s) => [s.id, "A"])))}>All Absent</Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((s) => {
                const v = state[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3">
                    <img src={s.avatar} className="h-12 w-12 rounded-2xl bg-white" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Roll {String(s.rollNo).padStart(2, "0")} · {s.gender}</div>
                    </div>
                    <div className="flex gap-1">
                      {(["P", "A", "L", "Lv"] as Status[]).map((code) => {
                        const meta = STATUS_META[code];
                        const active = v === code;
                        const Icon = code === "P" ? Check : code === "A" ? X : code === "L" ? Clock : Plane;
                        return (
                          <button
                            key={code}
                            onClick={() => setState((p) => ({ ...p, [s.id]: code }))}
                            title={meta.label}
                            aria-label={meta.label}
                            className={cn(
                              "h-10 w-10 sm:h-9 sm:w-9 rounded-xl grid place-items-center transition touch-manipulation",
                              active ? `${meta.cls} text-white shadow-lg` : "bg-white text-slate-500 border",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
