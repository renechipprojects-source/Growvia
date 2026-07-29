import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KEY = "sunshine.academicYear.v1";

export interface AcademicYearContextType {
  activeYear: string;
  availableYears: string[];
  setActiveYear: (year: string) => void;
}

const DEFAULT_YEARS = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];
const DEFAULT_ACTIVE = "2026-2027";

const Ctx = createContext<AcademicYearContextType | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYearState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_ACTIVE;
    return window.localStorage.getItem(KEY) || DEFAULT_ACTIVE;
  });

  const setActiveYear = useCallback((year: string) => {
    setActiveYearState(year);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, year);
    }
  }, []);

  const value = useMemo(
    () => ({
      activeYear,
      availableYears: DEFAULT_YEARS,
      setActiveYear,
    }),
    [activeYear, setActiveYear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademicYear(): AcademicYearContextType {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAcademicYear must be used inside <AcademicYearProvider>");
  return ctx;
}
