import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InventoryProvider, useInventory, type InventoryItem } from "@/lib/inventoryContext";
import { Boxes, AlertTriangle, PackageCheck, Search, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("10");

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Form states for Add/Edit
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
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setQty(String(item.qty));
    setMinQty(String(item.minQty));
    setUnitPrice(String(item.unitPrice));
    setUnit(item.unit || "pcs");
    setIsAddEditOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
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
      toast.success(`Updated "${itemData.name}" successfully.`);
    } else {
      inv.addItem(itemData);
      toast.success(`Added "${itemData.name}" to inventory.`);
    }

    setIsAddEditOpen(false);
  };

  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockQty("10");
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    const addCount = Number(restockQty);
    if (isNaN(addCount) || addCount <= 0) {
      toast.error("Please enter a valid positive restock quantity.");
      return;
    }

    const newQty = restockItem.qty + addCount;
    inv.updateItem(restockItem.id, { qty: newQty });
    toast.success(`Restocked ${restockItem.name} (+${addCount} ${restockItem.unit || "pcs"}). New Stock: ${newQty}`);
    setRestockItem(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    inv.deleteItem(deleteTarget.id);
    toast.success(`Deleted "${deleteTarget.name}" from inventory.`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 w-full max-w-none p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Live Inventory Audit" description="Real-time institutional stock levels and asset valuation." />
        <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs">
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
            placeholder="Search live stock by item name, SKU, or category..."
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
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRestock(item)}
                            className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            title="Restock Item"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Restock
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            title="Edit Item"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(item)}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Item Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update item specifications, price, or minimum alert thresholds." : "Register a new stock item into institutional inventory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Crayons Box, A4 Paper Rim"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">SKU / Code</Label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-1001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit (e.g. pcs, box)</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Initial Qty</Label>
                <Input
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Min Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
                {editingItem ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockItem} onOpenChange={(open) => !open && setRestockItem(null)}>
        <DialogContent className="max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
            <DialogDescription>
              Add additional units to the current stock of <span className="font-semibold text-slate-900">{restockItem?.name}</span> (Current: {restockItem?.qty} {restockItem?.unit || "pcs"}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmRestock} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Additional Quantity to Add *</Label>
              <Input
                type="number"
                min="1"
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="10"
                className="mt-1 font-bold text-lg text-center"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRestockItem(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
                Confirm Restock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Delete Inventory Item?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span> from inventory? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
