import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Lock, ChevronRight, Search, ShieldCheck } from "lucide-react";
import {
  getSubjectAssignments,
  getAssignment,
  getStudentsForAssignment,
  SUBJECT_TEACHER_TABS,
} from "@/lib/teacherContext";
import { HOMEWORK } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useSearchQuery, matchesSearch } from "@/lib/searchContext";

const searchSchema = z.object({ a: z.string().optional() });

export const Route = createFileRoute("/teacher/my-subjects")({
  validateSearch: searchSchema,
  component: MySubjects,
});

function MySubjects() {
  const assignments = getSubjectAssignments();
  const { a } = Route.useSearch();
  const navigate = Route.useNavigate();
  const active = (a && getAssignment(a)) || assignments[0];
  const [tab, setTab] = useState<string>(SUBJECT_TEACHER_TABS[0]);
  const [localSearch, setLocalSearch] = useState("");
  const headerQ = useSearchQuery();
  const q = headerQ || localSearch;

  if (!active) {
    return (
      <div>
        <PageHeader title="My Subjects" subtitle="No subject assignments yet." />
      </div>
    );
  }

  const students = getStudentsForAssignment(active);
  const homework = HOMEWORK.filter(
    (h) => h.className === active.className && h.subject === active.subject,
  );
  const filteredStudents = useMemo(
    () => students.filter((s) => matchesSearch(q, s.name, s.rollNo, s.admissionNo, s.parent)),
    [q, students],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Fixed header + info + filters */}
      <div className="shrink-0">
        <PageHeader
          title="My Subjects"
          subtitle="Subject-teacher workspace · restricted to your assigned subject."
          action={
            <Badge className="bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-3 w-3 mr-1" /> Subject Teacher
            </Badge>
          }
        />
      </div>

      <div className="shrink-0 mb-4">
        <SectionCard title="Choose an assignment">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {assignments.map((asg) => {
              const isActive = asg.id === active.id;
              return (
                <button
                  key={asg.id}
                  onClick={() => navigate({ search: { a: asg.id } })}
                  className={`text-left rounded-2xl p-3 border transition ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg"
                      : "bg-white/60 border-white/60 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <div className="font-semibold">{asg.subject}</div>
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                    {asg.className}-{asg.section}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="shrink-0 flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        {SUBJECT_TEACHER_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-xs sm:text-sm rounded-full px-3 py-1.5 transition ${
              tab === t
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
                : "bg-white/60 text-slate-600 hover:bg-white"
            }`}
          >
            {t}
          </button>
        ))}
        <Badge className="ml-auto bg-amber-100 text-amber-700 shrink-0">
          <Lock className="h-3 w-3 mr-1" /> Subject-only view
        </Badge>
      </div>

      {/* Scrollable content region */}
      <div className="flex-1 min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
        <div className="shrink-0 px-5 pt-5 pb-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="font-semibold">{active.subject} · {active.className}-{active.section}</div>
            <div className="text-xs text-muted-foreground">{filteredStudents.length} of {students.length} students</div>
          </div>
          {(tab === "Overview" || tab === "Subject Marks" || tab === "Subject Attendance" || tab === "Subject Remarks") && (
            <div className="ml-auto relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search student…"
                className="pl-9 bg-white/70"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          {tab === "Overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStudents.map((s) => (
                <Card key={s.id} className="rounded-2xl p-4 border-white/60 bg-white/70">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} className="h-12 w-12 rounded-2xl" alt="" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Roll {String(s.rollNo).padStart(2, "0")} · {s.className}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "Subject Marks" && (
            <ul className="space-y-2">
              {filteredStudents.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} className="h-9 w-9 rounded-xl" alt="" />
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Roll {String(s.rollNo).padStart(2, "0")}</div>
                    </div>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">{60 + ((i * 7) % 40)} / 100</Badge>
                </li>
              ))}
            </ul>
          )}

          {tab === "Subject Homework" && (
            <div>
              {homework.length === 0 ? (
                <div className="text-sm text-muted-foreground">No homework assigned yet.</div>
              ) : (
                <ul className="space-y-2">
                  {homework.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                      <div>
                        <div className="font-medium">{h.title}</div>
                        <div className="text-xs text-muted-foreground">{h.className} • {h.subject}</div>
                      </div>
                      <div className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-1">Due {h.due}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Link to="/teacher/homework">
                  <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    Assign homework <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {tab === "Subject Assignments" && (
            <div className="text-sm text-muted-foreground">
              Create and track assignments for {active.subject} only. Other subjects are hidden.
            </div>
          )}

          {tab === "Subject Attendance" && (
            <ul className="space-y-2">
              {filteredStudents.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} className="h-9 w-9 rounded-xl" alt="" />
                    <div className="text-sm font-medium">{s.name}</div>
                  </div>
                  <Badge className={i % 4 === 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                    {i % 4 === 0 ? "Absent" : "Present"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {tab === "Subject Remarks" && (
            <div>
              <div className="text-sm text-muted-foreground mb-3">
                Only remarks for {active.subject} are visible here. Behaviour and other-subject remarks are restricted to the class teacher.
              </div>
              <ul className="space-y-2">
                {filteredStudents.slice(0, 8).map((s) => (
                  <li key={s.id} className="rounded-2xl bg-white/60 p-3">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Needs more practice with reading aloud in {active.subject}.
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
