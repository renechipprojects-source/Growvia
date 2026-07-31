import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Lock, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  changePasswordForCurrentUser,
  getSession,
  passwordStrengthIssues,
  roleHome,
  signOut,
} from "@/lib/auth";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Change password — Sunshine ERP" },
      { name: "description", content: "Create a new password before continuing to your dashboard." },
      { property: "og:title", content: "Change password — Sunshine ERP" },
      { property: "og:description", content: "Set a new secure password." },
    ],
  }),
  component: ChangePassword,
});

const RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",  test: (p) => /[a-z]/.test(p) },
  { label: "One number",            test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function ChangePassword() {
  const navigate = useNavigate();
  const [session, setSession] = useState(getSession());
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) navigate({ to: "/" });
  }, [navigate]);

  if (!session) return null;

  const forced = !!session.mustChangePassword;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (passwordStrengthIssues(pwd).length) {
      setErr("Please meet all password requirements.");
      return;
    }
    if (pwd !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    const res = changePasswordForCurrentUser(pwd);
    if (!res.ok) {
      setErr(res.error ?? "Could not change password.");
      return;
    }
    toast.success("Password updated.");
    const s = getSession();
    if (s) navigate({ to: roleHome(s.role) });
  }

  function cancel() {
    signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Card className="rounded-3xl border-white/60 bg-white/95 p-6 shadow-2xl shadow-black/5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold">
                {forced ? "Set a new password" : "Change your password"}
              </div>
              <div className="text-sm text-slate-600">
                {forced
                  ? "Your current password is temporary. Create a new one to continue."
                  : "Enter a new password for your account."}
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="new">New password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="new"
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            <ul className="space-y-1 text-xs">
              {RULES.map((r) => {
                const ok = r.test(pwd);
                return (
                  <li key={r.label} className={ok ? "text-emerald-700" : "text-slate-500"}>
                    <span className="inline-flex items-center gap-1.5">
                      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {r.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {err && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="flex-1 rounded-xl">Save new password</Button>
              <Button type="button" variant="outline" onClick={cancel} className="rounded-xl">
                {forced ? "Sign out" : "Cancel"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
