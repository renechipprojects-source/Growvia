import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap, ArrowRight, CheckCircle2, RefreshCw, AlertTriangle,
  ShieldCheck, ChevronRight, ChevronLeft, Undo2, Plus, Lock, Printer, FileSpreadsheet, Users, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { STUDENTS as SEED_STUDENTS } from "@/lib/mockData";
import {
  executeStudentPromotion, rollbackPromotionBatch, canRollbackPromotionBatch,
  getDefaultDestinationClass, getAcademicYears, addAcademicYear, closeAcademicYear,
  isAcademicYearClosed, validatePromotionCapacity
} from "@/lib/promotionStore";
import { exportToCSV } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface PromotionWizardModalProps {
  open: boolean;
  onClose: () => void;
  onPromoteSuccess?: () => void;
}

const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;

import { useAutoRefresh } from "@/lib/autoRefreshContext";

export function PromotionWizardModal({ open, onClose, onPromoteSuccess }: PromotionWizardModalProps) {
  const { setFormEditing, triggerModuleRefresh } = useAutoRefresh();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    setFormEditing(open);
  }, [open, setFormEditing]);

  // Setup state (Step 1)
  const [fromYear, setFromYear] = useState<string>("2026-2027");
  const [toYear, setToYear] = useState<string>("2027-2028");
  const [fromClass, setFromClass] = useState<string>("LKG");
  const [toClass, setToClass] = useState<string>("UKG");
  const [academicYears, setAcademicYears] = useState(getAcademicYears());

  // Students & Action Map (Step 2)
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentActions, setStudentActions] = useState<Record<string, "Promote" | "Retain" | "Transfer">>( {});
  const [capacityOverride, setCapacityOverride] = useState(false);

  // Execution state (Step 3 & 4)
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    batchId: string;
    promotedCount: number;
    retainedCount: number;
    graduatedCount: number;
    transferredCount: number;
    durationMs: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchStudents().then(({ data }) => {
        setAllStudents(data && data.length > 0 ? data : SEED_STUDENTS);
      });
      setStep(1);
      setExecutionResult(null);
      setAcademicYears(getAcademicYears());
    }
  }, [open]);

  // Auto-populate destination class using Promotion Mapping Configuration
  useEffect(() => {
    const autoMapped = getDefaultDestinationClass(fromClass);
    setToClass(autoMapped);
  }, [fromClass]);

  // Filter students by source class
  const classStudents = useMemo(() => {
    return allStudents.filter(
      (s) =>
        s.className === fromClass ||
        (s.className && s.className.startsWith(fromClass))
    );
  }, [allStudents, fromClass]);

  // Initialize student actions on step 2 load
  useEffect(() => {
    if (step === 2) {
      const actions: Record<string, "Promote" | "Retain" | "Transfer"> = {};
      classStudents.forEach((s) => {
        actions[s.id] = "Promote";
      });
      setStudentActions(actions);
    }
  }, [step, classStudents]);

  // Categorize student selections
  const promotedIds = useMemo(() => {
    return Object.entries(studentActions)
      .filter(([_, action]) => action === "Promote")
      .map(([id]) => id);
  }, [studentActions]);

  const retainedIds = useMemo(() => {
    return Object.entries(studentActions)
      .filter(([_, action]) => action === "Retain")
      .map(([id]) => id);
  }, [studentActions]);

  const transferredIds = useMemo(() => {
    return Object.entries(studentActions)
      .filter(([_, action]) => action === "Transfer")
      .map(([id]) => id);
  }, [studentActions]);

  // Preview Analytics Metrics (Requirement 2)
  const previewMetrics = useMemo(() => {
    const pendingFeesCount = classStudents.filter((s) => s.feeStatus !== "Paid").length;
    const inactiveCount = classStudents.filter((s) => (s as any).status === "Inactive").length;
    const tcCount = transferredIds.length;
    const alreadyPromotedCount = classStudents.filter((s) => (s as any).status === "Promoted" || (s as any).status === "Graduated").length;
    return {
      total: classStudents.length,
      pendingFeesCount,
      inactiveCount,
      tcCount,
      alreadyPromotedCount,
    };
  }, [classStudents, transferredIds]);

  // Validate Destination Academic Year Existence
  const isToYearValid = useMemo(() => {
    return academicYears.some((y) => y.year === toYear);
  }, [academicYears, toYear]);

  // Capacity Check
  const capacityCheck = useMemo(() => {
    return validatePromotionCapacity(toClass, promotedIds.length, 25);
  }, [toClass, promotedIds]);

  const handleCreateAcademicYear = () => {
    addAcademicYear(toYear, "Office Staff");
    setAcademicYears(getAcademicYears());
    toast.success(`Academic Year ${toYear} created successfully!`);
  };

  const handleExecutePromotion = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = executeStudentPromotion({
        studentIds: promotedIds,
        retainedStudentIds: retainedIds,
        transferredStudentIds: transferredIds,
        fromClass,
        toClass,
        fromAcademicYear: fromYear,
        toAcademicYear: toYear,
        promotedBy: "Office Staff",
      });

      setIsProcessing(false);
      setExecutionResult({
        batchId: result.batchId,
        promotedCount: result.promotedCount,
        retainedCount: result.retainedCount,
        graduatedCount: result.graduatedCount,
        transferredCount: result.transferredCount,
        durationMs: result.durationMs,
      });
      setStep(4);
      toast.success(`Successfully processed ${promotedIds.length + retainedIds.length + transferredIds.length} student promotions!`);
      triggerModuleRefresh("promotion");
      triggerModuleRefresh("students");
      triggerModuleRefresh("assignments");
      if (onPromoteSuccess) onPromoteSuccess();
    }, 1000);
  };

  const handleClosePreviousYear = () => {
    closeAcademicYear(fromYear, "Office Staff");
    setAcademicYears(getAcademicYears());
    triggerModuleRefresh("promotion");
    toast.success(`Academic Year ${fromYear} has been marked CLOSED. Historical ledgers & attendance are now read-only.`);
  };

  const handleRollback = () => {
    if (!executionResult) return;
    const res = rollbackPromotionBatch(executionResult.batchId, "Office Staff");
    if (res.success) {
      toast.success(res.message);
      setStep(1);
      setExecutionResult(null);
      triggerModuleRefresh("promotion");
      triggerModuleRefresh("students");
      if (onPromoteSuccess) onPromoteSuccess();
    } else {
      toast.error(res.message);
    }
  };

  const rollbackCheck = useMemo(() => {
    return executionResult ? canRollbackPromotionBatch(executionResult.batchId) : { canRollback: false };
  }, [executionResult]);

  const handleExportSummaryCSV = () => {
    if (!executionResult) return;
    const rows = [
      ["Academic Session Transition", `${fromYear} → ${toYear}`],
      ["Class Transition", `${fromClass} → ${toClass}`],
      ["Students Promoted", executionResult.promotedCount],
      ["Students Retained", executionResult.retainedCount],
      ["Students Graduated", executionResult.graduatedCount],
      ["Students Transferred", executionResult.transferredCount],
      ["Batch ID", executionResult.batchId],
      ["Executed By", "Office Staff"],
      ["Execution Date", new Date().toISOString().slice(0, 10)],
    ];
    exportToCSV(`Promotion_Summary_${executionResult.batchId}`, ["Metric", "Value"], rows as any);
    toast.success("Promotion summary exported to CSV!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white/95 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <GraduationCap className="h-6 w-6 text-indigo-600" /> Commercial ERP Student Promotion Wizard
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className={cn("px-2.5 py-1 rounded-full", step === 1 ? "bg-indigo-600 text-white" : "bg-slate-100")}>1. Setup</span>
              <span>→</span>
              <span className={cn("px-2.5 py-1 rounded-full", step === 2 ? "bg-indigo-600 text-white" : "bg-slate-100")}>2. Actions</span>
              <span>→</span>
              <span className={cn("px-2.5 py-1 rounded-full", step === 3 ? "bg-indigo-600 text-white" : "bg-slate-100")}>3. Preview</span>
              <span>→</span>
              <span className={cn("px-2.5 py-1 rounded-full", step === 4 ? "bg-emerald-600 text-white" : "bg-slate-100")}>4. Summary</span>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: SETUP & ACADEMIC YEAR VALIDATION */}
        {step === 1 && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900">
              <p className="font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> Auto-Mapped Promotion Setup
              </p>
              <p className="mt-1 text-slate-600 text-[11px]">
                Destination class is automatically populated from your <b>Promotion Mapping Configuration</b>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Academic Year</Label>
                <Select value={fromYear} onValueChange={setFromYear}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.year} value={y.year}>
                        {y.year} {y.status === "Closed" ? "(Closed)" : y.status === "Active" ? "(Active)" : "(Upcoming)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Target New Academic Year</Label>
                <Select value={toYear} onValueChange={setToYear}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.year} value={y.year}>
                        {y.year} {y.status === "Closed" ? "(Closed)" : y.status === "Active" ? "(Active)" : "(Upcoming)"}
                      </SelectItem>
                    ))}
                    <SelectItem value="2028-2029">2028-2029 (Create New)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ACADEMIC YEAR VALIDATION WARNING */}
            {!isToYearValid && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Please create Academic Year <b>{toYear}</b> before running promotion.</span>
                </div>
                <Button size="sm" onClick={handleCreateAcademicYear} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Academic Year
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Source Class</Label>
                <Select value={fromClass} onValueChange={setFromClass}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Target Destination Class (Auto-Mapped)</Label>
                <Select value={toClass} onValueChange={setToClass}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="Alumni / Graduated">Alumni / Graduated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Auto-Mapping Configuration:</span>
              <Badge className="bg-indigo-600 text-white">
                {fromClass} → {toClass}
              </Badge>
            </div>
          </div>
        )}

        {/* STEP 2: INDIVIDUAL STUDENT ACTIONS (PROMOTE / RETAIN / TRANSFER / GRADUATE) */}
        {step === 2 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Class Student Actions ({fromClass})</h4>
                <p className="text-muted-foreground text-[11px]">Set individual student progression: Promote, Retain, or Issue TC</p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge className="bg-indigo-100 text-indigo-700 font-bold">{promotedIds.length} Promote</Badge>
                <Badge className="bg-amber-100 text-amber-700 font-bold">{retainedIds.length} Retain</Badge>
                <Badge className="bg-rose-100 text-rose-700 font-bold">{transferredIds.length} Transfer</Badge>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 backdrop-blur z-10">
                  <tr>
                    <th className="px-3 py-2">Admission No</th>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Current Class</th>
                    <th className="px-3 py-2">Fee Status</th>
                    <th className="px-3 py-2 text-right">Progression Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((s) => {
                    const currentAction = studentActions[s.id] || "Promote";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 font-mono text-slate-700">{s.admissionNo || s.id}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                        <td className="px-3 py-2">{s.className}</td>
                        <td className="px-3 py-2">
                          <Badge className={s.feeStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {s.feeStatus || "Pending"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Select
                            value={currentAction}
                            onValueChange={(val: any) =>
                              setStudentActions((prev) => ({ ...prev, [s.id]: val }))
                            }
                          >
                            <SelectTrigger className="w-[150px] h-7 text-xs rounded-xl bg-white border-slate-200 ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Promote">Promote ({toClass})</SelectItem>
                              <SelectItem value="Retain">Retain in {fromClass}</SelectItem>
                              <SelectItem value="Transfer">Transfer (Issue TC)</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: PROMOTION PREVIEW SCREEN (REQUIREMENT 2 & 5) */}
        {step === 3 && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-indigo-950">Promotion Batch Pre-Flight Preview</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">Comprehensive audit of progression metrics before execution</p>
                </div>
                <Badge className="bg-indigo-600 text-white font-bold text-xs">{fromClass} → {toClass}</Badge>
              </div>
            </div>

            {/* PREVIEW ANALYTICS GRID */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-500 text-[10px] font-medium block">Total Students in Source</span>
                <span className="font-bold text-slate-900 text-sm">{previewMetrics.total} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-amber-50">
                <span className="text-amber-800 text-[10px] font-medium block">Pending Fees Exists</span>
                <span className="font-bold text-amber-900 text-sm">{previewMetrics.pendingFeesCount} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-500 text-[10px] font-medium block">In-Active Students</span>
                <span className="font-bold text-slate-900 text-sm">{previewMetrics.inactiveCount} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-rose-50">
                <span className="text-rose-800 text-[10px] font-medium block">Students with TC (Transferred)</span>
                <span className="font-bold text-rose-900 text-sm">{previewMetrics.tcCount} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-50">
                <span className="text-emerald-800 text-[10px] font-medium block">Already Promoted</span>
                <span className="font-bold text-emerald-900 text-sm">{previewMetrics.alreadyPromotedCount} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-indigo-50">
                <span className="text-indigo-800 text-[10px] font-medium block">Destination Class Strength / Capacity</span>
                <span className="font-bold text-indigo-900 text-sm">{capacityCheck.projectedCount} / {capacityCheck.capacity}</span>
              </div>
            </div>

            {/* CAPACITY WARNING (CAN OVERRIDE) */}
            {!capacityCheck.valid && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Destination Class Capacity Exceeded ({capacityCheck.projectedCount} / {capacityCheck.capacity})
                </div>
                <p className="text-[11px] text-amber-800">
                  Destination class capacity limit is <b>{capacityCheck.capacity}</b>. Promotion can still proceed if Office Staff approves capacity override.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="override" checked={capacityOverride} onCheckedChange={(c) => setCapacityOverride(!!c)} />
                  <label htmlFor="override" className="text-xs font-semibold text-amber-900 cursor-pointer">
                    Enable Capacity Override (Commercial Approval)
                  </label>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-indigo-950">Auto Teacher Assignment Inheritance:</span>
              </div>
              <span className="font-bold text-indigo-700 text-xs">Mrs. Priya (Class Teacher) & Subject Teachers</span>
            </div>
          </div>
        )}

        {/* STEP 4: ENHANCED PROMOTION SUMMARY & REPORTS */}
        {step === 4 && executionResult && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold">Academic Session Promotion Completed!</h3>
              <p className="text-xs text-emerald-800">
                Batch ID: <b>{executionResult.batchId}</b> · Duration: <b>{executionResult.durationMs}ms</b>
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl border bg-emerald-50">
                <div className="text-emerald-700 text-[10px]">Promoted</div>
                <div className="font-bold text-base text-emerald-800">{executionResult.promotedCount}</div>
              </div>
              <div className="p-3 rounded-xl border bg-amber-50">
                <div className="text-amber-700 text-[10px]">Retained</div>
                <div className="font-bold text-base text-amber-800">{executionResult.retainedCount}</div>
              </div>
              <div className="p-3 rounded-xl border bg-purple-50">
                <div className="text-purple-700 text-[10px]">Graduated</div>
                <div className="font-bold text-base text-purple-800">{executionResult.graduatedCount}</div>
              </div>
              <div className="p-3 rounded-xl border bg-rose-50">
                <div className="text-rose-700 text-[10px]">Transferred (TC)</div>
                <div className="font-bold text-base text-rose-800">{executionResult.transferredCount}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold">Sequential Roll Numbers:</span>
                <span className="font-bold text-indigo-700">Auto-Generated (1, 2, 3...) No Gaps</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-semibold">Teacher Assignments:</span>
                <span className="font-bold text-emerald-700">Auto-Inherited from Destination Class</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-indigo-950 block text-xs">Mark Academic Year {fromYear} Closed?</span>
                <span className="text-[11px] text-slate-600">Locks historical ledgers and attendance as read-only.</span>
              </div>
              <Button size="sm" onClick={handleClosePreviousYear} disabled={isAcademicYearClosed(fromYear)} className="h-8 text-xs bg-indigo-600 text-white rounded-xl">
                <Lock className="h-3.5 w-3.5 mr-1" /> {isAcademicYearClosed(fromYear) ? "Year Closed" : `Close ${fromYear}`}
              </Button>
            </div>

            <div className="flex justify-between items-center pt-2">
              {rollbackCheck.canRollback ? (
                <Button size="sm" variant="outline" onClick={handleRollback} className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl">
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo Promotion Batch
                </Button>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
                  <Lock className="h-3 w-3 mr-1" /> Rollback Locked (Activity Started)
                </Badge>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportSummaryCSV} className="h-8 text-xs rounded-xl">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export CSV / Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 text-xs rounded-xl">
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print Summary
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t flex justify-between items-center">
          {step > 1 && step < 4 ? (
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setStep((s) => (s - 1) as any)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          ) : <div />}

          <div className="flex gap-2">
            {step < 4 && (
              <Button variant="outline" className="rounded-xl text-xs" onClick={onClose}>
                Cancel
              </Button>
            )}

            {step === 1 && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                disabled={!isToYearValid}
                onClick={() => setStep(2)}
              >
                Next: Set Actions <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === 2 && (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs" onClick={() => setStep(3)}>
                Next: Promotion Preview <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === 3 && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs shadow-md"
                disabled={isProcessing}
                onClick={handleExecutePromotion}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Executing Promotions...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Execute Batch
                  </>
                )}
              </Button>
            )}

            {step === 4 && (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs" onClick={onClose}>
                Done & Close Wizard
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
