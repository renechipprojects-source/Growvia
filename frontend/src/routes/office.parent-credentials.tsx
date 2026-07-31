import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import {
  listParentCredentials,
  getParentCredential,
  generateParentCredential,
  resetParentPassword,
  setParentStatus,
  subscribeCredentials,
  suggestParentLoginId,
  alternativeParentLoginId,
  type ParentCredential,
} from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, KeyRound, Printer, RefreshCw, Search, ShieldCheck, ShieldOff, UserPlus, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/office/parent-credentials")({
  head: () => ({
    meta: [
      { title: "Parent Login Credentials — Sunshine ERP" },
      { name: "description", content: "Generate, reset, view, and print login credentials for parents." },
      { property: "og:title", content: "Parent Login Credentials — Sunshine ERP" },
      { property: "og:description", content: "Office Staff tool to issue parent portal accounts." },
    ],
  }),
  component: ParentCredentialsPage,
});

function ParentCredentialsPage() {
  const [, setTick] = useState(0);
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  useEffect(() => {
    subscribeCredentials(() => setTick((n) => n + 1));
    fetchStudents().then(({ data }) => {
      setStudentsList(data || []);
    });
  }, []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "issued" | "not_issued" | "inactive">("all");
  const [genFor, setGenFor] = useState<string | null>(null);
  const [viewFor, setViewFor] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studentsList
      .map((s) => ({ student: s, cred: getParentCredential(s.id) }))
      .filter(({ student, cred }) => {
        if (filter === "issued" && !cred) return false;
        if (filter === "not_issued" && cred) return false;
        if (filter === "inactive" && cred?.status !== "Inactive") return false;
        if (!q) return true;
        return [student.name, student.admissionNo, student.parent, student.phone, cred?.loginId]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [studentsList, query, filter]);

  const allCreds = listParentCredentials();
  const active = allCreds.filter((c) => c.status === "Active").length;
  const inactive = allCreds.filter((c) => c.status === "Inactive").length;
  const notIssued = studentsList.length - allCreds.length;

  return (
    <div>
      <PageHeader
        title="Parent Login Credentials"
        subtitle="Issue, reset, view and print login credentials for parents."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total students" value={studentsList.length} tone="from-sky-500 to-blue-500" />
        <StatCard label="Active logins" value={active} tone="from-emerald-500 to-green-500" />
        <StatCard label="Inactive" value={inactive} tone="from-amber-500 to-orange-500" />
        <StatCard label="Not issued" value={notIssued} tone="from-rose-500 to-pink-500" />
      </div>

      <SectionCard title="Students">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student, admission no, parent, mobile…"
              className="pl-9 bg-white/70"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px] bg-white/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="issued">Login issued</SelectItem>
              <SelectItem value="not_issued">Not issued</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-auto rounded-2xl border border-white/60">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-white/80 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Admission No</th>
                <th className="px-3 py-2 font-medium">Parent</th>
                <th className="px-3 py-2 font-medium">Mobile</th>
                <th className="px-3 py-2 font-medium">Login ID</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, cred }) => (
                <tr key={student.id} className="border-t border-white/60 hover:bg-white/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img src={student.avatar} className="h-8 w-8 rounded-full bg-white" alt="" />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.className}-{student.section}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{student.admissionNo}</td>
                  <td className="px-3 py-2">{student.parent}</td>
                  <td className="px-3 py-2 text-muted-foreground">{student.phone}</td>
                  <td className="px-3 py-2 font-mono text-xs">{cred?.loginId ?? "—"}</td>
                  <td className="px-3 py-2">
                    {cred ? (
                      <Badge className={cred.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                        {cred.status}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not issued</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {!cred ? (
                        <Button size="sm" onClick={() => setGenFor(student.id)} className="h-8 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Generate
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setViewFor(student.id)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => {
                            const c = resetParentPassword(student.id);
                            toast.success("New password generated");
                            setViewFor(student.id);
                            return c;
                          }}>
                            <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => {
                            const next = cred.status === "Active" ? "Inactive" : "Active";
                            setParentStatus(student.id, next);
                            toast.success(`Login ${next.toLowerCase()}`);
                          }}>
                            {cred.status === "Active" ? <><ShieldOff className="h-3.5 w-3.5 mr-1" /> Deactivate</> : <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Activate</>}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-8">No students match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <GenerateDialog studentId={genFor} studentsList={studentsList} onClose={() => setGenFor(null)} onDone={(id) => { setGenFor(null); setViewFor(id); }} />
      <ViewDialog studentId={viewFor} studentsList={studentsList} onClose={() => setViewFor(null)} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tone} text-white p-4 shadow-lg`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function GenerateDialog({ studentId, studentsList, onClose, onDone }: { studentId: string | null; studentsList: Student[]; onClose: () => void; onDone: (id: string) => void }) {
  const student = studentId ? studentsList.find((s) => s.id === studentId) : undefined;
  const [basis, setBasis] = useState<"admission" | "mobile" | "custom">("admission");
  const [custom, setCustom] = useState("");

  useEffect(() => { if (student) { setBasis("admission"); setCustom(""); } }, [student]);

  if (!student) return null;

  const previewId =
    basis === "custom" ? (custom.trim() || suggestParentLoginId(student))
    : basis === "mobile" ? alternativeParentLoginId(student)
    : suggestParentLoginId(student);

  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate parent login</DialogTitle>
          <DialogDescription>{student.name} · {student.admissionNo} · {student.parent}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Login ID based on</div>
            <Select value={basis} onValueChange={(v) => setBasis(v as typeof basis)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">Admission Number ({suggestParentLoginId(student)})</SelectItem>
                <SelectItem value="mobile">Parent Mobile ({alternativeParentLoginId(student)})</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {basis === "custom" && (
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Custom login ID</div>
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. NEHA2026" className="bg-white" />
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Preview</div>
            <div className="mt-1 font-mono">{previewId}</div>
            <div className="text-xs text-muted-foreground mt-2">A strong password will be generated automatically.</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button
            onClick={() => {
              generateParentCredential(student.id, {
                loginIdBasis: basis === "mobile" ? "mobile" : "admission",
                customLoginId: basis === "custom" ? custom : undefined,
              });
              toast.success(`Login issued for ${student.parent}`);
              onDone(student.id);
            }}
            className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white"
          >
            Generate credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ studentId, studentsList, onClose }: { studentId: string | null; studentsList: Student[]; onClose: () => void }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<"id" | "pw" | null>(null);
  useEffect(() => { setReveal(false); setCopied(null); }, [studentId]);

  const student = studentId ? studentsList.find((s) => s.id === studentId) : undefined;
  const cred = studentId ? getParentCredential(studentId) : undefined;
  if (!student || !cred) return null;

  const copy = async (text: string, which: "id" | "pw") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1200);
    } catch { toast.error("Copy failed"); }
  };

  const printSlip = () => {
    const w = window.open("", "_blank", "width=520,height=640");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    w.document.write(printableSlip({
      title: "Parent Portal — Login Credentials",
      rows: [
        ["Student", `${student.name} · ${student.className}-${student.section}`],
        ["Admission No", student.admissionNo],
        ["Parent", student.parent],
        ["Mobile", student.phone],
        ["Login ID", cred.loginId],
        ["Password", cred.password],
        ["Issued on", new Date(cred.updatedAt).toLocaleString()],
      ],
      footer: "Please change your password after first login. Keep these credentials confidential.",
    }));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Parent login credentials</DialogTitle>
          <DialogDescription>{student.name} · {student.parent}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <CredField label="Login ID" value={cred.loginId} onCopy={() => copy(cred.loginId, "id")} copied={copied === "id"} />
          <CredField
            label="Password"
            value={reveal ? cred.password : "•".repeat(cred.password.length)}
            onCopy={() => copy(cred.password, "pw")}
            copied={copied === "pw"}
            trailing={
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setReveal((v) => !v)}>
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            }
          />
          <div className="text-xs text-muted-foreground">
            Status: <span className="font-medium">{cred.status}</span> · Updated {new Date(cred.updatedAt).toLocaleString()}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={printSlip}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => {
            resetParentPassword(student.id);
            toast.success("Password reset");
            setReveal(true);
          }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reset password
          </Button>
          <Button onClick={onClose} className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredField({ label, value, onCopy, copied, trailing }: { label: string; value: string; onCopy: () => void; copied: boolean; trailing?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-sm">
        <span className="flex-1 truncate">{value}</span>
        {trailing}
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function printableSlip({ title, rows, footer }: { title: string; rows: Array<[string, string]>; footer?: string }): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:32px;color:#0f172a}
    h1{font-size:18px;margin:0 0 4px}.brand{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#64748b}
    hr{border:none;border-top:1px dashed #cbd5e1;margin:16px 0}
    table{width:100%;border-collapse:collapse}td{padding:8px 0;vertical-align:top;font-size:13px}
    td.k{color:#64748b;width:38%}td.v{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600}
    .footer{margin-top:20px;font-size:11px;color:#64748b;line-height:1.5}
  </style></head><body>
  <div class="brand">Sunshine Play School ERP</div>
  <h1>${esc(title)}</h1><hr/>
  <table>${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("")}</table>
  ${footer ? `<div class="footer">${esc(footer)}</div>` : ""}
  </body></html>`;
}
