import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { fetchStudents, allocateRollNumbersAlphabetically } from "@/lib/supabaseService";
import { StudentProfileModal } from "@/components/students/StudentProfileModal";
import { getStoredMasterClasses, subscribeMasterClasses, type MasterClassItem } from "@/lib/masterClassesStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  className: string;
  section: string;
  rollNo: number;
  dob: string;
  bloodGroup: string;
  address: string;
  parent: {
    name: string;
    phone: string;
    email: string;
    occupation: string;
  };
  academic: {
    term: string;
    average: number;
    rank: number;
    remarks: string;
  };
  attendance: { present: number; absent: number; late: number; total: number };
  teacherRemarks: string;
  avatarSeed?: string;
}

import { FilterBar } from "@/components/admin/data-table";

export const Route = createFileRoute("/principal/students")({
  head: () => ({
    meta: [
      { title: "Student Directory — Principal Portal" },
      { name: "description", content: "Directory of enrolled students across all grades." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Student | null>(null);

  const loadData = () => {
    fetchStudents().then(({ data }) => {
      const sourceList = data || [];
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
        avatar: s.avatar,
      }));
      setItems(mapped);
    });
  };

  const [masterClasses, setMasterClasses] = useState<MasterClassItem[]>(getStoredMasterClasses);

  useAutoRefresh("students", loadData);

  useEffect(() => {
    loadData();
    return subscribeMasterClasses(() => setMasterClasses(getStoredMasterClasses()));
  }, []);

  const handleAutoAssignRollNumbers = async () => {
    const targetCls = filterValues["Class"] !== "all" ? filterValues["Class"] : undefined;
    await allocateRollNumbersAlphabetically(targetCls);
    toast.success("Alphabetical Roll Numbers assigned for class section(s)!");
    loadData();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    const st = filterValues["Status"];
    const feeSt = filterValues["Fee Status"];
    const normalize = (str?: string) => (str || "").replace(/\s+/g, "").toLowerCase();

    return items.filter((s) => {
      if (q && !`${s.name} ${s.admissionNo} ${s.parent.name} ${s.parent.phone}`.toLowerCase().includes(q)) return false;
      if (cls && cls !== "all" && normalize(s.className) !== normalize(cls)) return false;
      if (sec && sec !== "all" && s.section?.toLowerCase() !== sec.toLowerCase()) return false;
      return true;
    });
  }, [items, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Admission No", "Name", "Class", "Section", "Roll No", "Parent", "Phone"];
    const rows = filtered.map(s => [s.admissionNo, s.name, s.className, s.section, s.rollNo, s.parent.name, s.parent.phone]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((s) => {
      if (s.section && typeof s.section === "string" && s.section.trim()) {
        set.add(s.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [items]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Students Directory"
          description="View student profiles, enrollment, and health records."
        />
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1">
          <FilterBar
            searchPlaceholder="Search by name, admission no, parent, or phone..."
            filters={[
              { label: "Class", options: ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] },
              { label: "Section", options: sectionOptions },
              { label: "Status", options: ["Active", "Inactive"] },
              { label: "Fee Status", options: ["Paid", "Partial", "Due"] },
            ]}
            search={search}
            onSearchChange={setSearch}
            filterValues={filterValues}
            onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
            onExport={handleExportCSV}
          />
        </div>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-260px)] rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-100/95 text-xs uppercase text-slate-600 sticky top-0 z-20 backdrop-blur-md border-b">
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Student</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Admission No.</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Class</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Roll</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Parent</th>
                  <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-right px-4 py-3 font-medium">Action</th>
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
                        <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                          <AvatarImage src={(s as any).avatar || (s as any).avatar_url} alt={s.name} className="object-cover" />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
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
      <StudentProfileModal
        open={!!selected}
        onClose={() => setSelected(null)}
        student={selected}
      />
    </div>
  );
}

function StudentDialog({ student, onClose }: { student: Student | null; onClose: () => void }) {
  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 p-6">
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
                <KV k="Fee Payment Status" v={student.feeStatus || "N/A"} />
              </Grid>
            </Section>

            <Section title="Academic & Attendance Summary">
              <Grid>
                <KV k="Attendance Rate" v={student.attendance !== undefined && student.attendance !== null ? `${student.attendance}% Present` : "N/A"} />
                {student.teacherRemarks && <KV k="Teacher Remarks" v={student.teacherRemarks} wide />}
              </Grid>
            </Section>

            <Section title="Submitted Student Documents">
              {student.documents && student.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {student.documents.map((doc: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-50 border flex justify-between items-center">
                      <span>{doc.name || doc}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{doc.status || "Uploaded"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-xs italic py-1">No attached documents available.</div>
              )}
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
