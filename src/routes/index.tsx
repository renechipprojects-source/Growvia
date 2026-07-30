import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sparkles, LogIn, User, Lock, Eye, EyeOff, ShieldCheck, MapPin, Phone,
  Mail, Globe, Calendar, Clock, GraduationCap
} from "lucide-react";
import { getSession, roleHome, authenticate, writeSession } from "@/lib/auth";
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
      if (supaResult.success && supaResult.profile) {
        writeSession(
          {
            loginId: supaResult.profile.login_id,
            role: supaResult.profile.role as any,
            name: supaResult.profile.full_name,
            mustChangePassword: supaResult.profile.must_change_password,
          },
          remember
        );
        toast.success(`Welcome, ${supaResult.profile.full_name}`);
        setTimeout(() => {
          if (supaResult.profile.must_change_password) navigate({ to: "/change-password" });
          else navigate({ to: roleHome(supaResult.profile.role as any) });
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/30 text-slate-800 relative overflow-hidden flex items-center justify-center p-4 lg:p-8">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-400/15 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/15 opacity-60 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch rounded-3xl border border-slate-200/80 bg-white/80 shadow-2xl shadow-slate-300/60 backdrop-blur-xl lg:grid-cols-12 overflow-hidden">
        {/* Left Side — School Branding & Info */}
        <div className="p-8 lg:p-10 lg:col-span-7 bg-gradient-to-br from-white/90 via-slate-50/70 to-blue-50/40 border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              {/* Top Left: School Logo, School Name & Academic Session */}
              <div className="flex flex-col items-start">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-2 flex items-center justify-center text-amber-600 overflow-hidden shrink-0 shadow-sm">
                  {settings.branding.logoUrl ? (
                    <img src={settings.branding.logoUrl} alt="School Logo" className="h-full w-full object-cover" />
                  ) : (
                    <GraduationCap className="h-8 w-8" />
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{settings.branding.schoolName}</h1>
                <div className="mt-1 text-xs text-amber-600 font-bold uppercase tracking-wider">
                  ACADEMIC SESSION {settings.school.academicYear}
                </div>
              </div>

              {/* Top Right: Growvia ERP Developer Branding */}
              {Boolean(settings.branding.projectLogo || settings.branding.project_logo) && (
                <div className="flex items-center gap-3 shrink-0 bg-transparent">
                  <div className="h-14 w-14 flex items-center justify-center bg-transparent border-none p-0 shadow-none shrink-0">
                    <img
                      src={settings.branding.projectLogo || settings.branding.project_logo || "/growvia-logo.png"}
                      alt={settings.branding.projectName || settings.branding.project_name || "Growvia"}
                      className="h-full w-full object-contain filter-none opacity-100 shadow-none [image-rendering:auto]"
                    />
                  </div>
                  <span className="text-base font-bold text-slate-900 tracking-tight">
                    {settings.branding.projectName || settings.branding.project_name || "Growvia"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p className="text-base text-slate-700 leading-relaxed font-medium">
                {settings.loginPage.welcomeMessage}
              </p>

              {settings.branding.motto && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> &ldquo;{settings.branding.motto}&rdquo;
                </div>
              )}
            </div>

            {/* School Details Metadata (Website & School Code removed as required) */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-700">{settings.branding.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-700">{settings.branding.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-sky-600 shrink-0" />
                <span className="font-medium text-slate-700">{settings.branding.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-medium text-slate-700">Office Hours: {settings.branding.officeHours}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/80 text-center space-y-0.5">
            {settings.branding.footer ? (
              settings.branding.footer.split("\n").map((line, idx) => (
                <p key={idx} className={idx === 0 ? "text-xs font-semibold text-slate-700" : "text-[11px] text-slate-500"}>
                  {line}
                </p>
              ))
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-700">Renechip Private Limited</p>
                <p className="text-[11px] text-slate-500">© 2026 All Rights Reserved.</p>
              </>
            )}
          </div>
        </div>

        {/* Right Side — Login Form */}
        <div className="p-8 lg:p-10 lg:col-span-5 flex flex-col justify-center bg-white/70 backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Institutional Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your assigned Login ID and password to access your role dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="loginId" className="text-xs font-semibold text-slate-700">Login ID</Label>
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
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20 text-sm rounded-xl"
                  aria-invalid={!!errors.loginId}
                />
              </div>
              {errors.loginId && <p className="mt-1 text-xs text-red-500 font-medium">{errors.loginId}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20 text-sm rounded-xl"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-semibold text-amber-600 hover:text-amber-700">
                Forgot password?
              </Link>
            </div>

            {errors.form && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
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
