import { useState, type ReactNode } from "react";
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
  onExport,
  hideExport = false,
}: {
  searchPlaceholder?: string;
  filters?: { label: string; options: string[] }[];
  onAdd?: () => void;
  addLabel?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  filterValues?: Record<string, string>;
  onFilterChange?: (label: string, value: string) => void;
  onExport?: () => void;
  hideExport?: boolean;
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
        <div className="ml-auto flex items-center gap-2">
          {!hideExport && (
            <Button variant="outline" size="sm" onClick={onExport} aria-label="Export Data">
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
          )}
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
  pageSize = 15,
  hidePagination = false,
}: {
  columns: string[];
  children: ReactNode;
  total?: number;
  pageSize?: number;
  hidePagination?: boolean;
}) {
  const [page, setPage] = useState(1);
  const childrenArray = Array.isArray(children) ? children.flat() : children ? [children] : [];
  const realTotal = total ?? childrenArray.length;
  const totalPages = Math.ceil(childrenArray.length / pageSize) || 1;
  const paginatedChildren = hidePagination
    ? childrenArray
    : childrenArray.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card className="mt-4 flex w-full max-w-none flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto max-h-[58vh] sm:max-h-[62vh]">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap py-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {paginatedChildren.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                    No matching records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedChildren
              )}
            </TableBody>
          </Table>
        </div>
        {!hidePagination && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-card/50">
            <div className="text-xs font-medium text-muted-foreground">
              Showing {childrenArray.length} {childrenArray.length === 1 ? "entry" : "entries"} total
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { TableCell, TableRow };
