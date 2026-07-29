import React, { useState, useMemo } from "react";
import { Search, Filter, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircularCard } from "./CircularCard";
import { CircularDetailsModal } from "./CircularDetailsModal";
import { isCircularTargetedToRole } from "@/lib/circularReadStore";

interface CircularListProps {
  circulars: any[];
  role: string;
}

export function CircularList({ circulars, role }: CircularListProps) {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [selectedCircular, setSelectedCircular] = useState<any | null>(null);

  // Filter circulars relevant to this role & query filters
  const filtered = useMemo(() => {
    return circulars.filter((c) => {
      const isTarget = isCircularTargetedToRole(c, role);
      const matchQ = !q || c.title.toLowerCase().includes(q.toLowerCase()) || (c.description || c.content || "").toLowerCase().includes(q.toLowerCase());
      const matchP = priority === "all" || c.priority === priority;
      return isTarget && matchQ && matchP;
    });
  }, [circulars, role, q, priority]);

  return (
    <div className="space-y-4 w-full">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-white/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search circulars by title or keyword..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-slate-50/80 border-slate-200 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-slate-50/80 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High Priority</SelectItem>
              <SelectItem value="Medium">Medium Priority</SelectItem>
              <SelectItem value="Low">Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">No circulars found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {q || priority !== "all"
              ? "Try adjusting your search query or priority filters."
              : "There are currently no circulars published for your portal."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CircularCard key={c.id} circular={c} role={role} onClick={() => setSelectedCircular(c)} />
          ))}
        </div>
      )}

      {/* Details Modal */}
      <CircularDetailsModal
        open={!!selectedCircular}
        onClose={() => setSelectedCircular(null)}
        circular={selectedCircular}
        role={role}
      />
    </div>
  );
}
