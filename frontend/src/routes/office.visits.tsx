import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/admin/page-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, Plus, CheckCircle2, Clock, Search, Sparkles, UserCheck, MapPin } from "lucide-react";
import { useEnquiries } from "@/lib/enquiryContext";
import type { Enquiry } from "@/lib/mockData";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { toast } from "sonner";
import { validateIndianMobile } from "@/lib/utils";

export const Route = createFileRoute("/office/visits")({
  component: VisitsPage,
  head: () => ({
    meta: [
      { title: "Today's School Visits — Office Portal" },
      { name: "description", content: "Track, schedule and record prospective parent school campus visits." },
    ],
  }),
});

function VisitsPage() {
  const { enquiries, addEnquiry, updateStatus } = useEnquiries();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Schedule Visit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVisit, setNewVisit] = useState({
    parentName: "",
    childName: "",
    phone: "",
    interestedClass: "Playgroup",
    visitDate: new Date().toISOString().slice(0, 10),
    visitTime: "10:30 AM",
    notes: "",
  });

  const { triggerModuleRefresh } = useAutoRefresh();

  useAutoRefresh("visits", () => triggerModuleRefresh("enquiries"));
  useAutoRefresh("enquiries", () => triggerModuleRefresh("visits"));

  // All visits: includes scheduled, completed, and enquiries
  const visitsList = useMemo(() => {
    return enquiries.filter((e) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "scheduled") return e.status === "Visit Scheduled" || e.status === "New";
      if (statusFilter === "completed") return e.status === "Visit Completed";
      return true;
    });
  }, [enquiries, statusFilter]);

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visitsList.filter((v) => {
      if (!q) return true;
      return (
        v.parentName.toLowerCase().includes(q) ||
        v.childName.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.interestedClass.toLowerCase().includes(q)
      );
    });
  }, [visitsList, search]);

  const scheduledCount = enquiries.filter((e) => e.status === "Visit Scheduled" || e.status === "New").length;
  const completedCount = enquiries.filter((e) => e.status === "Visit Completed").length;

  const handleMarkCompleted = (id: string, childName: string) => {
    updateStatus(id, "Visit Completed");
    triggerModuleRefresh("enquiries");
    toast.success(`Marked visit completed for ${childName}`);
  };

  const handleScheduleVisit = () => {
    const phoneCheck = validateIndianMobile(newVisit.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error || "Please enter a valid 10-digit mobile number.");
      return;
    }

    addEnquiry({
      parentName: newVisit.parentName.trim(),
      childName: newVisit.childName.trim(),
      phone: phoneCheck.formatted,
      interestedClass: newVisit.interestedClass,
      status: "Visit Scheduled",
      source: "Campus Walk-in",
      notes: `Scheduled visit on ${newVisit.visitDate} at ${newVisit.visitTime}. ${newVisit.notes}`,
    });

    triggerModuleRefresh("enquiries");
    toast.success(`Visit scheduled for ${newVisit.childName} on ${newVisit.visitDate} at ${newVisit.visitTime}`);
    setIsModalOpen(false);
    setNewVisit({
      parentName: "",
      childName: "",
      phone: "",
      interestedClass: "Playgroup",
      visitDate: new Date().toISOString().slice(0, 10),
      visitTime: "10:30 AM",
      notes: "",
    });
  };

  return (
    <div className="space-y-4 w-full max-w-none">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Today's School Visits"
          description="Schedule, track, and record prospective parent campus tours and visits."
        />
        <Button onClick={() => setIsModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-medium shadow">
          <Plus className="mr-1.5 h-4 w-4" /> Schedule Campus Visit
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4 shadow-sm">
          <div className="text-xs uppercase font-medium text-sky-600">Total Scheduled</div>
          <div className="text-2xl font-bold text-sky-900 mt-1">{scheduledCount}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="text-xs uppercase font-medium text-emerald-600">Completed Visits</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{completedCount}</div>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-sm">
          <div className="text-xs uppercase font-medium text-indigo-600">Total Enquiries</div>
          <div className="text-2xl font-bold text-indigo-900 mt-1">{enquiries.length}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="text-xs uppercase font-medium text-amber-600">Completion Rate</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {enquiries.length ? Math.round((completedCount / (scheduledCount + completedCount || 1)) * 100) : 100}%
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-elevated p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search visit by child name, parent, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visits & Enquiries</SelectItem>
            <SelectItem value="scheduled">Scheduled Visits</SelectItem>
            <SelectItem value="completed">Completed Visits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visits Cards Grid */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((e, i) => {
            const isCompleted = e.status === "Visit Completed";
            const timeSlot = ["10:30 AM", "11:15 AM", "12:00 PM", "03:30 PM", "04:15 PM"][i % 5];

            return (
              <div
                key={e.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                  isCompleted ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-slate-200 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-slate-900">{e.childName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Parent: <span className="font-semibold text-slate-700">{e.parentName}</span></div>
                    </div>
                    <Badge className={isCompleted ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-sky-100 text-sky-800 border-sky-200"}>
                      {e.status}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Class Interest:</span>
                      <span className="font-semibold text-indigo-700">{e.interestedClass}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Time Slot:</span>
                      <span className="font-mono text-slate-800 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-600" /> {timeSlot}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <a href={`tel:${e.phone}`} className="font-mono text-sky-600 hover:underline flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3" /> {e.phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between gap-2">
                  {!isCompleted ? (
                    <Button
                      size="sm"
                      onClick={() => handleMarkCompleted(e.id, e.childName)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Visit Completed
                    </Button>
                  ) : (
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 mx-auto">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Visit Completed & Verified
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredVisits.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
              No visits found. Click <span className="font-semibold text-sky-600">Schedule Campus Visit</span> above to record a new prospective parent visit.
            </div>
          )}
        </div>
      </div>

      {/* Schedule New Visit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Campus Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Parent / Guardian Name *</label>
              <Input
                value={newVisit.parentName}
                onChange={(e) => setNewVisit({ ...newVisit, parentName: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Child Name *</label>
              <Input
                value={newVisit.childName}
                onChange={(e) => setNewVisit({ ...newVisit, childName: e.target.value })}
                placeholder="e.g. Aarav Sharma"
                className="mt-1 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Phone Number</label>
                <Input
                  maxLength={10}
                  value={newVisit.phone}
                  onChange={(e) => setNewVisit({ ...newVisit, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="9876543210"
                  placeholder="e.g. 9876543210"
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Interested Class</label>
                <Select
                  value={newVisit.interestedClass}
                  onValueChange={(val) => setNewVisit({ ...newVisit, interestedClass: val })}
                >
                  <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Playgroup">Playgroup</SelectItem>
                    <SelectItem value="Nursery">Nursery</SelectItem>
                    <SelectItem value="LKG">LKG</SelectItem>
                    <SelectItem value="UKG">UKG</SelectItem>
                    <SelectItem value="Grade 1">Grade 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Visit Date</label>
                <Input
                  type="date"
                  value={newVisit.visitDate}
                  onChange={(e) => setNewVisit({ ...newVisit, visitDate: e.target.value })}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Visit Time Slot</label>
                <Select
                  value={newVisit.visitTime}
                  onValueChange={(val) => setNewVisit({ ...newVisit, visitTime: val })}
                >
                  <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                    <SelectItem value="11:15 AM">11:15 AM</SelectItem>
                    <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                    <SelectItem value="03:30 PM">03:30 PM</SelectItem>
                    <SelectItem value="04:15 PM">04:15 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleVisit} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow">
              Save & Schedule Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

