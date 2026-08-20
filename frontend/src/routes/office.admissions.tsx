import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { validateIndianMobile } from "@/lib/utils";
import { ClipboardCheck, LinkIcon, HeartPulse, Upload, FileText, User, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useEnquiries } from "@/lib/enquiryContext";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useStudentDocs, DEFAULT_DOCS, type DocEntry } from "@/lib/studentDocsContext";
import { createStudent, getNextAdmissionNo, fetchStudents, toCanonicalAdmissionNo } from "@/lib/supabaseService";
import { NotificationService } from "@/lib/notifications";
import type { ClassName, Section } from "@/lib/mockData";

const searchSchema = z.object({
  enquiryId: fallback(z.string(), "").default(""),
});

const schema = z.object({
  childName: z.string().min(2, "Required"),
  age: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  parentName: z.string().min(2, "Required"),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  guardianName: z.string().optional(),
  occupation: z.string().optional(),
  altPhone: z.string().optional(),
  previousSchool: z.string().optional(),
  phone: z.string().refine((val) => validateIndianMobile(val).valid, {
    message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
  }),
  email: z.string().email(),
  className: z.string().min(1),
  section: z.string().optional(),
  admissionNo: z.string().optional(),
  admissionDate: z.string().optional(),
  feePlan: z.string().optional(),
  transport: z.string().optional(),
  address: z.string().min(3),
  notes: z.string().optional(),

  // Optional Medical Fields
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  doctor: z.string().optional(),
  emergencyContact: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/office/admissions")({
  validateSearch: zodValidator(searchSchema),
  component: Admissions,
});

function autoAdmissionNo(existingStudents: any[] = [], year: number = 2026) {
  return getNextAdmissionNo(existingStudents, year);
}

import { useAutoRefresh } from "@/lib/autoRefreshContext";

