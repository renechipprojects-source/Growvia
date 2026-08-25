import { useState, useEffect, useCallback, useMemo } from "react";
import { GraduationCap, Search, Bus, CheckCircle2, XCircle, Pencil, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { currency } from "../utils/format";
import { fetchStudents, type Student } from "@/lib/supabaseService";
import { getStoredAllocations, saveStoredAllocations, syncTransportFromSupabase, getStoredRoutes } from "../transportStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export interface StudentTransportAllocationItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  rollNo?: number;
  parentName?: string;
  phone?: string;
  transportOpted: "Yes" | "No";
  transportMode: "One Way" | "Two Way";
  direction: "Pickup" | "Drop" | "Both";
  routeName: string;
  pickupStop: string;
  dropStop: string;
  monthlyFee: number;
  status: "Active" | "Inactive";
}

export function StudentAllocationPage({ readOnly }: { readOnly?: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [allocations, setAllocations] = useState<StudentTransportAllocationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"all" | "pickup" | "drop" | "unallocated">("all");

  // Edit / Allocation Modal State
  const [editingItem, setEditingItem] = useState<StudentTransportAllocationItem | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal Form State
  const [formOpted, setFormOpted] = useState<"Yes" | "No">("Yes");
  const [formMode, setFormMode] = useState<"One Way" | "Two Way">("Two Way");
  const [formDirection, setFormDirection] = useState<"Pickup" | "Drop" | "Both">("Both");
  const [formRoute, setFormRoute] = useState<string>("");
  const [formPickupStop, setFormPickupStop] = useState<string>("");
  const [formDropStop, setFormDropStop] = useState<string>("");
  const [formFee, setFormFee] = useState<number>(1500);

  const loadAllData = useCallback(() => {
    setLoading(true);
    Promise.all([fetchStudents(), syncTransportFromSupabase()]).then(([studentsRes]) => {
      const studentList = studentsRes.data || [];
      setStudents(studentList);

      const rawAlloc = getStoredAllocations();
      const routes = getStoredRoutes();
      const routeNames = routes.map((r) => r.name).filter(Boolean);
      setAvailableRoutes(routeNames);

      // Map allocations dynamically from real students and real allocations
      const mappedList: StudentTransportAllocationItem[] = studentList.map((s) => {
        const match = rawAlloc.find(
          (a: any) => a.studentId === s.id || a.id === s.id || (a.studentName || a.student || "").toLowerCase() === s.name.toLowerCase()
        );

        if (match) {
          const opted = match.transportOpted || match.transport_required || "Yes";
          const mode = match.transportMode || match.transport_mode || (match.direction === "Pickup" || match.direction === "Drop" || match.transport_direction === "Pickup" || match.transport_direction === "Drop" ? "One Way" : "Two Way");
          const dir = match.direction || match.transport_direction || (mode === "One Way" ? "Pickup" : "Both");
          return {
            id: match.id || `ALC-${s.id}`,
            studentId: s.id,
            studentName: s.name,
            className: s.className || "Unassigned",
            section: s.section || "A",
            rollNo: s.rollNo,
            parentName: typeof s.parent === "object" ? (s.parent as any)?.name : s.parent,
            phone: s.phone,
            transportOpted: opted,
            transportMode: mode,
            direction: dir,
            routeName: match.routeName || match.route || "",
            pickupStop: match.pickupStop || match.pickupPoint || "",
            dropStop: match.dropStop || match.dropPoint || "",
            monthlyFee: Number(match.monthlyFee || 0),
            status: match.status || "Active",
          };
        } else {
          return {
            id: `ALC-${s.id}`,
            studentId: s.id,
            studentName: s.name,
            className: s.className || "Unassigned",
            section: s.section || "A",
            rollNo: s.rollNo,
            parentName: typeof s.parent === "object" ? (s.parent as any)?.name : s.parent,
            phone: s.phone,
            transportOpted: "No",
            transportMode: "Two Way",
            direction: "Both",
            routeName: "",
            pickupStop: "",
            dropStop: "",
            monthlyFee: 0,
            status: "Inactive",
          };
        }
      });

      setAllocations(mappedList);
      setLoading(false);
    });
  }, []);

  useAutoRefresh("transport", loadAllData);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Edit Click
  const handleOpenEdit = (item: StudentTransportAllocationItem) => {
    setEditingItem(item);
    setFormOpted(item.transportOpted);
    setFormMode(item.transportMode || "Two Way");
    setFormDirection(item.direction || (item.transportMode === "One Way" ? "Pickup" : "Both"));
    setFormRoute(item.routeName || availableRoutes[0] || "");
    setFormPickupStop(item.pickupStop || "");
    setFormDropStop(item.dropStop || "");
    setFormFee(item.monthlyFee || (item.transportOpted === "Yes" ? 1500 : 0));
    setOpenModal(true);
  };

  // Save Allocation
  const handleSaveAllocation = () => {
    if (!editingItem || isSaving) return;
    setIsSaving(true);

    try {
      const updatedDir = formOpted === "No" ? "Both" : formMode === "Two Way" ? "Both" : formDirection;

      const updatedItem: StudentTransportAllocationItem = {
        ...editingItem,
        transportOpted: formOpted,
        transportMode: formOpted === "No" ? "Two Way" : formMode,
        direction: updatedDir,
        routeName: formOpted === "No" ? "" : formRoute,
        pickupStop: formOpted === "No" ? "" : formPickupStop,
        dropStop: formOpted === "No" ? "" : formDropStop,
        monthlyFee: formOpted === "No" ? 0 : Number(formFee),
        status: formOpted === "Yes" ? "Active" : "Inactive",
      };

      const nextAllocations = allocations.map((a) => (a.studentId === editingItem.studentId ? updatedItem : a));
      setAllocations(nextAllocations);

      // Persist opted transport allocations to Supabase / LocalStore
      const activeAllocations = nextAllocations.filter((a) => a.transportOpted === "Yes");
      saveStoredAllocations(activeAllocations as any);

      toast.success(`Updated transport settings for ${editingItem.studentName}`);
      setOpenModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered List Logic
  const filteredList = useMemo(() => {
    return allocations.filter((item) => {
      // 1. Text Search Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchId = item.studentId.toLowerCase().includes(q);
        const matchParent = (item.parentName || "").toLowerCase().includes(q);
        const matchRoute = item.routeName.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchParent && !matchRoute) return false;
      }

      // 2. Class Filter
      if (selectedClass !== "all" && item.className.toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }

      // 3. Section Filter
      if (selectedSection !== "all" && item.section.toLowerCase() !== selectedSection.toLowerCase()) {
        return false;
      }

      // 4. Transport Opted (Yes/No) and Direction Logic:
      if (viewTab === "unallocated") {
        return item.transportOpted === "No";
      }

      // For "all", "pickup", "drop", student MUST have Transport = Yes
      if (item.transportOpted !== "Yes") return false;

      if (viewTab === "pickup") {
        return item.direction === "Pickup" || item.direction === "Both" || item.transportMode === "Two Way";
      }

      if (viewTab === "drop") {
        return item.direction === "Drop" || item.direction === "Both" || item.transportMode === "Two Way";
      }

      return true;
    });
  }, [allocations, search, selectedClass, selectedSection, viewTab]);

  // Class List Options
  const classOptions = useMemo(() => {
    return Array.from(new Set(allocations.map((a) => a.className))).filter(Boolean).sort();
  }, [allocations]);

  // Active Allocations Count
  const totalOptedCount = allocations.filter((a) => a.transportOpted === "Yes").length;
  const pickupCount = allocations.filter((a) => a.transportOpted === "Yes" && (a.direction === "Pickup" || a.direction === "Both" || a.transportMode === "Two Way")).length;
  const dropCount = allocations.filter((a) => a.transportOpted === "Yes" && (a.direction === "Drop" || a.direction === "Both" || a.transportMode === "Two Way")).length;
  const totalRevenue = allocations.filter((a) => a.transportOpted === "Yes").reduce((sum, a) => sum + (a.monthlyFee || 0), 0);

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Student Transport Allocation"
        subtitle="Manage student bus assignments, pickup/drop directions, and monthly transport fees."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Opted Transport (Yes)" value={totalOptedCount} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Pickup List (Home → School)" value={pickupCount} tone="info" icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Drop List (School → Home)" value={dropCount} tone="warning" icon={<Bus className="h-5 w-5" />} />
        <StatCard label="Monthly Transport Revenue" value={currency(totalRevenue)} tone="success" icon={<GraduationCap className="h-5 w-5" />} />
      </div>

      {/* Filter and View Controls */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Direction View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Active ({totalOptedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("pickup")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewTab === "pickup" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pickup ({pickupCount})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("drop")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewTab === "drop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Drop ({dropCount})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("unallocated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewTab === "unallocated" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No Transport ({allocations.length - totalOptedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student name, ID, parent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Class:</span>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Section:</span>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="h-8 w-24 text-xs rounded-lg">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
                <SelectItem value="D">Section D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Student Allocations Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
            <span className="text-sm">Loading student transport roster...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-1">
            <Bus className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            {allocations.length === 0 ? (
              <>
                <p className="font-semibold text-slate-700">No Student Records Found</p>
                <p className="text-xs text-slate-400">No registered students exist in the system for transport allocation.</p>
              </>
            ) : totalOptedCount === 0 && viewTab !== "unallocated" ? (
              <>
                <p className="font-semibold text-slate-700">No Active Transport Allocations</p>
                <p className="text-xs text-slate-400">No students have opted for transport yet. Click "No Transport" tab to view all students and edit allocation.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-700">No Matching Transport Allocations</p>
                <p className="text-xs text-slate-400">Try clearing your search query or adjusting class/section filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 uppercase text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Class & Sec</th>
                  <th className="px-4 py-3">Transport Opted</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Pickup / Drop Stop</th>
                  <th className="px-4 py-3">Monthly Fee</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.studentName}</div>
                      <div className="text-[11px] text-slate-400">{item.studentId} {item.parentName ? `· ${item.parentName}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.className} - {item.section}
                    </td>
                    <td className="px-4 py-3">
                      {item.transportOpted === "Yes" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Yes</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.transportOpted === "Yes" ? (
                        <Badge variant="outline" className={item.transportMode === "One Way" ? "border-amber-300 text-amber-800 bg-amber-50" : "border-blue-300 text-blue-800 bg-blue-50"}>
                          {item.transportMode}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.transportOpted === "Yes" ? (
                        item.transportMode === "One Way" ? (
                          <span className="font-semibold text-amber-700 flex items-center gap-1">
                            {item.direction === "Pickup" ? "Pickup (Home → School)" : "Drop (School → Home)"}
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-700 flex items-center gap-1">
                            Two Way (Pickup & Drop)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.transportOpted === "Yes" && item.routeName ? item.routeName : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.transportOpted === "Yes" && (item.pickupStop || item.dropStop) ? (
                        <div className="text-[11px]">
                          {item.pickupStop && <div><span className="text-slate-400">Pickup:</span> {item.pickupStop}</div>}
                          {item.dropStop && <div><span className="text-slate-400">Drop:</span> {item.dropStop}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {item.transportOpted === "Yes" ? currency(item.monthlyFee) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 text-xs px-2.5 rounded-lg"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit Transport
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Transport Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Edit Transport Allocation</DialogTitle>
            <DialogDescription>
              Update transport settings for {editingItem?.studentName} ({editingItem?.className}-{editingItem?.section})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Transport Opted (Yes / No) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Opt for School Transport?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formOpted === "Yes" ? "default" : "outline"}
                  onClick={() => setFormOpted("Yes")}
                  className={formOpted === "Yes" ? "bg-pink-600 text-white" : ""}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Yes (Opted)
                </Button>
                <Button
                  type="button"
                  variant={formOpted === "No" ? "default" : "outline"}
                  onClick={() => setFormOpted("No")}
                  className={formOpted === "No" ? "bg-slate-700 text-white" : ""}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  No (Not Opted)
                </Button>
              </div>
            </div>

            {formOpted === "Yes" && (
              <>
                {availableRoutes.length === 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>No Routes Configured:</strong> No bus routes exist in the system yet. Please configure routes under "Bus Routes" first.
                    </div>
                  </div>
                )}

                {/* Transport Mode (One Way / Two Way) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-semibold">Transport Mode</Label>
                  <Select
                    value={formMode}
                    onValueChange={(val: "One Way" | "Two Way") => {
                      setFormMode(val);
                      if (val === "Two Way") setFormDirection("Both");
                      else if (formDirection === "Both") setFormDirection("Pickup");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="One Way">One Way (Single Direction)</SelectItem>
                      <SelectItem value="Two Way">Two Way (Pickup & Drop)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Direction Selection (Required for One Way) */}
                {formMode === "One Way" && (
                  <div className="space-y-1.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
                    <Label className="text-xs font-semibold text-amber-900">Required Direction (One Way)</Label>
                    <Select
                      value={formDirection}
                      onValueChange={(val: "Pickup" | "Drop") => setFormDirection(val)}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pickup">Pickup Only (Home → School)</SelectItem>
                        <SelectItem value="Drop">Drop Only (School → Home)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Route Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bus Route</Label>
                  {availableRoutes.length > 0 ? (
                    <Select value={formRoute} onValueChange={setFormRoute}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue placeholder="Select a route..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoutes.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formRoute}
                      onChange={(e) => setFormRoute(e.target.value)}
                      placeholder="Enter route name..."
                      className="h-9 text-xs rounded-xl"
                    />
                  )}
                </div>

                {/* Pickup & Drop Stops */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pickup Stop</Label>
                    <Input
                      value={formPickupStop}
                      onChange={(e) => setFormPickupStop(e.target.value)}
                      placeholder="e.g. Stop 3 / Home"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Drop Stop</Label>
                    <Input
                      value={formDropStop}
                      onChange={(e) => setFormDropStop(e.target.value)}
                      placeholder="e.g. Main Gate"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Monthly Transport Fee */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Monthly Transport Fee (₹)</Label>
                  <Input
                    type="number"
                    value={formFee}
                    onChange={(e) => setFormFee(Number(e.target.value))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSaveAllocation} disabled={isSaving} className="bg-pink-600 hover:bg-pink-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Transport Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}