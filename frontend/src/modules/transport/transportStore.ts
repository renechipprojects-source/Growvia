import { supabase } from "@/lib/supabase";
import { vehicles as seedVehicles, drivers as seedDrivers, routes as seedRoutes, allocations as seedAllocations } from "./data/mockData";
import type { Vehicle, Driver, Route, StudentAllocation } from "./types";

const VEHICLES_KEY = "sunshine.transport.vehicles.v1";
const DRIVERS_KEY = "sunshine.transport.drivers.v1";
const ROUTES_KEY = "sunshine.transport.routes.v1";
const ALLOCATIONS_KEY = "sunshine.transport.allocations.v1";

// ─── SUPABASE DATABASE SYNC ──────────────────────────────────────────────────
export async function syncTransportFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("gv_inventory_expenses")
      .select("*")
      .in("record_type", ["transport_vehicle", "transport_driver", "transport_route", "transport_allocation"]);

    if (error || !data || data.length === 0) return;

    const vehicles: Vehicle[] = [];
    const drivers: Driver[] = [];
    const routes: Route[] = [];
    const allocations: StudentAllocation[] = [];

    data.forEach((d: any) => {
      try {
        const meta = d.notes && (d.notes.startsWith("{") || d.notes.startsWith("[")) ? JSON.parse(d.notes) : {};
        if (d.record_type === "transport_vehicle") {
          vehicles.push({ id: d.id, name: d.title, number: d.supplier_or_paid_to || meta.number || "BUS-1", capacity: d.quantity || meta.capacity || 30, status: meta.status || "Active" });
        } else if (d.record_type === "transport_driver") {
          drivers.push({ id: d.id, name: d.title, phone: d.supplier_or_paid_to || meta.phone || "9876543210", licenseNo: meta.licenseNo || "LIC-100", vehicle: meta.vehicle || "BUS-1", status: meta.status || "Active" });
        } else if (d.record_type === "transport_route") {
          routes.push({ id: d.id, name: d.title, vehicle: d.supplier_or_paid_to || meta.vehicle || "BUS-1", driver: meta.driver || "Driver", students: d.quantity || meta.students || 15, stops: meta.stops || ["School", "Main Gate"] });
        } else if (d.record_type === "transport_allocation") {
          allocations.push({ id: d.id, studentId: meta.studentId || d.id, studentName: d.title, className: meta.className || "Nursery", section: meta.section || "A", routeName: meta.routeName || "Route 1", pickupStop: d.supplier_or_paid_to || meta.pickupStop || "Stop 1", monthlyFee: d.amount_or_unit_cost || meta.monthlyFee || 1500, status: meta.status || "Active" });
        }
      } catch {}
    });

    if (vehicles.length > 0) saveStoredVehicles(vehicles);
    if (drivers.length > 0) saveStoredDrivers(drivers);
    if (routes.length > 0) saveStoredRoutes(routes);
    if (allocations.length > 0) saveStoredAllocations(allocations);
  } catch {}
}

// ─── VEHICLES ────────────────────────────────────────────────────────────────
export function getStoredVehicles(): Vehicle[] {
  if (typeof window === "undefined") return seedVehicles;
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    return raw ? JSON.parse(raw) : seedVehicles;
  } catch {
    return seedVehicles;
  }
}

export function saveStoredVehicles(list: Vehicle[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(list));
  } catch {}

  // Sync to Supabase gv_inventory_expenses
  list.forEach((v) => {
    supabase.from("gv_inventory_expenses").upsert([{
      id: v.id,
      record_type: "transport_vehicle",
      title: v.name,
      category: "Transport Fleet",
      quantity: v.capacity,
      supplier_or_paid_to: v.number,
      notes: JSON.stringify(v),
      created_by: "Office Staff",
    }], { onConflict: "id" }).catch(() => {});
  });
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────
export function getStoredDrivers(): Driver[] {
  if (typeof window === "undefined") return seedDrivers;
  try {
    const raw = localStorage.getItem(DRIVERS_KEY);
    return raw ? JSON.parse(raw) : seedDrivers;
  } catch {
    return seedDrivers;
  }
}

export function saveStoredDrivers(list: Driver[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(list));
  } catch {}

  list.forEach((d) => {
    supabase.from("gv_inventory_expenses").upsert([{
      id: d.id,
      record_type: "transport_driver",
      title: d.name,
      category: "Transport Roster",
      supplier_or_paid_to: d.phone,
      notes: JSON.stringify(d),
      created_by: "Office Staff",
    }], { onConflict: "id" }).catch(() => {});
  });
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────
export function getStoredRoutes(): Route[] {
  if (typeof window === "undefined") return seedRoutes;
  try {
    const raw = localStorage.getItem(ROUTES_KEY);
    return raw ? JSON.parse(raw) : seedRoutes;
  } catch {
    return seedRoutes;
  }
}

export function saveStoredRoutes(list: Route[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROUTES_KEY, JSON.stringify(list));
  } catch {}

  list.forEach((r) => {
    supabase.from("gv_inventory_expenses").upsert([{
      id: r.id,
      record_type: "transport_route",
      title: r.name,
      category: "Transport Route",
      amount_or_unit_cost: 1500,
      quantity: r.students,
      supplier_or_paid_to: r.vehicle,
      notes: JSON.stringify(r),
      created_by: "Office Staff",
    }], { onConflict: "id" }).catch(() => {});
  });
}

// ─── ALLOCATIONS ─────────────────────────────────────────────────────────────
export function getStoredAllocations(): StudentAllocation[] {
  if (typeof window === "undefined") return seedAllocations;
  try {
    const raw = localStorage.getItem(ALLOCATIONS_KEY);
    return raw ? JSON.parse(raw) : seedAllocations;
  } catch {
    return seedAllocations;
  }
}

export function saveStoredAllocations(list: StudentAllocation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(list));
  } catch {}

  list.forEach((a) => {
    supabase.from("gv_inventory_expenses").upsert([{
      id: a.id,
      record_type: "transport_allocation",
      title: a.studentName,
      category: "Transport Student Allocation",
      amount_or_unit_cost: a.monthlyFee,
      supplier_or_paid_to: a.pickupStop,
      notes: JSON.stringify(a),
      created_by: "Office Staff",
    }], { onConflict: "id" }).catch(() => {});
  });
}
