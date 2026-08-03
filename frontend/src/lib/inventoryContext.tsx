import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react";
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

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => "IE-INV-" + Math.random().toString(36).slice(2, 7).toUpperCase();

const seedCategories: InventoryCategory[] = [
  { id: "c1", name: "Stationery & Paper", code: "STATIONERY" },
  { id: "c2", name: "Art & Craft", code: "ART" },
  { id: "c3", name: "Maintenance & Cleaning", code: "MAINTENANCE" },
];

const seedVendors: InventoryVendor[] = [
  { id: "v1", name: "Metro Stationery Mart", contactPerson: "Rajesh Kumar", phone: "9876543210", email: "metro@stationery.com" },
  { id: "v2", name: "SafePlay Systems", contactPerson: "Sanjay Gupta", phone: "9876543211", email: "info@safeplay.com" },
];

let memoryItemsCache: InventoryItem[] = [];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<InventoryCategory[]>(seedCategories);
  const [vendors, setVendors] = useState<InventoryVendor[]>(seedVendors);
  const [items, setItems] = useState<InventoryItem[]>(memoryItemsCache);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);

  const fetchInventoryFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("gv_inventory_expenses")
        .select("*")
        .eq("record_type", "inventory")
        .order("created_at", { ascending: false });

      if (error || !data) return;

      const mapped: InventoryItem[] = data.map((d: any) => ({
        id: d.id,
        name: d.title || "Inventory Item",
        sku: d.receipt_ref || `SKU-${d.id.slice(-4)}`,
        categoryId: d.category === "Art" ? "c2" : "c1",
        unit: d.unit || "pcs",
        qty: Number(d.quantity || 0),
        minQty: Number(d.min_stock || 10),
        unitPrice: Number(d.amount_or_unit_cost || 50),
        updatedAt: d.transaction_date || d.created_at?.slice(0, 10) || today(),
      }));

      memoryItemsCache = mapped;
      setItems(mapped);
    } catch {}
  };

  useEffect(() => {
    fetchInventoryFromSupabase();
  }, []);

  const value = useMemo<Ctx>(() => ({
    categories, vendors, items, purchases, movements, issues,
    lowStock: items.filter((i) => i.qty < i.minQty),

    addCategory: (c) => setCategories((prev) => [...prev, { ...c, id: uid() }]),
    updateCategory: (id, c) => setCategories((prev) => prev.map((x) => x.id === id ? { ...x, ...c } : x)),
    deleteCategory: (id) => setCategories((prev) => prev.filter((x) => x.id !== id)),

    addVendor: (v) => setVendors((prev) => [...prev, { ...v, id: uid() }]),
    updateVendor: (id, v) => setVendors((prev) => prev.map((x) => x.id === id ? { ...x, ...v } : x)),
    deleteVendor: (id) => setVendors((prev) => prev.filter((x) => x.id !== id)),

    addItem: (i) => {
      const newId = uid();
      const newItem: InventoryItem = { ...i, id: newId, updatedAt: today() };
      setItems((prev) => [newItem, ...prev]);

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
    },

    updateItem: (id, i) => {
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, ...i, updatedAt: today() } : x));
      Promise.resolve(
        supabase.from("gv_inventory_expenses").update({
          title: i.name,
          quantity: i.qty,
          min_stock: i.minQty,
          amount_or_unit_cost: i.unitPrice,
          unit: i.unit,
        }).eq("id", id)
      ).catch(() => {});
    },

    deleteItem: (id) => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
    },

    addPurchase: (p) => setPurchases((prev) => [{ ...p, id: uid() }, ...prev]),
    addMovement: (m) => setMovements((prev) => [{ ...m, id: uid() }, ...prev]),
    addIssue: (is) => setIssues((prev) => [{ ...is, id: uid() }, ...prev]),
    issueItem: (is: any) => setIssues((prev) => [{ ...is, id: uid(), returned: false, date: today() }, ...prev]),
    returnItem: (id: string) => setIssues((prev) => prev.map((x) => x.id === id ? { ...x, returned: true, returnedDate: today() } : x)),
  }), [categories, vendors, items, purchases, movements, issues]);

  return <InventoryCtx.Provider value={value}>{children}</InventoryCtx.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryCtx);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
