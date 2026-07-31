import { useMemo, useState } from "react";

export function useDataTable<T>(data: T[], opts: {
  searchFields?: (keyof T)[];
  filters?: { key: string; predicate: (row: T, value: string) => boolean }[];
  pageSize?: number;
}) {
  const { searchFields, filters, pageSize = 8 } = opts;
  const [search, setSearch] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let out = data;
    if (search && searchFields?.length) {
      const q = search.toLowerCase();
      out = out.filter((r) => searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
    }
    filters?.forEach((f) => {
      const v = filterVals[f.key];
      if (v && v !== "__all") out = out.filter((r) => f.predicate(r, v));
    });
    return out;
  }, [data, search, searchFields, filters, filterVals]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, totalPages);
  const pageRows = filtered.slice((cur - 1) * pageSize, cur * pageSize);

  return {
    search, setSearch: (v: string) => { setSearch(v); setPage(1); },
    filterVals, setFilterVal: (k: string, v: string) => { setFilterVals((p) => ({ ...p, [k]: v })); setPage(1); },
    page: cur, setPage, totalPages, pageRows, total: filtered.length, pageSize,
  };
}
