import { supabase } from "./supabase";

export interface InventoryItemRecord {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  lastRestocked: string;
  supplier: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  paymentMethod: "Cash" | "UPI" | "Bank Transfer";
  expenseDate: string;
  receiptRef: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

// ─── INVENTORY & EXPENSES SERVICE (Module 2: GV_inventory_expenses) ─────────────

export async function fetchInventoryFromModule(): Promise<{ data: InventoryItemRecord[]; isFromSupabase: boolean }> {
  try {
    let { data, error } = await supabase
      .from("GV_inventory_expenses")
      .select("*")
      .eq("record_type", "inventory");

    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("inventory_expenses").select("*").eq("record_type", "inventory");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      // Fallback query to legacy inventory_items
      const { data: legacy } = await supabase.from("inventory_items").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: InventoryItemRecord[] = legacy.map((d: any) => ({
          id: d.id,
          itemName: d.item_name,
          category: d.category,
          quantity: d.quantity,
          unit: d.unit,
          minStock: d.min_stock,
          status: d.quantity === 0 ? "Out of Stock" : d.quantity <= d.min_stock ? "Low Stock" : "In Stock",
          lastRestocked: new Date(d.updated_at || d.created_at).toISOString().split("T")[0],
          supplier: d.supplier || "Vendor",
          notes: d.notes,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: InventoryItemRecord[] = data.map((d: any) => ({
      id: d.id,
      itemName: d.title,
      category: d.category,
      quantity: d.quantity,
      unit: d.unit || "pcs",
      minStock: d.min_stock || 5,
      status: d.quantity === 0 ? "Out of Stock" : d.quantity <= (d.min_stock || 5) ? "Low Stock" : "In Stock",
      lastRestocked: new Date(d.updated_at || d.created_at).toISOString().split("T")[0],
      supplier: d.supplier_or_paid_to || "Vendor",
      notes: d.notes,
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchExpensesFromModule(): Promise<{ data: ExpenseRecord[]; isFromSupabase: boolean }> {
  try {
    let { data, error } = await supabase
      .from("GV_inventory_expenses")
      .select("*")
      .eq("record_type", "expense");

    if (error || !data || data.length === 0) {
      const fallbackRes = await supabase.from("inventory_expenses").select("*").eq("record_type", "expense");
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      // Fallback query to legacy expenses table
      const { data: legacy } = await supabase.from("expenses").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: ExpenseRecord[] = legacy.map((d: any) => ({
          id: d.id,
          category: d.category,
          amount: Number(d.amount),
          paymentMethod: d.payment_method || "Cash",
          expenseDate: d.expense_date,
          receiptRef: d.receipt_ref || "",
          notes: d.notes || "",
          createdBy: d.created_by || "Office Staff",
          createdAt: d.created_at,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: ExpenseRecord[] = data.map((d: any) => ({
      id: d.id,
      category: d.category,
      amount: Number(d.amount_or_unit_cost || 0),
      paymentMethod: d.payment_method || "Cash",
      expenseDate: d.transaction_date || new Date().toISOString().split("T")[0],
      receiptRef: d.receipt_ref || "",
      notes: d.notes || "",
      createdBy: d.created_by || "Office Staff",
      createdAt: d.created_at,
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function saveInventoryItemToModule(item: Partial<InventoryItemRecord>) {
  const payload = {
    id: item.id || `INV-${Date.now()}`,
    record_type: "inventory",
    title: item.itemName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit || "pcs",
    min_stock: item.minStock || 5,
    supplier_or_paid_to: item.supplier,
    notes: item.notes,
  };

  try {
    const { data, error } = await supabase.from("GV_inventory_expenses").upsert([payload]).select();
    Promise.resolve(supabase.from("inventory_expenses").upsert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}

export async function recordExpenseToModule(expense: Partial<ExpenseRecord>) {
  const payload = {
    id: expense.id || `EXP-${Date.now()}`,
    record_type: "expense",
    title: expense.category || "General Expense",
    category: expense.category || "Utilities",
    amount_or_unit_cost: expense.amount || 0,
    payment_method: expense.paymentMethod || "Cash",
    transaction_date: expense.expenseDate || new Date().toISOString().split("T")[0],
    receipt_ref: expense.receiptRef || "",
    notes: expense.notes || "",
    created_by: expense.createdBy || "Office Staff",
  };

  try {
    const { data, error } = await supabase.from("GV_inventory_expenses").insert([payload]).select();
    Promise.resolve(supabase.from("inventory_expenses").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
