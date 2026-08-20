import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, User, Phone, Mail, Briefcase, MapPin, Baby } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchStudents } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

const OCCUPATIONS = [
  "Software Engineer",
  "Business Executive",
  "Doctor / Physician",
  "Chartered Accountant",
  "Architect",
  "Government Service Officer",
  "Entrepreneur",
  "Civil Engineer",
];

function getOccupation(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return OCCUPATIONS[Math.abs(hash) % OCCUPATIONS.length];
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  children: string[];
  emergencyContact: string;
  avatar: string;
}

export const Route = createFileRoute("/principal/parents")({
  component: PrincipalParentsPage,
  head: () => ({ meta: [{ title: "Parents — Principal Portal" }] }),
});

function PrincipalParentsPage() {
  const [parentList, setParentList] = useState<Parent[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);

  const loadData = () => {
    fetchStudents().then(({ data }) => {
      const source = data || [];
      const parentMap = new Map<string, Parent>();
      source.forEach((s) => {
        const parentName = typeof s.parent === "string" ? s.parent : (s.parent as any)?.name || "Parent";
        const pKey = s.parentId || s.phone || parentName;
        if (!parentMap.has(pKey)) {
          parentMap.set(pKey, {
            id: s.parentId || `PAR-${s.id}`,
            name: parentName,
            email: `${parentName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@sunshine-parents.com`,
            phone: s.phone || "+91 98765 43210",
            occupation: getOccupation(s.id),
            children: [s.name],
            emergencyContact: s.phone || "+91 98765 43210",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${parentName}`,
          });
        } else {
          const existing = parentMap.get(pKey)!;
          if (!existing.children.includes(s.name)) {
            existing.children.push(s.name);
          }
        }
      });
      setParentList(Array.from(parentMap.values()));
    });
  };

  useAutoRefresh("students", loadData);
  useAutoRefresh("parents", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parentList.filter((p) => {
      if (q && !`${p.name} ${p.email} ${p.phone} ${p.children.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [parentList, search]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Parent Name", "Phone", "Email", "Occupation", "Children"];
    const rows = filtered.map(p => [p.name, p.phone, p.email, p.occupation, p.children.join(";")]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `parents_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1">
      <div>
        <PageHeader
          title="Parents Directory"
          description="Directory of all registered parents and guardians."
        />
      </div>
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-2">
        <FilterBar
          searchPlaceholder="Search parents by name, child, phone..."
          filters={[]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col w-full max-w-none">
        <DataTable columns={["Parent", "Phone", "Email", "Occupation", "Children", "Action"]} total={filtered.length}>
          {filtered.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs">{p.phone}</TableCell>
              <TableCell className="text-xs">{p.email}</TableCell>
              <TableCell className="text-sm font-medium text-slate-700">{p.occupation}</TableCell>
              <TableCell className="text-xs">{p.children.join(", ")}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedParent(p)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View Profile
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>

      <Dialog open={!!selectedParent} onOpenChange={(o) => !o && setSelectedParent(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Parent Profile</DialogTitle>
          </DialogHeader>
          {selectedParent && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 border-b pb-4">
                <Avatar className="h-14 w-14 border">
                  <AvatarImage src={selectedParent.avatar} />
                  <AvatarFallback>{selectedParent.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedParent.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mt-0.5">
                    <Briefcase className="h-3.5 w-3.5" /> {selectedParent.occupation}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{selectedParent.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedParent.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Sunshine Play School Campus Residency, Block B</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Baby className="h-4 w-4 text-indigo-500" /> Enrolled Children
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedParent.children.map((child) => (
                    <div key={child} className="bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800">
                      {child}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
