import { type Enquiry } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Phone, User, Calendar as CalIcon, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEnquiries } from "@/lib/enquiryContext";

const COLUMNS: { key: Enquiry["status"]; title: string; color: string }[] = [
  { key: "New", title: "New", color: "from-slate-400 to-slate-500" },
  { key: "Contacted", title: "Contacted", color: "from-sky-400 to-sky-500" },
  { key: "Visit Scheduled", title: "Visit Scheduled", color: "from-indigo-400 to-indigo-500" },
  { key: "Visit Completed", title: "Visit Completed", color: "from-violet-400 to-violet-500" },
  { key: "Documents Pending", title: "Docs Pending", color: "from-amber-400 to-orange-500" },
  { key: "Admission Approved", title: "Approved", color: "from-emerald-400 to-emerald-500" },
  { key: "Enrolled", title: "Enrolled", color: "from-teal-500 to-emerald-600" },
];

const SOURCE_COLOR: Record<string, string> = {
  "Walk-in": "bg-emerald-100 text-emerald-700",
  Phone: "bg-sky-100 text-sky-700",
  WhatsApp: "bg-green-100 text-green-700",
  Referral: "bg-purple-100 text-purple-700",
};

const CONVERTIBLE: Enquiry["status"][] = ["Visit Completed", "Documents Pending", "Admission Approved"];

export function EnquiryKanban({ readOnly = false }: { readOnly?: boolean }) {
  const { enquiries, updateStatus, isConverted } = useEnquiries();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<string | null>(null);

  const move = (id: string, status: Enquiry["status"]) => {
    if (readOnly) return;
    updateStatus(id, status);
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
              onDrop={() => dragging && move(dragging, col.key)}
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
                  const converted = isConverted(e.id);
                  const canConvert = !readOnly && !converted && CONVERTIBLE.includes(e.status);
                  return (
                    <Card
                      key={e.id}
                      draggable={!readOnly && !converted}
                      onDragStart={() => setDragging(e.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "rounded-2xl border-white/70 bg-white shadow-sm p-3 hover:shadow-md transition",
                        converted ? "opacity-70" : "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{e.childName}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.interestedClass} • Age {e.age}</div>
                        </div>
                        <Badge className={cn("text-[10px]", SOURCE_COLOR[e.source])}>{e.source}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{e.parentName}</div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{e.phone}</div>
                        {e.followUp && (
                          <div className="flex items-center gap-1.5 text-amber-700"><CalIcon className="h-3 w-3" />Follow up {e.followUp}</div>
                        )}
                      </div>
                      {converted && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Converted to admission
                        </div>
                      )}
                      {canConvert && (
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate({ to: "/office/admissions", search: { enquiryId: e.id } })
                          }
                          className="mt-2 w-full h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs"
                        >
                          Convert to Admission <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
