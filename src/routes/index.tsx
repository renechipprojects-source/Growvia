import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { getSession, roleHome, authenticate } from "@/lib/auth";
import { login } from "@/lib/supabaseAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Sunshine Play School ERP" },
      { name: "description", content: "Secure sign-in for Sunshine Play School ERP. One login for Admin, Principal, Office, Teachers and Parents." },
      { property: "og:title", content: "Sign in — Sunshine Play School ERP" },
      { property: "og:description", content: "One login. Automatic role detection." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ loginId?: string; password?: string; form?: string }>({});

  // If already signed in, hop to the right dashboard.
  useEffect(() => {
    const s = getSession();
    if (s) {
      if (s.mustChangePassword) navigate({ to: "/change-password" });
      else navigate({ to: roleHome(s.role) });
    }
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!loginId.trim()) nextErrors.loginId = "Please enter your Login ID.";
    if (!password) nextErrors.password = "Please enter your password.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const result = authenticate(loginId, password, remember);
      if (!result.ok) {
        setSubmitting(false);
        const msg = result.reason === "invalid" ? "Invalid Login ID or password." : "Please fill in all fields.";
        setErrors({ form: msg });
        toast.error(msg);
        return;
      }
      const { session } = result;
      toast.success(`Welcome, ${session.name}`);
      setTimeout(() => {
        if (session.mustChangePassword) navigate({ to: "/change-password" });
        else navigate({ to: roleHome(session.role) });
      }, 200);
    } catch (err: any) {
      setSubmitting(false);
      toast.error("An error occurred during login. Please try again.");
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200 to-sky-200 opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-200 to-pink-200 opacity-40 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-2">
        {/* Brand / marketing */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Secure role-based access
          </div>
          <div className="mt-6">
            <div className="text-2xl font-bold tracking-tight text-slate-900">Sunshine Play School</div>
            <div className="text-sm text-slate-600">Enterprise Resource Planning</div>
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900">
            Welcome back to Sunshine ERP
          </h1>
          <p className="mt-3 max-w-md text-slate-600">
            Sign in with your Login ID and password. We&rsquo;ll take you to the correct dashboard automatically —
            no role picking required.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Unified login for every role</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" /> Automatic role detection & redirect</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure password recovery workflow</li>
          </ul>
        </div>

        {/* Login form */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <div className="text-lg font-bold tracking-tight text-slate-900">Sunshine ERP</div>
          </div>
          <Card className="rounded-3xl border-white/60 bg-white/90 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8">
            <div className="text-xl font-bold text-slate-900">Sign in</div>
            <div className="mt-1 text-sm text-slate-600">
              Enter your Login ID and password to continue.
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <Label htmlFor="loginId">Login ID</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="loginId"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="e.g. ADMIN001"
                    className="pl-9"
                    aria-invalid={!!errors.loginId}
                  />
                </div>
                {errors.loginId && <p className="mt-1 text-xs text-red-600">{errors.loginId}</p>}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-10"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-800">
                  Forgot password?
                </Link>
              </div>

              {errors.form && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errors.form}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-pink-500 text-white shadow-lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-[11px] text-slate-500">
              By signing in you agree to Sunshine&rsquo;s terms and privacy policy.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
