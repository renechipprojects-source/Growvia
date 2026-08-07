import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, ShieldAlert, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { processUnifiedPasswordReset, type ResetRequest } from "@/lib/passwordResets";
import type { Role } from "@/lib/roleConfig";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Sunshine ERP" },
      { name: "description", content: "Request a password reset for your Sunshine ERP account." },
      { property: "og:title", content: "Forgot password — Sunshine ERP" },
      { property: "og:description", content: "Role-based password recovery for schools." },
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
              <div className="text-lg font-bold">Reset your password</div>
              <div className="text-sm text-slate-600">Unified password recovery service for all ERP user roles.</div>
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
                title="Teacher password reset"
                subtitle="Enter your Login ID or Employee ID to generate a secure temporary password."
                label="Login ID or Employee ID"
                placeholder="e.g. TCH1001"
              />
            </TabsContent>

            <TabsContent value="parent" className="mt-6">
              <IdentifierForm
                role="parent"
                title="Parent password reset"
                subtitle="Enter your Admission Number, Mobile Number, or Parent Login ID."
                label="Admission Number or Mobile Number"
                placeholder="e.g. STU1001 or 9876543210"
              />
            </TabsContent>

            <TabsContent value="office" className="mt-6">
              <IdentifierForm
                role="office"
                title="Office Staff password reset"
                subtitle="Enter your Office Login ID to reset your password."
                label="Login ID"
                placeholder="e.g. OFFICE001"
              />
            </TabsContent>

            <TabsContent value="principal" className="mt-6">
              <IdentifierForm
                role="principal"
                title="Principal password reset"
                subtitle="Enter your Principal Login ID to reset your password."
                label="Login ID"
                placeholder="e.g. PRINCIPAL001"
              />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Admin self-reset restricted.</div>
                    <div className="mt-1">Please contact the ERP System Administrator to update System Admin credentials.</div>
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
  const [resultRequest, setResultRequest] = useState<ResetRequest | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = processUnifiedPasswordReset(role, value);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setResultRequest(result.request);
    toast.success("Password reset successfully!");
  }

  if (resultRequest) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-950 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Password Reset Successful
        </div>
        <p className="text-xs text-emerald-800 leading-relaxed">
          Your account credentials have been updated and synchronized with the database. You can now log in immediately.
        </p>
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 font-mono text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Account Role:</span>
            <span className="font-bold text-slate-900 uppercase">{resultRequest.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Login ID:</span>
            <span className="font-bold text-indigo-700">{resultRequest.loginId}</span>
          </div>
          {resultRequest.tempPassword && (
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="text-slate-500">Temporary Password:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{resultRequest.tempPassword}</span>
            </div>
          )}
        </div>
        <div className="pt-2 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (resultRequest.tempPassword) {
                navigator.clipboard.writeText(resultRequest.tempPassword);
                toast.success("Password copied to clipboard!");
              }
            }}
            className="bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100 rounded-xl"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Password
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow"
          >
            Sign In Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        Reset Password Now
      </Button>
    </form>
  );
}
