import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, UserRound, SortAsc } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Student } from "@/lib/admin-mock-data";
import { fetchStudents, allocateRollNumbersAlphabetically } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/students")({
  component: StudentsPage,
  head: () => ({ meta: [{ title: "Students — Sunshine ERP" }] }),
});

function StudentsPage() {
  const [itemList, setItemList] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const loadData = () => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) {
        const mapped: Student[] = data.map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo || s.id,
          name: s.name,
          gender: ((s.gender as string) === "Girl" || (s.gender as string) === "Female") ? "Female" : "Male",
          dob: s.dob || "2022-01-01",
          age: s.age || 3,
          className: s.className as any,
          section: s.section as any,
          parent: s.parent,
          phone: s.phone,
          address: "Bengaluru",
          status: "Active",
          feesStatus: s.feeStatus === "Paid" ? "Paid" : s.feeStatus === "Partial" ? "Partial" : "Due",
          joinedOn: s.admissionDate || new Date().toISOString().split("T")[0],
          bloodGroup: "O+",
          allergies: [],
          avatar: s.avatar || "",
        }));
        setItemList(mapped);
      }
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
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    const st = filterValues["Status"];
    const normalize = (str?: string) => (str || "").replace(/\s+/g, "").toLowerCase();

    return itemList.filter((s) => {
      if (q && !`${s.name} ${s.admissionNo} ${s.parent || ""} ${s.phone || ""}`.toLowerCase().includes(q)) return false;
      if (cls && cls !== "all" && normalize(s.className) !== normalize(cls)) return false;
      if (sec && sec !== "all" && s.section?.toLowerCase() !== sec.toLowerCase()) return false;
      if (st && st !== "all" && s.status?.toLowerCase() !== st.toLowerCase()) return false;
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Students"
        description="Manage profiles and student records."
        actions={
          <Button variant="outline" size="sm" onClick={handleAutoAssignRollNumbers} className="gap-2">
            <SortAsc className="h-4 w-4" />
            Auto-Assign Alphabetical Roll No
          </Button>
        }
      />

      <div className="shrink-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Students" value={itemList.length} icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="Active" value={active} tone="success" icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="Inactive" value={inactive} tone="warning" icon={<UserRound className="h-5 w-5" />} />
          <StatCard label="New this month" value={itemList.length} tone="info" icon={<UserRound className="h-5 w-5" />} />
        </div>

        <FilterBar
          searchPlaceholder="Search by name, admission no, parent..."
          filters={[
            { label: "Class", options: ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] },
            { label: "Section", options: ["A", "B", "C"] },
            { label: "Status", options: ["Active", "Inactive"] },
          ]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
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

      {/* View Profile Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedStudent.avatar} />
                    <AvatarFallback>{selectedStudent.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedStudent.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedStudent.admissionNo} · {selectedStudent.className} ({selectedStudent.section})</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Gender & Age</div>
                  <div className="mt-0.5">{selectedStudent.gender}, {selectedStudent.age} yrs</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Parent / Guardian</div>
                  <div className="mt-0.5">{selectedStudent.parent}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Phone</div>
                  <div className="mt-0.5">{selectedStudent.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Fees Status</div>
                  <div className="mt-0.5"><StatusBadge status={selectedStudent.feesStatus} /></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Joined On</div>
                  <div className="mt-0.5">{selectedStudent.joinedOn}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Status</div>
                  <div className="mt-0.5"><StatusBadge status={selectedStudent.status} /></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
