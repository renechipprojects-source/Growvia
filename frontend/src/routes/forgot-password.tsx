import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, ShieldAlert, CheckCircle2, Send, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requestSecurePasswordReset } from "@/lib/passwordResets";
import type { Role } from "@/lib/roleConfig";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — Sunshine ERP" },
      { name: "description", content: "Secure password reset portal for Sunshine ERP users." },
      { property: "og:title", content: "Reset Your Password — Sunshine ERP" },
      { property: "og:description", content: "Role-based secure password recovery." },
    ],
  }),
  component: ForgotPassword,
});

type TabKey = "principal" | "office" | "teacher" | "parent" | "admin";

function ForgotPassword() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("teacher");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>

        <Card className="rounded-3xl border-white/60 bg-white/95 p-6 shadow-2xl shadow-black/5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">Reset your password</div>
              <div className="text-sm text-slate-600">Submit a password reset request to school administration.</div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
              <TabsTrigger value="office">Office</TabsTrigger>
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="mt-6">
              <IdentifierForm
                role="teacher"
                title="Teacher Password Reset"
                subtitle="Enter your registered Login ID, email address, or employee ID."
                label="Teacher Identifier"
                placeholder="e.g. TCH101 or teacher@sunshineschool.edu"
              />
            </TabsContent>

            <TabsContent value="parent" className="mt-6">
              <IdentifierForm
                role="parent"
                title="Parent Password Reset"
                subtitle="Enter your registered Login ID, mobile number, or Student Admission Number."
                label="Parent Identifier"
                placeholder="e.g. PRT1001, STU-1001 or 9876543210"
              />
            </TabsContent>

            <TabsContent value="office" className="mt-6">
              <IdentifierForm
                role="office"
                title="Office Staff Password Reset"
                subtitle="Enter your registered Office Login ID or email address."
                label="Office Staff Identifier"
                placeholder="e.g. OFFICE001 or office@sunshineschool.edu"
              />
            </TabsContent>

            <TabsContent value="principal" className="mt-6">
              <IdentifierForm
                role="principal"
                title="Principal Password Reset"
                subtitle="Enter your registered Principal Login ID or email address."
                label="Principal Identifier"
                placeholder="e.g. PRINCIPAL001 or principal@sunshineschool.edu"
              />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900 shadow-xs">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold text-amber-950 text-base">Admin Self-Reset Restricted</div>
                    <div className="mt-1 text-xs text-amber-800 leading-relaxed">
                      For school data security, System Administrator credentials cannot be reset through public self-service. Please contact the School ERP System Owner directly.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-xs text-slate-500">
            Remember your password?{" "}
            <Link to="/" className="font-medium text-indigo-600 hover:text-indigo-800">Sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function IdentifierForm({
  role,
  title,
  subtitle,
  label,
  placeholder,
}: {
  role: Role;
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      toast.error("Please enter your registered account information.");
      return;
    }

    setSubmitting(true);
    const res = await requestSecurePasswordReset(role, value);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error || "Unable to process password reset request.");
      return;
    }

    setResetMessage(res.message);
    toast.success("Password reset request submitted.");
  }

  if (resetMessage) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-950 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900 text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> Request Submitted Successfully
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">{resetMessage}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>An administrator will review and issue a temporary login credential.</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setResetMessage(null);
              setValue("");
            }}
            className="flex-1 rounded-xl text-xs"
          >
            Submit Another Request
          </Button>
          <Button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md"
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitRequest} className="space-y-4">
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>

      <div>
        <Label htmlFor="identifier" className="text-xs font-semibold text-slate-700">{label}</Label>
        <Input
          id="identifier"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5 bg-white border-slate-200 text-sm rounded-xl"
          autoFocus
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md py-2.5"
      >
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting..." : "Submit Reset Request"}
      </Button>
    </form>
  );
}
