import { supabase } from "@/lib/supabase";
import { notifyAutoRefresh } from "@/lib/supabaseService";
import type { Vehicle, Driver, Route, StudentAllocation } from "./types";

const VEHICLES_KEY = "sunshine.transport.vehicles.v2";
const DRIVERS_KEY = "sunshine.transport.drivers.v2";
const ROUTES_KEY = "sunshine.transport.routes.v2";
const ALLOCATIONS_KEY = "sunshine.transport.allocations.v2";

// ─── SUPABASE DATABASE SYNC ──────────────────────────────────────────────────
export async function syncTransportFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("gv_inventory_expenses")
      .select("*")
      .in("record_type", ["transport_vehicle", "transport_driver", "transport_route", "transport_allocation"]);

    if (error) return;

    const remoteVehicles: Vehicle[] = [];
    const remoteDrivers: Driver[] = [];
    const remoteRoutes: Route[] = [];
    const remoteAllocations: StudentAllocation[] = [];

    (data || []).forEach((d: any) => {
      try {
        const meta = d.notes && (d.notes.startsWith("{") || d.notes.startsWith("[")) ? JSON.parse(d.notes) : {};
        if (d.record_type === "transport_vehicle") {
          remoteVehicles.push({ id: d.id, name: d.title, number: d.supplier_or_paid_to || meta.number || "", capacity: d.quantity || meta.capacity || 30, status: meta.status || "Active" });
        } else if (d.record_type === "transport_driver") {
          remoteDrivers.push({ id: d.id, name: d.title, phone: d.supplier_or_paid_to || meta.phone || "", licenseNo: meta.licenseNo || "", vehicle: meta.vehicle || "", status: meta.status || "Active" });
        } else if (d.record_type === "transport_route") {
          remoteRoutes.push({ id: d.id, name: d.title, vehicle: d.supplier_or_paid_to || meta.vehicle || "", driver: meta.driver || "", students: d.quantity || meta.students || 0, stops: meta.stops || [], status: meta.status || "Active" });
        } else if (d.record_type === "transport_allocation") {
          remoteAllocations.push({ id: d.id, studentId: meta.studentId || d.id, studentName: d.title, className: meta.className || "", section: meta.section || "", routeName: meta.routeName || "", pickupStop: d.supplier_or_paid_to || meta.pickupStop || "", monthlyFee: d.amount_or_unit_cost || meta.monthlyFee || 0, status: meta.status || "Active" });
        }
      } catch {}
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(remoteVehicles));
        localStorage.setItem(DRIVERS_KEY, JSON.stringify(remoteDrivers));
        localStorage.setItem(ROUTES_KEY, JSON.stringify(remoteRoutes));
        localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(remoteAllocations));
        window.dispatchEvent(new CustomEvent("sunshine-transport-update"));
      } catch {}
    }
  } catch {}
}

// ─── VEHICLES ────────────────────────────────────────────────────────────────
export function getStoredVehicles(): Vehicle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredVehicles(list: Vehicle[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("sunshine-transport-update"));
  } catch {}

  notifyAutoRefresh("transport");

  list.forEach((v) => {
    Promise.resolve(supabase.from("gv_inventory_expenses").upsert([{
      id: v.id,
      record_type: "transport_vehicle",
      title: v.name,
      category: "Transport Fleet",
      quantity: v.capacity,
      supplier_or_paid_to: v.number,
      notes: JSON.stringify(v),
      created_by: "Office Staff",
    }], { onConflict: "id" })).catch(() => {});
  });
}

export function deleteVehicle(id: string) {
  const next = getStoredVehicles().filter((v) => v.id !== id);
  saveStoredVehicles(next);
  Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────
export function getStoredDrivers(): Driver[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRIVERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredDrivers(list: Driver[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("sunshine-transport-update"));
  } catch {}

  notifyAutoRefresh("transport");

  list.forEach((d) => {
    Promise.resolve(supabase.from("gv_inventory_expenses").upsert([{
      id: d.id,
      record_type: "transport_driver",
      title: d.name,
      category: "Transport Roster",
      supplier_or_paid_to: d.phone || d.mobile || "",
      notes: JSON.stringify(d),
      created_by: "Office Staff",
    }], { onConflict: "id" })).catch(() => {});
  });
}

export function deleteDriver(id: string) {
  const next = getStoredDrivers().filter((d) => d.id !== id);
  saveStoredDrivers(next);
  Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────
export function getStoredRoutes(): Route[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredRoutes(list: Route[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROUTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("sunshine-transport-update"));
  } catch {}

  notifyAutoRefresh("transport");

  list.forEach((r) => {
    Promise.resolve(supabase.from("gv_inventory_expenses").upsert([{
      id: r.id,
      record_type: "transport_route",
      title: r.name,
      category: "Transport Route",
      amount_or_unit_cost: 1500,
      quantity: r.students,
      supplier_or_paid_to: r.vehicle,
      notes: JSON.stringify(r),
      created_by: "Office Staff",
    }], { onConflict: "id" })).catch(() => {});
  });
}

export function deleteRoute(id: string) {
  const next = getStoredRoutes().filter((r) => r.id !== id);
  saveStoredRoutes(next);
  Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
}

// ─── ALLOCATIONS ─────────────────────────────────────────────────────────────
export function getStoredAllocations(): StudentAllocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALLOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredAllocations(list: StudentAllocation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("sunshine-transport-update"));
  } catch {}

  notifyAutoRefresh("transport");

  list.forEach((a) => {
    Promise.resolve(supabase.from("gv_inventory_expenses").upsert([{
      id: a.id,
      record_type: "transport_allocation",
      title: a.studentName || a.student || "",
      category: "Transport Student Allocation",
      amount_or_unit_cost: a.monthlyFee,
      supplier_or_paid_to: a.pickupStop || a.pickupPoint || "",
      notes: JSON.stringify(a),
      created_by: "Office Staff",
    }], { onConflict: "id" })).catch(() => {});
  });
}

export function deleteAllocation(id: string) {
  const next = getStoredAllocations().filter((a) => a.id !== id);
  saveStoredAllocations(next);
  Promise.resolve(supabase.from("gv_inventory_expenses").delete().eq("id", id)).catch(() => {});
}
