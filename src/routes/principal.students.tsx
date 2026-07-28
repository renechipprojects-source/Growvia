import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, SortAsc } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { students as seedStudents, type Student } from "@/lib/principal-mock-data";
import { fetchStudents, allocateRollNumbersAlphabetically } from "@/lib/supabaseService";

export const Route = createFileRoute("/principal/students")({
  head: () => ({
    meta: [
      { title: "Students | Principal Portal" },
      { name: "description", content: "View, search and filter student records." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<string>("all");
  const [selected, setSelected] = useState<Student | null>(null);

  const loadData = () => {
    fetchStudents().then(({ data }) => {
      const sourceList = data && data.length > 0 ? data : (seedStudents as any);
      const mapped: Student[] = sourceList.map((s: any) => ({
        id: s.id,
        admissionNo: s.admissionNo || s.id,
        name: s.name,
        gender: s.gender === "Girl" ? "Female" : s.gender || "Male",
        className: s.className || "Nursery",
        section: s.section || "A",
        rollNo: s.rollNo || 0,
        dob: s.dob || "2022-01-01",
        bloodGroup: "O+",
        address: "Bengaluru",
        parent: {
          name: typeof s.parent === "string" ? s.parent : s.parent?.name || "Parent",
          phone: s.phone || (typeof s.parent === "object" ? s.parent?.phone : "") || "",
          email: "parent@school.com",
          occupation: "Service",
        },
        academic: {
          term: "Term 1",
          average: 85,
          rank: 1,
          remarks: "Good performance",
        },
        attendance: { present: 95, absent: 5, late: 0, total: 100 },
        teacherRemarks: "Active in class",
        avatarSeed: s.name,
      }));
      setItems(mapped);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoAssignRollNumbers = async () => {
    const targetCls = cls !== "all" ? cls : undefined;
    await allocateRollNumbersAlphabetically(targetCls);
    toast.success("Alphabetical Roll Numbers assigned for class section(s)!");
    loadData();
  };

  const classes = useMemo(() => Array.from(new Set(items.map((s) => s.className))), [items]);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      const q = query.toLowerCase();
      const matchQ = !q ||
        s.name.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.parent.name.toLowerCase().includes(q);
      const matchC = cls === "all" || s.className === cls;
      return matchQ && matchC;
    });
  }, [items, query, cls]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Students"
          description="View-only student directory. Search or filter to find a student and open their profile."
        />
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission no. or parent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAutoAssignRollNumbers} className="gap-2">
              <SortAsc className="h-4 w-4" />
              Auto-Assign Alphabetical Roll No
            </Button>
          </div>
        </div>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-left px-4 py-3 font-medium">Admission No.</th>
                  <th className="text-left px-4 py-3 font-medium">Class</th>
                  <th className="text-left px-4 py-3 font-medium">Roll</th>
                  <th className="text-left px-4 py-3 font-medium">Parent</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="border-t hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                          {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.gender} · {s.bloodGroup}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.admissionNo}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{s.className} - {s.section}</Badge>
                    </td>
                    <td className="px-4 py-3">{s.rollNo}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{s.parent.name}</div>
                      <div className="text-xs text-muted-foreground">{s.parent.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelected(s); }}>
                        <Eye className="w-4 h-4 mr-1.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No students match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Showing {filtered.length} of {items.length} students</div>
      <StudentDialog student={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {student && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-primary text-primary-foreground font-semibold flex items-center justify-center text-base">
                    {student.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{student.name}</DialogTitle>
                    <div className="text-xs text-muted-foreground">{student.admissionNo} · {student.className} - {student.section} · Roll #{student.rollNo || 1}</div>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active Student</Badge>
              </div>
            </DialogHeader>

            <Section title="Personal & Parent Details">
              <Grid>
                <KV k="Gender" v={student.gender} />
                <KV k="Date of Birth" v={student.dob} />
                <KV k="Blood Group" v={student.bloodGroup} />
                <KV k="Address" v={student.address} />
                <KV k="Parent Name" v={student.parent.name} />
                <KV k="Parent Phone" v={student.parent.phone} />
                <KV k="Parent Email" v={student.parent.email} />
                <KV k="Occupation" v={student.parent.occupation} />
              </Grid>
            </Section>

            <Section title="Fee Ledger & Status">
              <Grid>
                <KV k="Total Annual Fee" v="₹8,500" />
                <KV k="Total Paid So Far" v="₹8,500" />
                <KV k="Pending Balance" v="₹0" />
                <KV k="Fee Payment Status" v="Paid (3/3 Installments)" />
              </Grid>
            </Section>

            <Section title="Academic & Attendance Summary">
              <Grid>
                <KV k="Term Performance" v={`${student.academic.term} (${student.academic.average}%)`} />
                <KV k="Attendance Rate" v={`${Math.round((student.attendance.present / student.attendance.total) * 100)}% (${student.attendance.present}/100 Days)`} />
                <KV k="Teacher Remarks" v={student.teacherRemarks} wide />
              </Grid>
            </Section>

            <Section title="Submitted Student Documents">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border flex justify-between items-center">
                  <span>Birth Certificate</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border flex justify-between items-center">
                  <span>Immunization Record</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border flex justify-between items-center">
                  <span>Address Proof</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border flex justify-between items-center">
                  <span>Transfer Certificate</span>
                  <Badge className="bg-sky-100 text-sky-700 text-[10px]">Submitted</Badge>
                </div>
              </div>
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="rounded-lg border bg-muted/30 p-4">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}
function KV({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-[11px] uppercase text-muted-foreground font-medium">{k}</div>
      <div className="text-sm mt-0.5">{v}</div>
    </div>
  );
}
