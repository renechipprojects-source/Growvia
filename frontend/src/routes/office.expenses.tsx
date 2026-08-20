import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { fetchExpenses, type Expense } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Wallet, Search, Plus, FileText, User, Calendar, CreditCard, DollarSign } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/office/expenses")({ component: Expenses });

function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadData = useCallback(() => {
    fetchExpenses().then(({ data }) => {
      setItems(data || []);
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
    const newId = `EXP-${Date.now().toString().slice(-6)}`;
    const newExp: Expense = {
      id: newId,
      category: v.category,
      description: v.description,
      amount: amt,
      date: v.date || new Date().toISOString().split("T")[0],
      paidTo: v.paidTo,
      paymentMethod: v.paymentMethod || "Bank Transfer",
      notes: v.notes || v.description,
    };

    setItems((prev) => [newExp, ...prev]);

    const { error } = await supabase.from("gv_inventory_expenses").insert([
      {
        id: newId,
        record_type: "expense",
        title: v.description || v.category,
        category: v.category,
        amount_or_unit_cost: amt,
        transaction_date: newExp.date,
        supplier_or_paid_to: v.paidTo,
        notes: JSON.stringify({
          description: v.description,
          paidTo: v.paidTo,
          paymentMethod: v.paymentMethod,
          notes: v.notes,
          salaryRecipient: v.category === "Salary" ? v.paidTo : undefined,
          salaryAmount: v.category === "Salary" ? amt : undefined,
        }),
      },
    ]);

    if (error) {
      toast.error(`Failed to save to database: ${error.message}`);
      return;
    }

    toast.success(`Expense of ₹${amt.toLocaleString()} recorded successfully.`);
    setIsAddOpen(false);
    reset();
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQ =
        !q ||
        item.description.toLowerCase().includes(q.toLowerCase()) ||
        item.paidTo.toLowerCase().includes(q.toLowerCase()) ||
        item.category.toLowerCase().includes(q.toLowerCase());
      const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
      return matchesQ && matchesCat;
    });
  }, [items, q, categoryFilter]);

  const totalSpent = useMemo(() => items.reduce((sum, item) => sum + (item.amount || 0), 0), [items]);

  const handleRowClick = (exp: Expense) => {
    setSelectedExpense(exp);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-4 w-full max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="School Expenses & Disbursement" />
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record New Expense
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Expenses</div>
            <div className="text-xl font-bold text-slate-900">₹{totalSpent.toLocaleString()}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Entries</div>
            <div className="text-xl font-bold text-slate-900">{items.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search expenses by description, paid to, or recipient..."
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-white border-slate-200 rounded-xl">
              <SelectValue placeholder="Category: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Supplies">Supplies</SelectItem>
              <SelectItem value="Utilities">Utilities</SelectItem>
              <SelectItem value="Salary">Salary</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
              <SelectItem value="Food">Food</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Full Width Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Date</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Description / Purpose</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Category</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Paid To</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Payment Method</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No expense records match your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{item.date}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{item.description}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.paidTo}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      -₹{item.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-indigo-600">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
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
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
              className="w-full rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Record New Expense
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
                Record Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
