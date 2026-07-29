// Centralized Automatic Refresh Engine for Sunshine Play School ERP
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export type ERPModule =
  | "students"
  | "staff"
  | "admissions"
  | "fees"
  | "attendance"
  | "circulars"
  | "notifications"
  | "inventory"
  | "transport"
  | "reports"
  | "promotion"
  | "assignments"
  | "messages"
  | "leaveRequests";

interface AutoRefreshContextType {
  registerRefresher: (module: ERPModule, fn: () => Promise<void> | void) => () => void;
  triggerModuleRefresh: (module: ERPModule) => void;
  triggerAllRefreshes: () => void;
  setFormEditing: (editing: boolean) => void;
  isFormEditing: boolean;
}

const AutoRefreshContext = createContext<AutoRefreshContextType | null>(null);

export function AutoRefreshProvider({ children }: { children: React.ReactNode }) {
  const refreshersRef = useRef<Map<ERPModule, Set<() => Promise<void> | void>>>(new Map());
  const [isFormEditing, setIsFormEditing] = useState(false);
  const isRefreshingRef = useRef<Map<ERPModule, boolean>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const registerRefresher = useCallback((module: ERPModule, fn: () => Promise<void> | void) => {
    if (!refreshersRef.current.has(module)) {
      refreshersRef.current.set(module, new Set());
    }
    refreshersRef.current.get(module)!.add(fn);

    return () => {
      const set = refreshersRef.current.get(module);
      if (set) {
        set.delete(fn);
        if (set.size === 0) refreshersRef.current.delete(module);
      }
    };
  }, []);

  const triggerModuleRefresh = useCallback(
    (module: ERPModule) => {
      if (isFormEditing) return; // Never refresh while editing forms
      if (isRefreshingRef.current.get(module)) return; // Prevent duplicate API calls

      const fns = refreshersRef.current.get(module);
      if (!fns || fns.size === 0) return;

      isRefreshingRef.current.set(module, true);

      Promise.all(Array.from(fns).map((fn) => Promise.resolve(fn())))
        .catch((err) => console.warn(`AutoRefresh error in ${module}:`, err))
        .finally(() => {
          isRefreshingRef.current.set(module, false);
        });
    },
    [isFormEditing]
  );

  const triggerAllRefreshes = useCallback(() => {
    if (isFormEditing) return;
    refreshersRef.current.forEach((_, module) => {
      triggerModuleRefresh(module);
    });
  }, [isFormEditing, triggerModuleRefresh]);

  // Window Focus & Tab Visibility Event Listeners
  useEffect(() => {
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          triggerAllRefreshes();
        }, 300);
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [triggerAllRefreshes]);

  return (
    <AutoRefreshContext.Provider
      value={{
        registerRefresher,
        triggerModuleRefresh,
        triggerAllRefreshes,
        setFormEditing: setIsFormEditing,
        isFormEditing,
      }}
    >
      {children}
    </AutoRefreshContext.Provider>
  );
}

export function useAutoRefresh(module?: ERPModule, refreshFn?: () => Promise<void> | void) {
  const ctx = useContext(AutoRefreshContext);
  if (!ctx) {
    throw new Error("useAutoRefresh must be used within an AutoRefreshProvider");
  }

  useEffect(() => {
    if (module && refreshFn) {
      const unregister = ctx.registerRefresher(module, refreshFn);
      // Auto-trigger on initial registration (route change)
      ctx.triggerModuleRefresh(module);
      return unregister;
    }
  }, [module, refreshFn, ctx]);

  return ctx;
}
