import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { fetchTeachers, createTeacher, updateTeacher, type Teacher } from "@/lib/supabaseService";
import {
  listTeacherCredentials,
  getTeacherCredential,
  generateTeacherCredential,
  resetTeacherPassword,
  setTeacherStatus,
  subscribeCredentials,
  suggestTeacherLoginId,
} from "@/lib/credentials";
import { printableSlip } from "@/routes/office.parent-credentials";
import { validateIndianMobile } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, KeyRound, Printer, RefreshCw, Search, ShieldCheck, ShieldOff, UserPlus, Copy, Check, Camera, Upload, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/office/teacher-credentials")({
  head: () => ({
    meta: [
      { title: "Teacher Login Accounts — Sunshine ERP" },
      { name: "description", content: "Generate, reset, activate, and deactivate teacher login accounts." },
      { property: "og:title", content: "Teacher Login Accounts — Sunshine ERP" },
      { property: "og:description", content: "Office Staff tool to manage teacher accounts." },
    ],
  }),
  component: TeacherCredentialsPage,
});

function TeacherCredentialsPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeCredentials(() => setTick((n) => n + 1)), []);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const loadTeachersList = () => {
    fetchTeachers().then(({ data }) => {
      setTeachers(data || []);
    });
  };

  useEffect(() => {
    loadTeachersList();
  }, []);

  useAutoRefresh("staff", loadTeachersList);

  const [query, setQuery] = useState("");

  // Edit Staff Photo Modal State
  const [editingStaff, setEditingStaff] = useState<Teacher | null>(null);
  const [staffPhotoPreview, setStaffPhotoPreview] = useState<string>("");
  const [isSavingStaffPhoto, setIsSavingStaffPhoto] = useState(false);

  const handleStaffPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      setStaffPhotoPreview(rawDataUrl); // Set instant preview so save works right away!

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setStaffPhotoPreview(compressedDataUrl);
        } catch {}
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStaffPhoto = async () => {
    if (!editingStaff) {
      toast.error("No staff member selected.");
      return;
    }
    if (!staffPhotoPreview) {
      toast.error("Please select a local staff image file first.");
      return;
    }
    try {
      setIsSavingStaffPhoto(true);
      await updateTeacher(editingStaff.id, { avatar: staffPhotoPreview });
      toast.success(`Staff photo saved successfully for ${editingStaff.name}!`);
      setEditingStaff(null);
      setStaffPhotoPreview("");
      loadTeachersList();
    } catch (err: any) {
      toast.error("Failed to save staff photo: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingStaffPhoto(false);
    }
  };
  const [filter, setFilter] = useState<"all" | "issued" | "not_issued" | "inactive">("all");
  const [genFor, setGenFor] = useState<string | null>(null);
  const [viewFor, setViewFor] = useState<string | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers
      .map((t) => ({ teacher: t, cred: getTeacherCredential(t.id) }))
      .filter(({ teacher, cred }) => {
        if (filter === "issued" && !cred) return false;
        if (filter === "not_issued" && cred) return false;
        if (filter === "inactive" && cred?.status !== "Inactive") return false;
        if (!q) return true;
        return [teacher.name, teacher.id, teacher.subject, teacher.className, cred?.loginId]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
  }, [teachers, query, filter, tick]);

  const handleAddStaff = (newTeacher: Teacher) => {
    setTeachers((prev) => [newTeacher, ...prev]);
    generateTeacherCredential(newTeacher.id, { teacher: newTeacher });
    Promise.resolve(createTeacher(newTeacher)).catch(() => {});
    toast.success(`Staff ${newTeacher.name} added & login credentials created!`);
    setViewFor(newTeacher.id);
  };

  const allCreds = listTeacherCredentials();
  const active = allCreds.filter((c) => c.status === "Active").length;
  const inactive = allCreds.filter((c) => c.status === "Inactive").length;
  const notIssued = Math.max(0, teachers.length - allCreds.length);

  return (
    <div>
      <PageHeader
        title="Teacher & Staff Login Accounts"
        subtitle="Generate, reset, activate or deactivate teacher logins. Add new staff to issue accounts instantly."
        action={
          <Button onClick={() => setAddStaffOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full shadow-lg">
            <UserPlus className="h-4 w-4 mr-2" /> Add Staff / Teacher
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total teachers" value={teachers.length} tone="from-sky-500 to-blue-500" />
        <StatCard label="Active logins" value={active} tone="from-emerald-500 to-green-500" />
        <StatCard label="Inactive" value={inactive} tone="from-amber-500 to-orange-500" />
        <StatCard label="Not issued" value={notIssued} tone="from-rose-500 to-pink-500" />
      </div>

      <SectionCard title="Teachers">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, employee ID, subject…"
              className="pl-9 bg-white/70"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px] bg-white/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teachers</SelectItem>
              <SelectItem value="issued">Login issued</SelectItem>
              <SelectItem value="not_issued">Not issued</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-auto rounded-2xl border border-white/60">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Teacher</th>
                <th className="px-3 py-2 font-medium">Employee ID</th>
                <th className="px-3 py-2 font-medium">Class / Subject</th>
                <th className="px-3 py-2 font-medium">Login ID</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ teacher, cred }) => (
                <tr key={teacher.id} className="border-t border-white/60 hover:bg-white/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative group/avatar">
                        <img src={teacher.avatar} className="h-8 w-8 rounded-full bg-white object-cover border shadow-sm" alt="" />
                        <button
                          onClick={() => {
                            setEditingStaff(teacher);
                            setStaffPhotoPreview(teacher.avatar || "");
                          }}
                          title="Edit Staff Photo"
                          className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow text-[8px] transition-transform hover:scale-110"
                        >
                          <Camera className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-xs text-muted-foreground">{teacher.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{teacher.id}</td>
                  <td className="px-3 py-2 text-xs">{teacher.className} · {teacher.subject}</td>
                  <td className="px-3 py-2 font-mono text-xs">{cred?.loginId ?? "—"}</td>
                  <td className="px-3 py-2">
                    {cred ? (
                      <Badge className={cred.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                        {cred.status}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not issued</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-indigo-600 hover:text-indigo-800"
                        onClick={() => {
                          setEditingStaff(teacher);
                          setStaffPhotoPreview(teacher.avatar || "");
                        }}
                      >
                        <Camera className="h-3.5 w-3.5 mr-1" /> Photo
                      </Button>
                      {!cred ? (
                        <Button size="sm" onClick={() => setGenFor(teacher.id)} className="h-8 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-full">
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Generate
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setViewFor(teacher.id)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => {
                            const next = cred.status === "Active" ? "Inactive" : "Active";
                            setTeacherStatus(teacher.id, next);
                            toast.success(`Login ${next.toLowerCase()}`);
                          }}>
                            {cred.status === "Active" ? <><ShieldOff className="h-3.5 w-3.5 mr-1" /> Deactivate</> : <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Activate</>}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-8">No teachers match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Office Edit Staff Photo Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Staff Profile Photo — {editingStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
              <AvatarImage src={staffPhotoPreview} className="object-cover" />
              <AvatarFallback className="text-xl font-bold bg-indigo-100 text-indigo-700">
                {editingStaff?.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Upload new staff photo from local device</Label>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Select an image file (JPG, PNG, WEBP). This change will update live across all portals for this staff member.
              </p>
            </div>
            <input
              type="file"
              id="office-edit-staff-photo"
              accept="image/*"
              className="hidden"
              onChange={handleStaffPhotoSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("office-edit-staff-photo")?.click()}
              className="bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Select Local Image File
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
            <Button onClick={handleSaveStaffPhoto} disabled={isSavingStaffPhoto} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow">
              {isSavingStaffPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving Photo...
                </>
              ) : (
                "Save Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AddStaffDialog open={addStaffOpen} onClose={() => setAddStaffOpen(false)} onAdd={handleAddStaff} />
      <GenerateDialog teacherId={genFor} teachersList={teachers} onClose={() => setGenFor(null)} onDone={(id) => { setGenFor(null); setViewFor(id); }} />
      <ViewDialog teacherId={viewFor} teachersList={teachers} onClose={() => setViewFor(null)} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tone} text-white p-4 shadow-lg`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function GenerateDialog({ teacherId, teachersList, onClose, onDone }: { teacherId: string | null; teachersList: Teacher[]; onClose: () => void; onDone: (id: string) => void }) {
  const teacher = teacherId ? teachersList.find((t) => t.id === teacherId) : undefined;
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [custom, setCustom] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (teacher) {
      setMode("auto");
      setCustom("");
      setPassword(generatePassword());
    }
  }, [teacher]);

  if (!teacher) return null;

  const previewId = mode === "custom" ? (custom.trim() || suggestTeacherLoginId(teacher)) : suggestTeacherLoginId(teacher);

  return (
    <Dialog open={!!teacherId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate teacher login</DialogTitle>
          <DialogDescription>{teacher.name} · {teacher.id} · {teacher.className}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Login ID</div>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Employee ID ({suggestTeacherLoginId(teacher)})</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "custom" && (
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. PRIYA.T" className="bg-white" />
          )}

          {/* Editable Password Field */}
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>Password (Editable)</span>
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-normal"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate Random
              </button>
            </div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type custom password"
              className="bg-white font-mono"
            />
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Preview Summary</div>
            <div className="mt-1 font-mono text-xs">Login ID: <span className="font-bold text-slate-900">{previewId}</span></div>
            <div className="mt-0.5 font-mono text-xs">Password: <span className="font-bold text-slate-900">{password}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button
            onClick={() => {
              if (!password.trim()) {
                toast.error("Password cannot be empty");
                return;
              }
              generateTeacherCredential(teacher.id, {
                customLoginId: mode === "custom" ? custom : undefined,
                password: password.trim(),
                teacher,
              });
              toast.success(`Login issued for ${teacher.name}`);
              onDone(teacher.id);
            }}
            className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white"
          >
            Generate credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ teacherId, teachersList, onClose }: { teacherId: string | null; teachersList: Teacher[]; onClose: () => void }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<"id" | "pw" | null>(null);
  useEffect(() => { setReveal(false); setCopied(null); }, [teacherId]);

  const teacher = teacherId ? teachersList.find((t) => t.id === teacherId) : undefined;
  const cred = teacherId ? getTeacherCredential(teacherId) : undefined;
  if (!teacher || !cred) return null;

  const copy = async (text: string, which: "id" | "pw") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1200);
    } catch { toast.error("Copy failed"); }
  };

  const printSlip = () => {
    const w = window.open("", "_blank", "width=520,height=640");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    w.document.write(printableSlip({
      title: "Teacher Login Slip — Sunshine ERP",
      rows: [
        ["Teacher Name", teacher.name],
        ["Employee ID", teacher.id],
        ["Class / Subject", `${teacher.className} · ${teacher.subject}`],
        ["Login ID", cred.loginId],
        ["Password", cred.password],
        ["Status", cred.status],
      ],
      footer: "Direct parents/staff to the Sunshine Portal sign-in page to log in using these issued credentials.",
    }));
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={!!teacherId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teacher login details</DialogTitle>
          <DialogDescription>{teacher.name} · {teacher.id} · {teacher.className}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Login ID" value={cred.loginId} onCopy={() => copy(cred.loginId, "id")} copied={copied === "id"} />
          <Field
            label="Password"
            value={reveal ? cred.password : "••••••••••••"}
            onCopy={() => copy(cred.password, "pw")}
            copied={copied === "pw"}
            trailing={
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setReveal((r) => !r)}>
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            }
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="rounded-full" onClick={printSlip}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={onClose} className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onCopy, copied, trailing }: { label: string; value: string; onCopy: () => void; copied: boolean; trailing?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-sm">
        <span className="flex-1 truncate">{value}</span>
        {trailing}
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function AddStaffDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (teacher: Teacher) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("English & Rhymes");
  const [className, setClassName] = useState("Nursery A");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Full Name is required");

    const phoneCheck = validateIndianMobile(phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error || "Please enter a valid 10-digit mobile number.");
      return;
    }

    const id = `TCH-${Math.floor(100 + Math.random() * 900)}`;
    const newTeacher: Teacher = {
      id,
      name: name.trim(),
      subject,
      className,
      phone: phoneCheck.formatted,
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@sunshineschool.edu`,
      avatar: `https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80`,
      experience: 3,
      joined: "2026-01-01",
      branch: "Main Campus",
    };

    onAdd(newTeacher);
    setName("");
    setPhone("");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Teacher / Staff Member</DialogTitle>
          <DialogDescription>Register new teaching or administrative staff to automatically issue login credentials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700">Full Name *</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Sen" className="mt-1 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700">Subject / Role</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="mt-1 bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700">Assigned Class</label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Nursery A" className="mt-1 bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700">Phone Number</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1 bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700">Email Address</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@sunshineschool.edu" className="mt-1 bg-white" />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-sky-500 to-blue-500 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Save & Issue Login
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTeacherModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  return (
    <AddStaffDialog
      open={open}
      onClose={onClose}
      onAdd={async (newTeacher) => {
        await createTeacher(newTeacher);
        toast.success(`Registered staff member ${newTeacher.name}!`);
        onCreated();
      }}
    />
  );
}
