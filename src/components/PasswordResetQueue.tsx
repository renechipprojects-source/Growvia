import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listForQueue,
  setStatus,
  subscribeResets,
  type ResetRequest,
  type ResetStatus,
} from "@/lib/passwordResets";
import { generateTemporaryPassword, setTemporaryPasswordFor } from "@/lib/auth";

export function PasswordResetQueue({ queue, title, description }: {
  queue: "office" | "admin";
  title: string;
  description: string;
}) {
  const [rows, setRows] = useState<ResetRequest[]>(() => listForQueue(queue));
  useEffect(() => {
    setRows(listForQueue(queue));
    return subscribeResets(() => setRows(listForQueue(queue)));
  }, [queue]);

  const [filter, setFilter] = useState<ResetStatus | "All">("All");
  const [active, setActive] = useState<ResetRequest | null>(null);
  const [tempPwd, setTempPwd] = useState("");

  const filtered = useMemo(
    () => (filter === "All" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );


  function openReset(r: ResetRequest) {
    setActive(r);
    setTempPwd(generateTemporaryPassword());
  }

  function applyReset() {
    if (!active) return;
    if (!tempPwd || tempPwd.length < 8) {
      toast.error("Temporary password must be at least 8 characters.");
      return;
    }
    const ok = setTemporaryPasswordFor(active.loginId, tempPwd);
    if (!ok) {
      toast.error("Could not update that account.");
      return;
    }
    setStatus(active.id, "Completed", tempPwd);
    toast.success("Password reset. Share the temporary password with the user.");
    setActive(null);
  }

  function markInProgress(r: ResetRequest) {
    setStatus(r.id, "In Progress");
  }
  function markCompleted(r: ResetRequest) {
    setStatus(r.id, "Completed");
    toast.success("Marked completed.");
  }

  const counts = {
    pending: rows.filter((r) => r.status === "Pending").length,
    inProgress: rows.filter((r) => r.status === "In Progress").length,
    completed: rows.filter((r) => r.status === "Completed").length,
  };

  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.pending} tone="amber" />
        <StatCard label="In Progress" value={counts.inProgress} tone="sky" />
        <StatCard label="Completed" value={counts.completed} tone="emerald" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["All", "Pending", "In Progress", "Completed"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => { setFilter(s as never); setPage(1); }}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Login ID</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No reset requests.
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="capitalize">{r.role === "super-admin" ? "admin" : r.role}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.loginId}</TableCell>
                  <TableCell className="text-xs">
                    {r.admissionNo ?? r.employeeId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{r.mobile ?? "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.requestedAt).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {r.status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => markInProgress(r)}>
                          Verify
                        </Button>
                      )}
                      {r.status !== "Completed" && (
                        <Button size="sm" onClick={() => openReset(r)}>
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset
                        </Button>
                      )}
                      {r.status === "In Progress" && (
                        <Button size="sm" variant="outline" onClick={() => markCompleted(r)}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground font-medium">
            Showing {filtered.length} reset requests total
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate temporary password</DialogTitle>
            <DialogDescription>
              A temporary password will replace the current one. The user must set a new
              password on their next sign-in.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div><span className="font-medium">Name:</span> {active.name}</div>
                <div><span className="font-medium">Login ID:</span> <span className="font-mono">{active.loginId}</span></div>
                <div className="capitalize"><span className="font-medium">Role:</span> {active.role === "super-admin" ? "admin" : active.role}</div>
              </div>
              <div>
                <Label>Temporary password</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input value={tempPwd} onChange={(e) => setTempPwd(e.target.value)} className="font-mono" />
                  <Button type="button" variant="outline" onClick={() => setTempPwd(generateTemporaryPassword())}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard?.writeText(tempPwd);
                      toast.success("Copied.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={applyReset}>Reset password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: ResetStatus }) {
  const map: Record<ResetStatus, string> = {
    Pending: "bg-amber-100 text-amber-800",
    "In Progress": "bg-sky-100 text-sky-800",
    Completed: "bg-emerald-100 text-emerald-800",
  };
  return <Badge className={map[status]}>{status}</Badge>;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "sky" | "emerald" }) {
  const bg = tone === "amber" ? "from-amber-50 to-amber-100"
    : tone === "sky" ? "from-sky-50 to-sky-100"
    : "from-emerald-50 to-emerald-100";
  return (
    <Card className={`bg-gradient-to-br ${bg} p-4`}>
      <div className="text-xs uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </Card>
  );
}
