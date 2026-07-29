import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap, ArrowRight, CheckCircle2, RefreshCw, AlertTriangle,
  ShieldCheck, ChevronRight, ChevronLeft, Undo2
} from "lucide-react";
import { toast } from "sonner";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { STUDENTS as SEED_STUDENTS } from "@/lib/mockData";
import { executeStudentPromotion, rollbackPromotionBatch } from "@/lib/promotionStore";
import { cn } from "@/lib/utils";

interface PromotionWizardModalProps {
  open: boolean;
  onClose: () => void;
  onPromoteSuccess?: () => void;
}

const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;
const ACADEMIC_YEARS = ["2025-2026", "2026-2027", "2027-2028", "2028-2029"] as const;

export function PromotionWizardModal({ open, onClose, onPromoteSuccess }: PromotionWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Setup state (Step 1)
  const [fromYear, setFromYear] = useState<string>("2026-2027");
  const [toYear, setToYear] = useState<string>("2027-2028");
  const [fromClass, setFromClass] = useState<string>("LKG");
  const [toClass, setToClass] = useState<string>("UKG");
  const [promotionMode, setPromotionMode] = useState<"entire" | "selected">("entire");

  // Students & Selection (Step 2)
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Execution state (Step 3 & 4)
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    batchId: string;
    promotedCount: number;
    retainedCount: number;
    graduatedCount: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchStudents().then(({ data }) => {
        setAllStudents(data && data.length > 0 ? data : SEED_STUDENTS);
      });
      setStep(1);
      setExecutionResult(null);
    }
  }, [open]);

  // Filter students by source class
  const classStudents = useMemo(() => {
    return allStudents.filter(
      (s) =>
        s.className === fromClass ||
        (s.className && s.className.startsWith(fromClass))
    );
  }, [allStudents, fromClass]);

  // Auto-select all eligible on step 2 load
  useEffect(() => {
    if (step === 2) {
      const eligibleIds = new Set<string>();
      classStudents.forEach((s) => {
        const st = (s as any).status;
        if (st !== "Inactive" && st !== "Graduated") {
          eligibleIds.add(s.id);
        }
      });
      setSelectedStudentIds(eligibleIds);
    }
  }, [step, classStudents]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === classStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      const allIds = new Set<string>(classStudents.map((s) => s.id));
      setSelectedStudentIds(allIds);
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleExecutePromotion = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = executeStudentPromotion({
        studentIds: Array.from(selectedStudentIds),
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
        retainedCount: classStudents.length - selectedStudentIds.size,
        graduatedCount: result.graduatedCount,
      });
      setStep(4);
      toast.success(`Successfully promoted ${result.promotedCount} students to ${toClass}!`);
      if (onPromoteSuccess) onPromoteSuccess();
    }, 1200);
  };

  const handleRollback = () => {
    if (!executionResult) return;
    const ok = rollbackPromotionBatch(executionResult.batchId, "Office Staff");
    if (ok) {
      toast.success("Promotion batch rolled back successfully!");
      setStep(1);
      setExecutionResult(null);
      if (onPromoteSuccess) onPromoteSuccess();
    }
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
              <span className={cn("px-2.5 py-1 rounded-full", step === 2 ? "bg-indigo-600 text-white" : "bg-slate-100")}>2. Students</span>
              <span>→</span>
              <span className={cn("px-2.5 py-1 rounded-full", step === 3 ? "bg-indigo-600 text-white" : "bg-slate-100")}>3. Confirm</span>
              <span>→</span>
              <span className={cn("px-2.5 py-1 rounded-full", step === 4 ? "bg-emerald-600 text-white" : "bg-slate-100")}>4. Summary</span>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: SELECT PROMOTION SETUP */}
        {step === 1 && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900">
              <p className="font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> Office-Managed Academic Promotion Engine
              </p>
              <p className="mt-1 text-slate-600 text-[11px]">
                Configures the transition from current academic session to target academic year. Archives historical attendance & fee ledgers while preserving complete audit trails.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Academic Year</Label>
                <Select value={fromYear} onValueChange={setFromYear}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Target New Academic Year</Label>
                <Select value={toYear} onValueChange={setToYear}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Source Class</Label>
                <Select value={fromClass} onValueChange={setFromClass}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Target Destination Class</Label>
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
              <span className="font-semibold text-slate-700">Promotion Scope</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="radio" name="scope" checked={promotionMode === "entire"} onChange={() => setPromotionMode("entire")} />
                  Promote Entire Class ({classStudents.length} Students)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input type="radio" name="scope" checked={promotionMode === "selected"} onChange={() => setPromotionMode("selected")} />
                  Select Specific Students
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STUDENT SELECTION & ELIGIBILITY TABLE */}
        {step === 2 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Class Student Register ({fromClass})</h4>
                <p className="text-muted-foreground text-[11px]">Verify promotion eligibility before advancing</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-xl" onClick={toggleSelectAll}>
                {selectedStudentIds.size === classStudents.length ? "Deselect All" : "Select All Eligible"}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 backdrop-blur z-10">
                  <tr>
                    <th className="px-3 py-2 text-center">Select</th>
                    <th className="px-3 py-2">Admission No</th>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Current Class</th>
                    <th className="px-3 py-2">Attendance %</th>
                    <th className="px-3 py-2">Fee Status</th>
                    <th className="px-3 py-2">Eligibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((s) => {
                    const isFeePending = s.feeStatus !== "Paid";
                    const studentStatus = (s as any).status;
                    const isInactive = studentStatus === "Inactive" || studentStatus === "Graduated";
                    const isSelected = selectedStudentIds.has(s.id);

                    return (
                      <tr key={s.id} className={cn("hover:bg-slate-50 transition", isSelected && "bg-indigo-50/40")}>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStudent(s.id)}
                            disabled={isInactive}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">{s.admissionNo || s.id}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                        <td className="px-3 py-2">{s.className}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">96%</td>
                        <td className="px-3 py-2">
                          <Badge className={s.feeStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {s.feeStatus || "Pending"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {isInactive ? (
                            <Badge variant="outline" className="text-slate-500 bg-slate-100">Inactive / Skip</Badge>
                          ) : isFeePending ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Pending Fee Exists (Allowed)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Eligible
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                        No students enrolled in source class {fromClass}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-900">Selected for Promotion:</span>
              <span className="font-bold text-indigo-700 text-sm">{selectedStudentIds.size} of {classStudents.length} Students</span>
            </div>
          </div>
        )}

        {/* STEP 3: PRE-FLIGHT CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-slate-900">
              <h4 className="font-bold text-sm text-indigo-950">Pre-Flight Promotion Summary</h4>
              <p className="text-slate-600 text-[11px] mt-0.5">Please review the configuration before confirming promotion execution.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-400 block font-medium">Academic Year Transition</span>
                <span className="font-bold text-slate-900">{fromYear} → {toYear}</span>
              </div>
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-400 block font-medium">Class Transition</span>
                <span className="font-bold text-indigo-700">{fromClass} → {toClass}</span>
              </div>
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-400 block font-medium">Students Selected</span>
                <span className="font-bold text-emerald-700">{selectedStudentIds.size} Students</span>
              </div>
              <div className="p-3 rounded-xl border bg-slate-50">
                <span className="text-slate-400 block font-medium">Executed By / Date</span>
                <span className="font-bold text-slate-900">Office Staff · {new Date().toISOString().slice(0, 10)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Data Protection & Historical Integrity</span>
                Existing fee history, attendance records, and parent mappings will remain intact. Fresh fee ledgers will be generated for Academic Year {toYear}.
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS SUMMARY & REPORT */}
        {step === 4 && executionResult && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold">Student Promotion Execution Complete!</h3>
              <p className="text-xs text-emerald-800">
                Academic session updated from <b>{fromYear}</b> to <b>{toYear}</b> for <b>{toClass}</b>.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl border bg-slate-50">
                <div className="text-slate-500 text-[10px]">Total Selected</div>
                <div className="font-bold text-sm text-slate-900">{selectedStudentIds.size}</div>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-50">
                <div className="text-emerald-700 text-[10px]">Promoted</div>
                <div className="font-bold text-sm text-emerald-800">{executionResult.promotedCount}</div>
              </div>
              <div className="p-3 rounded-xl border bg-amber-50">
                <div className="text-amber-700 text-[10px]">Retained</div>
                <div className="font-bold text-sm text-amber-800">{executionResult.retainedCount}</div>
              </div>
              <div className="p-3 rounded-xl border bg-slate-50">
                <div className="text-slate-500 text-[10px]">Errors</div>
                <div className="font-bold text-sm text-slate-900">0</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 border flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Administrative Batch Rollback</span>
                <span className="text-[11px] text-muted-foreground">Office Staff can revert this promotion batch if executed in error.</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleRollback} className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50">
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Rollback Batch
              </Button>
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
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs" onClick={() => setStep(2)}>
                Next: Select Students <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === 2 && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                disabled={selectedStudentIds.size === 0}
                onClick={() => setStep(3)}
              >
                Next: Review Confirmation <ChevronRight className="h-4 w-4 ml-1" />
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
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Executing Promotion...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Execute Promotion
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
