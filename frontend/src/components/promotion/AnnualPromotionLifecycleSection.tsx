import React, { useEffect, useState, useCallback } from "react";
import { SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Users, UserCheck, CheckCircle2, Clock, AlertTriangle,
  UserX, FileText, RefreshCw, ArrowUpRight, ShieldCheck, HeartHandshake, Archive
} from "lucide-react";
import {
  getAnnualPromotionAndLifecycleStats,
  subscribeToPromotionAndLifecycleUpdates,
  type AnnualPromotionLifecycleStats,
} from "@/lib/dashboardStatsService";

interface AnnualPromotionLifecycleSectionProps {
  readOnly?: boolean;
  className?: string;
}

export function AnnualPromotionLifecycleSection({ readOnly = false, className }: AnnualPromotionLifecycleSectionProps) {
  const [selectedYear, setSelectedYear] = useState<string>("2026-2027");
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<AnnualPromotionLifecycleStats>({
    academicYear: "2026-2027",
    studentsEligible: 0,
    studentsPromoted: 0,
    promotionPending: 0,
    promotionCompleted: 0,
    promotionFailed: 0,
    promotionPercentage: 0,
    studentsWaitingReview: 0,
    studentsRequiringManualAction: 0,

    totalAdmissions: 0,
    activeStudents: 0,
    graduatedStudents: 0,
    tcIssued: 0,
    studentsLeftSchool: 0,
    rejoinedStudents: 0,
    inactiveStudents: 0,
    archivedStudents: 0,
  });

  const loadStats = useCallback((year: string) => {
    setLoading(true);
    getAnnualPromotionAndLifecycleStats(year).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  // Initial load and year change handler
  useEffect(() => {
    loadStats(selectedYear);
  }, [selectedYear, loadStats]);

  // Realtime subscription for automatic updates without page reload
  useEffect(() => {
    const unsubscribe = subscribeToPromotionAndLifecycleUpdates(() => {
      loadStats(selectedYear);
    });
    return () => {
      unsubscribe();
    };
  }, [selectedYear, loadStats]);

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* ─── 1. ANNUAL PROMOTION SECTION ─── */}
      <SectionCard
        title="Annual Academic Promotion Engine"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Academic Year:</span>
            <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl bg-white border-slate-200 shadow-sm font-semibold">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-2026">2025-2026</SelectItem>
                <SelectItem value="2026-2027">2026-2027 (Active)</SelectItem>
                <SelectItem value="2027-2028">2027-2028</SelectItem>
              </SelectContent>
            </Select>
            {loading && <RefreshCw className="h-3.5 w-3.5 text-indigo-600 animate-spin" />}
          </div>
        }
      >
        {/* Promotion Progress Banner */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-indigo-600" />
              <span className="font-bold text-slate-900 text-sm">
                Academic Session Progression ({selectedYear})
              </span>
              {readOnly && (
                <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                  Read Only
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-600">
              {stats.studentsPromoted} of {stats.studentsEligible} eligible students promoted ({stats.promotionPercentage}%)
            </div>
          </div>
          <div className="w-full sm:w-48 space-y-1.5 shrink-0">
            <div className="flex justify-between text-[11px] font-semibold text-indigo-900">
              <span>Promotion Rate</span>
              <span>{stats.promotionPercentage}%</span>
            </div>
            <Progress value={stats.promotionPercentage} className="h-2 bg-indigo-100" />
          </div>
        </div>

        {/* 8 Annual Promotion Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Eligible Students"
            value={stats.studentsEligible}
            sub="Active in Grade"
            color="indigo"
            icon={<Users className="h-4 w-4 text-indigo-600" />}
          />
          <StatTile
            label="Students Promoted"
            value={stats.studentsPromoted}
            sub="Next Grade Assigned"
            color="emerald"
            icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
          />
          <StatTile
            label="Promotion Pending"
            value={stats.promotionPending}
            sub="Action Required"
            color="amber"
            icon={<Clock className="h-4 w-4 text-amber-600" />}
          />
          <StatTile
            label="Promotion Completed"
            value={stats.promotionCompleted}
            sub="Promoted + Graduated"
            color="purple"
            icon={<CheckCircle2 className="h-4 w-4 text-purple-600" />}
          />
          <StatTile
            label="Promotion Failed / Repeat"
            value={stats.promotionFailed}
            sub="Retained Same Grade"
            color="rose"
            icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          />
          <StatTile
            label="Promotion Percentage"
            value={`${stats.promotionPercentage}%`}
            sub="Overall Completion"
            color="teal"
            icon={<ArrowUpRight className="h-4 w-4 text-teal-600" />}
          />
          <StatTile
            label="Waiting Review"
            value={stats.studentsWaitingReview}
            sub="Pending Approval"
            color="blue"
            icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}
          />
          <StatTile
            label="Manual Action Needed"
            value={stats.studentsRequiringManualAction}
            sub="Low Attendance / Dues"
            color="orange"
            icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
          />
        </div>
      </SectionCard>

      {/* ─── 2. LIFECYCLE SUMMARY SECTION ─── */}
      <SectionCard title="Student Lifecycle Directory Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Total Admissions"
            value={stats.totalAdmissions}
            sub="All Registrations"
            color="slate"
            icon={<FileText className="h-4 w-4 text-slate-600" />}
          />
          <StatTile
            label="Active Students"
            value={stats.activeStudents}
            sub="Enrolled & Attending"
            color="emerald"
            icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
          />
          <StatTile
            label="Graduated Students"
            value={stats.graduatedStudents}
            sub="Alumni Directory"
            color="purple"
            icon={<GraduationCap className="h-4 w-4 text-purple-600" />}
          />
          <StatTile
            label="TC Issued"
            value={stats.tcIssued}
            sub="Transferred Students"
            color="rose"
            icon={<UserX className="h-4 w-4 text-rose-600" />}
          />
          <StatTile
            label="Students Left School"
            value={stats.studentsLeftSchool}
            sub="Withdrawn"
            color="amber"
            icon={<UserX className="h-4 w-4 text-amber-600" />}
          />
          <StatTile
            label="Rejoined Students"
            value={stats.rejoinedStudents}
            sub="Re-enrolled"
            color="teal"
            icon={<HeartHandshake className="h-4 w-4 text-teal-600" />}
          />
          <StatTile
            label="Inactive Students"
            value={stats.inactiveStudents}
            sub="Temporary Hold"
            color="slate"
            icon={<Users className="h-4 w-4 text-slate-500" />}
          />
          <StatTile
            label="Archived Students"
            value={stats.archivedStudents}
            sub="Historical Database"
            color="indigo"
            icon={<Archive className="h-4 w-4 text-indigo-600" />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: "emerald" | "amber" | "purple" | "rose" | "indigo" | "teal" | "blue" | "orange" | "slate";
  icon: React.ReactNode;
}) {
  const COLOR_MAP: Record<string, { bg: string; border: string; text: string; subText: string }> = {
    emerald: { bg: "bg-emerald-50/70", border: "border-emerald-200", text: "text-emerald-950", subText: "text-emerald-700" },
    amber: { bg: "bg-amber-50/70", border: "border-amber-200", text: "text-amber-950", subText: "text-amber-700" },
    purple: { bg: "bg-purple-50/70", border: "border-purple-200", text: "text-purple-950", subText: "text-purple-700" },
    rose: { bg: "bg-rose-50/70", border: "border-rose-200", text: "text-rose-950", subText: "text-rose-700" },
    indigo: { bg: "bg-indigo-50/70", border: "border-indigo-200", text: "text-indigo-950", subText: "text-indigo-700" },
    teal: { bg: "bg-teal-50/70", border: "border-teal-200", text: "text-teal-950", subText: "text-teal-700" },
    blue: { bg: "bg-blue-50/70", border: "border-blue-200", text: "text-blue-950", subText: "text-blue-700" },
    orange: { bg: "bg-orange-50/70", border: "border-orange-200", text: "text-orange-950", subText: "text-orange-700" },
    slate: { bg: "bg-slate-50/70", border: "border-slate-200", text: "text-slate-950", subText: "text-slate-600" },
  };

  const theme = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <div className={`p-3.5 rounded-2xl ${theme.bg} border ${theme.border} transition-all duration-200 hover:shadow-sm`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] font-semibold text-slate-700 truncate">{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-bold ${theme.text} tracking-tight`}>{value}</div>
      <div className={`text-[10px] font-medium ${theme.subText} mt-0.5 truncate`}>{sub}</div>
    </div>
  );
}
