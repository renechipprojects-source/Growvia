import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
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
  { id: "c5", name: "Notebooks & Workbooks", description: "Student notebooks, activity workbooks, drawing pads, tracing books" },
  { id: "c1", name: "Stationery", description: "Pens, pencils, markers, paper reams, files, folders" },
  { id: "c2", name: "Cleaning Supplies", description: "Detergents, disinfectants, sanitizers, brooms, towels" },
  { id: "c3", name: "Electronics & Media", description: "Cables, chargers, projectors, batteries, audio systems" },
  { id: "c4", name: "Furniture & Craft", description: "Kids chairs, activity desks, play mats, craft boards" },
];

const seedVendors: InventoryVendor[] = [
  { id: "v1", name: "Sunshine Publications & Stationers", contact: "Rajesh Kumar", phone: "+91 98100 12345", email: "rajesh@sunstationers.com", address: "Sector 14, Main Market" },
  { id: "v2", name: "Bright Edu Supplies Ltd", contact: "Anil Sharma", phone: "+91 98765 43210", email: "orders@brightedu.in", address: "Industrial Area Phase 2" },
];

const seedItems: InventoryItem[] = [
  { id: "nb1", name: "4-Line English Notebook (100 Pages)", sku: "NB-ENG-100", categoryId: "c5", unit: "books", qty: 250, minQty: 50, unitPrice: 45, vendorId: "v1", updatedAt: today() },
  { id: "nb2", name: "Square-Line Math Notebook (100 Pages)", sku: "NB-MATH-100", categoryId: "c5", unit: "books", qty: 200, minQty: 40, unitPrice: 45, vendorId: "v1", updatedAt: today() },
  { id: "nb3", name: "Art & Drawing Sketch Book (A4)", sku: "NB-ART-A4", categoryId: "c5", unit: "books", qty: 120, minQty: 30, unitPrice: 65, vendorId: "v1", updatedAt: today() },
  { id: "nb4", name: "Alphabet & Tracing Practice Workbook", sku: "WB-TRC-01", categoryId: "c5", unit: "books", qty: 180, minQty: 40, unitPrice: 80, vendorId: "v2", updatedAt: today() },
  { id: "st1", name: "A4 Printing Paper Reams (500 sheets)", sku: "ST-PAP-A4", categoryId: "c1", unit: "reams", qty: 35, minQty: 10, unitPrice: 280, vendorId: "v1", updatedAt: today() },
  { id: "st2", name: "Whiteboard Markers (Pack of 10)", sku: "ST-MRK-10", categoryId: "c1", unit: "packs", qty: 15, minQty: 5, unitPrice: 250, vendorId: "v1", updatedAt: today() },
  { id: "cl1", name: "Hand Sanitizer 500ml", sku: "CL-SAN-500", categoryId: "c2", unit: "bottles", qty: 24, minQty: 8, unitPrice: 180, vendorId: "v2", updatedAt: today() },
];

const STORAGE_KEY = "sunshine.inventory.v2";

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<InventoryCategory[]>(() => {
    if (typeof window === "undefined") return seedCategories;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.cats`);
      return saved ? JSON.parse(saved) : seedCategories;
    } catch { return seedCategories; }
  });

  const [vendors, setVendors] = useState<InventoryVendor[]>(() => {
    if (typeof window === "undefined") return seedVendors;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.vendors`);
      return saved ? JSON.parse(saved) : seedVendors;
    } catch { return seedVendors; }
  });

  const [items, setItems] = useState<InventoryItem[]>(() => {
    if (typeof window === "undefined") return seedItems;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.items`);
      return saved ? JSON.parse(saved) : seedItems;
    } catch { return seedItems; }
  });

  const [purchases, setPurchases] = useState<PurchaseEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.purchases`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.movements`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [issues, setIssues] = useState<IssueRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.issues`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Save to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${STORAGE_KEY}.cats`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY}.vendors`, JSON.stringify(vendors));
      localStorage.setItem(`${STORAGE_KEY}.items`, JSON.stringify(items));
      localStorage.setItem(`${STORAGE_KEY}.purchases`, JSON.stringify(purchases));
      localStorage.setItem(`${STORAGE_KEY}.movements`, JSON.stringify(movements));
      localStorage.setItem(`${STORAGE_KEY}.issues`, JSON.stringify(issues));
    } catch {}
  }, [categories, vendors, items, purchases, movements, issues]);

  // Fetch initial items from Supabase if available
  useEffect(() => {
    supabase.from("inventory_items").select("*").then(({ data }) => {
      if (data && data.length > 0) {
        const mapped: InventoryItem[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          sku: d.sku || `SKU-${d.id.slice(0, 4)}`,
          categoryId: d.category || "c1",
          unit: d.unit || "pcs",
          qty: Number(d.quantity || 0),
          minQty: Number(d.min_threshold || 10),
          unitPrice: Number(d.unit_price || 50),
          updatedAt: today(),
        }));
        setItems((prev) => {
          const merged = [...prev];
          mapped.forEach((m) => {
            if (!merged.some((x) => x.id === m.id)) merged.push(m);
          });
          return merged;
        });
      }
    });
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
      const newItem = { ...i, id: newId, updatedAt: today() };
      setItems((prev) => [...prev, newItem]);
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
