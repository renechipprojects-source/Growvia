import { useMemo, useState } from "react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchQuery } from "@/lib/searchContext";

export function DataTable<T>({
  data, columns, searchKey, searchPlaceholder = "Search…", fillParent = false,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  /** When true, table fills its parent and only the tbody scrolls internally. */
  fillParent?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const globalQuery = useSearchQuery();
  const activeQuery = (globalQuery || filter).trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!activeQuery) return data;
    return data.filter((row) => {
      if (searchKey) {
        if (String((row as any)[searchKey] ?? "").toLowerCase().includes(activeQuery)) return true;
      }
      // Fallback: search across all string/number fields
      return Object.values(row as any).some((v) =>
        typeof v === "string" || typeof v === "number"
          ? String(v).toLowerCase().includes(activeQuery)
          : false,
      );
    });
  }, [data, activeQuery, searchKey]);


  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: fillParent ? 25 : 8 } },
  });

  return (
    <div className={cn("w-full max-w-none flex flex-col gap-3", fillParent && "h-full min-h-0")}>
      {searchKey && (
        <div className="relative max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-white/70 border-white/70"
          />
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl border border-white/60 bg-white/70 backdrop-blur",
          fillParent ? "flex-1 min-h-0 overflow-hidden flex flex-col" : "overflow-hidden",
        )}
      >
        <div className={cn(fillParent ? "flex-1 min-h-0 overflow-auto" : "overflow-x-auto")}>
          <table className="w-full text-sm">
            <thead className={cn("bg-white/80 text-left", fillParent && "sticky top-0 z-10 backdrop-blur")}>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="px-4 py-3 font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-white/60 hover:bg-white/60">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <div>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
