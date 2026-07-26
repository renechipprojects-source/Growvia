import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type InventoryCategory = {
  id: string;
  name: string;
  description?: string;
};

export type InventoryVendor = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
  address?: string;
};

export type InventoryItem = {
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
};

export type StockMovement = {
  id: string;
  itemId: string;
  type: "in" | "out";
  qty: number;
  reason: string;
  date: string;
  note?: string;
};

export type PurchaseEntry = {
  id: string;
  vendorId: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  total: number;
  invoiceNo: string;
  date: string;
};

export type IssueRecord = {
  id: string;
  itemId: string;
  issuedTo: string;
  qty: number;
  date: string;
  returned: boolean;
  returnedDate?: string;
  purpose?: string;
};

type Ctx = {
  categories: InventoryCategory[];
  vendors: InventoryVendor[];
  items: InventoryItem[];
  purchases: PurchaseEntry[];
  movements: StockMovement[];
  issues: IssueRecord[];
  addCategory: (c: Omit<InventoryCategory, "id">) => void;
  updateCategory: (id: string, c: Partial<InventoryCategory>) => void;
  deleteCategory: (id: string) => void;
  addVendor: (v: Omit<InventoryVendor, "id">) => void;
  updateVendor: (id: string, v: Partial<InventoryVendor>) => void;
  deleteVendor: (id: string) => void;
  addItem: (i: Omit<InventoryItem, "id" | "updatedAt">) => void;
  updateItem: (id: string, i: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  addPurchase: (p: Omit<PurchaseEntry, "id" | "total">) => void;
  addMovement: (m: Omit<StockMovement, "id">) => void;
  issueItem: (i: Omit<IssueRecord, "id" | "returned">) => void;
  returnItem: (id: string) => void;
  lowStock: InventoryItem[];
};

const InventoryContext = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const seedCategories: InventoryCategory[] = [
  { id: "c1", name: "Stationery", description: "Pens, paper, files" },
  { id: "c2", name: "Cleaning Supplies", description: "Detergents, brooms" },
  { id: "c3", name: "Electronics", description: "Cables, batteries" },
  { id: "c4", name: "Furniture", description: "Chairs, desks" },
];

const seedVendors: InventoryVendor[] = [];
const seedItems: InventoryItem[] = [];
const seedPurchases: PurchaseEntry[] = [];
const seedMovements: StockMovement[] = [];
const seedIssues: IssueRecord[] = [];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(seedCategories);
  const [vendors, setVendors] = useState(seedVendors);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);

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
      setItems((prev) => [...prev, { ...i, id: newId, updatedAt: today() }]);
      Promise.resolve(supabase.from("inventory_items").insert([{
        id: newId,
        name: i.name,
        category: i.categoryId,
        quantity: i.qty,
        min_threshold: i.minQty,
        unit: i.unit,
        status: i.qty < i.minQty ? "Low Stock" : "In Stock"
      }])).catch(() => {});
    },
    updateItem: (id, i) => {
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, ...i, updatedAt: today() } : x));
      Promise.resolve(supabase.from("inventory_items").update({
        name: i.name,
        quantity: i.qty,
        min_threshold: i.minQty,
        unit: i.unit
      }).eq("id", id)).catch(() => {});
    },
    deleteItem: (id) => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      Promise.resolve(supabase.from("inventory_items").delete().eq("id", id)).catch(() => {});
    },
    addPurchase: (p) => {
      const total = p.qty * p.unitPrice;
      const id = uid();
      setPurchases((prev) => [{ ...p, id, total }, ...prev]);
      setItems((prev) => prev.map((x) => x.id === p.itemId ? { ...x, qty: x.qty + p.qty, updatedAt: today() } : x));
      setMovements((prev) => [{ id: uid(), itemId: p.itemId, type: "in", qty: p.qty, reason: `Purchase ${p.invoiceNo}`, date: p.date }, ...prev]);
    },
    addMovement: (m) => {
      const id = uid();
      setMovements((prev) => [{ ...m, id }, ...prev]);
      setItems((prev) => prev.map((x) => x.id === m.itemId ? { ...x, qty: m.type === "in" ? x.qty + m.qty : Math.max(0, x.qty - m.qty), updatedAt: today() } : x));
    },
    issueItem: (i) => {
      const id = uid();
      setIssues((prev) => [{ ...i, id, returned: false }, ...prev]);
      setItems((prev) => prev.map((x) => x.id === i.itemId ? { ...x, qty: Math.max(0, x.qty - i.qty), updatedAt: today() } : x));
      setMovements((prev) => [{ id: uid(), itemId: i.itemId, type: "out", qty: i.qty, reason: `Issued to ${i.issuedTo}`, date: i.date }, ...prev]);
    },
    returnItem: (id) => {
      setIssues((prev) => prev.map((x) => {
        if (x.id !== id || x.returned) return x;
        setItems((its) => its.map((it) => it.id === x.itemId ? { ...it, qty: it.qty + x.qty, updatedAt: today() } : it));
        setMovements((mv) => [{ id: uid(), itemId: x.itemId, type: "in", qty: x.qty, reason: `Returned by ${x.issuedTo}`, date: today() }, ...mv]);
        return { ...x, returned: true, returnedDate: today() };
      }));
    },
  }), [categories, vendors, items, purchases, movements, issues]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
