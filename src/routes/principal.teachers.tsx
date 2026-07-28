import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Mail, Phone, Calendar, GraduationCap, Briefcase, Bus, MessageSquare, BookOpen, UserCheck, FileText, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { fetchTeachers } from "@/lib/supabaseService";
import { type Teacher } from "@/lib/principal-mock-data";
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
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

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
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader title="Teachers" description="Read-only view of teaching staff. Click any card to inspect full profile details." />

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
                <div className="w-12 h-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                  {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate group-hover:text-primary transition-colors flex items-center gap-1">
                      {t.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </div>
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

      {selectedTeacher && (
        <StaffDetailsDialog teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
    </div>
  );
}

function StaffDetailsDialog({
  teacher,
  onClose,
}: {
  teacher: Teacher | null;
  onClose: () => void;
}) {
  if (!teacher) return null;

  const attendancePct = 96;
  const leaveBalance = { casual: "8 / 12", medical: "10 / 10", earned: "5 / 5" };
  const recentLeaves = [
    { date: "14 Jul 2026", type: "Casual Leave", status: "Approved", days: "1 Day" },
    { date: "02 May 2026", type: "Sick Leave", status: "Approved", days: "2 Days" },
  ];
  const transportDuty = teacher.subject === "Mathematics" || teacher.name.includes("Priya")
    ? "Route 2 - Bus Coordinator"
    : "No Transport Duty Assigned";

  return (
    <Dialog open={!!teacher} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-4">
            <span>Staff Profile & Operational Details</span>
            <Badge variant={teacher.status === "Active" ? "secondary" : "outline"} className={teacher.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
              {teacher.status || "Active"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm mt-2">
          {/* Main Info Tile */}
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 border border-sky-200/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border-2 border-sky-300 shadow-sm">
                <AvatarImage src={(teacher as any).avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {teacher.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-bold text-slate-900">{teacher.name}</div>
                <div className="text-xs text-muted-foreground font-medium">
                  Emp ID: <span className="font-mono text-slate-800">{teacher.empId || teacher.id}</span> · {teacher.subject || "General Educator"}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                  <span>Department: <b>Academics</b></span>
                  <span>·</span>
                  <span>Designation: <b>Senior Teacher</b></span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-sky-700">{attendancePct}%</div>
              <div className="text-[11px] text-muted-foreground font-medium">Attendance Summary</div>
            </div>
          </div>

          {/* Contact & Professional Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border p-3 bg-card space-y-2">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Contact Information</div>
              <div className="flex items-center gap-2 text-slate-600"><Mail className="h-3.5 w-3.5 text-sky-600" /> {teacher.email || "staff@sunshine.edu"}</div>
              <div className="flex items-center gap-2 text-slate-600"><Phone className="h-3.5 w-3.5 text-emerald-600" /> {teacher.phone || "+91 98765 43210"}</div>
            </div>

            <div className="rounded-xl border p-3 bg-card space-y-2">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Academic Profile</div>
              <div className="flex items-center gap-2 text-slate-600"><GraduationCap className="h-3.5 w-3.5 text-indigo-600" /> Qualification: <b>{teacher.qualification || "M.Ed, B.Ed"}</b></div>
              <div className="flex items-center gap-2 text-slate-600"><Briefcase className="h-3.5 w-3.5 text-amber-600" /> Experience: <b>{teacher.experience || 3} Years</b></div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-3.5 w-3.5 text-purple-600" /> Joining Date: <b>12 Jun 2022</b></div>
            </div>
          </div>

          {/* Assigned Classes & Subjects */}
          <div className="rounded-xl border p-3 bg-card space-y-2">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Assigned Classes & Subjects</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Assigned Classes:</span>
              {(teacher.classesAssigned || ["Nursery A"]).map((c) => (
                <Badge key={c} variant="secondary" className="bg-primary/10 text-primary font-medium text-xs">{c}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Assigned Subjects:</span>
              <Badge variant="outline" className="text-xs font-medium">{teacher.subject || "Early Childhood Education"}</Badge>
            </div>
          </div>

          {/* Leave & Transport Duty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border p-3 bg-card space-y-1.5">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Leave Balance (Annual)</div>
              <div className="flex justify-between"><span>Casual Leave:</span> <b>{leaveBalance.casual}</b></div>
              <div className="flex justify-between"><span>Medical Leave:</span> <b>{leaveBalance.medical}</b></div>
              <div className="flex justify-between"><span>Earned Leave:</span> <b>{leaveBalance.earned}</b></div>
            </div>

            <div className="rounded-xl border p-3 bg-card space-y-1.5">
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Transport Duty</div>
              <div className="flex items-center gap-2 text-slate-700 mt-1">
                <Bus className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{transportDuty}</span>
              </div>
            </div>
          </div>

          {/* Recent Leave History */}
          <div className="rounded-xl border p-3 bg-card space-y-2">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Recent Leave History</div>
            <div className="space-y-1.5">
              {recentLeaves.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border">
                  <div>
                    <span className="font-semibold text-slate-800">{l.type}</span> · <span className="text-muted-foreground">{l.date} ({l.days})</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{l.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 border-t flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info(`Viewing attendance record for ${teacher.name}`)}>
              <UserCheck className="h-3.5 w-3.5 mr-1 text-sky-600" /> View Attendance
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info(`Viewing leave history for ${teacher.name}`)}>
              <FileText className="h-3.5 w-3.5 mr-1 text-purple-600" /> View Leave History
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info(`Classes assigned: ${teacher.classesAssigned.join(", ")}`)}>
              <BookOpen className="h-3.5 w-3.5 mr-1 text-indigo-600" /> View Assigned Classes
            </Button>
            <Button size="sm" className="text-xs bg-primary text-primary-foreground" onClick={() => toast.success(`Message prompt initiated for ${teacher.name}`)}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
