import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDeveloperSettings } from "./developerSettingsStore";

const KEY = "sunshine.academicYear.v1";

export interface AcademicYearContextType {
  activeYear: string;
  availableYears: string[];
  setActiveYear: (year: string) => void;
}

const Ctx = createContext<AcademicYearContextType | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { settings } = useDeveloperSettings();
  const devActiveYear = settings.school?.academicYear || settings.system?.academicYear || "2026-2027";

  const [activeYearState, setActiveYearState] = useState<string>(() => {
    if (typeof window === "undefined") return devActiveYear;
    return window.localStorage.getItem(KEY) || devActiveYear;
  });

  // Keep activeYear synced with Developer Console settings when settings change
  useEffect(() => {
    if (devActiveYear) {
      setActiveYearState(devActiveYear);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, devActiveYear);
      }
    }
  }, [devActiveYear]);

  const setActiveYear = useCallback((year: string) => {
    setActiveYearState(year);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, year);
    }
  }, []);

  // Compute available sessions dynamically around the active year
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add("2024-2025");
    years.add("2025-2026");
    years.add("2026-2027");
    years.add("2027-2028");
    if (activeYearState) years.add(activeYearState);
    if (devActiveYear) years.add(devActiveYear);

    // Also offer next session for promotion
    const match = (activeYearState || devActiveYear).match(/^(\d{4})[-–](\d{4})$/);
    if (match) {
      const start = parseInt(match[1], 10);
      const nextStart = start + 1;
      const nextEnd = start + 2;
      years.add(`${nextStart}-${nextEnd}`);
    }

    return Array.from(years).sort();
  }, [activeYearState, devActiveYear]);

  const value = useMemo(
    () => ({
      activeYear: activeYearState || devActiveYear,
      availableYears,
      setActiveYear,
    }),
    [activeYearState, devActiveYear, availableYears, setActiveYear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademicYear(): AcademicYearContextType {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback if accessed outside provider
    return {
      activeYear: "2026-2027",
      availableYears: ["2024-2025", "2025-2026", "2026-2027", "2027-2028"],
      setActiveYear: () => {},
    };
  }
  return ctx;
}
