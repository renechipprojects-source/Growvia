import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Boxes, PackageSearch, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-primitives";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { InventoryProvider, useInventory } from "@/lib/inventoryContext";

export const Route = createFileRoute("/admin/inventory")({
  component: () => (
    <InventoryProvider>
      <InventoryPage />
    </InventoryProvider>
  ),
  head: () => ({ meta: [{ title: "Inventory — TinySteps ERP" }] }),
});

function InventoryPage() {
  const { items, categories, vendors, purchases, movements, lowStock } = useInventory();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "-";
  const vendorName = (id?: string) => (id ? vendors.find((v) => v.id === id)?.name ?? "-" : "-");
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        catName(i.categoryId).toLowerCase().includes(q);
      const matchC = categoryId === "all" || i.categoryId === categoryId;
      const isLow = i.qty < i.minQty;
      const matchS = statusFilter === "all" || (statusFilter === "low" ? isLow : !isLow);
      return matchQ && matchC && matchS;
    });
  }, [items, query, categoryId, statusFilter, categories]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col">
      <PageHeader
        title="Inventory"
        description="Read-only view. Additions and edits are managed by the Office."
      />

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Items" value={items.length} icon={Boxes} />
        <StatCard label="Categories" value={categories.length} icon={PackageSearch} />
        <StatCard label="Vendors" value={vendors.length} icon={PackageSearch} />
        <StatCard label="Low Stock" value={lowStock.length} tone="danger" icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="items" className="mt-4 flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="alerts">
            Low Stock {lowStock.length > 0 && <Badge variant="destructive" className="ml-2">{lowStock.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items by name, code..."
                className="pl-9"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stock Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Status</SelectItem>
                <SelectItem value="healthy">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollTable columns={["Item", "Code", "Category", "Unit", "Stock", "Min", "Vendor", "Updated"]}>
            {paginatedItems.map((i) => {
              const low = i.qty < i.minQty;
              return (
                <TableRow key={i.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{i.sku}</TableCell>
                  <TableCell><Badge variant="outline">{catName(i.categoryId)}</Badge></TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="font-semibold">
                    <span className={low ? "text-destructive font-bold" : "text-emerald-600"}>{i.qty}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.minQty}</TableCell>
                  <TableCell>{vendorName(i.vendorId)}</TableCell>
                  <TableCell className="text-xs">{i.updatedAt}</TableCell>
                </TableRow>
              );
            })}
          </ScrollTable>
          
          {/* Pagination controls */}
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="text-xs text-muted-foreground">
              Showing {filteredItems.length} items total
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground font-medium">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ScrollTable columns={["Name", "Description"]}>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.description ?? "-"}</TableCell>
              </TableRow>
            ))}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="vendors" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ScrollTable columns={["Vendor", "Contact", "Phone", "Email", "Address"]}>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.contact}</TableCell>
                <TableCell>{v.phone}</TableCell>
                <TableCell className="text-muted-foreground">{v.email ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{v.address ?? "-"}</TableCell>
              </TableRow>
            ))}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="purchases" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ScrollTable columns={["Date", "Invoice", "Vendor", "Item", "Qty", "Unit Price", "Total"]}>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{p.date}</TableCell>
                <TableCell className="font-medium">{p.invoiceNo}</TableCell>
                <TableCell>{vendorName(p.vendorId)}</TableCell>
                <TableCell>{itemName(p.itemId)}</TableCell>
                <TableCell>{p.qty}</TableCell>
                <TableCell>₹{p.unitPrice}</TableCell>
                <TableCell className="font-semibold">₹{p.total}</TableCell>
              </TableRow>
            ))}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="history" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ScrollTable columns={["Date", "Item", "Type", "Qty", "Reason"]}>
            {movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs">{m.date}</TableCell>
                <TableCell className="font-medium">{itemName(m.itemId)}</TableCell>
                <TableCell>
                  <Badge variant={m.type === "in" ? "secondary" : "outline"}>
                    {m.type === "in" ? "Stock In" : "Stock Out"}
                  </Badge>
                </TableCell>
                <TableCell>{m.qty}</TableCell>
                <TableCell className="text-muted-foreground">{m.reason}</TableCell>
              </TableRow>
            ))}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="alerts" className="mt-3 flex min-h-0 flex-1 flex-col">
          {lowStock.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">All stock levels are healthy.</div>
          ) : (
            <ScrollTable columns={["Item", "Code", "Current", "Minimum", "Vendor"]}>
              {lowStock.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.sku}</TableCell>
                  <TableCell className="font-semibold text-destructive">{i.qty}</TableCell>
                  <TableCell>{i.minQty}</TableCell>
                  <TableCell>{vendorName(i.vendorId)}</TableCell>
                </TableRow>
              ))}
            </ScrollTable>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ScrollTable({ columns, children }: { columns: string[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="whitespace-nowrap text-xs uppercase tracking-wide text-muted-foreground">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
    </div>
  );
}
