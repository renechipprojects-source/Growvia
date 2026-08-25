import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { PageHeader, StatCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fetchExpenses, saveExpenseRecord, deleteExpenseRecord, type Expense } from "@/lib/supabaseService";
import { Search, Receipt, Wallet, DollarSign, Lock, Building2, FileText, Plus, Edit3, Trash2 } from "lucide-react";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/principal/expenses")({
  head: () => ({
    meta: [
      { title: "Operating Expenses | Principal Portal" },
      { name: "description", content: "School operating expenses and outlays overview." },
    ],
  }),
  component: PrincipalExpensesOverview,
});

function PrincipalExpensesOverview() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const loadData = useCallback(() => {
    fetchExpenses().then(({ data }) => {
      setExpenses(data || []);
    });
  }, []);

  useAutoRefresh("expenses", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    category: string;
    description: string;
    amount: string;
    paidTo: string;
    date: string;
    paymentMethod: string;
    notes: string;
  }>({
    defaultValues: {
      category: "Supplies",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Transfer",
      notes: "",
    },
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    reset({
      category: "Supplies",
      description: "",
      amount: "",
      paidTo: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Transfer",
      notes: "",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingExpense(exp);
    reset({
      category: exp.category || "Supplies",
      description: exp.description || "",
      amount: String(exp.amount || 0),
      paidTo: exp.paidTo || "",
      date: exp.date || new Date().toISOString().split("T")[0],
      paymentMethod: exp.paymentMethod || "Bank Transfer",
      notes: exp.notes || "",
    });
    setIsAddOpen(true);
  };

  const onSubmit = async (v: {
    category: string;
    description: string;
    amount: string;
    paidTo: string;
    date: string;
    paymentMethod: string;
    notes: string;
  }) => {
    const amt = Number(v.amount) || 0;
    const expPayload: Partial<Expense> = {
      id: editingExpense?.id,
      category: v.category,
      description: v.description,
      amount: amt,
      date: v.date || new Date().toISOString().split("T")[0],
      paidTo: v.paidTo,
      paymentMethod: v.paymentMethod || "Bank Transfer",
      notes: v.notes || v.description,
    };

    const { error } = await saveExpenseRecord(expPayload);
    if (error) {
      toast.error(`Failed to save expense: ${error}`);
      return;
    }

    toast.success(editingExpense ? "Expense updated successfully." : `Expense of ₹${amt.toLocaleString()} recorded successfully.`);
    setIsAddOpen(false);
    setEditingExpense(null);
    reset();
    loadData();
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    const { error } = await deleteExpenseRecord(id);
    if (error) {
      toast.error(`Failed to delete expense: ${error}`);
      return;
    }

    toast.success("Expense record deleted successfully.");
    if (selectedExpense?.id === id) {
      setIsDetailsOpen(false);
      setSelectedExpense(null);
    }
    loadData();
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category && e.category.trim()) set.add(e.category.trim());
    });
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchQ =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.paidTo.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q));
      const matchC = categoryFilter === "all" || e.category === categoryFilter;
      return matchQ && matchC;
    });
  }, [expenses, query, categoryFilter]);

  const totalExpense = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const avgExpense = useMemo(() => (expenses.length > 0 ? totalExpense / expenses.length : 0), [expenses, totalExpense]);

  const handleRowClick = (exp: Expense) => {
    setSelectedExpense(exp);
    setIsDetailsOpen(true);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-4 p-3 md:p-4 bg-slate-50/50">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <PageHeader
          title="Operating Expenses"
          subtitle="Overview of all recorded school expenditures and vendor outlays."
        />
        <Button
          onClick={handleOpenAdd}
          className="bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record New Expense
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard label="Total Expenditure" value={`₹${totalExpense.toLocaleString()}`} icon={Wallet} gradient="from-rose-500 to-pink-500" />
        <StatCard label="Total Records" value={expenses.length} icon={Receipt} gradient="from-sky-500 to-blue-500" />
        <StatCard label="Avg Outlay / Item" value={`₹${Math.round(avgExpense).toLocaleString()}`} icon={DollarSign} gradient="from-amber-500 to-orange-500" />
        <StatCard label="Categories" value={categories.length} icon={Building2} gradient="from-emerald-500 to-teal-500" />
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by description, vendor, or category…"
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl focus:bg-white"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table Container */}
      <div className="flex-1 min-h-[400px] max-h-[calc(100vh-270px)] rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto max-h-[calc(100vh-260px)]">
          <table className="w-full text-sm border-collapse min-w-full table-auto">
            <thead className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-xs font-bold uppercase text-slate-600 sticky top-0 z-20">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-left px-4 py-3.5 font-bold w-[12%]">Date</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-left px-4 py-3.5 font-bold w-[28%]">Description</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-left px-4 py-3.5 font-bold w-[16%]">Category</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-left px-4 py-3.5 font-bold w-[18%]">Paid To</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-right px-4 py-3.5 font-bold w-[14%]">Amount (₹)</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-right px-4 py-3.5 font-bold w-[12%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} onClick={() => handleRowClick(e)} className="hover:bg-slate-50/60 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-slate-500">{e.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{e.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {e.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{e.paidTo}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                    ₹{e.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs font-medium text-amber-700 hover:bg-amber-50" onClick={(ev) => handleOpenEdit(e, ev)}>
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={(ev) => handleDelete(e.id, ev)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                    No operating expenses match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Expense Details
            </DialogTitle>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Category</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {selectedExpense.category}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-rose-600">
                    ₹{selectedExpense.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedExpense.category.toLowerCase().includes("salary") && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 text-[10px] px-2">Salary</Badge>
                    <span>Salary Disbursement Details</span>
                  </div>
                  <div className="flex justify-between text-indigo-800">
                    <span className="text-indigo-600">Recipient / Staff:</span>
                    <span className="font-semibold">{selectedExpense.paidTo || "Staff Member"}</span>
                  </div>
                  <div className="flex justify-between text-indigo-800">
                    <span className="text-indigo-600">Disbursed Amount:</span>
                    <span className="font-semibold">₹{selectedExpense.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-indigo-800">
                    <span className="text-indigo-600">Payment Mode:</span>
                    <span className="font-semibold">{selectedExpense.paymentMethod || "Bank Transfer"}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Purpose / Description</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedExpense.description}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Recipient (Paid To)</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedExpense.paidTo || "Vendor / Staff"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Transaction Date</span>
                  <span className="font-semibold text-slate-800">{selectedExpense.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Payment Method</span>
                  <span className="font-semibold text-slate-800">
                    {selectedExpense.paymentMethod || "Bank Transfer"}
                  </span>
                </div>
              </div>

              {selectedExpense.notes && (
                <div className="text-xs">
                  <span className="text-slate-400 font-medium block">Additional Notes</span>
                  <p className="mt-1 p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 leading-relaxed">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Expense Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingExpense ? <Edit3 className="h-5 w-5 text-amber-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
              {editingExpense ? "Edit Expense Record" : "Record New Expense"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 text-sm py-2">
            <div>
              <Label>Category</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger className="mt-1 bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Supplies", "Utilities", "Salary", "Maintenance", "Events", "Food", "Other"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description / Purpose</Label>
              <Input
                {...register("description", { required: true })}
                placeholder="e.g. Monthly Electricity Bill / Staff Salary"
                className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <Label>Recipient (Paid To / Supplier)</Label>
              <Input
                {...register("paidTo", { required: true })}
                placeholder="e.g. State Electricity Board / Teacher Name"
                className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  {...register("amount", { required: true })}
                  placeholder="0.00"
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <Label>Transaction Date</Label>
                <Input
                  type="date"
                  {...register("date")}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                <SelectTrigger className="mt-1 bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer / UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Input
                {...register("notes")}
                placeholder="Optional notes or receipt reference..."
                className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 text-white rounded-xl">
                {editingExpense ? "Save Changes" : "Record Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
