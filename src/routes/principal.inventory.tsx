import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/principal/PageHeader";
import { useInventory } from "@/lib/inventoryContext";
import { useMemo, useState } from "react";
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
import { AlertTriangle, Boxes, PackageSearch, Search } from "lucide-react";

export const Route = createFileRoute("/principal/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory | Principal Portal" },
      { name: "description", content: "Read-only view of school inventory, vendors, purchases and stock movements." },
      { property: "og:title", content: "Inventory | Principal Portal" },
      { property: "og:description", content: "Live inventory visibility for the principal." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { items, categories, vendors, purchases, movements, lowStock } = useInventory();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "-";
  const vendorName = (id?: string) => (id ? vendors.find((v) => v.id === id)?.name ?? "-" : "-");
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q);
      const matchC = categoryId === "all" || i.categoryId === categoryId;
      return matchQ && matchC;
    });
  }, [items, query, categoryId, categories]);

  return (
    <div className="w-full max-w-none flex flex-1 min-h-0 flex-col">
      <PageHeader
        title="Inventory"
        description="Read-only view. Additions and edits are managed by the Office."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <StatCard label="Total Items" value={items.length} icon={Boxes} />
        <StatCard label="Categories" value={categories.length} icon={PackageSearch} />
        <StatCard label="Vendors" value={vendors.length} icon={PackageSearch} />
        <StatCard label="Low Stock" value={lowStock.length} tone="danger" icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="items" className="mt-4 flex-1 min-h-0 flex flex-col">
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

        <TabsContent value="items" className="flex-1 min-h-0 flex flex-col mt-3">
          <div className="flex flex-wrap items-center gap-2 shrink-0 mb-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollTable
            columns={["Item", "Code", "Category", "Unit", "Stock", "Min", "Vendor", "Updated"]}
          >
            {filteredItems.map((i) => {
              const low = i.qty < i.minQty;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.sku}</TableCell>
                  <TableCell><Badge variant="outline">{catName(i.categoryId)}</Badge></TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="font-semibold">
                    <span className={low ? "text-destructive" : ""}>{i.qty}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.minQty}</TableCell>
                  <TableCell>{vendorName(i.vendorId)}</TableCell>
                  <TableCell className="text-xs">{i.updatedAt}</TableCell>
                </TableRow>
              );
            })}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="categories" className="flex-1 min-h-0 flex flex-col mt-3">
          <ScrollTable columns={["Name", "Description"]}>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.description ?? "-"}</TableCell>
              </TableRow>
            ))}
          </ScrollTable>
        </TabsContent>

        <TabsContent value="vendors" className="flex-1 min-h-0 flex flex-col mt-3">
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

        <TabsContent value="purchases" className="flex-1 min-h-0 flex flex-col mt-3">
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

        <TabsContent value="history" className="flex-1 min-h-0 flex flex-col mt-3">
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

        <TabsContent value="alerts" className="flex-1 min-h-0 flex flex-col mt-3">
          {lowStock.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6">All stock levels are healthy.</div>
          ) : (
            <ScrollTable columns={["Item", "Code", "Current", "Minimum", "Vendor"]}>
              {lowStock.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.sku}</TableCell>
                  <TableCell className="text-destructive font-semibold">{i.qty}</TableCell>
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
    <div className="card-elevated p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      }`}>
        <Icon className="w-5 h-5" />
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
    <div className="card-elevated flex-1 min-h-0 flex flex-col overflow-hidden">
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
