import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchTeachers } from "@/lib/supabaseService";
import { type Teacher } from "@/lib/principal-mock-data";
import { useEffect } from "react";

import { TEACHERS as SEED_TEACHERS } from "@/lib/mockData";

export const Route = createFileRoute("/principal/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers | Principal Portal" },
      { name: "description", content: "View, search and filter teachers and their class assignments." },
    ],
  }),
  component: TeachersPage,
});

const DEFAULT_TEACHERS: Teacher[] = SEED_TEACHERS.map((t) => ({
  id: t.id,
  empId: t.id,
  name: t.name,
  subject: t.subject || "General",
  qualification: "B.Ed",
  phone: t.phone || "",
  email: t.email || "",
  experience: 3,
  classesAssigned: [t.className || "Nursery A"],
  status: "Active",
}));

function TeachersPage() {
  const [items, setItems] = useState<Teacher[]>(DEFAULT_TEACHERS);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");

  useEffect(() => {
    fetchTeachers().then(({ data }) => {
      if (data && data.length > 0) {
        const mapped: Teacher[] = data.map((t) => ({
          id: t.id,
          empId: t.id,
          name: t.name,
          subject: t.subject || "General",
          qualification: "B.Ed",
          phone: t.phone || "",
          email: t.email || "",
          experience: t.experience || 1,
          classesAssigned: [t.className || "Nursery A"],
          status: "Active",
        }));
        setItems(mapped);
      }
    });
  }, []);

  const subjects = useMemo(() => Array.from(new Set(items.map((t) => t.subject))), [items]);
  const filtered = useMemo(
    () =>
      items.filter((t) => {
        const matchQ = !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.empId.toLowerCase().includes(q.toLowerCase());
        const matchS = subject === "all" || t.subject === subject;
        return matchQ && matchS;
      }),
    [items, q, subject],
  );

  return (
    <div className="w-full max-w-none">
      <PageHeader title="Teachers" description="Read-only view of teaching staff. Login credentials cannot be edited from here." />

      <div className="card-elevated p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search teachers by name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Filter by subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{t.name}</div>
                    <Badge variant={t.status === "Active" ? "secondary" : "outline"} className={t.status === "Active" ? "bg-success/15 text-success border-success/30" : "text-warning-foreground bg-warning/10 border-warning/30"}>
                      {t.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.empId} · {t.subject}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.qualification} · {t.experience} yrs experience</div>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {t.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {t.phone}</div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="text-[11px] uppercase text-muted-foreground font-medium mb-1.5">Classes assigned</div>
                <div className="flex flex-wrap gap-1.5">
                  {t.classesAssigned.map((c) => (
                    <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">No teachers match your filters.</div>
        )}
      </div>
    </div>
  );
}
