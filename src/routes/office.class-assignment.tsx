import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useClassAssignments, type ClassAssignment, type AssignmentRole } from "@/lib/classAssignmentContext";

export const Route = createFileRoute("/office/class-assignment")({ component: ClassAssignmentPage });

const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG"] as const;
const SECTIONS = ["A", "B"] as const;
const TEACHERS = [
  { id: "TCH100", name: "Mrs. Priya" },
  { id: "TCH101", name: "Ms. Anjali" },
  { id: "TCH102", name: "Mr. Rakesh" },
  { id: "TCH103", name: "Mrs. Kavitha" },
];

type Draft = Omit<ClassAssignment, "id"> & { id?: string };

const EMPTY: Draft = {
  teacherId: "",
  teacherName: "",
  academicYear: "2026-27",
  role: "class",
  className: "",
  section: "A",
  subject: "",
  status: "active",
};

function ClassAssignmentPage() {
  const { assignments, create, update, remove, toggle } = useClassAssignments();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const grouped = useMemo(() => {
    const map = new Map<string, ClassAssignment[]>();
    for (const a of assignments) {
      const arr = map.get(a.teacherId) ?? [];
      arr.push(a);
      map.set(a.teacherId, arr);
    }
    return Array.from(map.entries());
  }, [assignments]);

  const openNew = () => { setDraft(EMPTY); setOpen(true); };
  const openEdit = (a: ClassAssignment) => { setDraft({ ...a }); setOpen(true); };

  const save = () => {
    if (!draft.teacherId || !draft.className || !draft.section) {
      toast.error("Please pick teacher, class and section.");
      return;
    }
    if (draft.role === "subject" && !draft.subject) {
      toast.error("Subject teachers need a subject.");
      return;
    }
    const teacher = TEACHERS.find((t) => t.id === draft.teacherId);
    const payload: Omit<ClassAssignment, "id"> = {
      teacherId: draft.teacherId,
      teacherName: teacher?.name ?? draft.teacherName,
      academicYear: draft.academicYear,
      role: draft.role,
      className: draft.className,
      section: draft.section,
      subject: draft.role === "subject" ? draft.subject : undefined,
      status: draft.status,
    };
    if (draft.id) { update(draft.id, payload); toast.success("Assignment updated"); }
    else { create(payload); toast.success("Assignment created"); }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Class Assignment"
        subtitle="Assign teachers to classes and subjects. Controls what each teacher can access."
        action={
          <Button onClick={openNew} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg">
            <Plus className="h-4 w-4 mr-2" />New assignment
          </Button>
        }
      />

      <div className="space-y-4">
        {grouped.length === 0 && (
          <SectionCard title="No assignments">
            <div className="text-sm text-muted-foreground">Create the first assignment to get started.</div>
          </SectionCard>
        )}
        {grouped.map(([teacherId, rows]) => {
          const teacher = TEACHERS.find((t) => t.id === teacherId);
          return (
            <SectionCard key={teacherId} title={`${teacher?.name ?? teacherId} · ${rows.length} assignment${rows.length === 1 ? "" : "s"}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="py-2 pr-3">Year</th><th className="pr-3">Role</th><th className="pr-3">Class</th><th className="pr-3">Section</th><th className="pr-3">Subject</th><th className="pr-3">Status</th><th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="border-t border-white/60">
                        <td className="py-2 pr-3">{a.academicYear}</td>
                        <td className="pr-3">{a.role === "class" ? "Class Teacher" : "Subject Teacher"}</td>
                        <td className="pr-3">{a.className}</td>
                        <td className="pr-3">{a.section}</td>
                        <td className="pr-3">{a.subject ?? "—"}</td>
                        <td className="pr-3">
                          <Badge className={a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>{a.status}</Badge>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => toggle(a.id)} title="Toggle status"><Power className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { remove(a.id); toast.success("Removed"); }}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft.id ? "Edit assignment" : "New assignment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Teacher</Label>
              <Select value={draft.teacherId} onValueChange={(v) => setDraft({ ...draft, teacherId: v })}>
                <SelectTrigger className="bg-white/70 mt-1.5"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{TEACHERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic year</Label>
              <Input className="bg-white/70 mt-1.5" value={draft.academicYear} onChange={(e) => setDraft({ ...draft, academicYear: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as AssignmentRole })}>
                <SelectTrigger className="bg-white/70 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class Teacher</SelectItem>
                  <SelectItem value="subject">Subject Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={draft.className} onValueChange={(v) => setDraft({ ...draft, className: v })}>
                <SelectTrigger className="bg-white/70 mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={draft.section} onValueChange={(v) => setDraft({ ...draft, section: v })}>
                <SelectTrigger className="bg-white/70 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.role === "subject" && (
              <div className="col-span-2">
                <Label>Subject</Label>
                <Input className="bg-white/70 mt-1.5" value={draft.subject ?? ""} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="e.g. English" />
              </div>
            )}
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as "active" | "inactive" })}>
                <SelectTrigger className="bg-white/70 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
