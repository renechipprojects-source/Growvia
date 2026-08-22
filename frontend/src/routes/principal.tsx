import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PrincipalSidebar } from "@/components/principal/Sidebar";
import { PrincipalHeader } from "@/components/principal/Header";
import { InventoryProvider } from "@/lib/inventoryContext";
import { getSession } from "@/lib/auth";

const titleMap: Record<string, string> = {
  "/principal/dashboard": "Dashboard",
  "/principal/students": "Students Directory",
  "/principal/parents": "Parents Directory",
  "/principal/teachers": "Teachers & Staff",
  "/principal/classes": "Classes Overview",
  "/principal/attendance/students": "Student Attendance",
  "/principal/attendance/staff": "Staff Attendance",
  "/principal/circulars": "Circular Management",
  "/principal/inventory": "Live Inventory",
  "/principal/transport": "Transport Fleet",
  "/principal/fees": "Fees Overview",
  "/principal/expenses": "Operating Expenses",
  "/principal/school-branding": "School Branding",
  "/principal/events": "School Events",
  "/principal/messages": "Message Center",
};

import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/principal")({
  beforeLoad: async () => {
    await requireAuthGuard("principal");
  },
  component: PrincipalLayout,
});

function PrincipalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleMap[pathname] ?? "Principal Portal";

  return (
    <InventoryProvider>
      <div className="principal-shell h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/20 to-indigo-50/20">
        <PrincipalSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <PrincipalHeader onMenu={() => setMobileOpen(true)} title={title} />
          <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 lg:p-8 w-full max-w-none">
            <Outlet />
          </main>
        </div>
      </div>
    </InventoryProvider>
  );
}
