import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, ShieldAlert, CheckCircle2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requestSecurePasswordReset, completeSecurePasswordReset } from "@/lib/passwordResets";
import { passwordStrengthIssues } from "@/lib/auth";
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
              <div className="text-sm text-slate-600">Enter your registered account information to create a new password.</div>
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
                subtitle="Enter your registered email address, mobile number, or Login ID."
                label="Registered Identifier"
                placeholder="e.g. teacher@sunshineschool.edu or 9876543210"
              />
            </TabsContent>

            <TabsContent value="parent" className="mt-6">
              <IdentifierForm
                role="parent"
                title="Parent Password Reset"
                subtitle="Enter your registered mobile number, email, or Admission Number."
                label="Registered Identifier"
                placeholder="e.g. STU-1001 or 9876543210"
              />
            </TabsContent>

            <TabsContent value="office" className="mt-6">
              <IdentifierForm
                role="office"
                title="Office Staff Password Reset"
                subtitle="Enter your registered Office Login ID or email address."
                label="Registered Identifier"
                placeholder="e.g. OFFICE001 or office@sunshineschool.edu"
              />
            </TabsContent>

            <TabsContent value="principal" className="mt-6">
              <IdentifierForm
                role="principal"
                title="Principal Password Reset"
                subtitle="Enter your registered Principal Login ID or email address."
                label="Registered Identifier"
                placeholder="e.g. PRINCIPAL001 or principal@sunshineschool.edu"
              />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Admin self-reset restricted.</div>
                    <div className="mt-1">Please contact the ERP System Administrator to reset System Admin credentials.</div>
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
  const [issuedRequestId, setIssuedRequestId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // New Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      toast.error("Please enter your registered account information.");
      return;
    }

    const res = requestSecurePasswordReset(role, value);
    if (!res.ok) {
      toast.error(res.error || "Unable to process password reset request.");
      return;
    }

    setResetMessage(res.message);
    if (res.requestId) {
      setIssuedRequestId(res.requestId);
    }
    toast.success("Password reset request generated.");
  }

  function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    const issues = passwordStrengthIssues(newPassword || "");
    if (issues.length) {
      toast.error("Password requirements: " + issues.join(", ") + ".");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (!issuedRequestId) {
      toast.error("Invalid or missing reset request.");
      return;
    }

    setSubmittingReset(true);
    const complete = completeSecurePasswordReset(issuedRequestId, newPassword);
    setSubmittingReset(false);

    if (!complete.ok) {
      toast.error(complete.error || "Failed to update password.");
      return;
    }

    toast.success("Password reset successfully! You can now log in with your new password.");
    setTimeout(() => {
      navigate({ to: "/" });
    }, 500);
  }

  if (resetMessage && issuedRequestId) {
    return (
      <form onSubmit={handleSetNewPassword} className="space-y-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-950 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" /> Account Verified
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed">{resetMessage}</p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-sm font-semibold text-slate-900">Create New Password</div>

          <div>
            <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              className="mt-1 bg-white border-slate-200 text-sm rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1 bg-white border-slate-200 text-sm rounded-xl"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={submittingReset}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md py-2.5"
        >
          <Lock className="w-4 h-4 mr-2" /> Save New Password & Sign In
        </Button>
      </form>
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

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md py-2.5">
        Request Password Reset
      </Button>
    </form>
  );
}
