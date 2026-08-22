import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, CheckCircle2, Send, Lock, Eye, EyeOff, MailCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { login } from "@/lib/supabaseAuth";
import { setSession } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — Sunshine ERP" },
      { name: "description", content: "Authoritative Supabase Auth password recovery portal for all accounts." },
    ],
  }),
  component: ForgotPasswordPage,
});

type Step = "identifier" | "sent" | "password" | "success";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "****@sunshine.edu";
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
}

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect Supabase Auth PASSWORD_RECOVERY event or URL hash recovery token
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setStep("password");
      toast.info("Password recovery token detected. Please enter your new password below.");
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("password");
        toast.info("Authenticated for password recovery. Enter your new password.");
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // STEP 1: Request Recovery Email via Supabase Auth
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = identifier.trim();
    if (!clean) {
      toast.error("Please enter your registered Email or Login ID.");
      return;
    }

    setLoading(true);

    try {
      let emailToUse = clean.includes("@") ? clean.toLowerCase() : "";
      let loginIdResolved = clean;

      if (!emailToUse) {
        const norm = clean.toLowerCase().replace(/[\s\-_]+/g, "");
        const { data: profile } = await supabase
          .from("gv_users")
          .select("email, login_id")
          .or(`login_id.ilike.${clean},login_id.ilike.${norm},id.ilike.${clean}`)
          .maybeSingle();

        if (profile?.email) {
          emailToUse = profile.email;
          loginIdResolved = profile.login_id || clean;
        }
      }

      if (!emailToUse) {
        // Safe neutral notice to prevent email enumeration
        setMaskedEmail("your registered email");
        setStep("sent");
        setLoading(false);
        toast.success("If an account exists for that identifier, recovery instructions have been sent.");
        return;
      }

      setTargetEmail(emailToUse);
      setMaskedEmail(maskEmail(emailToUse));

      const redirectUrl = `${window.location.origin}/forgot-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: redirectUrl,
      });

      setLoading(false);

      if (error) {
        if (error.message.includes("rate limit")) {
          toast.error("Email rate limit exceeded. Please wait a few minutes before trying again.");
        } else {
          toast.error(error.message || "Failed to send recovery email.");
        }
        return;
      }

      setStep("sent");
      toast.success(`Password recovery email sent to ${maskEmail(emailToUse)}!`);
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "Failed to process recovery request.");
    }
  };

  // STEP 2: Update Password directly in Supabase Auth
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Primary client updateUser against current recovery session
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        // Fallback: update via server endpoint if available
        const { updateServerAuthPassword } = await import("@/lib/supabaseAuth");
        const res = await updateServerAuthPassword(targetEmail || identifier, newPassword);
        if (!res?.success) {
          setLoading(false);
          toast.error(updateErr.message || "Password update failed.");
          return;
        }
      }

      setLoading(false);
      setStep("success");
      toast.success("Your password has been updated in Supabase Auth!");
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "Failed to update password.");
    }
  };

  const handleLoginNow = async () => {
    const loginIdentifier = targetEmail || identifier.trim();
    setLoading(true);
    const loginRes = await login(loginIdentifier, newPassword);
    setLoading(false);

    if (loginRes.success && loginRes.profile) {
      const userObj = {
        loginId: loginRes.profile.login_id || loginIdentifier,
        role: loginRes.profile.role as any,
        name: loginRes.profile.full_name || "User",
        linkId: loginRes.profile.login_id || loginIdentifier,
      };
      setSession(userObj);
      toast.success(`Welcome back, ${userObj.name}!`);

      const targetPath =
        userObj.role === "admin" || userObj.role === "super-admin"
          ? "/admin"
          : userObj.role === "principal"
          ? "/principal"
          : userObj.role === "office"
          ? "/office"
          : userObj.role === "teacher"
          ? "/teacher"
          : userObj.role === "parent"
          ? "/parent"
          : "/";

      window.location.href = targetPath;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>

        <Card className="rounded-3xl border border-white/10 bg-slate-900/90 text-white p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Reset Password</div>
              <div className="text-xs text-slate-400">Authoritative Supabase Auth password recovery</div>
            </div>
          </div>

          {/* STEP 1: IDENTIFIER / EMAIL INPUT */}
          {step === "identifier" && (
            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-xs font-medium text-slate-300">
                  Registered Email or Login ID
                </Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. staff@sunshineschool.edu or ADMIN001"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-sm rounded-xl h-11 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                {loading ? "Sending Recovery Link..." : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" /> Send Recovery Link
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: EMAIL SENT NOTICE */}
          {step === "sent" && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <MailCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Check Your Inbox</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  We sent password recovery instructions to <strong className="text-emerald-400 font-semibold">{maskedEmail}</strong>.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Click the link in the email to automatically open password reset, or enter your new password below if you have the recovery link open.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => setStep("password")}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 rounded-xl cursor-pointer"
                >
                  I Have The Recovery Link / Session — Set Password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("identifier")}
                  className="w-full border-white/20 text-slate-300 hover:bg-white/10 h-10 rounded-xl cursor-pointer"
                >
                  Resend / Enter Different Email
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === "password" && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-xs font-medium text-slate-300">
                  New Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-sm rounded-xl h-11 pr-10 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-sm rounded-xl h-11 focus:ring-indigo-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                {loading ? "Updating Password..." : "Update Password in Supabase Auth"}
              </Button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Password Reset Successful!</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your new password is live in Supabase Auth. Your old password is now invalid, and both your Email and Login ID will log in with your new password.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleLoginNow}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-amber-500/30 transition cursor-pointer"
              >
                {loading ? "Signing In..." : "Sign In Now"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
