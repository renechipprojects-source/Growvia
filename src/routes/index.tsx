import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sparkles, LogIn, User, Lock, Eye, EyeOff, ShieldCheck, MapPin, Phone,
  Mail, Globe, Calendar, Clock, GraduationCap
} from "lucide-react";
import { getSession, roleHome, authenticate } from "@/lib/auth";
import { login } from "@/lib/supabaseAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";

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
  const { settings } = useDeveloperSettings();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!loginId.trim()) nextErrors.loginId = "Please enter your Login ID.";
    if (!password) nextErrors.password = "Please enter your password.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // First try Supabase auth
      const supaResult = await login(loginId.trim(), password);
      if (supaResult.ok) {
        toast.success(`Welcome, ${supaResult.session.name}`);
        setTimeout(() => {
          if (supaResult.session.mustChangePassword) navigate({ to: "/change-password" });
          else navigate({ to: roleHome(supaResult.session.role) });
        }, 200);
        return;
      }

      // Fallback to local system auth
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-slate-100 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 opacity-50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 opacity-50 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-2xl lg:grid-cols-12 overflow-hidden">
        {/* Left Side — School Branding & Info */}
        <div className="p-8 lg:p-10 lg:col-span-7 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-r border-slate-800/80 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 p-2 flex items-center justify-center text-amber-400 overflow-hidden shrink-0">
                {settings.branding.logoUrl ? (
                  <img src={settings.branding.logoUrl} alt="School Logo" className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap className="h-7 w-7" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{settings.branding.schoolName}</h1>
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Academic Session {settings.school.academicYear}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p className="text-base text-slate-200 leading-relaxed font-medium">
                {settings.loginPage.welcomeMessage}
              </p>

              {settings.branding.motto && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> &ldquo;{settings.branding.motto}&rdquo;
                </div>
              )}
            </div>

            {/* School Details Metadata */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.branding.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{settings.branding.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-sky-400 shrink-0" />
                <span>{settings.branding.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>{settings.branding.website}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Office Hours: {settings.branding.officeHours}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-pink-400 shrink-0" />
                <span>Code: {settings.school.schoolCode}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-4 border-t border-slate-800/50">
            {settings.branding.footer}
          </div>
        </div>

        {/* Right Side — Login Form */}
        <div className="p-8 lg:p-10 lg:col-span-5 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Institutional Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your assigned Login ID and password to access your role dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="loginId" className="text-xs text-slate-300">Login ID</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. ADMIN001 / OFFICE001"
                  className="pl-9 bg-slate-950 border-slate-800 text-white text-sm"
                  aria-invalid={!!errors.loginId}
                />
              </div>
              {errors.loginId && <p className="mt-1 text-xs text-red-400">{errors.loginId}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10 bg-slate-950 border-slate-800 text-white text-sm"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-800"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-amber-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-medium text-amber-400 hover:text-amber-300">
                Forgot password?
              </Link>
            </div>

            {errors.form && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              {submitting ? (
                "Authenticating..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign In to ERP
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
