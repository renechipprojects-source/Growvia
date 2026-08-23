import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, GraduationCap, FileText, Save, Loader2, Paperclip, CheckCircle2, AlertCircle } from "lucide-react";
import { updateStudent, fetchFees, saveFeeRecord, recalculateFeeLedger, type Student } from "@/lib/supabaseService";
import { useStudentDocs, DEFAULT_DOCS, type DocEntry } from "@/lib/studentDocsContext";
import { validateIndianMobile } from "@/lib/utils";
import { fetchMasterClassesFromSupabase } from "@/lib/masterClassesStore";

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onUpdated?: () => void;
}

export function EditStudentModal({ open, onClose, student, onUpdated }: EditStudentModalProps) {
  const { get, upsert: upsertDocs, addMedicalCertificate } = useStudentDocs();

  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);
  const [sectionList] = useState<string[]>(["A", "B", "C", "D"]);

  // Form State
  const [form, setForm] = useState<{
    name: string;
    className: string;
    section: string;
    rollNo: number;
    parent: string;
    phone: string;
    email: string;
    address: string;
    dob: string;
    gender: "Boy" | "Girl";
    house: string;
    feeStatus: "Pending" | "Partial" | "Paid";
    feePlan: string;
    feeAmount: number;
  }>({
    name: "",
    className: "Nursery",
    section: "A",
    rollNo: 1,
    parent: "",
    phone: "",
    email: "",
    address: "",
    dob: "",
    gender: "Boy",
    house: "Red",
    feeStatus: "Pending",
    feePlan: "Standard",
    feeAmount: 15000,
  });

  // Documents State
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [newCertName, setNewCertName] = useState("");

  useEffect(() => {
    fetchMasterClassesFromSupabase().then((res) => {
      if (res && res.length > 0) {
        const names = Array.from(new Set(res.map((c) => c.name)));
        setClassList(names);
      } else {
        setClassList(["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"]);
      }
    });
  }, []);

  useEffect(() => {
    if (!open || !student) return;

    setForm({
      name: student.name || "",
      className: student.className || "Nursery",
      section: student.section || "A",
      rollNo: Number(student.rollNo || 1),
      parent: typeof student.parent === "object" ? (student.parent as any)?.name : student.parent || "",
      phone: student.phone || "",
      email: student.email || "",
      address: student.address || "",
      dob: student.dob || (student as any).dateOfBirth || "",
      gender: student.gender === "Girl" ? "Girl" : "Boy",
      house: student.house || "Red",
      feeStatus: (student.feeStatus as any) || "Pending",
      feePlan: (student as any).feePlan || "Standard",
      feeAmount: Number((student as any).feeAmount || 15000),
    });

    // Fetch existing fee schedule to populate exact authoritative fee amount
    fetchFees(student.id).then(({ data }) => {
      if (data && data.length > 0) {
        const ledger = data[0];
        setForm((prev) => ({
          ...prev,
          feePlan: (ledger as any).feeType || prev.feePlan,
          feeAmount: ledger.originalFee || prev.feeAmount,
        }));
      }
    });

    // Load existing certificate submissions
    const existingDocRecord = get(student.admissionNo || student.id);
    if (existingDocRecord && existingDocRecord.documents && existingDocRecord.documents.length > 0) {
      setDocs(existingDocRecord.documents);
    } else {
      setDocs(
        DEFAULT_DOCS.map((name) => ({
          name,
          status: "Pending",
        }))
      );
    }
  }, [open, student, get]);

  if (!student) return null;

  const toggleDoc = (docName: string, checked: boolean) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.name === docName
          ? {
              ...d,
              status: checked ? "Submitted" : "Pending",
              submittedOn: checked ? new Date().toISOString().slice(0, 10) : undefined,
            }
          : d
      )
    );
  };

  const handleAddCustomCert = () => {
    if (!newCertName.trim()) return;
    const certTitle = newCertName.trim();
    if (docs.some((d) => d.name.toLowerCase() === certTitle.toLowerCase())) {
      toast.error("This certificate is already listed.");
      return;
    }
    setDocs((prev) => [
      ...prev,
      {
        name: certTitle,
        status: "Submitted",
        submittedOn: new Date().toISOString().slice(0, 10),
      },
    ]);
    setNewCertName("");
    toast.success(`Attached custom certificate: ${certTitle}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Student full name is required.");
    if (!form.parent.trim()) return toast.error("Parent / Guardian name is required.");

    const phoneCheck = validateIndianMobile(form.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error || "Please enter a valid 10-digit primary contact phone number.");
      return;
    }

    try {
      setSaving(true);

      // 1. Authoritatively update student record in Supabase (gv_users)
      const res = await updateStudent(student.id, {
        name: form.name.trim(),
        className: form.className as any,
        section: form.section as any,
        rollNo: Number(form.rollNo),
        parent: form.parent.trim(),
        phone: phoneCheck.formatted,
        email: form.email.trim().toLowerCase(),
        address: form.address.trim(),
        dob: form.dob,
        gender: form.gender as any,
        house: form.house as any,
        feeStatus: form.feeStatus as any,
      });

      if (res.error) {
        toast.error(`Database Error: ${res.error}`);
        setSaving(false);
        return;
      }

      // 2. Authoritatively update Fee Schedule in Supabase (gv_fees_payments)
      const { data: feeData } = await fetchFees(student.id);
      const existingLedger = feeData && feeData.length > 0 ? feeData[0] : null;
      const updatedLedger = recalculateFeeLedger({
        ...(existingLedger || {
          id: `FS-${student.id}`,
          studentId: student.id,
          studentName: form.name.trim(),
          admissionNo: student.admissionNo || student.id,
          className: form.className,
          section: form.section,
        }),
        feeType: form.feePlan,
        originalFee: Number(form.feeAmount || 0),
        studentName: form.name.trim(),
        className: form.className,
        section: form.section,
      });
      await saveFeeRecord(updatedLedger);

      // 3. Authoritatively update Certificate Submissions in Supabase (gv_requests)
      const admNo = student.admissionNo || student.id;
      upsertDocs(admNo, form.name.trim(), docs);

      setSaving(false);
      toast.success(`Authoritative updates saved for ${form.name}!`);

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setSaving(false);
      toast.error("Failed to update student: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                Edit Student Details & Certificate Submissions
              </DialogTitle>
              <DialogDescription>
                Editing existing authoritative record for <span className="font-bold text-slate-800">{student.name}</span> ({student.admissionNo || student.id}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl">
              <TabsTrigger value="details" className="rounded-xl text-xs sm:text-sm font-semibold">
                <User className="h-4 w-4 mr-1.5" /> Student & Parent Profile
              </TabsTrigger>
              <TabsTrigger value="certificates" className="rounded-xl text-xs sm:text-sm font-semibold">
                <FileText className="h-4 w-4 mr-1.5" /> Certificate Submissions ({docs.filter((d) => d.status === "Submitted").length}/{docs.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: STUDENT & PARENT PROFILE */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-indigo-600" /> Academic & Personal Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ananya Sen"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assigned Class *</Label>
                    <Select value={form.className} onValueChange={(v) => setForm({ ...form, className: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {classList.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Section & Roll No</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sectionList.map((sec) => (
                            <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={form.rollNo}
                        onChange={(e) => setForm({ ...form, rollNo: Number(e.target.value) })}
                        placeholder="Roll #"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select value={form.gender} onValueChange={(v: "Boy" | "Girl") => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boy">Boy</SelectItem>
                        <SelectItem value="Girl">Girl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">House / Group</Label>
                    <Select value={form.house} onValueChange={(v) => setForm({ ...form, house: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Red", "Blue", "Green", "Yellow"].map((h) => (
                          <SelectItem key={h} value={h}>{h} House</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Fee Plan Category</Label>
                    <Select value={form.feePlan} onValueChange={(v) => setForm({ ...form, feePlan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Standard", "Sibling Discount", "Scholarship", "Custom"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Authoritative Total Fee Amount (₹) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={form.feeAmount}
                      onChange={(e) => setForm({ ...form, feeAmount: Number(e.target.value) })}
                      className="font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Fee Status</Label>
                    <Select value={form.feeStatus} onValueChange={(v: any) => setForm({ ...form, feeStatus: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Partial">Partial</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-4 w-4 text-sky-600" /> Parent & Contact Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Parent / Guardian Full Name *</Label>
                    <Input
                      value={form.parent}
                      onChange={(e) => setForm({ ...form, parent: e.target.value })}
                      placeholder="e.g. Ramesh Sen"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Primary Contact Phone (10 Digits) *</Label>
                    <Input
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="9876543210"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Parent Email Address</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="parent@gmail.com"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Residential Address</Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="House/Flat No., Street, City, State"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CERTIFICATE SUBMISSIONS */}
            <TabsContent value="certificates" className="space-y-4 mt-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600" /> Certificate Checklist & Verification
                  </div>
                  <Badge variant="outline" className="bg-white text-xs font-semibold">
                    {docs.filter((d) => d.status === "Submitted").length} of {docs.length} Verified
                  </Badge>
                </div>

                <div className="space-y-2.5 pt-1">
                  {docs.map((d) => {
                    const isDone = d.status === "Submitted";
                    return (
                      <div
                        key={d.name}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isDone ? "bg-emerald-50/70 border-emerald-200" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`cert-${d.name}`}
                            checked={isDone}
                            onCheckedChange={(checked) => toggleDoc(d.name, Boolean(checked))}
                          />
                          <label htmlFor={`cert-${d.name}`} className="cursor-pointer text-xs font-semibold text-slate-800">
                            {d.name}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Submitted {d.submittedOn ? `(${d.submittedOn})` : ""}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-600" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Certificate */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                <Label className="text-xs font-semibold">Add / Attach Additional Certificate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newCertName}
                    onChange={(e) => setNewCertName(e.target.value)}
                    placeholder="e.g. Migration Certificate, Caste Certificate"
                    className="bg-white text-xs"
                  />
                  <Button type="button" onClick={handleAddCustomCert} variant="outline" className="shrink-0 rounded-xl text-xs">
                    <Paperclip className="h-3.5 w-3.5 mr-1" /> Attach Certificate
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between pt-4 border-t gap-3">
            <Button variant="outline" type="button" onClick={onClose} rounded-full>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Authoritative Details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
