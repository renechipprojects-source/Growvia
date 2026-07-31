import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Megaphone, ArrowRight, Paperclip, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchCirculars } from "@/lib/supabaseService";
import { CircularDetailsModal } from "./CircularDetailsModal";
import { isCircularTargetedToRole, isCircularRead } from "@/lib/circularReadStore";

interface RecentCircularWidgetProps {
  role: string;
  viewAllLink?: string;
  limit?: number;
}

export function RecentCircularWidget({ role, viewAllLink, limit = 5 }: RecentCircularWidgetProps) {
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<any | null>(null);

  const targetLink = viewAllLink || (role === "admin" || role === "super-admin" ? "/admin/circulars" : `/${role}/circulars`);

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      if (data && Array.isArray(data)) {
        const targeted = data.filter((c) => isCircularTargetedToRole(c, role));
        setCirculars(targeted.slice(0, limit));
      }
      setLoading(false);
    });
  }, [role, limit]);

  const priorityColor = (p?: string) => {
    if (p === "High") return "bg-rose-100 text-rose-700 border-rose-200";
    if (p === "Medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="rounded-3xl border border-white/60 bg-white/75 backdrop-blur-xl p-5 shadow-lg shadow-slate-900/5 flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Megaphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base leading-tight truncate">Recent Circulars</h3>
            <p className="text-xs text-slate-500">Official notices & announcements</p>
          </div>
        </div>

        <Link to={targetLink}>
          <Button variant="ghost" size="sm" className="rounded-xl text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 font-semibold">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 min-h-[160px]">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading recent notices...</div>
        ) : circulars.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No recent circulars available.</div>
        ) : (
          circulars.map((c) => {
            const isRead = isCircularRead(c.id, role);
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCircular(c)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  !isRead
                    ? "bg-indigo-50/50 border-indigo-200/80 hover:bg-indigo-50/80"
                    : "bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${priorityColor(c.priority)}`}>
                      {c.priority || "Medium"}
                    </span>
                    {!isRead && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                    {c.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {c.publishDate || c.published_date || "Today"}
                    </span>
                    {(c.attachment || c.attachmentName) && (
                      <span className="flex items-center gap-0.5 text-indigo-500">
                        <Paperclip className="w-3 h-3" /> Attached
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <CircularDetailsModal
        open={!!selectedCircular}
        onClose={() => setSelectedCircular(null)}
        circular={selectedCircular}
        role={role}
      />
    </div>
  );
}
