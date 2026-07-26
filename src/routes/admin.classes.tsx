import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { classes, staff } from "@/lib/admin-mock-data";
import { fetchStudents, fetchTeachers, type Student } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/classes")({
  component: ClassesPage,
  head: () => ({ meta: [{ title: "Classes — Sunshine ERP" }] }),
});

function ClassesPage() {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setStudentsList(data);
    });
    fetchTeachers().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTeachersList(data);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classes.filter((c) => {
      if (q && !c.toLowerCase().includes(q)) return false;
      if (sec && sec !== "all") {
        return ["A", "B"].includes(sec);
      }
      return true;
    });
  }, [search, filterValues]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Classes" description="Class overview with live section strength and assigned class teachers." />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search class name..."
          filters={[{ label: "Section", options: ["A", "B"] }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          hideExport={true}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Class", "Sections", "Live Student Count", "Class Teacher"]}
          total={filtered.length}
          hidePagination={true}
        >
          {filtered.map((c, idx) => {
            const count = studentsList.filter((s) => s.className?.toLowerCase() === c.toLowerCase() || (s as any).class_name?.toLowerCase() === c.toLowerCase()).length;
            const teacher = teachersList[idx] ?? teachersList[0] ?? { name: "Ananya Sharma", avatar: "/avatars/teacher.svg" };
            return (
              <TableRow key={c} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-foreground py-4">{c}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Section A</Badge>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Section B</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                    {count} Students
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={teacher?.avatar || "/avatars/teacher.svg"} />
                      <AvatarFallback>{teacher?.name?.[0] || "T"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{teacher?.name ?? "Assigned Teacher"}</span>
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
