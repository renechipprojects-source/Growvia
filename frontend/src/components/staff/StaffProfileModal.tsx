import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, Briefcase, ShieldCheck, AlertCircle, CheckCircle2, Lock, Save, Loader2 } from "lucide-react";
import { fetchStaffProfile, saveStaffProfile, type StaffProfile } from "@/lib/staffProfileService";
import { validatePhoneNumber, normalizePhoneNumber } from "@/lib/utils";
import { getSession } from "@/lib/auth";

interface StaffProfileModalProps {
  open: boolean;
  onClose: () => void;
  staffId?: string;
  readOnly?: boolean;
  onProfileUpdated?: (updated: StaffProfile) => void;
}

export function StaffProfileModal({ open, onClose, staffId, readOnly = false, onProfileUpdated }: StaffProfileModalProps) {
  const currentSession = getSession();
  const targetId = staffId || currentSession?.linkId || currentSession?.loginId || currentSession?.email || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<StaffProfile>>({});
  const [phoneErrors, setPhoneErrors] = useState<{ mobile?: string; alternate_phone?: string; emergency_phone?: string }>({});

  useEffect(() => {
    if (!open || !targetId) return;
    setLoading(true);
    fetchStaffProfile(targetId).then((res) => {
      if (res) {
        setProfile(res);
        setForm(res);
      } else {
        const fallback: Partial<StaffProfile> = {
          id: targetId,
          login_id: currentSession?.loginId || targetId,
          email: currentSession?.email || (targetId.includes("@") ? targetId : `${targetId.toLowerCase()}@growvia.edu`),
          full_name: currentSession?.name || "Staff Member",
          role: currentSession?.role || "teacher",
          mobile: "",
          gender: "Male",
          blood_group: "O+",
          employment_type: "Full-Time",
          department: "Academic",
        };
        setProfile(fallback as any);
        setForm(fallback);
      }
      setLoading(false);
    });
  }, [open, targetId]);

  const handlePhoneBlur = (field: "mobile" | "alternate_phone" | "emergency_phone", val: string, required: boolean) => {
    if (!val && !required) {
      setPhoneErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }
    const check = validatePhoneNumber(val, required);
    if (!check.valid) {
      setPhoneErrors((prev) => ({ ...prev, [field]: check.error }));
    } else {
      setPhoneErrors((prev) => ({ ...prev, [field]: undefined }));
      setForm((f) => ({ ...f, [field]: check.normalized }));
    }
  };

  const isCompleted = Boolean(profile?.profile_completed);
  // Authoritative One-Time Lock: Once completed, normal staff users can view, but only authorized admins or initial setup can edit
  const isEditingLocked = isCompleted && !readOnly && currentSession?.role !== "super-admin" && currentSession?.role !== "admin";
  const effectiveReadOnly = readOnly || isEditingLocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveReadOnly) return;

    // Validate phone numbers before submission
    const pCheck = validatePhoneNumber(form.mobile || "", true);
    if (!pCheck.valid) {
      setPhoneErrors((prev) => ({ ...prev, mobile: pCheck.error }));
      toast.error(pCheck.error || "Enter a valid 10-digit primary phone number.");
      return;
    }

    if (form.alternate_phone) {
      const altCheck = validatePhoneNumber(form.alternate_phone, false);
      if (!altCheck.valid) {
        setPhoneErrors((prev) => ({ ...prev, alternate_phone: altCheck.error }));
        toast.error(`Alternate Phone: ${altCheck.error}`);
        return;
      }
    }

    if (form.emergency_phone) {
      const emCheck = validatePhoneNumber(form.emergency_phone, false);
      if (!emCheck.valid) {
        setPhoneErrors((prev) => ({ ...prev, emergency_phone: emCheck.error }));
        toast.error(`Emergency Phone: ${emCheck.error}`);
        return;
      }
    }

    setSaving(true);
    const res = await saveStaffProfile({
      ...form,
      id: profile?.id || targetId,
      mobile: pCheck.normalized,
    });

    setSaving(false);
    if (res.success && res.data) {
      toast.success("Staff profile completed & saved authoritatively to Supabase!");
      setProfile(res.data);
      setForm(res.data);
      if (onProfileUpdated) onProfileUpdated(res.data);
      onClose();
    } else {
      toast.error(res.error || "Failed to save staff profile.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {effectiveReadOnly ? "Authoritative Staff Details" : isCompleted ? "Update Staff Profile" : "Complete Staff Profile"}
              </DialogTitle>
              <DialogDescription>
                Authoritative single-source-of-truth profile stored in Supabase.
              </DialogDescription>
            </div>
            {isCompleted ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Profile Authoritative & Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1 shrink-0">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Action Required: Complete Profile
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Loading staff profile from Supabase...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {isEditingLocked && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                This profile is completed and locked as authoritative information. Changes require administrative privileges.
              </div>
            )}

            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-2xl">
                <TabsTrigger value="identity" className="rounded-xl text-xs sm:text-sm">Identity</TabsTrigger>
                <TabsTrigger value="contact" className="rounded-xl text-xs sm:text-sm">Contact</TabsTrigger>
                <TabsTrigger value="emergency" className="rounded-xl text-xs sm:text-sm">Emergency</TabsTrigger>
                <TabsTrigger value="employment" className="rounded-xl text-xs sm:text-sm">Employment</TabsTrigger>
              </TabsList>

              {/* 1. IDENTITY TAB */}
              <TabsContent value="identity" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.full_name || ""}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="e.g. Dr. Ananya Sharma"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Profile Photo URL</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.photo_url || ""}
                      onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      type="date"
                      value={form.date_of_birth || ""}
                      onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select
                      disabled={effectiveReadOnly}
                      value={form.gender || "Male"}
                      onValueChange={(v) => setForm({ ...form, gender: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Blood Group</Label>
                    <Select
                      disabled={effectiveReadOnly}
                      value={form.blood_group || "O+"}
                      onValueChange={(v) => setForm({ ...form, blood_group: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* 2. CONTACT TAB */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email Address (Primary Login ID) *
                    </Label>
                    <Input
                      disabled={effectiveReadOnly || Boolean(profile?.email)}
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="teacher@sunshine.edu"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">Serves as the primary email-based login identity.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Primary Phone (10 Digits) *
                    </Label>
                    <Input
                      disabled={effectiveReadOnly}
                      maxLength={10}
                      value={form.mobile || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm({ ...form, mobile: val });
                      }}
                      onBlur={(e) => handlePhoneBlur("mobile", e.target.value, true)}
                      placeholder="9876543210"
                      className={phoneErrors.mobile ? "border-destructive focus-visible:ring-destructive" : ""}
                      required
                    />
                    {phoneErrors.mobile && <p className="text-[11px] text-destructive font-medium">{phoneErrors.mobile}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Alternate Phone (10 Digits)
                    </Label>
                    <Input
                      disabled={effectiveReadOnly}
                      maxLength={10}
                      value={form.alternate_phone || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm({ ...form, alternate_phone: val });
                      }}
                      onBlur={(e) => handlePhoneBlur("alternate_phone", e.target.value, false)}
                      placeholder="9876543211"
                      className={phoneErrors.alternate_phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {phoneErrors.alternate_phone && <p className="text-[11px] text-destructive font-medium">{phoneErrors.alternate_phone}</p>}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Street Address
                    </Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="House/Flat No., Street, Colony"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">City</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.city || ""}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Hyderabad"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">State / PIN Code</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        disabled={effectiveReadOnly}
                        value={form.state || ""}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        placeholder="Telangana"
                      />
                      <Input
                        disabled={effectiveReadOnly}
                        value={form.pincode || ""}
                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                        placeholder="500001"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 3. EMERGENCY CONTACT TAB */}
              <TabsContent value="emergency" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Emergency Contact Person Name</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.emergency_contact_name || ""}
                      onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                      placeholder="e.g. Suresh Sharma"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Relationship</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.emergency_contact_relation || ""}
                      onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })}
                      placeholder="Spouse / Parent / Sibling"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Emergency Contact Phone (10 Digits)</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      maxLength={10}
                      value={form.emergency_phone || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm({ ...form, emergency_phone: val });
                      }}
                      onBlur={(e) => handlePhoneBlur("emergency_phone", e.target.value, false)}
                      placeholder="9876543212"
                      className={phoneErrors.emergency_phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {phoneErrors.emergency_phone && <p className="text-[11px] text-destructive font-medium">{phoneErrors.emergency_phone}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* 4. EMPLOYMENT TAB */}
              <TabsContent value="employment" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Employee ID</Label>
                    <Input
                      disabled
                      value={form.employee_id || form.id || ""}
                      className="bg-slate-100 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">System Role</Label>
                    <Input
                      disabled
                      value={(form.role || "teacher").toUpperCase()}
                      className="bg-slate-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Designation</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.designation || ""}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="Senior Primary Teacher"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Department</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.department || ""}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Academics / Early Childhood"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Highest Qualification</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.qualification || ""}
                      onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                      placeholder="M.Sc. Education, B.Ed."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Specialization</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      value={form.specialization || ""}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      placeholder="Mathematics / English Phonetics"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Years of Experience</Label>
                    <Input
                      disabled={effectiveReadOnly}
                      type="number"
                      min={0}
                      max={50}
                      value={form.experience ?? 0}
                      onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Employment Type</Label>
                    <Select
                      disabled={effectiveReadOnly}
                      value={form.employment_type || "Full-Time"}
                      onValueChange={(v) => setForm({ ...form, employment_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-4 border-t gap-3">
              <Button variant="outline" type="button" onClick={onClose} rounded-full>
                {effectiveReadOnly ? "Close" : "Cancel"}
              </Button>
              {!effectiveReadOnly && (
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Authoritative Profile
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
