import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, KeyRound, ShieldCheck, CheckCircle2, Send, Clock, Lock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { requestOtpForIdentifier, verifyOtpCode, resetPasswordWithOtp } from "@/lib/passwordResets";
import { login } from "@/lib/supabaseAuth";
import { setSession } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — Email OTP" },
      { name: "description", content: "Secure email OTP password reset portal for all accounts." },
    ],
  }),
  component: ForgotPasswordPage,
});

type Step = "identifier" | "otp" | "password" | "success";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Expiry timer (10 mins = 600s)
  const [expirySeconds, setExpirySeconds] = useState(600);
  // Resend cooldown timer (60s)
  const [resendSeconds, setResendSeconds] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && expirySeconds > 0) {
      timer = setInterval(() => {
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expirySeconds]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && resendSeconds > 0) {
      timer = setInterval(() => {
        setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // STEP 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your Login ID or registered Email.");
      return;
    }

    setLoading(true);
    const res = await requestOtpForIdentifier(identifier.trim());
    setLoading(false);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    setMaskedEmail(res.emailMasked || "your registered email");
    if (res.otpDevFallback) {
      setDevOtp(res.otpDevFallback);
    }
    setStep("otp");
    setExpirySeconds(600);
    setResendSeconds(60);
    toast.success(`Verification OTP sent to ${res.emailMasked || "your email"}.`);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    const res = await requestOtpForIdentifier(identifier.trim());
    setLoading(false);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    if (res.otpDevFallback) {
      setDevOtp(res.otpDevFallback);
    }
    setOtp("");
    setExpirySeconds(600);
    setResendSeconds(60);
    toast.success(`Fresh OTP code sent to ${res.emailMasked || "your email"}.`);
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    if (expirySeconds <= 0) {
      toast.error("OTP code has expired. Please click Resend OTP.");
      return;
    }

    setLoading(true);
    const res = await verifyOtpCode(identifier.trim(), otp.trim());
    setLoading(false);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    setStep("password");
    toast.success("OTP verified successfully! Set your new password.");
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
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
    const res = await resetPasswordWithOtp(identifier.trim(), otp.trim(), newPassword);
    setLoading(false);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    setStep("success");
    toast.success("Password reset successfully!");
  };

  const handleLoginNow = async () => {
    setLoading(true);
    const loginRes = await login(identifier.trim(), newPassword);
    setLoading(false);

    if (loginRes.success && loginRes.profile) {
      const userObj = {
        loginId: loginRes.profile.login_id || identifier.trim(),
        role: loginRes.profile.role as any,
        name: loginRes.profile.full_name || "User",
        linkId: loginRes.profile.login_id || identifier.trim(),
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

      navigate({ to: targetPath });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
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
              <div className="text-xs text-slate-400">Cryptographically secure Email OTP verification</div>
            </div>
          </div>

          {/* STEP 1: IDENTIFIER INPUT */}
          {step === "identifier" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-xs font-medium text-slate-300">
                  Login ID or Registered Email
                </Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. TCH1528, PRT1528, 260001, or name@sunshineschool.edu"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-sm rounded-xl h-11 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-11 shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Sending OTP..." : "Send Verification OTP"}
              </Button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/20 p-3 text-xs text-indigo-200">
                <span>An OTP code was sent to </span>
                <span className="font-semibold text-white">{maskedEmail}</span>.
                {devOtp && (
                  <div className="mt-1.5 pt-1.5 border-t border-indigo-400/20 text-[11px] font-mono text-emerald-300">
                    🔑 [E2E Test Mode OTP]: <span className="font-bold tracking-widest">{devOtp}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp" className="text-xs font-medium text-slate-300">
                    6-Digit OTP Code
                  </Label>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>Expires in {formatTimer(expirySeconds)}</span>
                  </div>
                </div>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 849201"
                  className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-center font-mono text-xl tracking-widest rounded-xl h-12 focus:ring-indigo-500"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendSeconds > 0 || loading}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading || expirySeconds <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 shadow-lg disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {loading ? "Verifying..." : "Verify OTP Code"}
              </Button>
            </form>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
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
                    placeholder="Enter at least 6 characters"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-sm rounded-xl h-11 pr-10 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-11 shadow-lg disabled:opacity-50"
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? "Updating Password..." : "Reset Password & Save"}
              </Button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">Password Reset Complete!</div>
                <div className="text-xs text-slate-400 mt-1">
                  Your new password is active immediately. You can now sign in using your Login ID or registered Email.
                </div>
              </div>

              <Button
                onClick={handleLoginNow}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 shadow-lg mt-2"
              >
                {loading ? "Authenticating..." : "Sign In with New Password"}
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-slate-400">
            Remembered your password?{" "}
            <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
