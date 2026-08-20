import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useInventory, type InventoryItem } from "@/lib/inventoryContext";
import { Boxes, AlertTriangle, PackageCheck, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/office/inventory")({
  component: OfficeInventory,
  head: () => ({
    meta: [
      { title: "Live Inventory — Sunshine Play School" },
      { name: "description", content: "Simplified live stock and item management." },
    ],
  }),
});

function OfficeInventory() {
  const inv = useInventory();
  const [q, setQ] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("pcs");

  const filteredItems = useMemo(() => {
    return inv.items.filter((item) => {
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q.toLowerCase()) ||
        item.sku.toLowerCase().includes(q.toLowerCase()) ||
        (item.category || item.categoryId).toLowerCase().includes(q.toLowerCase());
      return matchQ;
    });
  }, [inv.items, q]);

  const totalStockValue = useMemo(() => {
    return inv.items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  }, [inv.items]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setQty("10");
    setMinQty("5");
    setUnitPrice("100");
    setUnit("pcs");
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setQty(String(item.qty));
    setMinQty(String(item.minQty));
    setUnitPrice(String(item.unitPrice));
    setUnit(item.unit || "pcs");
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an item name.");
      return;
    }

    const itemData: Omit<InventoryItem, "id" | "updatedAt"> = {
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      categoryId: "cat-1",
      category: "General",
      qty: Number(qty) || 0,
      minQty: Number(minQty) || 0,
      unitPrice: Number(unitPrice) || 0,
      unit: unit || "pcs",
    };

    if (editingItem) {
      inv.updateItem(editingItem.id, itemData);
      toast.success("Inventory item updated successfully.");
    } else {
      inv.addItem(itemData);
      toast.success("New inventory item added.");
    }

    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    inv.deleteItem(id);
    toast.success("Item deleted from inventory.");
  };

  return (
    <div className="space-y-4 w-full max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Live Inventory & Stock Center" />
        <Button onClick={handleOpenAdd} className="bg-slate-900 text-white rounded-xl shadow-xs hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory Item
        </Button>
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
            placeholder="Search live stock by name, SKU, or category..."
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Full Width Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Item Name</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">SKU / Code</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">In Stock</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Min Stock</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Unit Price</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4">Category</th>
                <th className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md py-3.5 px-4 text-right">Actions</th>
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
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-indigo-600" />
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-sm py-2">
            <div>
              <Label>Item Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Drawing Notebooks / Crayon Sets"
                className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU / Code</Label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <Label>Unit (e.g. pcs, box)</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label>Unit Price (₹)</Label>
                <Input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="mt-1 bg-slate-50 border-slate-200 rounded-xl"
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 text-white rounded-xl">
                {editingItem ? "Update Item" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
