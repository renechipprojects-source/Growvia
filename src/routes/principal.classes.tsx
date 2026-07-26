import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, DoorOpen, Users } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classesList } from "@/lib/principal-mock-data";

export const Route = createFileRoute("/principal/classes")({
  head: () => ({
    meta: [
      { title: "Classes | Principal Portal" },
      { name: "description", content: "View classes, sections, class teachers and class strength." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const sections = useMemo(() => Array.from(new Set(classesList.map((c) => c.section))), []);

  const filtered = useMemo(
    () =>
      classesList.filter((c) => {
        const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.classTeacher.toLowerCase().includes(q.toLowerCase());
        const matchS = sec === "all" || c.section === sec;
        return matchQ && matchS;
      }),
    [q, sec],
  );

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Classes" description="Overview of every class, its section, class teacher and current strength." />

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by class name or class teacher" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={sec} onValueChange={setSec}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-primary">Section {c.section}</div>
                  <div className="text-lg font-semibold mt-0.5">{c.name}</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {c.section}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><DoorOpen className="w-3.5 h-3.5" /> {c.room}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {c.strength} students</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-[11px] uppercase text-muted-foreground font-medium">Class Teacher</div>
                  <div className="text-sm mt-0.5 font-medium">{c.classTeacher}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">No classes match your filters.</div>
        )}
      </div>
    </div>
  );
}
