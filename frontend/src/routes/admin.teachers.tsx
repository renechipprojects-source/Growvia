import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Mail, Phone, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-primitives";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchTeachers } from "@/lib/supabaseService";
import { StaffProfileModal } from "@/components/staff/StaffProfileModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export interface Teacher {
  id: string;
  empId: string;
  name: string;
  subject: string;
  qualification: string;
  phone: string;
  email: string;
  experience: number;
  classesAssigned: string[];
  status: "Active" | "Inactive";
}

export const Route = createFileRoute("/admin/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — Admin Portal" },
      { name: "description", content: "View, search and filter teachers and their class assignments." },
    ],
  }),
  component: AdminTeachersPage,
});

function AdminTeachersPage() {
  const [items, setItems] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const loadTeachers = () => {
    fetchTeachers().then(({ data }) => {
      const source = data || [];
      const mapped: Teacher[] = source.map((t) => ({
        id: t.id,
        empId: t.id,
        name: t.name,
        subject: t.subject || "General",
        qualification: "B.Ed",
        phone: t.phone || "",
        email: t.email || "",
        experience: t.experience || 1,
        classesAssigned: t.className ? [t.className] : [],
        avatar: t.avatar,
        status: "Active",
      }));
      setItems(mapped);
    });
  };

  useAutoRefresh("staff", loadTeachers);

  useEffect(() => {
    loadTeachers();
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
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader title="Teachers & Staff" description="Directory of teaching staff and class assignments. Click any card to inspect full profile details." />

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
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

        <div className="mt-5 flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pr-1">
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTeacher(t)}
              className="rounded-xl border bg-card p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group relative"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 rounded-full border shrink-0 shadow-sm">
                  <AvatarImage src={(t as any).avatar} alt={t.name} className="object-cover" />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                    {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate group-hover:text-primary transition-colors flex items-center gap-1">
                      {t.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
                    <Badge variant={t.status === "Active" ? "secondary" : "outline"} className={t.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}>
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

      <StaffProfileModal
        open={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        staffId={selectedTeacher?.id}
        readOnly={true}
      />
    </div>
  );
}
