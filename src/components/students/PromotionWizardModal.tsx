import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/auditLogStore";

interface PromotionWizardModalProps {
  open: boolean;
  onClose: () => void;
  onPromoteSuccess?: () => void;
}

const CLASSES = ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;

export function PromotionWizardModal({ open, onClose, onPromoteSuccess }: PromotionWizardModalProps) {
  const [fromClass, setFromClass] = useState<string>("LKG");
  const [toClass, setToClass] = useState<string>("UKG");
  const [academicYear, setAcademicYear] = useState<string>("2026-2027");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePromote = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      logAuditEvent({
        user: "Office Admin",
        role: "office",
        module: "Students",
        action: "Student Batch Promoted",
        previousValue: `Class ${fromClass} (Year 2025-2026)`,
        newValue: `Promoted to ${toClass} (Year ${academicYear})`,
      });
      toast.success(`Successfully promoted all active students from ${fromClass} to ${toClass} for Academic Year ${academicYear}!`);
      if (onPromoteSuccess) onPromoteSuccess();
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" /> Student Annual Promotion Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs">
            <p className="font-semibold">Automated Class Promotion Engine</p>
            <p className="mt-1 text-slate-600 text-[11px]">
              Promotes all enrolled students in a class to the next grade while archiving previous year attendance, fee ledgers, and parent relationships.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Source Class (Current)</Label>
              <Select value={fromClass} onValueChange={setFromClass}>
                <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Target Class (Promoted)</Label>
              <Select value={toClass} onValueChange={setToClass}>
                <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  <SelectItem value="Alumni / Graduated">Alumni / Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Target Academic Year</Label>
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger className="mt-1 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-2027">2026-2027 (Upcoming)</SelectItem>
                <SelectItem value="2027-2028">2027-2028</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Promotion Summary:</span>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Badge variant="outline" className="bg-white">{fromClass}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
              <Badge className="bg-indigo-600 text-white">{toClass}</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" onClick={handlePromote} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing Promotion...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Execute Batch Promotion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
