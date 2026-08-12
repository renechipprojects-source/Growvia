import { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";

export interface InventoryCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface InventoryVendor {
  id: string;
  name: string;
  contactPerson?: string;
  contact?: string;
  phone: string;
  email: string;
  address?: string;
  gstin?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: string;
  unit: string;
  qty: number;
  minQty: number;
  unitPrice: number;
  vendorId?: string;
  updatedAt: string;
}

export interface PurchaseEntry {
  id: string;
  poNumber?: string;
  invoiceNo?: string;
  vendorId?: string;
  itemId?: string;
  qty?: number;
  unitPrice?: number;
  total?: number;
  items?: { itemId: string; qty: number; unitPrice: number }[];
  totalAmount?: number;
  status?: "Draft" | "Ordered" | "Received" | "Cancelled";
  date: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "in" | "out";
  qty: number;
  reason: string;
  ref?: string;
  note?: string;
  date: string;
}

export interface IssueRecord {
  id: string;
  itemId: string;
  qty: number;
  issuedTo: string;
  department: string;
  purpose: string;
  date: string;
  returned?: boolean;
  returnedDate?: string;
}

interface Ctx {
  categories: InventoryCategory[];
  vendors: InventoryVendor[];
  items: InventoryItem[];
  purchases: PurchaseEntry[];
  movements: StockMovement[];
  issues: IssueRecord[];
  lowStock: InventoryItem[];

  addCategory: (c: Omit<InventoryCategory, "id">) => void;
  updateCategory: (id: string, c: Partial<InventoryCategory>) => void;
  deleteCategory: (id: string) => void;

  addVendor: (v: Omit<InventoryVendor, "id">) => void;
  updateVendor: (id: string, v: Partial<InventoryVendor>) => void;
  deleteVendor: (id: string) => void;

  addItem: (i: Omit<InventoryItem, "id" | "updatedAt">) => void;
  updateItem: (id: string, i: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;

  addPurchase: (p: Omit<PurchaseEntry, "id">) => void;
  addMovement: (m: Omit<StockMovement, "id">) => void;
  addIssue: (is: Omit<IssueRecord, "id">) => void;
  issueItem?: (is: any) => void;
  returnItem?: (id: string) => void;
}

const InventoryCtx = createContext<Ctx | null>(null);

import { useAutoRefresh } from "./autoRefreshContext";
import { notifyAutoRefresh } from "./supabaseService";

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => "IE-INV-" + Math.random().toString(36).slice(2, 7).toUpperCase();

let memoryItemsCache: InventoryItem[] = [];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [items, setItems] = useState<InventoryItem[]>(memoryItemsCache);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);

  const fetchInventoryFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("gv_inventory_expenses")
        .select("*")
        .in("record_type", ["inventory", "inventory_category", "inventory_vendor", "inventory_purchase", "inventory_movement", "inventory_issue"])
        .order("created_at", { ascending: false });

      if (error || !data) {
        memoryItemsCache = [];
        setItems([]);
        setCategories([]);
        setVendors([]);
        setPurchases([]);
        setMovements([]);
        setIssues([]);
        return;
      }

      const remoteItems: InventoryItem[] = [];
      const remoteCategories: InventoryCategory[] = [];
      const remoteVendors: InventoryVendor[] = [];
      const remotePurchases: PurchaseEntry[] = [];
      const remoteMovements: StockMovement[] = [];
      const remoteIssues: IssueRecord[] = [];

      data.forEach((d: any) => {
        try {
          const meta = d.notes && (d.notes.startsWith("{") || d.notes.startsWith("[")) ? JSON.parse(d.notes) : {};
          if (d.record_type === "inventory") {
            remoteItems.push({
              id: d.id,
              name: d.title || "Inventory Item",
              sku: d.receipt_ref || meta.sku || `SKU-${d.id.slice(-4)}`,
              categoryId: d.category || meta.categoryId || "c1",
              category: d.category || meta.category || "General",
              unit: d.unit || meta.unit || "pcs",
              qty: Number(d.quantity || meta.qty || 0),
              minQty: Number(d.min_stock || meta.minQty || 10),
              unitPrice: Number(d.amount_or_unit_cost || meta.unitPrice || 0),
              updatedAt: d.transaction_date || d.created_at?.slice(0, 10) || today(),
            });
          } else if (d.record_type === "inventory_category") {
            remoteCategories.push({ id: d.id, name: d.title, code: d.receipt_ref || meta.code || "", description: meta.description || "" });
          } else if (d.record_type === "inventory_vendor") {
            remoteVendors.push({ id: d.id, name: d.title, phone: d.supplier_or_paid_to || meta.phone || "", email: meta.email || "" });
          } else if (d.record_type === "inventory_purchase") {
            remotePurchases.push({ id: d.id, poNumber: d.title, totalAmount: d.amount_or_unit_cost, date: d.transaction_date || today() });
          } else if (d.record_type === "inventory_movement") {
            remoteMovements.push({ id: d.id, itemId: d.category, type: d.supplier_or_paid_to as any, qty: d.quantity, reason: d.title, date: d.transaction_date || today() });
          } else if (d.record_type === "inventory_issue") {
            remoteIssues.push({ id: d.id, itemId: d.category, qty: d.quantity, issuedTo: d.title, department: d.supplier_or_paid_to || "School", purpose: meta.purpose || "", date: d.transaction_date || today() });
          }
        } catch {}
      });

      memoryItemsCache = remoteItems;
      setItems(remoteItems);
      setCategories(remoteCategories);
      setVendors(remoteVendors);
      setPurchases(remotePurchases);
      setMovements(remoteMovements);
      setIssues(remoteIssues);
    } catch {
      memoryItemsCache = [];
      setItems([]);
      setCategories([]);
      setVendors([]);
      setPurchases([]);
      setMovements([]);
      setIssues([]);
    }
  }, []);

  useEffect(() => {
    fetchInventoryFromSupabase();
  }, [fetchInventoryFromSupabase]);

  const addCategory = useCallback((c: Omit<InventoryCategory, "id">) => {
    const newId = uid();
    setCategories((prev) => [...prev, { ...c, id: newId }]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_category", title: c.name, receipt_ref: c.code, notes: JSON.stringify({ description: c.description }),
      }])
    ).catch(() => {});
  }, []);
  const updateCategory = useCallback((id: string, c: Partial<InventoryCategory>) => {
    setCategories((prev) => prev.map((x) => x.id === id ? { ...x, ...c } : x));
    Promise.resolve(
      supabase.from("gv_inventory_expenses").update({
        title: c.name, receipt_ref: c.code, notes: JSON.stringify({ description: c.description }),
      }).eq("id", id)
    ).catch(() => {});
  }, []);
  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((x) => x.id !== id));
    Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
  }, []);

  const addVendor = useCallback((v: Omit<InventoryVendor, "id">) => {
    const newId = uid();
    setVendors((prev) => [...prev, { ...v, id: newId }]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_vendor", title: v.name, supplier_or_paid_to: v.phone, notes: JSON.stringify({ email: v.email }),
      }])
    ).catch(() => {});
  }, []);
  const updateVendor = useCallback((id: string, v: Partial<InventoryVendor>) => {
    setVendors((prev) => prev.map((x) => x.id === id ? { ...x, ...v } : x));
    Promise.resolve(
      supabase.from("gv_inventory_expenses").update({
        title: v.name, supplier_or_paid_to: v.phone, notes: JSON.stringify({ email: v.email }),
      }).eq("id", id)
    ).catch(() => {});
  }, []);
  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((x) => x.id !== id));
    Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
  }, []);

  const addItem = useCallback((i: Omit<InventoryItem, "id" | "updatedAt">) => {
    const newId = uid();
    const newItem: InventoryItem = { ...i, id: newId, updatedAt: today() };
    setItems((prev) => [newItem, ...prev]);

    notifyAutoRefresh("inventory");

    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId,
        record_type: "inventory",
        title: i.name,
        category: i.categoryId,
        quantity: i.qty,
        min_stock: i.minQty,
        amount_or_unit_cost: i.unitPrice,
        unit: i.unit,
        transaction_date: today(),
      }])
    ).catch(() => {});
  }, []);

  const updateItem = useCallback((id: string, i: Partial<InventoryItem>) => {
    setItems((prev) => prev.map((x) => x.id === id ? { ...x, ...i, updatedAt: today() } : x));
    notifyAutoRefresh("inventory");
    Promise.resolve(
      supabase.from("gv_inventory_expenses").update({
        title: i.name,
        quantity: i.qty,
        min_stock: i.minQty,
        amount_or_unit_cost: i.unitPrice,
        unit: i.unit,
      }).eq("id", id)
    ).catch(() => {});
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    notifyAutoRefresh("inventory");
    Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
  }, []);

  const addPurchase = useCallback((p: Omit<PurchaseEntry, "id">) => {
    const newId = uid();
    setPurchases((prev) => [{ ...p, id: newId }, ...prev]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_purchase", title: p.poNumber, amount_or_unit_cost: p.totalAmount, transaction_date: p.date || today(),
      }])
    ).catch(() => {});
  }, []);
  const addMovement = useCallback((m: Omit<StockMovement, "id">) => {
    const newId = uid();
    setMovements((prev) => [{ ...m, id: newId }, ...prev]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_movement", title: m.reason, category: m.itemId, supplier_or_paid_to: m.type, quantity: m.qty, transaction_date: m.date || today(),
      }])
    ).catch(() => {});
  }, []);
  const addIssue = useCallback((is: Omit<IssueRecord, "id">) => {
    const newId = uid();
    setIssues((prev) => [{ ...is, id: newId }, ...prev]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_issue", title: is.issuedTo, category: is.itemId, quantity: is.qty, supplier_or_paid_to: is.department, transaction_date: is.date || today(), notes: JSON.stringify({ purpose: is.purpose }),
      }])
    ).catch(() => {});
  }, []);
  const issueItem = useCallback((is: any) => {
    const newId = uid();
    const record = { ...is, id: newId, returned: false, date: today() };
    setIssues((prev) => [record, ...prev]);
    Promise.resolve(
      supabase.from("gv_inventory_expenses").insert([{
        id: newId, record_type: "inventory_issue", title: is.issuedTo || is.name || "Issue", category: is.itemId, quantity: is.qty, supplier_or_paid_to: is.department || "School", transaction_date: today(), notes: JSON.stringify({ purpose: is.purpose }),
      }])
    ).catch(() => {});
  }, []);
  const returnItem = useCallback((id: string) => {
    setIssues((prev) => prev.map((x) => x.id === id ? { ...x, returned: true, returnedDate: today() } : x));
    Promise.resolve(
      supabase.from("gv_inventory_expenses").update({ notes: JSON.stringify({ returned: true, returnedDate: today() }) }).eq("id", id)
    ).catch(() => {});
  }, []);

  const lowStock = useMemo(() => items.filter((i) => i.qty < i.minQty), [items]);

  const value = useMemo<Ctx>(() => ({
    categories, vendors, items, purchases, movements, issues, lowStock,
    addCategory, updateCategory, deleteCategory,
    addVendor, updateVendor, deleteVendor,
    addItem, updateItem, deleteItem,
    addPurchase, addMovement, addIssue, issueItem, returnItem
  }), [
    categories, vendors, items, purchases, movements, issues, lowStock,
    addCategory, updateCategory, deleteCategory,
    addVendor, updateVendor, deleteVendor,
    addItem, updateItem, deleteItem,
    addPurchase, addMovement, addIssue, issueItem, returnItem
  ]);

  return <InventoryCtx.Provider value={value}>{children}</InventoryCtx.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryCtx);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
