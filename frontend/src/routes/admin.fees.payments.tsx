import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { fetchMergedFeeLedgers, toCanonicalAdmissionNo, type FeeLedgerItem } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { PaymentDetailsModal } from "@/components/fees/PaymentDetailsModal";

import { Edit3 } from "lucide-react";
import { saveFeeRecord, recalculateFeeLedger } from "@/lib/supabaseService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Student Fee Ledger — Sunshine Play School" }] }),
});

function PaymentsPage() {
  const [feeLedgers, setFeeLedgers] = useState<FeeLedgerItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedLedger, setSelectedLedger] = useState<FeeLedgerItem | null>(null);

  // Edit Fee Modal State
  const [editingLedger, setEditingLedger] = useState<FeeLedgerItem | null>(null);
  const [editOriginalFee, setEditOriginalFee] = useState("");
  const [editDiscountAmount, setEditDiscountAmount] = useState("");

  const loadData = () => {
    fetchMergedFeeLedgers().then(({ data }) => {
      if (data && data.length > 0) {
        setFeeLedgers(data);
      }
    });
  };

  useAutoRefresh("fees", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const openEditFeeModal = (f: FeeLedgerItem) => {
    setEditingLedger(f);
    setEditOriginalFee(String(f.originalFee || f.amount || 15000));
    setEditDiscountAmount(String(f.discountAmount || 0));
  };

  const handleSaveFeeStructure = async () => {
    if (!editingLedger) return;
    const origFee = Number(editOriginalFee || 0);
    const discAmt = Number(editDiscountAmount || 0);

    if (isNaN(origFee) || origFee < 0 || isNaN(discAmt) || discAmt < 0) {
      return toast.error("Fee amounts cannot be negative.");
    }
    if (discAmt > origFee) {
      return toast.error("Discount cannot exceed original total fee.");
    }

    const res = await saveFeeRecord({
      ...editingLedger,
      originalFee: origFee,
      discountAmount: discAmt,
    });

    if (!res.success) {
      return toast.error(res.error || "Failed to persist fee update.");
    }

    const updated = res.data!;
    setFeeLedgers((prev) => prev.map((f) => (f.id === editingLedger.id ? updated : f)));
    setEditingLedger(null);

    toast.success(`Fee structure updated for ${updated.studentName}! Total Applicable Fee: ₹${updated.finalFee.toLocaleString()}`);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const todayPayments = useMemo(() => {
    let total = 0;
    feeLedgers.forEach((f) => {
      if (f.payments && f.payments.length > 0) {
        f.payments.forEach((p: any) => {
          if (p.date === todayStr || p.created_at?.startsWith(todayStr)) {
            total += Number(p.amount || 0);
          }
        });
      } else if (f.lastPaymentDate === todayStr) {
        total += Number(f.paid || 0);
      }
    });
    return total;
  }, [feeLedgers, todayStr]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = filterValues["Status"];
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    return feeLedgers.filter((ledger) => {
      const matchSearch =
        !q ||
        ledger.studentName.toLowerCase().includes(q) ||
        (ledger.admissionNo && ledger.admissionNo.toLowerCase().includes(q)) ||
        ledger.className.toLowerCase().includes(q);
      const matchStatus = !st || st === "all" || ledger.status === st;
      const matchClass = !cls || cls === "all" || ledger.className?.toLowerCase() === cls.toLowerCase();
      const matchSection = !sec || sec === "all" || ledger.section?.toLowerCase() === sec.toLowerCase();
      return matchSearch && matchStatus && matchClass && matchSection;
    });
  }, [feeLedgers, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments Used", "Payment Status"];
    const rows = filtered.map((f) => {
      const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
      const paid = f.paid || 0;
      const remaining = Math.max(0, finalFee - paid);
      const instCount = f.payments?.length || (paid > 0 ? 1 : 0);

      let status = "Unpaid";
      if (remaining === 0 && finalFee > 0) status = "Paid";
      else if (paid > 0) status = "Partially Paid";

      return [
        f.studentName,
        toCanonicalAdmissionNo(f.admissionNo, f.id),
        f.className,
        finalFee,
        paid,
        remaining,
        instCount,
        status,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_fee_ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    feeLedgers.forEach((f) => {
      if (f.section && typeof f.section === "string" && f.section.trim()) {
        set.add(f.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [feeLedgers]);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Student Fee Ledger & Today Payments"
        description="Live daily fee collection ledger, class/section filters, and installment breakdown."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Total Collection" value={`₹${todayPayments.toLocaleString()}`} tone="success" icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Total Students" value={feeLedgers.length} tone="info" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Active Ledgers" value={filtered.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Date" value={todayStr} tone="warning" icon={<Calendar className="h-5 w-5" />} />
      </div>

      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search student name, admission no., class..."
          filters={[
            { label: "Class", options: ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] },
            { label: "Section", options: sectionOptions },
            { label: "Status", options: ["Paid", "Partial", "Pending"] },
          ]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments", "Status", "Action"]}
          total={filtered.length}
        >
          {filtered.map((f) => {
            const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
            const paid = f.paid || 0;
            const remaining = Math.max(0, finalFee - paid);
            const instCount = f.payments?.length || (paid > 0 ? 1 : 0);

            let displayStatus = "Unpaid";
            if (remaining === 0 && finalFee > 0) displayStatus = "Paid";
            else if (paid > 0) displayStatus = "Partially Paid";

            return (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-slate-800">{f.studentName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{toCanonicalAdmissionNo(f.admissionNo, f.id)}</TableCell>
                <TableCell>{f.className}</TableCell>
                <TableCell className="font-bold text-slate-900">₹{finalFee.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-emerald-700">₹{paid.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-rose-600">₹{remaining.toLocaleString()}</TableCell>
                <TableCell className="text-center font-semibold text-indigo-700">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full bg-slate-50">
                    {instCount} Txn{instCount === 1 ? "" : "s"}
                  </Badge>
                </TableCell>
                <TableCell><StatusBadge status={displayStatus} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-amber-700 hover:bg-amber-50 rounded-lg" onClick={() => openEditFeeModal(f)}>
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit Total Fee
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl h-8 px-2.5 text-xs" onClick={() => setSelectedLedger(f)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      <PaymentDetailsModal
        open={!!selectedLedger}
        onClose={() => setSelectedLedger(null)}
        ledger={selectedLedger}
      />

      {/* Admin Edit Fee Structure Modal */}
      {editingLedger && (
        <Dialog open={!!editingLedger} onOpenChange={(o) => !o && setEditingLedger(null)}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-600" /> Adjust Student Total Fee
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">{editingLedger.studentName}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Adm No: {toCanonicalAdmissionNo(editingLedger.admissionNo, editingLedger.id)} | Class: {editingLedger.className}
                </div>
                <div className="text-emerald-700 font-semibold text-[11px] mt-1">
                  Currently Recorded Paid Amount: ₹{(editingLedger.paid || 0).toLocaleString()}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Original Total Annual Fee (₹)</Label>
                <Input
                  type="number"
                  value={editOriginalFee}
                  onChange={(e) => setEditOriginalFee(e.target.value)}
                  placeholder="e.g. 15000"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Concession / Discount Amount (₹)</Label>
                <Input
                  type="number"
                  value={editDiscountAmount}
                  onChange={(e) => setEditDiscountAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                <div className="flex justify-between font-bold text-indigo-900">
                  <span>Net Total Applicable Fee:</span>
                  <span>₹{Math.max(0, Number(editOriginalFee || 0) - Number(editDiscountAmount || 0)).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Changing the total fee will safely recalculate balance and status without altering recorded payments.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingLedger(null)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveFeeStructure} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
