import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { classes, students, staff } from "@/lib/admin-mock-data";

export const Route = createFileRoute("/admin/classes")({
  component: ClassesPage,
  head: () => ({ meta: [{ title: "Classes — TinySteps ERP" }] }),
});

function ClassesPage() {
  const teachers = staff.filter((s) => s.role === "Teacher");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classes.filter((c) => {
      if (q && !c.toLowerCase().includes(q)) return false;
      if (sec && sec !== "all") {
        // Every class has both A and B sections in mock data; keep as pass-through.
        return ["A", "B"].includes(sec);
      }
      return true;
    });
  }, [search, filterValues]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Classes" description="Class list with sections, strength and class teachers." />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search class..."
          filters={[{ label: "Section", options: ["A", "B"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
        />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Class", "Sections", "Student Count", "Class Teacher"]}
          total={filtered.length}
        >
          {filtered.map((c, idx) => {
            const count = students.filter((s) => s.className === c).length;
            const teacher = teachers[idx] ?? teachers[0];
            return (
              <TableRow key={c}>
                <TableCell className="font-medium">{c}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge variant="outline">A</Badge>
                    <Badge variant="outline">B</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">{count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={teacher?.avatar} />
                      <AvatarFallback>T</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{teacher?.name ?? "—"}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
