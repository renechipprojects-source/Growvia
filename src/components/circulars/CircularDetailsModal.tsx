import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Bell, CheckCircle2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { AttachmentViewer } from "./AttachmentViewer";
import { markCircularAsRead, getDeliveryStats } from "@/lib/circularReadStore";

interface CircularDetailsModalProps {
  open: boolean;
  onClose: () => void;
  circular: any | null;
  role: string;
}

export function CircularDetailsModal({ open, onClose, circular, role }: CircularDetailsModalProps) {
  useEffect(() => {
    if (open && circular?.id && role) {
      markCircularAsRead(circular.id, role);
    }
  }, [open, circular?.id, role]);

  if (!circular) return null;

  const recipientsList = Array.isArray(circular.recipients) && circular.recipients.length > 0
    ? circular.recipients
    : typeof circular.target_audience === "string" && circular.target_audience.length > 0
    ? circular.target_audience.split(",")
    : ["Parents", "Teachers"];

  const stats = getDeliveryStats(circular.id, recipientsList);
  const isPrincipalOrAdmin = role === "principal" || role === "super-admin" || role === "admin";

  const priorityColor =
    circular.priority === "High"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : circular.priority === "Medium"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 p-6">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${priorityColor}`}>
              {circular.priority || "Medium"} Priority
            </span>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 text-xs">
              {circular.status || "Published"}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
            {circular.title}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Published by {circular.author || "Principal Office"}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {circular.publishDate || circular.published_date || "Today"}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Target Audience Badges */}
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Audience / Recipients</div>
            <div className="flex flex-wrap gap-1.5">
              {recipientsList.map((r: string) => (
                <Badge key={r} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          {/* Subject / Notice Body */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
            {circular.subject && circular.subject !== circular.title && (
              <div className="text-sm font-semibold text-slate-800">{circular.subject}</div>
            )}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {circular.description || circular.content || "No details available."}
            </p>
          </div>

          {/* Attachment Viewer */}
          {(circular.attachment || circular.attachmentName) && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Attached Document</div>
              <AttachmentViewer
                attachmentName={circular.attachmentName || circular.attachment}
                attachmentUrl={circular.attachmentUrl}
              />
            </div>
          )}

          {/* Delivery Statistics for Principal & Admin */}
          {isPrincipalOrAdmin && (
            <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Delivery & Read Statistics
                </span>
                <span>{stats.readPercentage}% Read</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-xl p-2.5 border border-indigo-100 shadow-sm">
                  <div className="text-xs text-slate-500">Sent To</div>
                  <div className="text-base font-bold text-slate-800">{stats.totalSent}</div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-emerald-100 shadow-sm">
                  <div className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> Read
                  </div>
                  <div className="text-base font-bold text-emerald-700">{stats.readCount}</div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-amber-100 shadow-sm">
                  <div className="text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
                    <EyeOff className="w-3 h-3" /> Pending
                  </div>
                  <div className="text-base font-bold text-amber-700">{stats.unreadCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Marked as Read
          </div>
          <Button onClick={onClose} variant="outline" className="rounded-xl border-slate-200">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
