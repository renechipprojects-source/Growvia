import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserRound, Users, UserCog, GraduationCap, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { fetchStudents, fetchTeachers } from "@/lib/supabaseService";
import { readAssignments } from "@/lib/classAssignmentContext";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchStudents(), fetchTeachers()]).then(([studentRes, teacherRes]) => {
      const stus: any[] = studentRes.data || [];
      const tchs: any[] = teacherRes.data || [];
      const liveList: any[] = [];

      (stus || []).forEach((s) => {
        const parentName = typeof s.parent === "object" ? s.parent?.name : s.parent || "Parent";
        liveList.push({
          id: s.id,
          type: "Student",
          name: s.name,
          detail: `Class ${s.className}-${s.section || "A"} · Roll: ${s.rollNo || s.id} · Parent: ${parentName}`,
          route: "/admin/students",
        });
        liveList.push({
          id: `PAR-${s.id}`,
          type: "Parent",
          name: parentName,
          detail: `Phone: ${s.phone || "+91 98765 43210"} · Child: ${s.name}`,
          route: "/admin/parents",
        });
      });

      (tchs || []).forEach((t) => {
        liveList.push({
          id: t.id,
          type: "Teacher",
          name: t.name,
          detail: `Emp ID: ${t.id} · Subject: ${t.subject || "General"}`,
          route: "/principal/teachers",
        });
      });

      // Add Class items
      ["Nursery-A", "LKG-A", "UKG-A", "UKG-B"].forEach((c, idx) => {
        liveList.push({
          id: `CLS-${idx}`,
          type: "Class",
          name: `Class ${c}`,
          detail: `Room 10${idx + 1} · Active Section`,
          route: "/admin/classes",
        });
      });

      setItems(liveList);
    });
  }, [open]);

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.detail.toLowerCase().includes(query.toLowerCase()) ||
          item.id.toLowerCase().includes(query.toLowerCase())
      )
    : items.slice(0, 8);

  const handleSelect = (route: string) => {
    onClose();
    navigate({ to: route as any });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden bg-white shadow-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-indigo-600 shrink-0" />
          <Input
            placeholder="Search live students, parents, teachers, classes, roll no, phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400 h-9"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] text-slate-400 font-mono">
            ESC to close
          </Badge>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No live records match "{query}".</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.route)}
                className="p-3 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                    {item.type === "Student" && <UserRound className="h-4 w-4" />}
                    {item.type === "Parent" && <Users className="h-4 w-4" />}
                    {item.type === "Teacher" && <UserCog className="h-4 w-4" />}
                    {item.type === "Class" && <GraduationCap className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      {item.name}
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                        {item.type}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500">{item.detail}</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
