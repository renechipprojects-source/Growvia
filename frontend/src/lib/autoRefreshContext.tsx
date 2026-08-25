// Centralized Automatic Refresh & Supabase Realtime Engine for Sunshine Play School ERP
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { subscribeToRealtimeTable, TABLE_TO_MODULE_MAP } from "./realtimeService";

export type ERPModule =
  | "students"
  | "staff"
  | "classes"
  | "parents"
  | "admissions"
  | "enquiries"
  | "visits"
  | "fees"
  | "attendance"
  | "circulars"
  | "notifications"
  | "inventory"
  | "expenses"
  | "transport"
  | "reports"
  | "promotion"
  | "assignments"
  | "messages"
  | "homework"
  | "marks"
  | "leaveRequests"
  | "requests"
  | "activities";

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
  const [isFormEditing, setIsFormEditingState] = useState(false);
  const isFormEditingRef = useRef(false);

  const setIsFormEditing = useCallback((editing: boolean) => {
    isFormEditingRef.current = editing;
    setIsFormEditingState(editing);
  }, []);

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

  const triggerModuleRefresh = useCallback((module: ERPModule) => {
    if (isFormEditingRef.current) return; // Never refresh while editing forms
    if (isRefreshingRef.current.get(module)) return; // Prevent duplicate API calls

    const fns = refreshersRef.current.get(module);
    if (!fns || fns.size === 0) return;

    isRefreshingRef.current.set(module, true);

    Promise.all(Array.from(fns).map((fn) => Promise.resolve().then(() => fn())))
      .catch((err) => console.warn(`AutoRefresh error in ${module}:`, err))
      .finally(() => {
        isRefreshingRef.current.set(module, false);
      });
  }, []);

  const triggerAllRefreshes = useCallback(() => {
    if (isFormEditingRef.current) return;
    refreshersRef.current.forEach((_, module) => {
      triggerModuleRefresh(module);
    });
  }, [triggerModuleRefresh]);

  useEffect(() => {
    const handleModuleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const mod = customEvent.detail?.module;
      if (mod) {
        triggerModuleRefresh(mod as ERPModule);
      }
    };

    window.addEventListener("sunshine-module-refresh", handleModuleRefresh);
    return () => {
      window.removeEventListener("sunshine-module-refresh", handleModuleRefresh);
    };
  }, [triggerModuleRefresh]);

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

  // Supabase Realtime Table Subscriptions for Instant Cross-Device Sync
  useEffect(() => {
    const tablesToSubscribe = [
      "gv_users",
      "gv_inventory_expenses",
      "gv_fees_payments",
      "gv_communications",
      "gv_requests",
      "gv_system_settings",
    ];

    const unsubs = tablesToSubscribe.map((table) => {
      return subscribeToRealtimeTable({
        table,
        onPayload: () => {
          const targetModules = TABLE_TO_MODULE_MAP[table] || [];
          targetModules.forEach((mod) => triggerModuleRefresh(mod));
        },
      });
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [triggerModuleRefresh]);

  const value = useMemo<AutoRefreshContextType>(
    () => ({
      registerRefresher,
      triggerModuleRefresh,
      triggerAllRefreshes,
      setFormEditing: setIsFormEditing,
      isFormEditing,
    }),
    [registerRefresher, triggerModuleRefresh, triggerAllRefreshes, isFormEditing]
  );

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
}

const fallbackContext: AutoRefreshContextType = {
  registerRefresher: () => () => {},
  triggerModuleRefresh: () => {},
  triggerAllRefreshes: () => {},
  setFormEditing: () => {},
  isFormEditing: false,
};

export function useAutoRefresh(module?: ERPModule, refreshFn?: () => Promise<void> | void) {
  const ctx = useContext(AutoRefreshContext);

  const refreshFnRef = useRef(refreshFn);
  useEffect(() => {
    refreshFnRef.current = refreshFn;
  });

  useEffect(() => {
    if (module && ctx) {
      const callback = () => {
        if (refreshFnRef.current) {
          return refreshFnRef.current();
        }
      };
      return ctx.registerRefresher(module, callback);
    }
  }, [module, ctx]);

  return ctx || fallbackContext;
}

export function notifyAutoRefresh(module: ERPModule) {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("sunshine-module-refresh", { detail: { module } }));
      window.dispatchEvent(new CustomEvent(`sunshine-auto-refresh-${module}`));
      window.dispatchEvent(new CustomEvent("sunshine-auto-refresh"));
    } catch {}
  }
}
