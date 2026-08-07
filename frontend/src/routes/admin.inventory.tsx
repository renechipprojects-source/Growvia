import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryProvider, useInventory } from "@/lib/inventoryContext";
import { Boxes, AlertTriangle, PackageCheck, Search } from "lucide-react";

export const Route = createFileRoute("/admin/inventory")({
  component: () => (
    <InventoryProvider>
      <AdminInventoryPage />
    </InventoryProvider>
  ),
  head: () => ({ meta: [{ title: "Inventory — Sunshine Play School" }] }),
});

function AdminInventoryPage() {
  const inv = useInventory();
  const [q, setQ] = useState("");

  const filteredItems = useMemo(() => {
    return inv.items.filter((item) => {
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q.toLowerCase()) ||
        item.sku.toLowerCase().includes(q.toLowerCase()) ||
        item.category.toLowerCase().includes(q.toLowerCase());
      return matchQ;
    });
  }, [inv.items, q]);

  const totalStockValue = useMemo(() => {
    return inv.items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  }, [inv.items]);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4 p-4 bg-slate-50/50">
      <div className="shrink-0 flex items-center justify-between">
        <PageHeader title="Live Inventory Audit" subtitle="Real-time institutional stock levels and asset valuation." />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Items</div>
            <div className="text-xl font-bold text-slate-900">{inv.items.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Low Stock Alerts</div>
            <div className="text-xl font-bold text-slate-900">{inv.lowStock.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Stock Value</div>
            <div className="text-xl font-bold text-slate-900">₹{totalStockValue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search live stock by item name, SKU, or category..."
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Full Width Inventory Table */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto overflow-x-auto flex-1 max-h-[calc(100vh-260px)]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Item Name</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">SKU / Code</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">In Stock</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Min Stock</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Unit Price</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Status</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No items in live inventory matching your search.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.qty <= item.minQty;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.qty} <span className="text-xs font-normal text-slate-500">{item.unit || "pcs"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{item.minQty}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">₹{item.unitPrice.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            In Stock
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
