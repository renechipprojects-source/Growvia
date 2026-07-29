import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserRound, Users, UserCog, GraduationCap, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

const MOCK_ITEMS = [
  { id: "STU1001", type: "Student", name: "Aarav Sharma", detail: "Class Nursery-A · Adm: ADM202601", route: "/admin/students" },
  { id: "STU1002", type: "Student", name: "Diya Patel", detail: "Class LKG-A · Adm: ADM202602", route: "/admin/students" },
  { id: "PAR2001", type: "Parent", name: "Mr. Rajesh Sharma", detail: "Phone: +91 98765 43210 · Child: Aarav", route: "/admin/parents" },
  { id: "TCH100", type: "Teacher", name: "Mrs. Priya", detail: "Emp ID: TCH100 · Class Teacher: Nursery-A", route: "/principal/teachers" },
  { id: "CLS101", type: "Class", name: "Nursery - Section A", detail: "Room 102 · Strength: 24 Students", route: "/admin/classes" },
];

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
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

  const filtered = query.trim()
    ? MOCK_ITEMS.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.detail.toLowerCase().includes(query.toLowerCase()) ||
          item.id.toLowerCase().includes(query.toLowerCase())
      )
    : MOCK_ITEMS;

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
            placeholder="Search students, parents, teachers, classes, admission no, phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400 h-9"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] text-slate-400 font-mono">
            ESC to close
          </Badge>
        </div>

        <div className="max-h-[350px] overflow-y-auto p-2 divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No records match "{query}".</div>
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
