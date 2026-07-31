import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Paperclip, ChevronRight, BellRing } from "lucide-react";
import { isCircularRead } from "@/lib/circularReadStore";

interface CircularCardProps {
  circular: any;
  role: string;
  onClick: () => void;
}

export function CircularCard({ circular, role, onClick }: CircularCardProps) {
  const isRead = isCircularRead(circular.id, role);

  const recipientsList = Array.isArray(circular.recipients) && circular.recipients.length > 0
    ? circular.recipients
    : typeof circular.target_audience === "string" && circular.target_audience.length > 0
    ? circular.target_audience.split(",")
    : ["Parents", "Teachers"];

  const priorityBadge =
    circular.priority === "High"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : circular.priority === "Medium"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";

  return (
    <Card
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl border transition-all duration-200 hover:shadow-md ${
        !isRead ? "bg-indigo-50/40 border-indigo-200/80 shadow-sm" : "bg-white/80 border-slate-200/80 hover:bg-white"
      }`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${priorityBadge}`}>
                {circular.priority || "Medium"}
              </span>
              {!isRead && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <BellRing className="w-3 h-3 animate-pulse" /> Unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {circular.publishDate || circular.published_date || "Today"}
            </div>
          </div>

          <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
            {circular.title}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {circular.description || circular.content || circular.subject || "No details."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-xs">
          <div className="flex flex-wrap gap-1 items-center">
            {recipientsList.slice(0, 3).map((r: string) => (
              <Badge key={r} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5">
                {r}
              </Badge>
            ))}
            {recipientsList.length > 3 && (
              <span className="text-[10px] text-slate-400">+{recipientsList.length - 3}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            {(circular.attachment || circular.attachmentName) && (
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>View</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
