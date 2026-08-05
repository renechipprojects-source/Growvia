// Centralized Automatic Refresh & Supabase Realtime Engine for Sunshine Play School ERP
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { subscribeToRealtimeTable, TABLE_TO_MODULE_MAP } from "./realtimeService";

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
      return ctx.registerRefresher(module, refreshFn);
    }
  }, [module, refreshFn, ctx]);

  return ctx;
}
