import type { ReactNode } from "react";
import { Search, Plus, Filter, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDataTable } from "../hooks/useDataTable";

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; className?: string };
export type FilterDef<T> = { key: string; label: string; options: string[]; predicate: (row: T, value: string) => boolean };

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  filters?: FilterDef<T>[];
  onAdd?: () => void;
  addLabel?: string;
  pageSize?: number;
  actions?: (row: T) => ReactNode;
}

export function DataTable<T>(props: Props<T>) {
  const { data, columns, rowKey, searchPlaceholder, searchFields, filters, onAdd, addLabel = "Add New", pageSize = 8, actions } = props;
  const dt = useDataTable(data, {
    searchFields,
    filters: filters?.map((f) => ({ key: f.key, predicate: f.predicate })),
    pageSize,
  });
  const pageNums = Array.from({ length: Math.min(dt.totalPages, 5) }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={searchPlaceholder ?? "Search..."} className="pl-9" value={dt.search} onChange={(e) => dt.setSearch(e.target.value)} />
          </div>
          {filters?.map((f) => (
            <Select key={f.key} value={dt.filterVals[f.key] ?? "__all"} onValueChange={(v) => dt.setFilterVal(f.key, v)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder={f.label} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All {f.label}</SelectItem>
                {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />More filters</Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
            {onAdd && <Button size="sm" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{addLabel}</Button>}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs uppercase tracking-wide text-muted-foreground">{c.header}</TableHead>
                  ))}
                  {actions && <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dt.pageRows.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-24 text-center text-sm text-muted-foreground">No results.</TableCell></TableRow>
                ) : dt.pageRows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((c) => <TableCell key={c.key} className={c.className}>{c.cell(row)}</TableCell>)}
                    {actions && <TableCell className="text-right">{actions(row)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Showing {dt.pageRows.length ? (dt.page - 1) * dt.pageSize + 1 : 0}-{(dt.page - 1) * dt.pageSize + dt.pageRows.length} of {dt.total}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); dt.setPage(Math.max(1, dt.page - 1)); }} /></PaginationItem>
                {pageNums.map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={dt.page === p} onClick={(e) => { e.preventDefault(); dt.setPage(p); }}>{p}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); dt.setPage(Math.min(dt.totalPages, dt.page + 1)); }} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
