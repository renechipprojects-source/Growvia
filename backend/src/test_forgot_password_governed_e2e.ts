import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
        if (key === "SUPABASE_URL") process.env.VITE_SUPABASE_URL = value.trim();
        if (key === "SUPABASE_SERVICE_ROLE_KEY") process.env.VITE_SUPABASE_ANON_KEY = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function runForgotPasswordGovernedE2ETest() {
  console.log("==================================================================================");
  console.log("🔑 GOVERNED FORGOT PASSWORD EMAIL OTP & MULTI-ROLE SECURITY E2E SUITE");
  console.log("==================================================================================");

  const { createClient } = await import("@supabase/supabase-js");
  const { generateTeacherCredential, generateParentCredential } = await import("../../frontend/src/lib/credentials");
  const { login } = await import("../../frontend/src/lib/supabaseAuth");
  const { requestOtpForIdentifier, verifyOtpCode, resetPasswordWithOtp } = await import("../../frontend/src/lib/passwordResets");

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const timestamp = Date.now();
  const runId = `${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
  const staffLoginId = `STF-OTP-${runId}`;
  const staffId = `TCH-OTP-${runId}`;
  const staffInitialPassword = `InitialPass@${runId}`;
  const staffNewPassword = `UpdatedPass@${runId}`;
  const staffEmail = `staff.otp.${runId}@sunshineschool.edu`;

  const parentLoginId = `PRT-OTP-${runId}`;
  const studentId = `STU-OTP-${runId}`;
  const parentInitialPassword = `ParentInit@${runId}`;
  const parentNewPassword = `ParentNew@${runId}`;
  const parentEmail = `prt.otp.${runId}@growvia.edu`;

  // Helper to securely fetch the latest OTP code from database (simulating email receiver)
  async function fetchLatestOtpFromInbox(loginIdOrEmail: string): Promise<string> {
    const { data: requests } = await adminSupabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "otp_reset");

    if (requests) {
      let latestMeta: any = null;
      for (const r of requests) {
        try {
          const m = JSON.parse(r.reason_or_notes || "{}");
          if (
            (m.loginId?.toLowerCase() === loginIdOrEmail.toLowerCase() ||
             m.email?.toLowerCase() === loginIdOrEmail.toLowerCase()) &&
            !m.invalidated &&
            !m.used
          ) {
            if (!latestMeta || m.expiresAt > latestMeta.expiresAt) {
              latestMeta = m;
            }
          }
        } catch {}
      }
      if (latestMeta && latestMeta.otp) return latestMeta.otp;
    }
    throw new Error(`No active OTP found in inbox store for '${loginIdOrEmail}'`);
  }

  // SETUP: Provision Staff A and Parent A
  console.log("\n[SETUP] Provisioning Staff A and Parent A accounts...");
  const teachCred = generateTeacherCredential(staffId, {
    customLoginId: staffLoginId,
    password: staffInitialPassword,
    teacher: { id: staffId, name: "Staff OTP Test", email: staffEmail, phone: "9876543210" } as any,
  });
  if ((teachCred as any)._provisionPromise) await (teachCred as any)._provisionPromise;

  const parentCred = generateParentCredential(studentId, {
    customLoginId: parentLoginId,
    password: parentInitialPassword,
    student: { id: studentId, name: "Student OTP Test", admissionNo: `ADM-${runId}`, parent: "Parent OTP Test", phone: "9876543210" } as any,
  });
  if ((parentCred as any)._provisionPromise) await (parentCred as any)._provisionPromise;

  await new Promise((r) => setTimeout(r, 800));

  // TEST 1: Request OTP for Staff Login ID & Verify No Exposure in Response
  console.log(`\n[TEST 1] Requesting OTP for Staff Login ID '${staffLoginId}'...`);
  const reqRes1 = await requestOtpForIdentifier(staffLoginId);
  console.log(`  - Public API Response Message: "${reqRes1.message}"`);
  console.log(`  - Masked Email in Response: "${reqRes1.emailMasked}"`);
  if (!reqRes1.success) {
    throw new Error("FAIL: Failed to request OTP for Staff Login ID!");
  }
  if ((reqRes1 as any).otpDevFallback || (reqRes1 as any).otp) {
    throw new Error("FAIL: SECURITY BREACH! Raw OTP was exposed in public API response!");
  }
  console.log("  [PASS] OTP requested successfully & raw OTP verified zero-exposure in API response.");

  // TEST 2: Retrieve OTP from inbox store & Wrong OTP Code Rejection
  const staffOtp1 = await fetchLatestOtpFromInbox(staffLoginId);
  console.log(`\n[TEST 2] Verifying Wrong OTP rejection (Real OTP: ${staffOtp1})...`);
  const wrongOtpRes = await verifyOtpCode(staffLoginId, "000000");
  console.log(`  - Result: ${wrongOtpRes.message}`);
  if (wrongOtpRes.success) {
    throw new Error("FAIL: Invalid OTP code was accepted!");
  }
  console.log("  [PASS] Wrong OTP code correctly rejected.");

  // TEST 3: Resend OTP (Previous OTP Invalidation)
  console.log("\n[TEST 3] Testing Resend OTP & previous OTP invalidation...");
  const reqRes2 = await requestOtpForIdentifier(staffLoginId);
  if (!reqRes2.success) {
    throw new Error("FAIL: Failed to resend OTP!");
  }
  const staffOtp2 = await fetchLatestOtpFromInbox(staffLoginId);
  console.log(`  - Resent OTP Code from inbox: ${staffOtp2}`);

  // Attempt to use previous invalidated OTP (staffOtp1)
  const invalidatedRes = await verifyOtpCode(staffLoginId, staffOtp1);
  console.log(`  - Result using previous OTP (${staffOtp1}): ${invalidatedRes.message}`);
  if (invalidatedRes.success) {
    throw new Error("FAIL: Previous invalidated OTP was accepted!");
  }
  console.log("  [PASS] Previous OTP code correctly invalidated upon resend.");

  // TEST 4: Verify Valid OTP & Reset Password for Staff A
  console.log("\n[TEST 4] Verifying valid OTP and resetting Staff A password...");
  const verifyRes = await verifyOtpCode(staffLoginId, staffOtp2);
  if (!verifyRes.success) {
    throw new Error(`FAIL: Valid OTP verification failed: ${verifyRes.message}`);
  }

  const resetRes = await resetPasswordWithOtp(staffLoginId, staffOtp2, staffNewPassword);
  console.log(`  - Result: ${resetRes.message}`);
  if (!resetRes.success) {
    throw new Error(`FAIL: Password reset failed: ${resetRes.message}`);
  }
  console.log("  [PASS] Password reset successfully.");

  // TEST 5: Single-Use Protection (Re-using staffOtp2 must fail)
  console.log("\n[TEST 5] Testing Single-Use Protection (Re-using staffOtp2)...");
  const reuseRes = await resetPasswordWithOtp(staffLoginId, staffOtp2, "AnotherPass@123");
  console.log(`  - Result: ${reuseRes.message}`);
  if (reuseRes.success) {
    throw new Error("FAIL: Used OTP code was accepted a second time!");
  }
  console.log("  [PASS] Single-use protection verified: Used OTP code rejected.");

  // TEST 6: Old Password Rejection & New Password Login for Staff A
  console.log("\n[TEST 6] Testing Old Password Rejection & New Password Login for Staff A...");
  const oldPassLogin = await login(staffLoginId, staffInitialPassword);
  if (oldPassLogin.success) {
    throw new Error("FAIL: Old password still worked after reset!");
  }
  console.log("  - Old password login correctly REJECTED.");

  const newPassLogin = await login(staffLoginId, staffNewPassword);
  if (!newPassLogin.success || !newPassLogin.user) {
    throw new Error(`FAIL: Login with new password failed: ${newPassLogin.error}`);
  }
  console.log(`  - New password login SUCCESS! User: ${newPassLogin.user.email}, Role: ${newPassLogin.profile?.role}`);
  console.log("  [PASS] Staff A reset password & immediate login verified.");

  // TEST 7: Complete Parent OTP Reset Flow
  console.log(`\n[TEST 7] Testing Complete Parent OTP Reset Flow for '${parentLoginId}'...`);
  const parentOtpReq = await requestOtpForIdentifier(parentLoginId);
  if (!parentOtpReq.success) {
    throw new Error("FAIL: Failed to request OTP for Parent Login ID!");
  }
  const parentOtp = await fetchLatestOtpFromInbox(parentLoginId);

  const parentReset = await resetPasswordWithOtp(parentLoginId, parentOtp, parentNewPassword);
  if (!parentReset.success) {
    throw new Error(`FAIL: Parent password reset failed: ${parentReset.message}`);
  }

  const parentLoginNew = await login(parentLoginId, parentNewPassword);
  if (!parentLoginNew.success || !parentLoginNew.user) {
    throw new Error(`FAIL: Parent login with new password failed: ${parentLoginNew.error}`);
  }
  console.log(`  - Parent new password login SUCCESS! User: ${parentLoginNew.user.email}, Role: ${parentLoginNew.profile?.role}`);
  console.log("  [PASS] Parent OTP reset flow verified.");

  // TEST 8: Registered Email Reset Flow
  console.log(`\n[TEST 8] Testing Registered Email OTP Reset Flow for '${staffEmail}'...`);
  const emailOtpReq = await requestOtpForIdentifier(staffEmail);
  if (!emailOtpReq.success) {
    throw new Error("FAIL: Failed to request OTP for Staff Email!");
  }
  const emailOtp = await fetchLatestOtpFromInbox(staffEmail);
  const emailNewPassword = `EmailUpdated@${runId}`;

  const emailReset = await resetPasswordWithOtp(staffEmail, emailOtp, emailNewPassword);
  if (!emailReset.success) {
    throw new Error(`FAIL: Email password reset failed: ${emailReset.message}`);
  }

  const emailLoginNew = await login(staffEmail, emailNewPassword);
  if (!emailLoginNew.success || !emailLoginNew.user) {
    throw new Error(`FAIL: Email login with new password failed: ${emailLoginNew.error}`);
  }
  console.log(`  - Email login with new password SUCCESS! User: ${emailLoginNew.user.email}`);
  console.log("  [PASS] Registered email OTP reset flow verified.");

  // TEST 9: Multi-Role Verification (Admin, Principal, Office accounts)
  console.log("\n[TEST 9] Verifying OTP Reset readiness for Admin, Principal, and Office roles...");
  const rolesToTest = [
    { role: "admin", email: "admin@sunshineschool.edu" },
    { role: "principal", email: "principal@sunshineschool.edu" },
    { role: "office", email: "office@sunshineschool.edu" },
  ];

  for (const item of rolesToTest) {
    const rRes = await requestOtpForIdentifier(item.email);
    if (!rRes.success) {
      throw new Error(`FAIL: Failed OTP request for ${item.role} email '${item.email}'`);
    }
    const rOtp = await fetchLatestOtpFromInbox(item.email);
    if (!rOtp) {
      throw new Error(`FAIL: OTP code not generated for ${item.role}`);
    }
    console.log(`  ✓ ${item.role.toUpperCase()} account ('${item.email}') OTP request verified.`);
  }
  console.log("  [PASS] All 5 system roles (Staff, Parent, Admin, Principal, Office) verified.");

  // TEST 10: Safe Invalid User Handling
  console.log("\n[TEST 10] Verifying Safe Invalid User handling...");
  const invalidReq = await requestOtpForIdentifier("nonexistent_user_9999");
  if (!invalidReq.success) {
    throw new Error("FAIL: Invalid user request threw an unhandled error!");
  }
  console.log(`  - Safe response: ${invalidReq.message}`);
  console.log("  [PASS] Safe invalid user response verified.");

  // CLEANUP
  console.log("\n[CLEANUP] Cleaning test accounts from database...");
  const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
  const staffAuth = authUsers?.users.find((u) => u.email?.toLowerCase() === staffEmail.toLowerCase());
  if (staffAuth?.id) await adminSupabase.auth.admin.deleteUser(staffAuth.id);

  const parentAuth = authUsers?.users.find((u) => u.email?.toLowerCase() === parentEmail.toLowerCase());
  if (parentAuth?.id) await adminSupabase.auth.admin.deleteUser(parentAuth.id);

  await adminSupabase.from("gv_users").delete().or(`login_id.eq.${staffLoginId},login_id.eq.${parentLoginId}`);
  await adminSupabase.from("gv_requests").delete().or(`id.eq.cred_teacher_${staffId},id.eq.cred_parent_${studentId}`);
  await adminSupabase.from("gv_requests").delete().eq("request_type", "otp_reset").or(`applicant_or_child_name.eq.${staffLoginId},applicant_or_child_name.eq.${parentLoginId}`);
  console.log("  [PASS] Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 GOVERNED FORGOT PASSWORD OTP E2E RESULT: PASS (All 10 Tests Verified)");
  console.log("==================================================================================");
}

runForgotPasswordGovernedE2ETest().catch((err) => {
  console.error("E2E test exception:", err);
  process.exit(1);
});
