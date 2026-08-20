import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, UserRound, SortAsc, HeartPulse } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fetchStudents, allocateRollNumbersAlphabetically, toCanonicalAdmissionNo } from "@/lib/supabaseService";
import { StudentProfileModal } from "@/components/students/StudentProfileModal";

export interface AdminStudent {
  id: string;
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  dob: string;
  age: number;
  className: string;
  section: string;
  parent: string;
  phone: string;
  address: string;
  status: string;
  feesStatus: string;
  joinedOn: string;
  bloodGroup: string;
  allergies: string[];
  avatar: string;
}

export const Route = createFileRoute("/admin/students")({
  component: StudentsPage,
  head: () => ({ meta: [{ title: "Students — Sunshine Play School" }] }),
});

function StudentsPage() {
  const [itemList, setItemList] = useState<AdminStudent[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const loadData = () => {
    Promise.all([fetchStudents(), fetchFees()]).then(([{ data: studentList }, { data: feeList }]) => {
      const sourceList = studentList || [];
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

      const mapped: AdminStudent[] = sourceList.map((s: any) => {
        const canonicalAdm = toCanonicalAdmissionNo(s.admissionNo || s.id, s.id);
        const calcStatus =
          feeMap.get(canonicalAdm.toLowerCase()) ||
          feeMap.get((s.id || "").toLowerCase()) ||
          feeMap.get((s.admissionNo || "").toLowerCase()) ||
          (s.feeStatus === "Paid" ? "Paid" : s.feeStatus === "Partial" ? "Partial" : "Due");

        return {
          id: s.id,
          admissionNo: canonicalAdm,
          name: s.name,
          gender: ((s.gender as string) === "Girl" || (s.gender as string) === "Female") ? "Female" : "Male",
          dob: s.dob || undefined,
          age: s.age || 3,
          className: s.className as any,
          section: s.section as any,
          parent: typeof s.parent === "string" ? s.parent : s.parent?.name || "Parent",
          phone: s.phone || "",
          address: s.address || undefined,
          status: s.status || "Active",
          feesStatus: calcStatus,
          joinedOn: s.admissionDate || undefined,
          bloodGroup: s.bloodGroup || undefined,
          allergies: s.allergies || [],
          avatar: s.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(s.name)}`,
        };
      });
      setItemList(mapped);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoAssignRollNumbers = async () => {
    const selectedClass = filterValues["Class"] !== "all" ? filterValues["Class"] : undefined;
    const selectedSec = filterValues["Section"] !== "all" ? filterValues["Section"] : undefined;
    const res = await allocateRollNumbersAlphabetically(selectedClass, selectedSec);
    toast.success(`Alphabetical Roll Numbers assigned successfully across section(s)!`);
    loadData();
  };

  const active = itemList.filter((s) => s.status === "Active").length;
  const inactive = itemList.length - active;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    const st = filterValues["Status"];
    const feeSt = filterValues["Fee Status"];
    const normalize = (str?: string) => (str || "").replace(/\s+/g, "").toLowerCase();

    return itemList.filter((s) => {
      if (q) {
        const canonicalAdm = toCanonicalAdmissionNo(s.admissionNo, s.id).toLowerCase();
        const rawAdm = (s.admissionNo || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        const parent = (s.parent || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const cleanPhone = phone.replace(/\D/g, "");
        const id = (s.id || "").toLowerCase();

        const matchesQuery =
          name.includes(q) ||
          rawAdm.includes(q) ||
          canonicalAdm.includes(q) ||
          parent.includes(q) ||
          phone.includes(q) ||
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
      if (feeSt && feeSt !== "all" && s.feesStatus?.toLowerCase() !== feeSt.toLowerCase()) return false;
      return true;
    });
  }, [itemList, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Admission No", "Name", "Class", "Section", "Parent", "Phone", "Status", "Fees Status"];
    const rows = filtered.map(s => [s.admissionNo, s.name, s.className, s.section, s.parent, s.phone, s.status, s.feesStatus]);
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
    itemList.forEach((s) => {
      if (s.section) set.add(s.section.trim());
    });
    ["A", "B", "C", "D", "1", "2"].forEach((sec) => set.add(sec));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [itemList]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Students"
          description="Manage student profiles, enrollment, and health records."
        />
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Students" value={itemList.length} icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="Active" value={active} tone="success" icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="Inactive" value={inactive} tone="warning" icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="New this month" value={itemList.length} tone="info" icon={<UserRound className="h-5 w-5" />} />
        </div>

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

      <div className="mt-2 flex w-full max-w-none min-h-0 flex-1 flex-col">
        <DataTable
          columns={["Student", "Admission No.", "Class", "Parent", "Contact", "Fees", "Status", "Action"]}
          total={filtered.length}
        >
          {filtered.map((s) => (
            <TableRow key={s.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.avatar} />
                    <AvatarFallback>{s.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.gender} · {s.age}y</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
              <TableCell>{s.className} · {s.section}</TableCell>
              <TableCell>{s.parent}</TableCell>
              <TableCell className="text-xs">{s.phone}</TableCell>
              <TableCell><StatusBadge status={s.feesStatus} /></TableCell>
              <TableCell><StatusBadge status={s.status} /></TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => setSelectedStudent(s)}>
                  <Eye className="mr-1.5 h-4 w-4" /> View Profile
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>

      <StudentProfileModal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />
    </div>
  );
}
