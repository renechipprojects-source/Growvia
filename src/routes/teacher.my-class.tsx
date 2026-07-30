import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { type ClassName, type Section } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Baby, Cake, ShieldCheck, Users, UserCheck, UserX, BookOpen, Sparkles, MessageSquarePlus, Search, Award, TrendingDown } from "lucide-react";
import { getClassAssignments } from "@/lib/teacherContext";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchQuery, matchesSearch } from "@/lib/searchContext";
import { toast } from "sonner";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/teacher/my-class")({ component: MyClass });

const TABS = ["Overview", "Attendance", "Homework", "Academics", "Students", "Activities", "Remarks"] as const;
type Tab = (typeof TABS)[number];

function MyClass() {
  const assignments = getClassAssignments();
  const active = assignments[0];
  const [tab, setTab] = useState<Tab>("Overview");
  const [localRemark, setLocalRemark] = useState<Record<string, string>>({});
  const headerQuery = useSearchQuery();
  const [localSearch, setLocalSearch] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const loadData = useCallback(() => {
    return fetchStudents().then(({ data }) => setAllStudents(data || []));
  }, []);

  useAutoRefresh("students", loadData);
  useAutoRefresh("attendance", loadData);

  const q = headerQuery || localSearch;

  if (!active) {
    return (
      <div>
        <PageHeader title="My Class" subtitle="You are not assigned as a class teacher." />
      </div>
    );
  }

  const cls = active.className as ClassName;
  const sec = active.section as Section;

  const list = useMemo(() => {
    const source = allStudents;
    return source.filter((s) => s.className === cls && (!sec || s.section === sec));
  }, [allStudents, cls, sec]);

  const recs: any[] = [];
  const recMap = new Map(recs.map((r) => [r.studentId, r.status]));

  const boys = list.filter((s) => s.gender === "Boy" || (s as any).gender === "Male").length;
  const girls = list.filter((s) => s.gender === "Girl" || (s as any).gender === "Female").length;
  const present = list.filter((s) => recMap.get(s.id) === "Present").length;
  const absent = list.filter((s) => recMap.get(s.id) === "Absent").length;
  const attnPct = list.length ? Math.round((present / list.length) * 100) : 0;

  const classHW: any[] = [];
  const classActs: any[] = [];
  const classRemarks: any[] = [];
  const upcomingBirthdays = list
    .filter((s) => {
      const parts = (s.dob || "").split("-").map(Number);
      const m = parts[1];
      return m === 7 || m === 8;
    })
    .slice(0, 5);

  const filtered = useMemo(
    () => list.filter((s) => matchesSearch(q, s.name, s.rollNo, s.admissionNo, s.parent)),
    [q, list],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title={`My Class · ${cls}-${sec}`}
          subtitle="Full class-teacher access to every student."
          action={
            <Badge className="bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-3 w-3 mr-1" /> Class Teacher
            </Badge>
          }
        />
      </div>

      <div className="sticky top-0 z-20 flex items-center gap-2 mb-3 overflow-x-auto bg-background/95 backdrop-blur-md pt-1 pb-2 shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-xs sm:text-sm rounded-full px-3 py-1.5 transition ${
              tab === t
                ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow"
                : "bg-white/60 text-slate-600 hover:bg-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBubble label="Total" value={list.length} icon={Users} gradient="from-sky-500 to-blue-500" />
            <StatBubble label="Boys" value={boys} icon={Baby} gradient="from-indigo-500 to-blue-500" />
            <StatBubble label="Girls" value={girls} icon={Baby} gradient="from-pink-500 to-fuchsia-500" />
            <StatBubble label="Present today" value={`${present}/${list.length}`} icon={UserCheck} gradient="from-emerald-500 to-green-500" sub={`${attnPct}%`} />
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <SectionCard title="Class information" className="lg:col-span-2">
              <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                <li className="rounded-2xl bg-white/60 p-3"><b>Class Teacher:</b> Mrs. Priya Menon</li>
                <li className="rounded-2xl bg-white/60 p-3"><b>Classroom:</b> Sunflower Room · 1st Floor</li>
                <li className="rounded-2xl bg-white/60 p-3"><b>Strength:</b> {list.length} students</li>
                <li className="rounded-2xl bg-white/60 p-3"><b>Homework pending:</b> {classHW.filter((h) => h.status === "Pending").length}</li>
              </ul>
            </SectionCard>
            <SectionCard title="Upcoming birthdays">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-sm text-muted-foreground">No birthdays this month.</div>
              ) : (
                <ul className="space-y-2">
                  {upcomingBirthdays.map((s) => (
                    <li key={s.id} className="rounded-2xl bg-pink-50 p-2 flex items-center gap-2">
                      <img src={s.avatar} className="h-9 w-9 rounded-full bg-white" alt="" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Cake className="h-3 w-3" />{s.dob.slice(5)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "Attendance" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBubble label="Present" value={present} icon={UserCheck} gradient="from-emerald-500 to-green-500" />
            <StatBubble label="Absent" value={absent} icon={UserX} gradient="from-rose-500 to-red-500" />
            <StatBubble label="Leave" value={list.filter((s) => recMap.get(s.id) === "Leave").length} icon={UserX} gradient="from-purple-500 to-fuchsia-500" />
            <StatBubble label="Attendance %" value={`${attnPct}%`} icon={UserCheck} gradient="from-sky-500 to-blue-500" />
          </div>
          <SectionCard title="Today's attendance">
            <SearchBar value={localSearch} onChange={setLocalSearch} />
            <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto pr-1 mt-3">
              <ul className="divide-y divide-white/50">
                {filtered.map((s) => {
                  const st = recMap.get(s.id);
                  return (
                    <li key={s.id} className="py-2 flex items-center gap-3">
                      <span className="text-xs w-8 text-muted-foreground">{String(s.rollNo).padStart(2, "0")}</span>
                      <img src={s.avatar} className="h-9 w-9 rounded-full bg-white" alt="" />
                      <div className="flex-1 min-w-0 text-sm font-medium truncate">{s.name}</div>
                      <Badge className={
                        st === "Absent" ? "bg-rose-100 text-rose-700" :
                        st === "Leave" ? "bg-purple-100 text-purple-700" :
                        st === "Late" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }>{st ?? "—"}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "Homework" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBubble label="Assigned" value={classHW.length} icon={BookOpen} gradient="from-sky-500 to-blue-500" />
            <StatBubble label="Submitted" value={classHW.reduce((n, h) => n + h.submitted, 0)} icon={BookOpen} gradient="from-emerald-500 to-green-500" />
            <StatBubble label="Pending" value={classHW.filter((h) => h.status === "Pending").length} icon={BookOpen} gradient="from-amber-500 to-orange-500" />
            <StatBubble label="Reviewed" value={classHW.reduce((n, h) => n + h.reviewed, 0)} icon={BookOpen} gradient="from-indigo-500 to-purple-500" />
          </div>
          <SectionCard title="Class homework">
            <ul className="space-y-2 max-h-[60vh] sm:max-h-[500px] overflow-y-auto pr-1">
              {classHW.map((h) => (
                <li key={h.id} className="rounded-2xl bg-white/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{h.title}</div>
                      <div className="text-xs text-muted-foreground">{h.subject} · Assigned {h.assignedDate} · Due {h.due}</div>
                    </div>
                    <Badge className={h.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>{h.status}</Badge>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span><b className="text-emerald-600">{h.submitted}</b> submitted</span>
                    <span><b className="text-amber-600">{h.total - h.submitted}</b> pending</span>
                    <span><b className="text-indigo-600">{h.reviewed}</b> reviewed</span>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === "Academics" && (
        <div>
          <div className="grid lg:grid-cols-2 gap-4">
            <SectionCard title="Subject-wise class averages">
              <ul className="space-y-2">
                {["Language", "Math", "Art", "Phonics", "General Awareness"].map((sub) => {
                  const scores: any[] = [];
                  const avg = 0;
                  return (
                    <li key={sub} className="rounded-2xl bg-white/60 p-3 flex items-center justify-between">
                      <div className="font-medium">{sub}</div>
                      <Badge className="bg-indigo-100 text-indigo-700">0 / 100</Badge>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
            <SectionCard title="Top performers & needing improvement">
              <div className="space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><Award className="h-3 w-3" /> Top 5</div>
                  <ul className="space-y-1">
                    {[...list]
                      .map((s) => {
                        const marks: any[] = [];
                        const avg = 0;
                        return { s, avg };
                      })
                      .sort((a: any, b: any) => b.avg - a.avg)
                      .slice(0, 5)
                      .map(({ s, avg }: any) => (
                        <li key={s.id} className="flex items-center justify-between rounded-xl bg-emerald-50/70 p-2">
                          <span className="text-sm">{s.name}</span>
                          <Badge className="bg-emerald-100 text-emerald-700">0%</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Needs support</div>
                  <ul className="space-y-1">
                    {[...list]
                      .map((s) => {
                        const marks: any[] = [];
                        const avg = 0;
                        return { s, avg };
                      })
                      .sort((a: any, b: any) => a.avg - b.avg)
                      .slice(0, 5)
                      .map(({ s, avg }: any) => (
                        <li key={s.id} className="flex items-center justify-between rounded-xl bg-amber-50/70 p-2">
                          <span className="text-sm">{s.name}</span>
                          <Badge className="bg-amber-100 text-amber-700">{Math.round(avg)}%</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "Students" && (
        <SectionCard title={`Students · ${filtered.length}/${list.length}`}>
          <SearchBar value={localSearch} onChange={setLocalSearch} />
          <div className="mt-3 max-h-[65vh] sm:max-h-[640px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((s) => (
                <Card key={s.id} className="rounded-3xl border-white/60 bg-white/70 backdrop-blur-xl shadow p-4">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} className="h-12 w-12 rounded-2xl bg-white" alt="" />
                    <div className="min-w-0">
                      <div className="font-bold truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Baby className="h-3 w-3" />Roll {String(s.rollNo).padStart(2, "0")} · {s.gender} · {s.house} House
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground text-xs">Parent</div>
                    <div className="font-medium truncate">{s.parent}</div>
                    <div className="text-muted-foreground text-xs mt-1">{s.phone}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge className="bg-sky-100 text-sky-700">Attendance {s.attendance}%</Badge>
                    <div className="text-xs text-muted-foreground">{s.admissionNo}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {tab === "Activities" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classActs.length === 0 ? (
            <SectionCard title="No activities">
              <div className="text-sm text-muted-foreground">No activities recorded for this class yet.</div>
            </SectionCard>
          ) : (
            classActs.map((a) => (
              <Card key={a.id} className="rounded-3xl overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow">
                <img src={a.cover} className="h-40 w-full object-cover" alt="" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{a.title}</div>
                    <Badge className="bg-sky-100 text-sky-700">{a.category ?? "Activity"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{a.date}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "Remarks" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <SectionCard title="Add remark">
            <div className="space-y-3 max-h-[60vh] sm:max-h-[600px] overflow-y-auto pr-1">
              {list.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white/60 p-3">
                  <div className="flex items-center gap-2">
                    <img src={s.avatar} className="h-8 w-8 rounded-full bg-white" alt="" />
                    <div className="text-sm font-medium">{s.name}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Textarea
                      rows={2}
                      value={localRemark[s.id] ?? ""}
                      onChange={(e) => setLocalRemark((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="Behaviour or academic note…"
                      className="bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!localRemark[s.id]?.trim()) return;
                        toast.success(`Remark saved for ${s.name}`);
                        setLocalRemark((p) => ({ ...p, [s.id]: "" }));
                      }}
                      className="bg-gradient-to-r from-sky-500 to-blue-500 text-white self-end rounded-full"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title={`Recent remarks · ${classRemarks.length}`}>
            <ul className="space-y-2 max-h-[60vh] sm:max-h-[600px] overflow-y-auto pr-1">
              {classRemarks
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 40)
                .map((r) => {
                  const s = list.find((x) => x.id === r.studentId);
                  return (
                    <li key={r.id} className="rounded-2xl bg-white/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{s?.name ?? r.studentId}</div>
                        <Badge className="bg-slate-100 text-slate-700">{r.type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{r.date} · {r.by}</div>
                      <div className="text-sm mt-1">{r.note}</div>
                    </li>
                  );
                })}
              {classRemarks.length === 0 && (
                <li className="text-sm text-muted-foreground">No remarks yet.</li>
              )}
            </ul>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function StatBubble({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; gradient: string; sub?: string;
}) {
  return (
    <div className={`rounded-3xl p-4 text-white shadow-lg bg-gradient-to-br ${gradient}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] opacity-80">{sub}</div>}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, roll, admission, parent…"
        className="pl-9 bg-white/70"
      />
    </div>
  );
}
