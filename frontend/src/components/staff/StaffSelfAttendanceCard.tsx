import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, Clock, CalendarCheck, ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import {
  fetchStaffAttendanceFromSupabase,
  markStaffTimeIn,
  markStaffTimeOut,
  getLocalDateString,
  computeStaffStatus,
} from "@/lib/attendanceStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { toast } from "sonner";

export function StaffSelfAttendanceCard() {
  const session = getSession();
  const staffId = session?.linkId || session?.loginId || "TCH-001";
  const staffName = session?.name || "Ananya Sen";

  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<{
    status: string;
    checkIn: string;
    checkOut: string;
    workingHours?: string;
  } | null>(null);

  const todayStr = getLocalDateString();
  const formattedToday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const loadAttendance = useCallback(() => {
    fetchStaffAttendanceFromSupabase(todayStr).then((map) => {
      const rec =
        map[staffId] ||
        map[staffId.toLowerCase()] ||
        map[staffName] ||
        map[staffName.toLowerCase()];
      setRecord(rec || null);
    });
  }, [staffId, staffName, todayStr]);

  useAutoRefresh("attendance", loadAttendance);
  useAutoRefresh("staff", loadAttendance);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const hasCheckedIn = Boolean(record && record.checkIn && record.checkIn !== "—");
  const hasCheckedOut = Boolean(record && record.checkOut && record.checkOut !== "—");

  const evaluated = computeStaffStatus(record || undefined, todayStr);
  let statusLabel = evaluated.status;
  let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-300";

  if (evaluated.status === "Checked Out") {
    statusBadgeColor = "bg-indigo-100 text-indigo-700 border-indigo-300";
  } else if (evaluated.status === "Present") {
    statusBadgeColor = "bg-emerald-100 text-emerald-700 border-emerald-300";
  } else if (evaluated.status === "Late") {
    statusBadgeColor = "bg-amber-100 text-amber-700 border-amber-300";
  } else if (evaluated.status === "Absent") {
    statusBadgeColor = "bg-rose-100 text-rose-700 border-rose-300";
  } else if (evaluated.status === "Leave") {
    statusBadgeColor = "bg-purple-100 text-purple-700 border-purple-300";
  }

  const handleTimeIn = async () => {
    setLoading(true);
    const res = await markStaffTimeIn(staffId, staffName);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      loadAttendance();
    } else {
      toast.error(res.message);
    }
  };

  const handleTimeOut = async () => {
    setLoading(true);
    const res = await markStaffTimeOut(staffId, staffName);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      loadAttendance();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 shadow-lg space-y-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{staffName}</span>
              <span className="text-xs text-indigo-300 font-mono">({staffId})</span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formattedToday}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadgeColor}`}>
            {statusLabel}
          </Badge>
          <Badge variant="outline" className="text-[11px] border-white/20 text-slate-300">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" /> Authenticated Self-Service
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Time In</span>
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {record?.checkIn || "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {hasCheckedIn ? "Recorded" : "Not Marked"}
          </div>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Time Out</span>
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {record?.checkOut || "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {hasCheckedOut ? "Recorded" : hasCheckedIn ? "Pending Out" : "Not Marked"}
          </div>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/10 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Working Hours</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {record?.workingHours || "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {hasCheckedOut ? "Completed" : hasCheckedIn ? "Active Session" : "No Session"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          onClick={handleTimeIn}
          disabled={loading || hasCheckedIn}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md disabled:opacity-50"
        >
          <LogIn className="w-4 h-4 mr-2" />
          {hasCheckedIn ? `Time In Marked (${record?.checkIn})` : "Mark Time In"}
        </Button>

        <Button
          onClick={handleTimeOut}
          disabled={loading || !hasCheckedIn || hasCheckedOut}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {hasCheckedOut
            ? `Time Out Marked (${record?.checkOut})`
            : hasCheckedIn
            ? "Mark Time Out"
            : "Mark Time In First"}
        </Button>
      </div>
    </div>
  );
}
