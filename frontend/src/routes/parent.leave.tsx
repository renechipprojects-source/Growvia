import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { NotificationService } from "@/lib/notifications";
import { useParent } from "@/lib/parentContext";
import { useLeave } from "@/lib/leaveContext";
import { useStudentDocs } from "@/lib/studentDocsContext";
import { useT } from "@/lib/i18n";
import { createLeaveRequest } from "@/lib/supabaseService";

const schema = z.object({
  studentId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
});
type V = z.infer<typeof schema>;

const REASONS = ["Sick", "Family Function", "Travel", "Other"];

export const Route = createFileRoute("/parent/leave")({ component: Leave });

function Leave() {
  const { t } = useT();
  const { children: kids, activeChild } = useParent();
  const { submit, forStudent } = useLeave();
  const { addMedicalCertificate } = useStudentDocs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [certName, setCertName] = useState<string | undefined>();
  const [certDataUrl, setCertDataUrl] = useState<string | undefined>();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { studentId: activeChild?.id ?? "", reason: "" },
  });

  const studentId = watch("studentId");
  const reason = watch("reason");
  const isSick = reason === "Sick";
  const student = kids.find((k) => k.id === studentId) ?? activeChild;
  const history = student ? forStudent(student.id) : [];

  const onFile = (f?: File) => {
    if (!f) { setCertName(undefined); setCertDataUrl(undefined); return; }
    setCertName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCertDataUrl(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSubmit = (v: V) => {
    const s = kids.find((k) => k.id === v.studentId);
    if (!s) return;
    const created = submit({
      studentId: s.id,
      studentName: s.name,
      className: s.className,
      section: s.section,
      from: v.from,
      to: v.to,
      reason: v.reason,
      description: v.description,
      medicalCertificateName: certName,
      medicalCertificateDataUrl: certDataUrl,
    });
    createLeaveRequest({
      applicant_name: s.name,
      applicant_role: "parent",
      start_date: v.from,
      end_date: v.to,
      reason: v.reason,
      status: "Pending",
    }).catch(() => {});
    if (certName && s.id) {
      addMedicalCertificate(s.id, { name: certName, leaveId: created.id });
    }
    NotificationService.leaveRequested(s.name, "Parent");
    toast.success(`${t("leave.submitted") || "Leave request sent"} (${v.from} → ${v.to})`);
    reset({ studentId: s.id, reason: "" });
    setCertName(undefined);
    setCertDataUrl(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <PageHeader title={t("leave.title")} subtitle={t("leave.subtitle")} />
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title={t("leave.title")}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {kids.length > 1 && (
              <div>
                <Label>{t("leave.student")}</Label>
                <Select value={studentId} onValueChange={(v) => setValue("studentId", v, { shouldValidate: true })}>
                  <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kids.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name} · {k.className}-{k.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("leave.from")}</Label>
                <Input type="date" {...register("from")} className="mt-1.5 bg-white/70" />
                {errors.from && <p className="text-xs text-rose-600 mt-1">{errors.from.message}</p>}
              </div>
              <div>
                <Label>{t("leave.to")}</Label>
                <Input type="date" {...register("to")} className="mt-1.5 bg-white/70" />
                {errors.to && <p className="text-xs text-rose-600 mt-1">{errors.to.message}</p>}
              </div>
            </div>
            <div>
              <Label>{t("leave.reason")}</Label>
              <Select value={reason} onValueChange={(v) => setValue("reason", v, { shouldValidate: true })}>
                <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue placeholder={t("leave.selectReason")} /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{t(`leave.reason.${r}`, r)}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.reason && <p className="text-xs text-rose-600 mt-1">{errors.reason.message}</p>}
            </div>
            <div>
              <Label>{t("leave.description") || "Description"}</Label>
              <Textarea rows={3} {...register("description")} className="mt-1.5 bg-white/70" />
            </div>
            {isSick && (
              <div className="rounded-2xl bg-amber-50/80 p-3">
                <Label className="text-amber-800">
                  {t("leave.medicalCert") || "Medical certificate (optional)"}
                </Label>
                <p className="text-[11px] text-amber-700 mt-1">
                  {t("leave.medicalNote") || "Attach a scan or photo. It will be saved to the student's health record."}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => onFile(e.target.files?.[0])}
                    className="text-xs"
                  />
                  {certName && (
                    <button type="button" onClick={() => onFile(undefined)} className="text-xs text-rose-600 inline-flex items-center gap-1">
                      <X className="h-3 w-3" />{t("action.remove")}
                    </button>
                  )}
                </div>
                {certName && (
                  <div className="mt-2 text-xs text-amber-900 inline-flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />{certName}
                  </div>
                )}
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white rounded-full">
              <Plane className="h-4 w-4 mr-2" />{t("leave.submit") || "Submit"}
            </Button>
          </form>
        </SectionCard>
        <SectionCard title={t("leave.recent") || "Recent requests"}>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("leave.none") || "No leave requests yet."}</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-2xl bg-white/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{h.from} → {h.to}</div>
                    <Badge className={
                      h.status === "Approved" ? "bg-emerald-100 text-emerald-700"
                        : h.status === "Rejected" ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }>{t(`status.${h.status.toLowerCase()}`, h.status)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t(`leave.reason.${h.reason}`, h.reason)}{h.description ? ` · ${h.description}` : ""}
                  </div>
                  {h.medicalCertificateName && (
                    <div className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />{h.medicalCertificateName}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
