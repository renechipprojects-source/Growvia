import type { ReactNode } from "react";
import { Search, Filter, Download, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

export function FilterBar({
  searchPlaceholder = "Search...",
  filters,
  onAdd,
  addLabel = "Add New",
  search,
  onSearchChange,
  filterValues,
  onFilterChange,
}: {
  searchPlaceholder?: string;
  filters?: { label: string; options: string[] }[];
  onAdd?: () => void;
  addLabel?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  filterValues?: Record<string, string>;
  onFilterChange?: (label: string, value: string) => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9"
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        {filters?.map((f) => (
          <Select
            key={f.label}
            value={filterValues?.[f.label] ?? "all"}
            onValueChange={(v) => onFilterChange?.(f.label, v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {f.label}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />More filters</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
          {onAdd !== undefined && (
            <Button size="sm" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{addLabel}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DataTable({
  columns,
  children,
  total,
}: {
  columns: string[];
  children: ReactNode;
  total?: number;
}) {
  return (
    <Card className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <div className="text-xs text-muted-foreground">
            {total !== undefined ? `Showing ${total} entries` : ""}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
              <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
              <PaginationItem><PaginationNext href="#" /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}

export { TableCell, TableRow };
