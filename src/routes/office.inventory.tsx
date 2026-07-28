import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Boxes, AlertTriangle, PackageCheck, Truck, ArrowDownToLine, ArrowUpFromLine,
  Pencil, Trash2, Plus, RotateCcw,
} from "lucide-react";

import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useInventory,
  type InventoryItem,
  type InventoryCategory,
  type InventoryVendor,
} from "@/lib/inventoryContext";

export const Route = createFileRoute("/office/inventory")({
  component: OfficeInventory,
  head: () => ({
    meta: [
      { title: "Office Inventory — Sunshine ERP" },
      { name: "description", content: "Track office supplies, purchases, stock movements and issue/return." },
      { property: "og:title", content: "Office Inventory" },
      { property: "og:description", content: "Item, category and vendor management for the office." },
    ],
  }),
});

function currency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function OfficeInventory() {
  const inv = useInventory();
  const totalValue = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none">
      <div className="shrink-0">
        <PageHeader title="Office Inventory" subtitle="Items, categories, vendors, purchases, stock and issues." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Items" value={inv.items.length} icon={Boxes} gradient="from-orange-500 to-amber-500" sub={`${inv.categories.length} categories`} />
          <StatCard label="Low Stock" value={inv.lowStock.length} icon={AlertTriangle} gradient="from-rose-500 to-red-500" sub="Below minimum" />
          <StatCard label="Vendors" value={inv.vendors.length} icon={Truck} gradient="from-indigo-500 to-blue-500" />
          <StatCard label="Stock Value" value={currency(totalValue)} icon={PackageCheck} gradient="from-emerald-500 to-teal-500" />
        </div>
      </div>

      <Tabs defaultValue="notebooks" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 flex-wrap h-auto justify-start bg-slate-100/80 p-1 rounded-xl">
          <TabsTrigger value="notebooks" className="font-semibold text-sky-800 data-[state=active]:bg-sky-500 data-[state=active]:text-white rounded-lg">📖 Notebooks &amp; Workbooks</TabsTrigger>
          <TabsTrigger value="items">All Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="stock">Stock In/Out</TabsTrigger>
          <TabsTrigger value="issues">Issue &amp; Return</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto pt-3">
          <TabsContent value="notebooks"><NotebooksTab /></TabsContent>
          <TabsContent value="items"><ItemsTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="vendors"><VendorsTab /></TabsContent>
          <TabsContent value="purchases"><PurchasesTab /></TabsContent>
          <TabsContent value="stock"><StockTab /></TabsContent>
          <TabsContent value="issues"><IssuesTab /></TabsContent>
          <TabsContent value="alerts"><AlertsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ---------------- Notebooks & Workbooks ---------------- */

function NotebooksTab() {
  const { items, categories, vendors, addItem, issueItem } = useInventory();
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [issueTarget, setIssueTarget] = useState<InventoryItem | null>(null);

  const notebookCat = categories.find((c) => c.name.toLowerCase().includes("notebook")) || categories[0];
  const notebookItems = useMemo(() => {
    return items.filter((i) => {
      const isNotebook = i.categoryId === notebookCat?.id || i.name.toLowerCase().includes("notebook") || i.name.toLowerCase().includes("book");
      const matchQ = !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase());
      return isNotebook && matchQ;
    });
  }, [items, notebookCat, q]);

  return (
    <SectionCard
      title="Notebooks & Workbooks Inventory"
      action={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpenAdd(true)} className="bg-sky-600 hover:bg-sky-700 text-white rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Add Notebook Stock
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <Input
          placeholder="Search notebooks, workbooks, drawing pads..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs bg-white"
        />
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{notebookItems.length}</span> notebook item types
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {notebookItems.map((nb) => {
          const isLow = nb.qty < nb.minQty;
          const vendor = vendors.find((v) => v.id === nb.vendorId);
          return (
            <div key={nb.id} className="rounded-2xl border border-sky-100 bg-gradient-to-b from-white to-sky-50/30 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">{nb.name}</h4>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{nb.sku}</div>
                </div>
                <Badge className={isLow ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"}>
                  {isLow ? "Low Stock" : "In Stock"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-muted-foreground">Current Stock:</span>
                  <div className="text-base font-bold text-slate-900">{nb.qty} {nb.unit}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Min Threshold:</span>
                  <div className="text-base font-medium text-slate-700">{nb.minQty} {nb.unit}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit Price:</span>
                  <div className="font-semibold text-slate-900">{currency(nb.unitPrice)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <div className="truncate font-medium text-slate-700">{vendor?.name || "Standard Supply"}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-full border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={() => {
                    setIssueTarget(nb);
                    setOpenIssue(true);
                  }}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5 mr-1" /> Issue to Class
                </Button>
              </div>
            </div>
          );
        })}

        {notebookItems.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No notebooks found. Click "Add Notebook Stock" to add student notebooks.
          </div>
        )}
      </div>

      <ItemDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        item={null}
        categories={categories}
        vendors={vendors}
        onSave={(data) => {
          addItem({ ...data, categoryId: notebookCat?.id || data.categoryId });
          toast.success("Notebook added to inventory!");
          setOpenAdd(false);
        }}
      />

      <Dialog open={openIssue} onOpenChange={setOpenIssue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Notebooks to Class</DialogTitle>
            <DialogDescription>
              {issueTarget ? `Issue "${issueTarget.name}" (Current Stock: ${issueTarget.qty} ${issueTarget.unit})` : "Select class and quantity"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const issuedTo = (form.elements.namedItem("issuedTo") as HTMLInputElement).value;
              const qty = Number((form.elements.namedItem("qty") as HTMLInputElement).value);
              const purpose = (form.elements.namedItem("purpose") as HTMLInputElement).value;
              if (!issueTarget) return;
              if (qty > issueTarget.qty) {
                toast.error(`Cannot issue ${qty} — only ${issueTarget.qty} in stock!`);
                return;
              }
              issueItem({
                itemId: issueTarget.id,
                issuedTo: issuedTo || "Nursery A",
                qty,
                date: new Date().toISOString().slice(0, 10),
                purpose: purpose || "Class Distribution",
              });
              toast.success(`Issued ${qty} ${issueTarget.unit} of "${issueTarget.name}" to ${issuedTo || "Class"}!`);
              setOpenIssue(false);
            }}
            className="space-y-3"
          >
            <div>
              <Label>Assigned Class / Department</Label>
              <Input name="issuedTo" required defaultValue="Nursery A" placeholder="e.g. Nursery A / Playgroup B" className="mt-1" />
            </div>
            <div>
              <Label>Quantity to Issue</Label>
              <Input name="qty" type="number" min={1} max={issueTarget?.qty || 100} defaultValue={10} required className="mt-1" />
            </div>
            <div>
              <Label>Distribution Purpose</Label>
              <Input name="purpose" defaultValue="Term 1 Notebook Distribution" placeholder="e.g. Term 1 Distribution" className="mt-1" />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpenIssue(false)}>Cancel</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white">Confirm Issue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Items ---------------- */

function ItemsTab() {
  const { items, categories, vendors, addItem, updateItem, deleteItem } = useInventory();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => items.filter((i) => {
    const matchQ = !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase());
    const matchCat = cat === "all" || i.categoryId === cat;
    return matchQ && matchCat;
  }), [items, q, cat]);

  return (
    <SectionCard title="Items" action={
      <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> New item
      </Button>
    }>
      <div className="flex flex-wrap gap-2 mb-3">
        <Input placeholder="Search by Item Name or Item Code (SKU)..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Min</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="w-40">Level</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((i) => {
            const low = i.qty < i.minQty;
            const pct = Math.min(100, (i.qty / Math.max(i.minQty * 2, 1)) * 100);
            const c = categories.find((x) => x.id === i.categoryId);
            const v = vendors.find((x) => x.id === i.vendorId);
            return (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.sku}</TableCell>
                <TableCell><Badge variant="outline">{c?.name ?? "—"}</Badge></TableCell>
                <TableCell className="text-sm">{v?.name ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{i.qty} {i.unit}</TableCell>
                <TableCell className="text-right text-muted-foreground">{i.minQty}</TableCell>
                <TableCell className="text-right">{currency(i.unitPrice)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className={low ? "[&>div]:bg-rose-500" : ""} />
                    {low && <Badge variant="destructive">Low</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm(`Delete "${i.name}"?`)) { deleteItem(i.id); toast.success("Item deleted"); }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No items found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <ItemDialog
        open={open}
        onOpenChange={setOpen}
        item={editing}
        categories={categories}
        vendors={vendors}
        onSave={(data) => {
          if (editing) { updateItem(editing.id, data); toast.success("Item updated"); }
          else { addItem(data); toast.success("Item added"); }
          setOpen(false);
        }}
      />
    </SectionCard>
  );
}

function ItemDialog({ open, onOpenChange, item, categories, vendors, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem | null;
  categories: InventoryCategory[];
  vendors: InventoryVendor[];
  onSave: (data: Omit<InventoryItem, "id" | "updatedAt">) => void;
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    name: string; sku: string; categoryId: string; unit: string;
    qty: number; minQty: number; unitPrice: number; vendorId?: string;
  }>({
    values: item
      ? { name: item.name, sku: item.sku, categoryId: item.categoryId, unit: item.unit, qty: item.qty, minQty: item.minQty, unitPrice: item.unitPrice, vendorId: item.vendorId }
      : { name: "", sku: "", categoryId: categories[0]?.id ?? "", unit: "pcs", qty: 0, minQty: 0, unitPrice: 0, vendorId: undefined },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>Fill in the item details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => onSave({
          ...data,
          qty: Number(data.qty), minQty: Number(data.minQty), unitPrice: Number(data.unitPrice),
          vendorId: data.vendorId || undefined,
        }))} className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input required {...register("name")} /></div>
          <div><Label>SKU</Label><Input required {...register("sku")} /></div>
          <div><Label>Unit</Label><Input required {...register("unit")} placeholder="pcs, ream, can..." /></div>
          <div>
            <Label>Category</Label>
            <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendor</Label>
            <Select value={watch("vendorId") ?? "__none"} onValueChange={(v) => setValue("vendorId", v === "__none" ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Opening Qty</Label><Input type="number" min={0} {...register("qty")} /></div>
          <div><Label>Min Qty</Label><Input type="number" min={0} {...register("minQty")} /></div>
          <div><Label>Unit Price (₹)</Label><Input type="number" min={0} step="0.01" {...register("unitPrice")} /></div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{item ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Categories ---------------- */

function CategoriesTab() {
  const { categories, items, addCategory, updateCategory, deleteCategory } = useInventory();
  const [editing, setEditing] = useState<InventoryCategory | null>(null);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();

  return (
    <SectionCard title="Categories" action={
      <Button size="sm" onClick={() => { setEditing(null); reset({ name: "", description: "" }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> New category
      </Button>
    }>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {categories.map((c) => {
            const count = items.filter((i) => i.categoryId === c.id).length;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.description ?? "—"}</TableCell>
                <TableCell>{count}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); reset({ name: c.name, description: c.description ?? "" }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    if (count > 0) { toast.error("Category is in use"); return; }
                    if (confirm(`Delete category "${c.name}"?`)) { deleteCategory(c.id); toast.success("Category deleted"); }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            if (editing) { updateCategory(editing.id, d); toast.success("Category updated"); }
            else { addCategory(d); toast.success("Category added"); }
            setOpen(false);
          })} className="space-y-3">
            <div><Label>Name</Label><Input required {...register("name")} /></div>
            <div><Label>Description</Label><Textarea rows={2} {...register("description")} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Vendors ---------------- */

function VendorsTab() {
  const { vendors, addVendor, updateVendor, deleteVendor, items } = useInventory();
  const [editing, setEditing] = useState<InventoryVendor | null>(null);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<Omit<InventoryVendor, "id">>();

  return (
    <SectionCard title="Vendors" action={
      <Button size="sm" onClick={() => { setEditing(null); reset({ name: "", contact: "", phone: "", email: "", address: "" }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> New vendor
      </Button>
    }>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Vendor</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead>
          <TableHead>Email</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {vendors.map((v) => {
            const count = items.filter((i) => i.vendorId === v.id).length;
            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.contact}</TableCell>
                <TableCell className="text-sm">{v.phone}</TableCell>
                <TableCell className="text-sm">{v.email ?? "—"}</TableCell>
                <TableCell>{count}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); reset(v); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    if (confirm(`Delete vendor "${v.name}"?`)) { deleteVendor(v.id); toast.success("Vendor deleted"); }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit vendor" : "New vendor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            if (editing) { updateVendor(editing.id, d); toast.success("Vendor updated"); }
            else { addVendor(d); toast.success("Vendor added"); }
            setOpen(false);
          })} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input required {...register("name")} /></div>
            <div><Label>Contact person</Label><Input required {...register("contact")} /></div>
            <div><Label>Phone</Label><Input required {...register("phone")} /></div>
            <div><Label>Email</Label><Input type="email" {...register("email")} /></div>
            <div><Label>Address</Label><Input {...register("address")} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Purchases ---------------- */

function PurchasesTab() {
  const { purchases, items, vendors, addPurchase } = useInventory();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    vendorId: string; itemId: string; qty: number; unitPrice: number; invoiceNo: string; date: string;
  }>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });

  const qty = Number(watch("qty") || 0);
  const price = Number(watch("unitPrice") || 0);

  return (
    <SectionCard title="Purchase entries" action={
      <Button size="sm" onClick={() => {
        reset({ vendorId: vendors[0]?.id ?? "", itemId: items[0]?.id ?? "", qty: 1, unitPrice: 0, invoiceNo: "", date: new Date().toISOString().slice(0, 10) });
        setOpen(true);
      }}>
        <Plus className="h-4 w-4 mr-1" /> Record purchase
      </Button>
    }>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Vendor</TableHead>
          <TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {purchases.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.date}</TableCell>
              <TableCell className="font-medium">{p.invoiceNo}</TableCell>
              <TableCell>{vendors.find((v) => v.id === p.vendorId)?.name ?? "—"}</TableCell>
              <TableCell>{items.find((i) => i.id === p.itemId)?.name ?? "—"}</TableCell>
              <TableCell className="text-right">{p.qty}</TableCell>
              <TableCell className="text-right">{currency(p.unitPrice)}</TableCell>
              <TableCell className="text-right font-semibold">{currency(p.total)}</TableCell>
            </TableRow>
          ))}
          {purchases.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No purchases yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record purchase</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            addPurchase({ ...d, qty: Number(d.qty), unitPrice: Number(d.unitPrice) });
            toast.success("Purchase recorded, stock updated");
            setOpen(false);
          })} className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor</Label>
              <Select value={watch("vendorId")} onValueChange={(v) => setValue("vendorId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item</Label>
              <Select value={watch("itemId")} onValueChange={(v) => setValue("itemId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Invoice No</Label><Input required {...register("invoiceNo")} /></div>
            <div><Label>Date</Label><Input type="date" required {...register("date")} /></div>
            <div><Label>Quantity</Label><Input type="number" min={1} required {...register("qty")} /></div>
            <div><Label>Unit Price (₹)</Label><Input type="number" min={0} step="0.01" required {...register("unitPrice")} /></div>
            <div className="col-span-2 text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{currency(qty * price)}</span></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save purchase</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Stock In/Out ---------------- */

function StockTab() {
  const { movements, items, addMovement } = useInventory();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    itemId: string; type: "in" | "out"; qty: number; reason: string; date: string; note?: string;
  }>({ defaultValues: { type: "in", date: new Date().toISOString().slice(0, 10) } });

  return (
    <SectionCard title="Stock movements" action={
      <Button size="sm" onClick={() => {
        reset({ itemId: items[0]?.id ?? "", type: "in", qty: 1, reason: "", date: new Date().toISOString().slice(0, 10), note: "" });
        setOpen(true);
      }}>
        <Plus className="h-4 w-4 mr-1" /> New movement
      </Button>
    }>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Type</TableHead>
          <TableHead className="text-right">Qty</TableHead><TableHead>Reason</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.date}</TableCell>
              <TableCell>{items.find((i) => i.id === m.itemId)?.name ?? "—"}</TableCell>
              <TableCell>
                {m.type === "in"
                  ? <Badge className="bg-emerald-100 text-emerald-700 gap-1"><ArrowDownToLine className="h-3 w-3" />IN</Badge>
                  : <Badge className="bg-rose-100 text-rose-700 gap-1"><ArrowUpFromLine className="h-3 w-3" />OUT</Badge>}
              </TableCell>
              <TableCell className="text-right font-semibold">{m.qty}</TableCell>
              <TableCell className="text-sm">{m.reason}</TableCell>
            </TableRow>
          ))}
          {movements.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No movements yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New stock movement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            addMovement({ ...d, qty: Number(d.qty) });
            toast.success("Stock updated");
            setOpen(false);
          })} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Item</Label>
              <Select value={watch("itemId")} onValueChange={(v) => setValue("itemId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as "in" | "out")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" min={1} required {...register("qty")} /></div>
            <div><Label>Date</Label><Input type="date" required {...register("date")} /></div>
            <div><Label>Reason</Label><Input required {...register("reason")} placeholder="e.g. Damaged, Adjustment, Return" /></div>
            <div className="col-span-2"><Label>Note</Label><Textarea rows={2} {...register("note")} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save movement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Issues ---------------- */

function IssuesTab() {
  const { issues, items, issueItem, returnItem } = useInventory();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    itemId: string; issuedTo: string; qty: number; date: string; purpose?: string;
  }>({ defaultValues: { date: new Date().toISOString().slice(0, 10) } });

  return (
    <SectionCard title="Item issue &amp; return" action={
      <Button size="sm" onClick={() => {
        reset({ itemId: items[0]?.id ?? "", issuedTo: "", qty: 1, date: new Date().toISOString().slice(0, 10), purpose: "" });
        setOpen(true);
      }}>
        <Plus className="h-4 w-4 mr-1" /> Issue item
      </Button>
    }>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Issued to</TableHead>
          <TableHead className="text-right">Qty</TableHead><TableHead>Purpose</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {issues.map((is) => (
            <TableRow key={is.id}>
              <TableCell>{is.date}</TableCell>
              <TableCell>{items.find((i) => i.id === is.itemId)?.name ?? "—"}</TableCell>
              <TableCell className="font-medium">{is.issuedTo}</TableCell>
              <TableCell className="text-right">{is.qty}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{is.purpose ?? "—"}</TableCell>
              <TableCell>
                {is.returned
                  ? <Badge className="bg-emerald-100 text-emerald-700">Returned {is.returnedDate}</Badge>
                  : <Badge className="bg-amber-100 text-amber-700">Out</Badge>}
              </TableCell>
              <TableCell className="text-right">
                {!is.returned && (
                  <Button size="sm" variant="outline" onClick={() => { returnItem(is.id); toast.success("Item returned"); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {issues.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No issued items.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => {
            issueItem({ ...d, qty: Number(d.qty) });
            toast.success("Item issued");
            setOpen(false);
          })} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Item</Label>
              <Select value={watch("itemId")} onValueChange={(v) => setValue("itemId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Issue to</Label><Input required {...register("issuedTo")} placeholder="Staff / Department" /></div>
            <div><Label>Quantity</Label><Input type="number" min={1} required {...register("qty")} /></div>
            <div><Label>Date</Label><Input type="date" required {...register("date")} /></div>
            <div className="col-span-2"><Label>Purpose</Label><Textarea rows={2} {...register("purpose")} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Issue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

/* ---------------- Alerts ---------------- */

function AlertsTab() {
  const { lowStock, categories, vendors } = useInventory();

  return (
    <SectionCard title="Low stock alerts">
      {lowStock.length === 0 ? (
        <p className="text-sm text-muted-foreground">All items are above minimum stock. 🎉</p>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Min</TableHead>
            <TableHead className="text-right">Shortfall</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lowStock.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell><Badge variant="outline">{categories.find((c) => c.id === i.categoryId)?.name ?? "—"}</Badge></TableCell>
                <TableCell className="text-sm">{vendors.find((v) => v.id === i.vendorId)?.name ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{i.qty} {i.unit}</TableCell>
                <TableCell className="text-right text-muted-foreground">{i.minQty}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">{i.minQty - i.qty} {i.unit}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}
