import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Plane } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NotificationService } from "@/lib/notifications";


interface Req {
  id: number;
  student: string;
  className: string;
  parent: string;
  from: string;
  to: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  remarks?: string;
}

const SEED: Req[] = [
  { id: 1, student: "Diya Patel", className: "Nursery", parent: "Neha Patel", from: "2026-07-24", to: "2026-07-26", reason: "Family wedding out of town", status: "Pending" },
  { id: 2, student: "Aarav Sharma", className: "Nursery", parent: "Rohit Sharma", from: "2026-07-23", to: "2026-07-23", reason: "Doctor's appointment", status: "Pending" },
  { id: 3, student: "Kiara Reddy", className: "Nursery", parent: "Sneha Reddy", from: "2026-07-18", to: "2026-07-19", reason: "Fever & cold", status: "Approved", remarks: "Get well soon!" },
];

export const Route = createFileRoute("/teacher/leave-requests")({ component: LeaveRequests });

function LeaveRequests() {
  const [reqs, setReqs] = useState<Req[]>(SEED);
  const [remarks, setRemarks] = useState<Record<number, string>>({});

  const act = (id: number, status: "Approved" | "Rejected") => {
    const req = reqs.find((r) => r.id === id);
    setReqs((rs) => rs.map((r) => (r.id === id ? { ...r, status, remarks: remarks[id] } : r)));
    if (req) NotificationService.leaveDecision(req.student, status);
    toast.success(`Leave ${status.toLowerCase()}`);
  };


  const pending = reqs.filter((r) => r.status === "Pending");
  const decided = reqs.filter((r) => r.status !== "Pending");

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Approve or reject leave requests from parents." />

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-blue-500 text-white p-3 sm:p-5 shadow-lg">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest opacity-80">Pending</div>
          <div className="text-2xl sm:text-3xl font-bold mt-1">{pending.length}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-3 sm:p-5 shadow">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">Approved</div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-emerald-600">{reqs.filter((r) => r.status === "Approved").length}</div>
        </div>
        <div className="rounded-3xl bg-white/70 border border-white/60 p-3 sm:p-5 shadow">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">Rejected</div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-rose-600">{reqs.filter((r) => r.status === "Rejected").length}</div>
        </div>
      </div>

      <SectionCard title="Pending requests" className="mb-4">
        {pending.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No pending requests 🎉</div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white/70 border border-white/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-sky-500" />
                      <span className="font-semibold">{r.student}</span>
                      <Badge variant="secondary">{r.className}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      From <span className="font-medium text-slate-700">{r.parent}</span> · {r.from} → {r.to}
                    </div>
                    <div className="text-sm mt-2">{r.reason}</div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                </div>
                <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-3 items-end">
                  <Textarea
                    rows={2}
                    placeholder="Add remarks (optional)…"
                    value={remarks[r.id] ?? ""}
                    onChange={(e) => setRemarks((s) => ({ ...s, [r.id]: e.target.value }))}
                    className="bg-white/80"
                  />
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button onClick={() => act(r.id, "Approved")} className="flex-1 md:flex-none h-10 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full">
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button onClick={() => act(r.id, "Rejected")} variant="outline" className="flex-1 md:flex-none h-10 rounded-full">
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="History">
        <ul className="space-y-2">
          {decided.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white/60 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{r.student} · {r.from} → {r.to}</div>
                <Badge className={r.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{r.reason}{r.remarks ? ` · Remarks: ${r.remarks}` : ""}</div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
