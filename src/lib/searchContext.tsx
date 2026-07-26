// Shared per-shell search state so the header search box is functional
// across every module. Pages call useSearchQuery() to read the current
// query and filter their lists.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const value = useMemo(() => ({ query, setQuery }), [query]);
  // Reset the header search when the route changes so old filters
  // don't leak between modules. Effect (not memo) — runs after render.
  useEffect(() => {
    setQuery("");
  }, [pathname]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) return { query: "", setQuery: () => {} };
  return ctx;
}

export function useSearchQuery(): string {
  return useSearch().query;
}

export function matchesSearch(query: string, ...fields: Array<string | number | undefined | null>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f == null ? false : String(f).toLowerCase().includes(q)));
}
