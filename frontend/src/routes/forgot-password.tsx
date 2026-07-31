import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  requestSystemReset,
  requestTeacherReset,
  requestParentReset,
} from "@/lib/passwordResets";

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
              <div className="text-sm text-slate-600">Choose your role and submit a request.</div>
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
                title="Teacher password reset"
                subtitle="Your request will be sent to the Office Staff for verification."
                label="Login ID or Employee ID"
                placeholder="e.g. TCH100"
                onSubmit={(v) => requestTeacherReset(v)}
              />
            </TabsContent>

            <TabsContent value="parent" className="mt-6">
              <IdentifierForm
                title="Parent password reset"
                subtitle="Your request will be sent to the Office Staff for verification."
                label="Admission Number or Mobile Number"
                placeholder="e.g. SUN/26-2001 or 9012345678"
                onSubmit={(v) => requestParentReset(v)}
              />
            </TabsContent>

            <TabsContent value="office" className="mt-6">
              <IdentifierForm
                title="Office Staff password reset"
                subtitle="Your request will be sent to the Admin for verification."
                label="Login ID"
                placeholder="e.g. OFFICE001"
                onSubmit={(v) => requestSystemReset(v)}
              />
            </TabsContent>

            <TabsContent value="principal" className="mt-6">
              <IdentifierForm
                title="Principal password reset"
                subtitle="Your request will be sent to the Admin for verification."
                label="Login ID"
                placeholder="e.g. PRINCIPAL001"
                onSubmit={(v) => requestSystemReset(v)}
              />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <div>
                    <div className="font-semibold">Admin cannot self-reset.</div>
                    <div className="mt-1">Please contact the ERP System Owner to reset the Admin password.</div>
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
  title,
  subtitle,
  label,
  placeholder,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  onSubmit: (value: string) => { ok: true; request: { id: string } } | { ok: false; error: string };
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<null | string>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = onSubmit(value);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSubmitted(result.request.id);
    toast.success("Reset request submitted.");
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="font-semibold">Request received</div>
        <div className="mt-1">
          Your password reset request has been logged.
          Please contact the office if you need urgent assistance.
        </div>
        <div className="mt-2 text-xs text-emerald-800/80">Request ID: <span className="font-mono">{submitted}</span></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm text-slate-600">{subtitle}</div>
      </div>
      <div>
        <Label htmlFor="identifier">{label}</Label>
        <Input
          id="identifier"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full rounded-xl">Submit reset request</Button>
    </form>
  );
}
