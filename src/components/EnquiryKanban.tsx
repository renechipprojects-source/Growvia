import { type Enquiry } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Phone, User, Calendar as CalIcon, ArrowRight, CheckCircle2, UserX, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEnquiries } from "@/lib/enquiryContext";
import { toast } from "sonner";

const COLUMNS: { key: string; title: string; color: string }[] = [
  { key: "New", title: "New", color: "from-slate-400 to-slate-500" },
  { key: "Contacted", title: "Contacted", color: "from-sky-400 to-sky-500" },
  { key: "Visit Scheduled", title: "Visit Scheduled", color: "from-indigo-400 to-indigo-500" },
  { key: "Visit Completed", title: "Visit Completed", color: "from-violet-400 to-violet-500" },
  { key: "Documents Pending", title: "Docs Pending", color: "from-amber-400 to-orange-500" },
  { key: "Admission Approved", title: "Approved", color: "from-emerald-400 to-emerald-500" },
  { key: "Enrolled", title: "Enrolled", color: "from-teal-500 to-emerald-600" },
  { key: "Dropped", title: "Dropped / Cancelled", color: "from-rose-400 to-rose-600" },
];

const SOURCE_COLOR: Record<string, string> = {
  "Walk-in": "bg-emerald-100 text-emerald-700",
  Phone: "bg-sky-100 text-sky-700",
  WhatsApp: "bg-green-100 text-green-700",
  Referral: "bg-purple-100 text-purple-700",
};

const DROP_REASONS = [
  "Distance too far",
  "Fee too high",
  "Joined another school",
  "No response from parents",
  "Timing mismatch",
  "Other reason",
];

export function EnquiryKanban({ readOnly = false }: { readOnly?: boolean }) {
  const { enquiries, updateStatus, isConverted, dropEnquiry } = useEnquiries();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<string | null>(null);

  // Drop modal state
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [dropReason, setDropReason] = useState<string>(DROP_REASONS[0]);
  const [dropNote, setDropNote] = useState<string>("");

  const moveForward = (id: string, targetStatus: string) => {
    if (readOnly) return;
    const item = enquiries.find((e) => e.id === id);
    if (!item) return;

    // Enforce forward-only pipeline progression
    const currentIdx = COLUMNS.findIndex((c) => c.key === item.status);
    const targetIdx = COLUMNS.findIndex((c) => c.key === targetStatus);

    if (targetStatus === "Dropped" || targetIdx >= currentIdx) {
      updateStatus(id, targetStatus as any);
      toast.success(`Enquiry for ${item.childName} moved to ${targetStatus}`);
    } else {
      toast.warning("Pipeline motion is restricted to forward direction only towards Admission.");
    }
  };

  const handleConfirmDrop = () => {
    if (!droppingId) return;
    const finalReason = dropNote ? `${dropReason} (${dropNote})` : dropReason;
    dropEnquiry(droppingId, finalReason);
    toast.error(`Enquiry dropped: ${finalReason}`);
    setDroppingId(null);
    setDropNote("");
  };

  return (
    <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden pb-2">
      <div className="flex gap-4 min-w-max h-full">
        {COLUMNS.map((col) => {
          const rows = enquiries.filter((e) => e.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragging && moveForward(dragging, col.key)}
              className="w-72 shrink-0 flex flex-col min-h-0"
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full bg-gradient-to-r", col.color)} />
                  <span className="font-semibold text-sm">{col.title}</span>
                </div>
                <Badge variant="secondary" className="rounded-full">{rows.length}</Badge>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 rounded-2xl bg-white/40 backdrop-blur p-2 border border-white/60">
                {rows.map((e) => {
                  const converted = isConverted(e.id) || e.status === "Enrolled";
                  const isDropped = (e.status as string) === "Dropped";
                  return (
                    <Card
                      key={e.id}
                      draggable={!readOnly && !converted && !isDropped}
                      onDragStart={() => setDragging(e.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "rounded-2xl border-white/70 bg-white shadow-sm p-3 hover:shadow-md transition-all duration-300 ease-out translate-x-0 animate-in fade-in slide-in-from-left-4",
                        converted ? "opacity-70 bg-emerald-50/40 border-emerald-200" : isDropped ? "opacity-60 bg-rose-50/40 border-rose-200" : "cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{e.childName}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.interestedClass} • Age {e.age}</div>
                        </div>
                        <Badge className={cn("text-[10px]", SOURCE_COLOR[e.source] || "bg-slate-100 text-slate-700")}>{e.source}</Badge>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{e.parentName}</div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{e.phone}</div>
                        {e.followUp && !isDropped && (
                          <div className="flex items-center gap-1.5 text-amber-700"><CalIcon className="h-3 w-3" />Follow up {e.followUp}</div>
                        )}
                        {e.notes && (
                          <div className="mt-1 text-[11px] italic text-rose-700 line-clamp-2 bg-rose-50 p-1.5 rounded-lg">
                            {e.notes}
                          </div>
                        )}
                      </div>

                      {converted && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Converted to admission
                        </div>
                      )}

                      {isDropped && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                          <AlertCircle className="h-3.5 w-3.5" /> Dropped
                        </div>
                      )}

                      {!readOnly && !converted && !isDropped && (
                        <div className="mt-3 flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                          <Button
                            size="sm"
                            onClick={() => navigate({ to: "/office/admissions", search: { enquiryId: e.id } })}
                            className="w-full h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-medium shadow-sm hover:shadow"
                          >
                            Convert to Admission <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDroppingId(e.id)}
                            className="w-full h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                          >
                            <UserX className="h-3 w-3 mr-1" /> Drop Enquiry
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop Enquiry Reason Dialog */}
      <Dialog open={!!droppingId} onOpenChange={(open) => !open && setDroppingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <UserX className="h-5 w-5" /> Drop Enquiry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Select reason for dropping this enquiry. Dropped enquiries are archived for future follow-up.
            </p>
            <div>
              <Label>Reason for dropping</Label>
              <Select value={dropReason} onValueChange={setDropReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DROP_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional Notes (optional)</Label>
              <Textarea
                value={dropNote}
                onChange={(e) => setDropNote(e.target.value)}
                placeholder="Details on why parent decided not to proceed..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDroppingId(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleConfirmDrop}>
              Confirm Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
