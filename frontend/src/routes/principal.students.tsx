import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye } from "lucide-react";
import { PageHeader } from "@/components/principal/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchStudents, fetchFees, allocateRollNumbersAlphabetically, toCanonicalAdmissionNo } from "@/lib/supabaseService";
import { StudentProfileModal } from "@/components/students/StudentProfileModal";
import { getStoredMasterClasses, subscribeMasterClasses, type MasterClassItem } from "@/lib/masterClassesStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { FilterBar } from "@/components/admin/data-table";

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
  status: string;
  feeStatus: string;
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
  avatar?: string;
}

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
    Promise.all([fetchStudents(), fetchFees()]).then(([{ data: sourceList }, { data: feeList }]) => {
      const feeMap = new Map<string, string>();

      (feeList || []).forEach((f) => {
        const key1 = (f.studentId || "").toLowerCase();
        const key2 = (f.admissionNo || "").toLowerCase();
        const canonicalKey = toCanonicalAdmissionNo(f.admissionNo || f.studentId).toLowerCase();
        const st = f.status === "Paid" ? "Paid" : f.paid > 0 ? "Partial" : "Due";
        if (key1) feeMap.set(key1, st);
        if (key2) feeMap.set(key2, st);
        if (canonicalKey) feeMap.set(canonicalKey, st);
      });

      const mapped: Student[] = (sourceList || []).map((s: any) => {
        const canonicalAdm = toCanonicalAdmissionNo(s.admissionNo || s.id, s.id);
        const calcFeeStatus =
          feeMap.get(canonicalAdm.toLowerCase()) ||
          feeMap.get((s.id || "").toLowerCase()) ||
          feeMap.get((s.admissionNo || "").toLowerCase()) ||
          (s.feeStatus === "Paid" ? "Paid" : s.feeStatus === "Partial" ? "Partial" : "Due");

        const rawStatus = s.status || s.student_status || s.enrollment_status || "Active";
        const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

        return {
          id: s.id,
          admissionNo: canonicalAdm,
          name: s.name || s.full_name || "Student",
          gender: s.gender === "Girl" || s.gender === "Female" ? "Female" : "Male",
          className: s.className || "Nursery",
          section: s.section || "A",
          rollNo: s.rollNo ?? s.roll_no ?? 0,
          dob: s.dob || s.dateOfBirth || "2022-01-01",
          bloodGroup: s.bloodGroup || s.blood_group || "O+",
          address: s.address || "Bengaluru",
          status: formattedStatus,
          feeStatus: calcFeeStatus,
          parent: {
            name: typeof s.parent === "object" ? s.parent?.name : s.parent || s.parent_name || "Parent",
            phone: s.phone || s.mobile || (typeof s.parent === "object" ? s.parent?.phone : "") || "",
            email: s.email || (typeof s.parent === "object" ? s.parent?.email : "parent@school.com"),
            occupation: s.occupation || "Service",
          },
          academic: {
            term: "Term 1",
            average: 85,
            rank: 1,
            remarks: "Good performance",
          },
          attendance: (s.attendance !== undefined && s.attendance !== null)
            ? (typeof s.attendance === "number" ? { present: s.attendance, absent: 100 - s.attendance, late: 0, total: 100 } : s.attendance)
            : { present: 95, absent: 5, late: 0, total: 100 },
          teacherRemarks: "Active in class",
          avatarSeed: s.name,
          avatar: s.avatar || s.photo_url || s.avatar_url,
        };
      });
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

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((s) => {
      if (s.section && typeof s.section === "string" && s.section.trim()) {
        set.add(s.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [items]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>(["Active", "Inactive"]);
    items.forEach((s) => {
      if (s.status && typeof s.status === "string" && s.status.trim()) {
        const formatted = s.status.trim().charAt(0).toUpperCase() + s.status.trim().slice(1).toLowerCase();
        set.add(formatted);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    const st = filterValues["Status"];
    const feeSt = filterValues["Fee Status"];
    const normalize = (str?: string) => (str || "").replace(/\s+/g, "").toLowerCase();

    return items.filter((s) => {
      if (q) {
        const canonicalAdm = (s.admissionNo || "").toLowerCase();
        const rawAdm = (s.admissionNo || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        const parentName = (s.parent.name || "").toLowerCase();
        const parentPhone = (s.parent.phone || "").toLowerCase();
        const cleanPhone = parentPhone.replace(/\D/g, "");
        const id = (s.id || "").toLowerCase();

        const matchesQuery =
          name.includes(q) ||
          rawAdm.includes(q) ||
          canonicalAdm.includes(q) ||
          parentName.includes(q) ||
          parentPhone.includes(q) ||
          id.includes(q) ||
          (cleanQ.length > 0 && (
            canonicalAdm.includes(cleanQ) ||
            cleanPhone.includes(cleanQ)
          ));

        if (!matchesQuery) return false;
      }

      if (cls && cls !== "all" && normalize(s.className) !== normalize(cls)) return false;
      if (sec && sec !== "all" && s.section?.toLowerCase() !== sec.toLowerCase()) return false;
      if (st && st !== "all" && s.status?.toLowerCase() !== st.toLowerCase()) return false;
      if (feeSt && feeSt !== "all" && s.feeStatus?.toLowerCase() !== feeSt.toLowerCase()) return false;

      return true;
    });
  }, [items, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Admission No", "Name", "Class", "Section", "Roll No", "Parent", "Phone", "Status", "Fee Status"];
    const rows = filtered.map(s => [s.admissionNo, s.name, s.className, s.section, s.rollNo, s.parent.name, s.parent.phone, s.status, s.feeStatus]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              { label: "Status", options: statusOptions },
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
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Status</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-medium">Fee Status</th>
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
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        s.status?.toLowerCase() === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                          : s.status?.toLowerCase() === "inactive"
                          ? "bg-amber-50 text-amber-700 border-amber-200 font-medium"
                          : "bg-purple-50 text-purple-700 border-purple-200 font-medium"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        s.feeStatus?.toLowerCase() === "paid"
                          ? "bg-emerald-100 text-emerald-800 font-medium"
                          : s.feeStatus?.toLowerCase() === "partial"
                          ? "bg-amber-100 text-amber-800 font-medium"
                          : "bg-rose-100 text-rose-800 font-medium"
                      }
                    >
                      {s.feeStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                <Badge className={student.status === "Active" ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
                  {student.status || "Active Student"}
                </Badge>
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
              {(student as any).documents && (student as any).documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(student as any).documents.map((doc: any, i: number) => (
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
