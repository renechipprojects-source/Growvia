import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { healthAlerts as initialAlerts } from "../data/mockData";
import { shortDate } from "../utils/format";
import type { HealthAlert } from "../types";
import { NotificationService } from "@/lib/notifications";

const groups: HealthAlert["category"][] = ["Allergy", "Chronic Disease", "Emergency Note", "Special Care"];
const KEY = "sunshine.health.alerts.v1";

export function HealthAlertsPage() {
  const [alerts, setAlerts] = useState<HealthAlert[]>(() => {
    if (typeof window === "undefined") return initialAlerts;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : initialAlerts;
    } catch {
      return initialAlerts;
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<HealthAlert, "id">>({
    student: "",
    category: "Allergy",
    detail: "",
    severity: "Critical",
    updated: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(KEY, JSON.stringify(alerts));
      } catch {}
    }
  }, [alerts]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student.trim()) return toast.error("Student name required");
    if (!form.detail.trim()) return toast.error("Alert details required");

    const newAlert: HealthAlert = {
      ...form,
      id: "AL-" + Date.now().toString().slice(-4),
      updated: new Date().toISOString().slice(0, 10),
    };

    setAlerts((prev) => [newAlert, ...prev]);

    // Dispatch real-time health alert notification across portals
    NotificationService.healthAlert(form.student, form.detail);

    toast.success(`Health alert created for ${form.student}!`);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this health alert?")) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Health alert removed");
    }
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Health Alerts"
        description="Allergies, chronic diseases, emergency notes and special care flags."
        actions={
          <Button onClick={() => setOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-full">
            <Plus className="mr-2 h-4 w-4" /> New Health Alert
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Alerts" value={alerts.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Critical" value={alerts.filter((a) => a.severity === "Critical").length} tone="danger" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Monitoring" value={alerts.filter((a) => a.severity === "Monitoring").length} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Resolved" value={alerts.filter((a) => a.severity === "Resolved").length} tone="success" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const items = alerts.filter((a) => a.category === g);
          return (
            <Card key={g} className="rounded-2xl shadow-sm border-slate-200/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{g}</CardTitle>
                <StatusBadge status={g} />
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 && <div className="text-sm text-muted-foreground py-2">No active alerts in this category.</div>}
                {items.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800">{a.student}</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.severity} />
                        <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-rose-600 p-1" title="Delete alert">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 font-medium">{a.detail}</div>
                    <div className="text-xs text-slate-400">Updated {shortDate(a.updated)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Health &amp; Medical Alert</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Student Name</Label>
              <Input required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="e.g. Kiara Patel" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as HealthAlert["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Allergy">Allergy</SelectItem>
                    <SelectItem value="Chronic Disease">Chronic Disease</SelectItem>
                    <SelectItem value="Emergency Note">Emergency Note</SelectItem>
                    <SelectItem value="Special Care">Special Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as HealthAlert["severity"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Monitoring">Monitoring</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Alert Details</Label>
              <Input required value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="e.g. Severe peanut allergy — EpiPen in nurse room" />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-600 text-white">Broadcast Alert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