function Admissions() {
  const { triggerModuleRefresh } = useAutoRefresh();
  const { enquiryId } = Route.useSearch();
  const navigate = useNavigate();
  const { getEnquiry, isConverted, markConverted } = useEnquiries();
  const enquiry = enquiryId ? getEnquiry(enquiryId) : undefined;
  const alreadyConverted = enquiryId ? isConverted(enquiryId) : false;

  const [photoBase64, setPhotoBase64] = useState<string>("");

  const handleLocalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        setPhotoBase64(compressedDataUrl);
        toast.success("Local student photo attached!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const defaults = useMemo<Partial<Values>>(() => ({
    className: enquiry?.interestedClass ?? "",
    childName: enquiry?.childName ?? "",
    parentName: enquiry?.parentName ?? "",
    fatherName: enquiry?.parentName ?? "",
    motherName: "",
    guardianName: "",
    occupation: "Business / Service",
    phone: enquiry?.phone ?? "",
    altPhone: enquiry?.altPhone ?? "",
    email: enquiry?.email ?? "",
    address: enquiry?.address ?? "",
    gender: enquiry?.gender ?? "",
    dob: enquiry?.dob ?? "",
    previousSchool: enquiry?.previousSchool ?? "",
    age: enquiry ? String(enquiry.age) : "",
    notes: enquiry?.notes ?? "",
    admissionNo: autoAdmissionNo(),
    admissionDate: new Date().toISOString().slice(0, 10),
    section: "A",
    feePlan: "Standard",
    transport: "No",
  }), [enquiry]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  const [existingStudents, setExistingStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents().then(({ data }) => {
      if (data) setExistingStudents(data);
    });
  }, []);

  useEffect(() => {
    if (existingStudents.length > 0) {
      setValue("admissionNo", getNextAdmissionNo(existingStudents, 2026));
    }
  }, [existingStudents, setValue]);

  useEffect(() => { reset(defaults); }, [defaults, reset]);

  const { upsert: upsertDocs } = useStudentDocs();
  const [docs, setDocs] = useState<DocEntry[]>(() =>
    DEFAULT_DOCS.map((name) => ({ name, status: "Pending" })),
  );
  const toggleDoc = (name: string, checked: boolean) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.name === name
          ? { ...d, status: checked ? "Submitted" : "Pending", submittedOn: checked ? new Date().toISOString().slice(0, 10) : undefined }
          : d,
      ),
    );
  };

  const onSubmit = async (v: Values) => {
    if (enquiryId && alreadyConverted) {
      toast.error("This enquiry has already been converted.");
      return;
    }

    const { data: createdStu, error } = await createStudent({
      admissionNo: v.admissionNo || autoAdmissionNo(),
      rollNo: 0,
      name: v.childName,
      age: parseInt(v.age || "3", 10),
      dob: v.dob || "2022-01-01",
      className: (v.className as ClassName) || "Nursery",
      section: (v.section as Section) || "A",
      parent: v.parentName,
      fatherName: v.fatherName || v.parentName,
      motherName: v.motherName || "",
      guardianName: v.guardianName || "",
      occupation: v.occupation || "Business / Service",
      address: v.address,
      email: v.email,
      parentId: undefined,
      phone: v.phone,
      gender: (v.gender as "Boy" | "Girl") || "Boy",
      house: "Red",
      admissionDate: v.admissionDate || new Date().toISOString().split("T")[0],
      feeStatus: "Pending",
      avatar: photoBase64 || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(v.childName)}`,
      attendance: 100,
      branch: "Main Branch",
    });

    if (error || !createdStu) {
      toast.error(error || "Failed to create student in database. Admission aborted.");
      return;
    }

    if (enquiryId) markConverted(enquiryId);
    if (v.admissionNo) upsertDocs(v.admissionNo, v.childName, docs);

    NotificationService.admissionCreated(v.childName, toCanonicalAdmissionNo(createdStu.admissionNo || v.admissionNo));
    toast.success(`${v.childName} admitted (${toCanonicalAdmissionNo(createdStu.admissionNo || v.admissionNo)}) — synced to database.`);
    triggerModuleRefresh("students");
    triggerModuleRefresh("admissions");
    setPhotoBase64("");
    reset();
    navigate({ to: "/office/students" });
  };

  return (
    <div className="space-y-4 w-full max-w-none">
      <div>
        <PageHeader
          title="New Admission"
          subtitle={enquiry ? `Converting enquiry ${enquiry.id} · ${enquiry.childName}` : "Convert an enquiry into a student."}
          action={enquiry ? (
            <Badge className="bg-emerald-100 text-emerald-700 gap-1">
              <LinkIcon className="h-3 w-3" /> From enquiry {enquiry.id}
            </Badge>
          ) : undefined}
        />
      </div>

      {alreadyConverted && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This enquiry has already been converted. Duplicate admissions are not allowed.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Admission Form">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Student Photo Upload (Local Only) */}
              <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative shrink-0">
                  {photoBase64 ? (
                    <img
                      src={photoBase64}
                      alt="Student Photo"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center text-slate-400">
                      <User className="w-9 h-9" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <Label className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 justify-center md:justify-start">
                    <Upload className="w-4 h-4 text-indigo-600" /> Student Photo (Upload from Local Device)
                  </Label>
                  <p className="text-xs text-slate-500">
                    Select a local image file (JPG, PNG, WEBP). This photo will display across all student lists and in the Parent Portal upon login.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <input
                      type="file"
                      id="student-photo-file-input"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLocalPhotoSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200 text-xs shadow-sm"
                      onClick={() => document.getElementById("student-photo-file-input")?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Choose Local Photo File
                    </Button>
                    {photoBase64 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-800 text-xs"
                        onClick={() => setPhotoBase64("")}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Field label="Admission Number" error={errors.admissionNo?.message}>
                <Input {...register("admissionNo")} className="bg-white/70" readOnly />
              </Field>
              <Field label="Admission Date" error={errors.admissionDate?.message}>
                <Input type="date" {...register("admissionDate")} className="bg-white/70" />
              </Field>

              <Field label="Child's name" error={errors.childName?.message}><Input {...register("childName")} className="bg-white/70" /></Field>
              <Field label="Age" error={errors.age?.message}><Input type="number" {...register("age")} className="bg-white/70" /></Field>
              <Field label="Date of Birth" error={errors.dob?.message}><Input type="date" {...register("dob")} className="bg-white/70" /></Field>
              <Field label="Gender">
                <Select value={watch("gender") || ""} onValueChange={(v) => setValue("gender", v)}>
                  <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>{["Boy", "Girl"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Blood Group">
                <Select value={watch("bloodGroup") || "O+"} onValueChange={(v) => setValue("bloodGroup", v)}>
                  <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select Blood Group" /></SelectTrigger>
                  <SelectContent>{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Parent name" error={errors.parentName?.message}><Input {...register("parentName")} className="bg-white/70" /></Field>
              <Field label="Parent Occupation"><Input {...register("occupation")} className="bg-white/70" placeholder="e.g. Business, Engineer, Doctor" /></Field>
              <Field label="Phone" error={errors.phone?.message}>
                <Input
                  maxLength={10}
                  {...register("phone")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setValue("phone", val, { shouldValidate: true });
                  }}
                  placeholder="9876543210"
                  className="bg-white/70"
                />
              </Field>
              <Field label="Alternate Contact">
                <Input
                  maxLength={10}
                  {...register("altPhone")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setValue("altPhone", val);
                  }}
                  placeholder="9876543211"
                  className="bg-white/70"
                />
              </Field>
              <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} className="bg-white/70" /></Field>

              <Field label="Class" error={errors.className?.message}>
                <Select value={watch("className")} onValueChange={(v) => setValue("className", v, { shouldValidate: true })}>
                  <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>{["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Section">
                <Select value={watch("section") || "A"} onValueChange={(v) => setValue("section", v)}>
                  <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{["A", "B", "C"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              {watch("className") && !["Nursery", "Playgroup"].includes(watch("className")) && (
                <Field label="Previous School"><Input {...register("previousSchool")} className="bg-white/70" placeholder="Previous school name & location" /></Field>
              )}

              <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-800 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 shrink-0 text-sky-600" />
                <span><strong>Roll Number Allocation:</strong> Roll numbers are not assigned during admission. They will be generated in <strong>alphabetical order</strong> by the Class Teacher after section allocation.</span>
              </div>

              <Field label="Fee Plan">
                <Select value={watch("feePlan") || "Standard"} onValueChange={(v) => setValue("feePlan", v)}>
                  <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Standard", "Sibling Discount", "Scholarship", "Custom"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Transport">
                <Select value={watch("transport") || "No"} onValueChange={(v) => setValue("transport", v)}>
                  <SelectTrigger className="bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{["No", "Morning only", "Both ways"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2"><Field label="Address" error={errors.address?.message}><Input {...register("address")} className="bg-white/70" /></Field></div>
              <div className="md:col-span-2"><Field label="Notes"><Textarea rows={2} {...register("notes")} className="bg-white/70" /></Field></div>

              {/* Optional Medical Records Section */}
              <div className="md:col-span-2 mt-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-rose-900 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-600" /> Medical & Health Records (Optional)
                  </div>
                  <Badge variant="outline" className="text-xs bg-white text-rose-700 border-rose-200">Optional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Record medical conditions, allergies, or emergency health details if needed. These will be visible to Admin & Principal.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <Field label="Height (cm)"><Input type="number" {...register("heightCm")} placeholder="e.g. 115" className="bg-white" /></Field>
                  <Field label="Weight (kg)"><Input type="number" {...register("weightKg")} placeholder="e.g. 20" className="bg-white" /></Field>
                  <Field label="Known Allergies"><Input {...register("allergies")} placeholder="e.g. Peanuts, Dust, None" className="bg-white" /></Field>
                  <Field label="Medical Conditions"><Input {...register("medicalConditions")} placeholder="e.g. Asthma, Diabetes, None" className="bg-white" /></Field>
                  <Field label="Pediatrician / Doctor"><Input {...register("doctor")} placeholder="e.g. Dr. Mehta" className="bg-white" /></Field>
                  <Field label="Emergency Medical Contact"><Input {...register("emergencyContact")} placeholder="e.g. +91 98111 22233" className="bg-white" /></Field>
                </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <Button
                  type="submit"
                  disabled={alreadyConverted}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg disabled:opacity-50"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Create Admission
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="space-y-4">
          {enquiry && (
            <SectionCard title="Source Enquiry">
              <ul className="text-sm space-y-1.5">
                <li><span className="text-muted-foreground">ID:</span> {enquiry.id}</li>
                <li><span className="text-muted-foreground">Created:</span> {enquiry.createdAt}</li>
                <li><span className="text-muted-foreground">Source:</span> {enquiry.source}</li>
                <li><span className="text-muted-foreground">Status:</span> {enquiry.status}</li>
                {enquiry.followUp && <li><span className="text-muted-foreground">Follow-up:</span> {enquiry.followUp}</li>}
              </ul>
            </SectionCard>
          )}
          <SectionCard title="Documents Checklist">
            <p className="text-xs text-muted-foreground mb-2">
              Tick documents received. Stored permanently in the student's record.
            </p>
            <ul className="space-y-2 text-sm">
              {docs.map((d) => (
                <li key={d.name} className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5">
                  <Checkbox
                    id={`doc-${d.name}`}
                    checked={d.status === "Submitted"}
                    onCheckedChange={(checked) => toggleDoc(d.name, Boolean(checked))}
                  />
                  <label htmlFor={`doc-${d.name}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{d.name}</div>
                    {d.submittedOn && (
                      <div className="text-[11px] text-muted-foreground">Submitted {d.submittedOn}</div>
                    )}
                  </label>
                  <Badge className={d.status === "Submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
