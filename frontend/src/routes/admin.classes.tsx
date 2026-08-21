import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DoorOpen } from "lucide-react";
import { fetchStudents, fetchTeachers, type Student, type Teacher } from "@/lib/supabaseService";
import {
  getStoredMasterClasses,
  subscribeMasterClasses,
  fetchMasterClassesFromSupabase,
  type MasterClassItem,
} from "@/lib/masterClassesStore";
import { ClassDetailsModal } from "@/components/classes/ClassDetailsModal";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/admin/classes")({
  component: ClassesPage,
  head: () => ({ meta: [{ title: "Classes — Sunshine Play School" }] }),
});

function ClassesPage() {
  const [classesList, setClassesList] = useState<MasterClassItem[]>(getStoredMasterClasses);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  const loadData = () => {
    fetchMasterClassesFromSupabase().then((res) => setClassesList(res || []));
    Promise.all([fetchStudents(), fetchTeachers()]).then(([{ data: st }, { data: tc }]) => {
      setStudentsList(st || []);
      setTeachersList((tc as any) || []);
    });
  };

  useAutoRefresh("classes", loadData);
  useAutoRefresh("students", loadData);
  useAutoRefresh("staff", loadData);

  useEffect(() => {
    loadData();
    return subscribeMasterClasses(() => {
      fetchMasterClassesFromSupabase().then((res) => setClassesList(res || []));
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sec = filterValues["Section"];
    return classesList.filter((c) => {
      const matchQ = !q || c.fullName.toLowerCase().includes(q) || c.classTeacher.toLowerCase().includes(q);
      const matchSec = !sec || sec === "all" || c.section.trim().toLowerCase() === sec.trim().toLowerCase();
      return matchQ && matchSec;
    });
  }, [classesList, search, filterValues]);

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    classesList.forEach((c) => {
      if (c.section && typeof c.section === "string" && c.section.trim()) {
        set.add(c.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [classesList]);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Classes Overview"
        description="Master school classes, sections, assigned class teachers, and student capacity."
      />

      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search class name, section, teacher..."
          filters={[{ label: "Section", options: sectionOptions }]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          hideExport={true}
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Class Name", "Section", "Live Student Count", "Class Teacher", "Room & Capacity", "Action"]}
          total={filtered.length}
        >
          {filtered.map((c) => {
            const count = studentsList.filter(
              (s) =>
                s.className?.trim().toLowerCase() === c.name.trim().toLowerCase() &&
                (s.section ? s.section.trim().toUpperCase() : "A") === c.section.toUpperCase()
            ).length;
            const fullClassInfo = { ...c, strength: count };

            return (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-slate-800 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    {c.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold text-xs">
                    Section {c.section}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100">
                    {count} / {c.capacity} Students
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Avatar className="h-7 w-7 border">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{c.classTeacher[0] || "T"}</AvatarFallback>
                    </Avatar>
                    <span>{c.classTeacher}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <DoorOpen className="w-3.5 h-3.5 text-indigo-500" /> {c.room || "Room 101"}
                    </div>
                    <div className="text-[11px] text-slate-500 pl-5 font-normal">
                      {c.capacity ? `Capacity: ${c.capacity} students` : "Capacity: Not Assigned"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setSelectedClass(fullClassInfo)}>
                    <Eye className="w-4 h-4 mr-1" /> View Class
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      <ClassDetailsModal
        open={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        classInfo={selectedClass}
        studentsList={studentsList}
      />
    </div>
  );
}
