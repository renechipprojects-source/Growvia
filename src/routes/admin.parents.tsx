import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type Parent } from "@/lib/admin-mock-data";
import { fetchStudents } from "@/lib/supabaseService";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/parents")({
  component: ParentsPage,
  head: () => ({ meta: [{ title: "Parents — Sunshine ERP" }] }),
});

function ParentsPage() {
  const [parentList, setParentList] = useState<Parent[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) {
        const mapped: Parent[] = data.map((s) => ({
          id: s.parentId || `PAR-${s.id}`,
          name: s.parent,
          email: `${s.parent.toLowerCase().replace(/\s+/g, ".")}@sunshineschool.edu`,
          phone: s.phone,
          occupation: "Parent / Guardian",
          children: [s.name],
          preferredChannel: "WhatsApp",
          emergencyContact: s.phone,
          avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(s.parent)}`,
        }));
        setParentList(mapped);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ch = filterValues["Channel"];
    return parentList.filter((p) => {
      if (q && !`${p.name} ${p.email} ${p.phone} ${p.children.join(" ")}`.toLowerCase().includes(q)) return false;
      if (ch && ch !== "all" && p.preferredChannel !== ch) return false;
      return true;
    });
  }, [parentList, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Parent Name", "Phone", "Email", "Occupation", "Children", "Channel"];
    const rows = filtered.map(p => [p.name, p.phone, p.email, p.occupation, p.children.join(";"), p.preferredChannel]);
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Parents"
        description="Directory of all registered parents and guardians."
      />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search parents by name, child, phone..."
          filters={[{ label: "Channel", options: ["Email", "SMS", "WhatsApp"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable columns={["Parent", "Phone", "Email", "Occupation", "Children", "Preferred"]} total={filtered.length}>
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
              <TableCell className="text-sm">{p.occupation}</TableCell>
              <TableCell className="text-xs">{p.children.join(", ")}</TableCell>
              <TableCell><Badge variant="outline">{p.preferredChannel}</Badge></TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
