import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import type { Expense } from "@/lib/mockData";
import { fetchExpenses } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/office/expenses")({ component: Expenses });

function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);

  useEffect(() => {
    fetchExpenses().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setItems(data);
    });
  }, []);

  const { register, handleSubmit, reset, setValue, watch } = useForm<{ category: string; description: string; amount: string; paidTo: string; date: string }>({
    defaultValues: { category: "Supplies", date: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (v: { category: string; description: string; amount: string; paidTo: string; date: string }) => {
    const amt = Number(v.amount) || 0;
    const newId = `EXP-${Date.now().toString().slice(-4)}`;
    const newExp: Expense = {
      id: newId,
      category: v.category,
      description: v.description,
      amount: amt,
      date: v.date || new Date().toISOString().split("T")[0],
      paidTo: v.paidTo,
    };

    setItems((prev) => [newExp, ...prev]);

    const { error } = await supabase.from("expenses").insert([{
      id: newId,
      category: v.category,
      description: v.description,
      amount: amt,
      expense_date: newExp.date,
      paid_to: v.paidTo,
    }]);

    if (error) {
      toast.error(`Failed to save to database: ${error.message}`);
      return;
    }

    toast.success(`Expense recorded: ₹${amt.toLocaleString()} — synced to Supabase.`);
    reset();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Expenses" subtitle="Track every rupee out the door." />
      </div>
      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">
        {/* Ledger — fills column, only list body scrolls */}
        <div className="lg:col-span-2 flex flex-col min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5">
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
            <h3 className="font-semibold">Ledger</h3>
            <span className="text-xs text-muted-foreground">{items.length} entries</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No expenses recorded yet. Use the form to record your first expense.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3">
                    <div>
                      <div className="font-medium">{e.description}</div>
                      <div className="text-xs text-muted-foreground">{e.paidTo} • {e.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700">{e.category}</Badge>
                      <div className="font-semibold text-rose-600">-₹{e.amount.toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Add form — sits alongside, does not scroll the page */}
        <div className="min-h-0 overflow-y-auto">
          <SectionCard title="Add expense">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
              <div><Label>Category</Label>
                <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Supplies", "Utilities", "Salary", "Maintenance", "Events", "Food", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input {...register("description", { required: true })} className="mt-1.5 bg-white/70" /></div>
              <div><Label>Paid to</Label><Input {...register("paidTo", { required: true })} className="mt-1.5 bg-white/70" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount</Label><Input type="number" {...register("amount", { required: true })} className="mt-1.5 bg-white/70" /></div>
                <div><Label>Date</Label><Input type="date" {...register("date")} className="mt-1.5 bg-white/70" /></div>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full">
                <Wallet className="h-4 w-4 mr-2" />Record Expense
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
