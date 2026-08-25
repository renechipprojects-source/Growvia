import { useState } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { validateIndianMobile } from "@/lib/utils";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable, type Column, type FilterDef } from "../components/DataTable";
import { drivers as initialDrivers } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { Driver } from "../types";

const columns: Column<Driver>[] = [
  { key: "name", header: "Driver Name", cell: (d) => <span className="font-medium">{d.name}</span> },
  { key: "emp", header: "Employee ID", cell: (d) => <span className="font-mono text-xs">{d.employeeId}</span> },
  { key: "mobile", header: "Mobile", cell: (d) => d.mobile },
  { key: "license", header: "License", cell: (d) => <span className="font-mono text-xs">{d.license}</span> },
  { key: "expiry", header: "License Expiry", cell: (d) => shortDate(d.licenseExpiry || "") },
  { key: "vehicle", header: "Vehicle", cell: (d) => <span className="font-mono text-xs">{d.vehicle}</span> },
  { key: "route", header: "Route", cell: (d) => d.route },
  { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
];

const filters: FilterDef<Driver>[] = [
  { key: "status", label: "Status", options: ["Active", "On Leave", "Inactive"], predicate: (r, v) => r.status === v },
];

import { getStoredDrivers, saveStoredDrivers, syncTransportFromSupabase, deleteDriver } from "../transportStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { useEffect, useCallback } from "react";

export function DriversPage({ readOnly }: { readOnly?: boolean }) {
  const [driverList, setDriverList] = useState<Driver[]>(getStoredDrivers);
  const [open, setOpen] = useState(false);

  const loadData = useCallback(() => {
    syncTransportFromSupabase().then(() => {
      setDriverList(getStoredDrivers());
    });
  }, []);

  useAutoRefresh("transport", loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    license: "",
    vehicle: "KA-04-B-1001",
    route: "Route 1",
  });

  const handleOpenAdd = () => {
    setForm({
      name: "",
      mobile: "",
      license: "",
      vehicle: "",
      route: "",
    });
    setOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (isSaving) return;
    const phoneCheck = validateIndianMobile(form.mobile);
    if (!form.name || !phoneCheck.valid) {
      toast.error(phoneCheck.error || "Driver name and a valid 10-digit mobile number are required.");
      return;
    }

    setIsSaving(true);
    try {
      const newDriver: Driver = {
        id: `DRV-${Date.now().toString().slice(-4)}`,
        employeeId: `EMP-${Math.floor(100 + Math.random() * 899)}`,
        name: form.name,
        mobile: phoneCheck.formatted,
        license: form.license || "DL-PENDING",
        licenseExpiry: "2028-12-31",
        vehicle: form.vehicle,
        route: form.route,
        status: "Active",
      };
      const next = [newDriver, ...driverList];
      setDriverList(next);
      saveStoredDrivers(next);
      toast.success(`Driver ${form.name} registered!`);
      setOpen(false);
      setForm({
        name: "",
        mobile: "",
        license: "",
        vehicle: "KA-04-B-1001",
        route: "Route 1",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    const next = driverList.filter((d) => d.id !== id);
    setDriverList(next);
    saveStoredDrivers(next);
    toast.success(`Driver ${name} removed`);
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Drivers & Staff"
        description="Transport drivers, contact information, and assigned bus routes."
        actions={!readOnly ? <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" />Add Driver</Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Drivers" value={driverList.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active" value={driverList.filter((d) => d.status === "Active").length} tone="success" icon={<Users className="h-5 w-5" />} />
        <StatCard label="On Leave" value={driverList.filter((d) => d.status === "On Leave").length} tone="warning" icon={<Users className="h-5 w-5" />} />
        <StatCard label="License Expiring Soon" value={driverList.filter((d) => new Date(d.licenseExpiry || Date.now()) < new Date("2027-01-01")).length} tone="danger" icon={<Users className="h-5 w-5" />} />
      </div>
      <div className="mt-6">
        <DataTable<Driver>
          data={driverList}
          columns={columns}
          rowKey={(d) => d.id}
          searchPlaceholder="Search driver, ID, license..."
          searchFields={["name", "employeeId", "license", "mobile"]}
          filters={filters}
          actions={!readOnly ? (d) => (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id, d.name)} aria-label="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Driver Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Kumar" />
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label>Driving License Number</Label>
              <Input value={form.license} onChange={(e) => setForm((f) => ({ ...f, license: e.target.value }))} placeholder="DL-1420110012345" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned Vehicle</Label>
                <Input value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
              </div>
              <div>
                <Label>Assigned Route</Label>
                <Input value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}