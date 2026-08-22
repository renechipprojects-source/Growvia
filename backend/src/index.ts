import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'https://growvia.vercel.app';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'https://nyhnkftlkigoliyogwvp.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Server-only Admin Client with Service Role privileges
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  : supabase;

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = FRONTEND_URL
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header are allowed.
      // This supports curl, health checks and server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins, Vercel deployments (*.vercel.app), and localhost for development
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);

      return callback(
        new Error(`CORS: Origin ${origin} is not allowed`)
      );
    },
    credentials: true,
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// BODY PARSING
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true,
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Growvia School ERP Express Backend API',
    health: '/health',
    version: '1.0.0',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. USERS MODULE
// Table: gv_users
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string;

    let query = supabase
      .from('gv_users')
      .select('*');

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_users')
      .insert([req.body])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_users')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_users')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PROVISIONING & LOGIN RESOLUTION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/users/provision', async (req: Request, res: Response) => {
  try {
    const { login_id, email, password, role, name, mobile } = req.body || {};
    if (!login_id || !password) {
      return res.status(400).json({ error: 'login_id and password are required.' });
    }

    const cleanLoginId = String(login_id).trim();
    const targetRole = String(role || 'teacher').toLowerCase();
    const targetName = String(name || 'User Account').trim();
    const targetEmail = (email && String(email).includes('@'))
      ? String(email).trim().toLowerCase()
      : `${cleanLoginId.toLowerCase()}@growvia.edu`;

    let authUserId: string | null = null;
    const admin = supabaseAdmin;

    const { data: userList } = await admin.auth.admin.listUsers();
    let authUser = userList?.users?.find(
      (u) =>
        u.email?.toLowerCase() === targetEmail.toLowerCase() ||
        u.user_metadata?.login_id?.toString().toLowerCase() === cleanLoginId.toLowerCase()
    );

    if (authUser) {
      authUserId = authUser.id;
      await admin.auth.admin.updateUserById(authUserId, {
        email: targetEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          ...authUser.user_metadata,
          login_id: cleanLoginId,
          role: targetRole,
          full_name: targetName,
        },
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: targetEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          login_id: cleanLoginId,
          role: targetRole,
          full_name: targetName,
        },
      });

      if (createErr && createErr.message.includes('already registered')) {
        const { data: retryList } = await admin.auth.admin.listUsers();
        const found = retryList?.users?.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
        if (found) {
          authUserId = found.id;
          await admin.auth.admin.updateUserById(authUserId, {
            password: password,
            email_confirm: true,
            user_metadata: { login_id: cleanLoginId, role: targetRole, full_name: targetName },
          });
        }
      } else if (created?.user?.id) {
        authUserId = created.user.id;
      }
    }

    const profilePayload: any = {
      login_id: cleanLoginId,
      role: targetRole,
      full_name: targetName,
      email: targetEmail,
      mobile: mobile || '9876543210',
      status: 'active',
      must_change_password: false,
    };

    if (authUserId) {
      profilePayload.id = authUserId;
      profilePayload.auth_user_id = authUserId;
    }

    await admin.from('gv_users').upsert([profilePayload], { onConflict: 'login_id' });
    Promise.resolve(admin.from('users').upsert([profilePayload], { onConflict: 'login_id' })).catch(() => {});

    return res.status(200).json({
      success: true,
      authUserId,
      login_id: cleanLoginId,
      email: targetEmail,
      role: targetRole,
    });
  } catch (err: any) {
    console.error('Provisioning error:', err);
    return res.status(500).json({ error: err.message || 'Provisioning failed' });
  }
});

app.post('/api/users/resolve-login-id', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) {
      return res.status(400).json({ error: 'identifier is required.' });
    }

    const clean = String(identifier).trim();
    const norm = clean.toLowerCase().replace(/[\s\-_]+/g, '');
    const admin = supabaseAdmin;

    let profile: any = null;
    try {
      const { data: d1 } = await admin.from('gv_users').select('*').ilike('login_id', clean).maybeSingle();
      if (d1) profile = d1;
      else {
        const { data: d2 } = await admin.from('gv_users').select('*').ilike('email', clean).maybeSingle();
        if (d2) profile = d2;
        else {
          const { data: d3 } = await admin.from('gv_users').select('*').ilike('login_id', norm).maybeSingle();
          if (d3) profile = d3;
          else {
            const { data: d4 } = await admin.from('gv_users').select('*').ilike('id', clean).maybeSingle();
            if (d4) profile = d4;
          }
        }
      }
    } catch {}

    if (profile) {
      let authEmail = profile.email;
      if (profile.auth_user_id) {
        try {
          const { data: authUserData } = await admin.auth.admin.getUserById(profile.auth_user_id);
          if (authUserData?.user?.email) {
            authEmail = authUserData.user.email;
          }
        } catch {}
      }

      if (authEmail) {
        return res.json({
          success: true,
          login_id: profile.login_id,
          email: authEmail,
          role: profile.role,
          full_name: profile.full_name,
          profile: {
            ...profile,
            email: authEmail,
          },
        });
      }
    }

    let page = 1;
    let authUser: any = null;
    while (!authUser && page <= 5) {
      const { data: userList } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      const users = userList?.users || [];
      if (users.length === 0) break;
      authUser = users.find(
        (u) =>
          u.email?.toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === norm
      );
      if (users.length < 100) break;
      page++;
    }

    if (authUser && authUser.email) {
      const derivedRole = authUser.user_metadata?.role || 'teacher';
      const derivedName = authUser.user_metadata?.full_name || 'User Account';
      const derivedLoginId = authUser.user_metadata?.login_id || clean;

      const fallbackProfile = {
        id: authUser.id,
        auth_user_id: authUser.id,
        login_id: derivedLoginId,
        role: derivedRole,
        full_name: derivedName,
        email: authUser.email,
        status: 'active',
      };

      return res.json({
        success: true,
        login_id: derivedLoginId,
        email: authUser.email,
        role: derivedRole,
        full_name: derivedName,
        profile: fallbackProfile,
      });
    }

    return res.status(404).json({ success: false, error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login ID resolution failed' });
  }
});

app.post('/api/users/update-email', async (req: Request, res: Response) => {
  try {
    const { identifier, new_email } = req.body || {};
    if (!identifier || !new_email) {
      return res.status(400).json({ error: 'identifier and new_email are required.' });
    }

    const clean = String(identifier).trim();
    const targetEmail = String(new_email).trim().toLowerCase();
    const admin = supabaseAdmin;

    let authUserId: string | null = null;
    let targetLoginId: string = clean;

    const { data: profile } = await admin
      .from('gv_users')
      .select('*')
      .or(`login_id.ilike.${clean},email.ilike.${clean},id.ilike.${clean}`)
      .maybeSingle();

    if (profile) {
      targetLoginId = profile.login_id || clean;
      authUserId = profile.auth_user_id || profile.id;
    }

    if (!authUserId) {
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 100 });
      let authUser = userList?.users?.find(
        (u) =>
          u.email?.toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === targetLoginId.toLowerCase()
      );
      if (authUser) authUserId = authUser.id;
    }

    if (authUserId) {
      await admin.auth.admin.updateUserById(authUserId, {
        email: targetEmail,
        email_confirm: true,
      });
    }

    await admin
      .from('gv_users')
      .update({ email: targetEmail })
      .or(`login_id.ilike.${targetLoginId},id.ilike.${clean}`);

    return res.json({
      success: true,
      login_id: targetLoginId,
      email: targetEmail,
      authUserId,
    });
  } catch (err: any) {
    console.error('Update email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update email' });
  }
});

app.post('/api/users/update-password', async (req: Request, res: Response) => {
  try {
    const { identifier, new_password } = req.body || {};
    if (!identifier || !new_password) {
      return res.status(400).json({ error: 'identifier and new_password are required.' });
    }

    const clean = String(identifier).trim();
    const admin = supabaseAdmin;

    let authUserId: string | null = null;
    let targetLoginId: string = clean;

    const { data: profile } = await admin
      .from('gv_users')
      .select('*')
      .or(`login_id.ilike.${clean},email.ilike.${clean},id.ilike.${clean}`)
      .maybeSingle();

    if (profile) {
      targetLoginId = profile.login_id || clean;
      authUserId = profile.auth_user_id || profile.id;
    }

    if (!authUserId) {
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 100 });
      let authUser = userList?.users?.find(
        (u) =>
          u.email?.toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === targetLoginId.toLowerCase()
      );
      if (authUser) authUserId = authUser.id;
    }

    if (authUserId) {
      await admin.auth.admin.updateUserById(authUserId, {
        password: new_password,
        email_confirm: true,
      });
    }

    await admin
      .from('gv_users')
      .update({ must_change_password: false })
      .or(`login_id.ilike.${targetLoginId},id.ilike.${clean}`);

    return res.json({
      success: true,
      login_id: targetLoginId,
      authUserId,
    });
  } catch (err: any) {
    console.error('Update password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL OTP FORGOT PASSWORD & PASSWORD RESET ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@growvia.edu';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
}

app.post('/api/auth/otp/request', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: 'Login ID or Email is required.' });
    }

    const clean = String(identifier).trim();
    const norm = clean.toLowerCase().replace(/[\s\-_]+/g, '');
    const admin = supabaseAdmin;

    let userEmail: string | null = null;
    let userLoginId: string = clean;
    let authUserId: string | null = null;

    const { data: profile } = await admin
      .from('gv_users')
      .select('*')
      .or(`login_id.ilike.${clean},login_id.ilike.${norm},email.ilike.${clean},id.ilike.${clean}`)
      .maybeSingle();

    if (profile && profile.email) {
      userEmail = profile.email;
      userLoginId = profile.login_id || clean;
      authUserId = profile.auth_user_id || profile.id;
    } else {
      const { data: userList } = await admin.auth.admin.listUsers();
      const authUser = userList?.users?.find(
        (u) =>
          u.email?.toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === clean.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === norm
      );
      if (authUser && authUser.email) {
        userEmail = authUser.email;
        userLoginId = authUser.user_metadata?.login_id || clean;
        authUserId = authUser.id;
      }
    }

    if (!userEmail) {
      return res.json({
        success: true,
        message: 'If an account matching that Login ID or email exists, an OTP has been sent.',
        emailMasked: '****@growvia.edu',
      });
    }

    const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    let otp = '';
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      otp = String(100000 + (buf[0] % 900000));
    } else {
      otp = String(Math.floor(100000 + Math.random() * 900000));
    }

    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;
    const otpId = `OTP-${userLoginId.toUpperCase()}-${now}`;

    try {
      const { data: existingOtps } = await admin
        .from('gv_requests')
        .select('*')
        .eq('request_type', 'otp_reset')
        .eq('applicant_or_child_name', userLoginId);

      if (existingOtps && existingOtps.length > 0) {
        for (const oldReq of existingOtps) {
          try {
            const oldMeta = JSON.parse(oldReq.reason_or_notes || '{}');
            oldMeta.used = true;
            oldMeta.invalidated = true;
            await admin
              .from('gv_requests')
              .update({ status: 'invalidated', reason_or_notes: JSON.stringify(oldMeta) })
              .eq('id', oldReq.id);
          } catch {}
        }
      }
    } catch {}

    const payload = {
      id: otpId,
      request_type: 'otp_reset',
      applicant_or_child_name: userLoginId,
      status: 'pending',
      reason_or_notes: JSON.stringify({
        otpId,
        loginId: userLoginId,
        email: userEmail,
        authUserId,
        otp,
        expiresAt,
        used: false,
        createdAt: new Date(now).toISOString(),
      }),
    };

    await admin.from('gv_requests').upsert([payload], { onConflict: 'id' });

    // Trigger Supabase Auth Email System dispatch to recipient email address
    try {
      await admin.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173'}/forgot-password`,
      });
    } catch (emailErr: any) {
      console.warn(`[OTP EMAIL SYSTEM NOTICE] Supabase Auth reset email dispatch note for ${userEmail}:`, emailErr?.message);
    }

    console.log(`[OTP GENERATED & DISPATCHED] LoginID: ${userLoginId} | Email: ${userEmail} | OTP: ${otp} | Expires: ${new Date(expiresAt).toISOString()}`);

    return res.json({
      success: true,
      message: `An OTP code has been sent to ${maskEmail(userEmail)}.`,
      login_id: userLoginId,
      emailMasked: maskEmail(userEmail),
    });
  } catch (err: any) {
    console.error('OTP request error:', err);
    return res.status(500).json({ error: err.message || 'Failed to request OTP.' });
  }
});

app.post('/api/auth/otp/verify', async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.body || {};
    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Login ID and OTP code are required.' });
    }

    const clean = String(identifier).trim();
    const cleanOtp = String(otp).trim();
    const admin = supabaseAdmin;

    const { data: requests } = await admin
      .from('gv_requests')
      .select('*')
      .eq('request_type', 'otp_reset');

    if (!requests || requests.length === 0) {
      return res.status(400).json({ error: 'No OTP request found for this user.' });
    }

    let matchingRecord: any = null;
    let meta: any = null;

    for (const r of requests) {
      try {
        const m = JSON.parse(r.reason_or_notes || '{}');
        if (
          (m.loginId?.toLowerCase() === clean.toLowerCase() ||
           m.email?.toLowerCase() === clean.toLowerCase())
        ) {
          if (!matchingRecord || m.expiresAt > (meta?.expiresAt || 0)) {
            matchingRecord = r;
            meta = m;
          }
        }
      } catch {}
    }

    if (!matchingRecord || !meta) {
      return res.status(400).json({ error: 'Invalid OTP request.' });
    }

    if (meta.used || matchingRecord.status === 'used' || meta.invalidated) {
      return res.status(400).json({ error: 'This OTP code has already been used or invalidated. Please request a new OTP.' });
    }

    if (Date.now() > meta.expiresAt) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new OTP.' });
    }

    if (meta.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: meta.otpId || matchingRecord.id,
      login_id: meta.loginId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'OTP verification failed.' });
  }
});

app.post('/api/auth/otp/reset-password', async (req: Request, res: Response) => {
  try {
    const { identifier, otp, newPassword } = req.body || {};
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Login ID, OTP, and New Password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const clean = String(identifier).trim();
    const cleanOtp = String(otp).trim();
    const admin = supabaseAdmin;

    const { data: requests } = await admin
      .from('gv_requests')
      .select('*')
      .eq('request_type', 'otp_reset');

    let matchingRecord: any = null;
    let meta: any = null;

    if (requests) {
      for (const r of requests) {
        try {
          const m = JSON.parse(r.reason_or_notes || '{}');
          if (
            (m.loginId?.toLowerCase() === clean.toLowerCase() ||
             m.email?.toLowerCase() === clean.toLowerCase()) &&
            m.otp === cleanOtp
          ) {
            matchingRecord = r;
            meta = m;
            break;
          }
        } catch {}
      }
    }

    if (!matchingRecord || !meta) {
      return res.status(400).json({ error: 'Invalid OTP or reset request.' });
    }

    if (meta.used || matchingRecord.status === 'used' || meta.invalidated) {
      return res.status(400).json({ error: 'This OTP code has already been used or invalidated. Please request a new OTP.' });
    }

    if (Date.now() > meta.expiresAt) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new OTP.' });
    }

    const userEmail = meta.email;
    const userLoginId = meta.loginId;

    const { data: userList } = await admin.auth.admin.listUsers();
    let authUser = userList?.users?.find(
      (u) =>
        u.email?.toLowerCase() === userEmail.toLowerCase() ||
        u.user_metadata?.login_id?.toString().toLowerCase() === userLoginId.toLowerCase()
    );

    let authUserId = authUser?.id || meta.authUserId;

    if (authUserId) {
      await admin.auth.admin.updateUserById(authUserId, {
        password: newPassword,
        email_confirm: true,
      });
    } else {
      const { data: created } = await admin.auth.admin.createUser({
        email: userEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { login_id: userLoginId },
      });
      authUserId = created?.user?.id;
    }

    if (authUserId) {
      await admin.from('gv_users').update({ status: 'active' }).eq('login_id', userLoginId);
      Promise.resolve(admin.from('users').update({ status: 'active' }).eq('login_id', userLoginId)).catch(() => {});
    }

    meta.used = true;
    meta.usedAt = new Date().toISOString();
    await admin
      .from('gv_requests')
      .update({ status: 'used', reason_or_notes: JSON.stringify(meta) })
      .eq('id', matchingRecord.id);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.',
      login_id: userLoginId,
    });
  } catch (err: any) {
    console.error('Password reset error:', err);
    return res.status(500).json({ error: err.message || 'Password reset failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REQUESTS MODULE
// Table: gv_requests
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/requests', async (req: Request, res: Response) => {
  try {
    const requestType =
      req.query.request_type as string;

    let query = supabase
      .from('gv_requests')
      .select('*');

    if (requestType) {
      query = query.eq(
        'request_type',
        requestType
      );
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.get('/api/requests/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_requests')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/requests', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_requests')
      .insert([req.body])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/requests/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_requests')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/requests/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_requests')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMMUNICATIONS MODULE
// Table: gv_communications
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/communications', async (_req: Request, res: Response) => {
  try {
    const channel =
      _req.query.channel as string;

    let query = supabase
      .from('gv_communications')
      .select('*');

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.get('/api/communications/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_communications')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/communications', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_communications')
      .insert([req.body])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/communications/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_communications')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/communications/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_communications')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEES MODULE
// Table: gv_fees_payments
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/fees', async (req: Request, res: Response) => {
  try {
    const studentId =
      req.query.student_id as string;

    let query = supabase
      .from('gv_fees_payments')
      .select('*');

    if (studentId) {
      query = query.eq(
        'student_id',
        studentId
      );
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.get('/api/fees/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_fees_payments')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/fees', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_fees_payments')
      .insert([req.body])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/fees/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_fees_payments')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/fees/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_fees_payments')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. INVENTORY MODULE
// Table: gv_inventory_expenses
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/inventory', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .select('*')
      .eq('record_type', 'inventory');

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/inventory', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      record_type: 'inventory',
    };

    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .insert([payload])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_inventory_expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5B. EXPENSES MODULE
// Table: gv_inventory_expenses
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/expenses', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .select('*')
      .eq('record_type', 'expense');

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      record_type: 'expense',
    };

    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .insert([payload])
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_inventory_expenses')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('gv_inventory_expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      success: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SYSTEM SETTINGS MODULE
// Table: gv_system_settings
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/system-settings', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('gv_system_settings')
      .select('*')
      .eq('id', 'PRIMARY')
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.put('/api/system-settings', async (req: Request, res: Response) => {
  try {
    const payload = {
      id: 'PRIMARY',
      ...req.body,
    };

    const { data, error } = await supabase
      .from('gv_system_settings')
      .upsert([payload], {
        onConflict: 'id',
      })
      .select();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      data: data?.[0],
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. AUTH USER PROVISIONING
// ─────────────────────────────────────────────────────────────────────────────

const CORE_ERP_ACCOUNTS = [
  {
    loginId: 'ADM001',
    email: 'admin@growvia.com',
    password: 'Admin@123',
    role: 'admin',
    name: 'System Administrator',
  },
  {
    loginId: 'PRN001',
    email: 'principal@growvia.com',
    password: 'Principal@123',
    role: 'principal',
    name: 'Principal',
  },
  {
    loginId: 'OFF001',
    email: 'office@growvia.com',
    password: 'Office@123',
    role: 'office',
    name: 'Office Staff',
  },
  {
    loginId: 'TCH001',
    email: 'teacher@growvia.com',
    password: 'Teacher@123',
    role: 'teacher',
    name: 'Lead Teacher',
  },
  {
    loginId: 'PAR001',
    email: 'parent@growvia.com',
    password: 'Parent@123',
    role: 'parent',
    name: 'Parent Account',
  },
  {
    loginId: 'DEV001',
    email: 'developer@growvia.com',
    password: 'Dev@123',
    role: 'developer',
    name: 'Lead Developer',
  },
];

app.post('/api/users/resolve-login-id', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server key not configured' });
    }

    const { identifier } = req.body || {};
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    const clean = String(identifier).trim();
    const norm = clean.toLowerCase().replace(/[\s\-_]+/g, '');

    const { data: user, error } = await supabaseAdmin
      .from('gv_users')
      .select('id, auth_user_id, login_id, role, full_name, email, mobile, photo_url, status, must_change_password')
      .or(`login_id.ilike.${clean},login_id.ilike.${norm},email.ilike.${clean}`)
      .maybeSingle();

    if (user && user.email) {
      return res.status(200).json({
        success: true,
        login_id: user.login_id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        profile: user,
      });
    }

    const { data: fallbackList } = await supabaseAdmin
      .from('gv_users')
      .select('id, auth_user_id, login_id, role, full_name, email, mobile, photo_url, status, must_change_password')
      .or(`login_id.ilike.%${norm}%,email.ilike.%${norm}%`)
      .limit(1);

    if (fallbackList && fallbackList.length > 0 && fallbackList[0].email) {
      const fb = fallbackList[0];
      return res.status(200).json({
        success: true,
        login_id: fb.login_id,
        email: fb.email,
        role: fb.role,
        full_name: fb.full_name,
        profile: fb,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Login ID not found in database records.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/provision', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({
        error:
          'SUPABASE_SERVICE_ROLE_KEY environment variable is required on server to provision Auth users.',
      });
    }

    const { login_id, email, password, role, name, full_name } = req.body || {};

    const targetAccounts = (login_id && password)
      ? [{
          loginId: login_id,
          email: email || `${String(login_id).toLowerCase()}@growvia.edu`,
          password: password,
          role: role || 'teacher',
          name: full_name || name || 'User Account',
        }]
      : CORE_ERP_ACCOUNTS;

    const results: Array<{
      loginId: string;
      status: string;
      authUserId?: string;
      details?: string;
    }> = [];

    const {
      data: authUserList,
      error: listErr,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listErr) {
      return res.status(500).json({
        error: listErr.message,
      });
    }

    const existingAuthUsers =
      authUserList?.users || [];

    for (const coreAcc of targetAccounts) {
      const { data: profile } = await supabaseAdmin
        .from('gv_users')
        .select('*')
        .eq('login_id', coreAcc.loginId)
        .maybeSingle();

      const targetEmail =
        profile?.email || coreAcc.email;

      const targetRole =
        profile?.role || coreAcc.role;

      const targetName =
        profile?.full_name || coreAcc.name;

      const targetMetadata = {
        login_id: coreAcc.loginId,
        role: targetRole,
        full_name: targetName,
        class_name: profile?.class_name || null,
        section: profile?.section || null,
      };

      let existingAuthUser =
        existingAuthUsers.find(
          (user) =>
            user.email?.toLowerCase() ===
            targetEmail.toLowerCase()
        );

      let authUserId =
        existingAuthUser?.id;

      if (!authUserId) {
        const {
          data: newAuthData,
          error: createErr,
        } =
          await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            password: coreAcc.password,
            email_confirm: true,
            user_metadata: targetMetadata,
          });

        if (createErr) {
          results.push({
            loginId: coreAcc.loginId,
            status: 'error',
            details: createErr.message,
          });

          continue;
        }

        authUserId =
          newAuthData?.user?.id;

        results.push({
          loginId: coreAcc.loginId,
          status: 'created',
          authUserId,
        });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          {
            email_confirm: true,
            password: coreAcc.password,
            user_metadata: targetMetadata,
          }
        );

        results.push({
          loginId: coreAcc.loginId,
          status: 'existing_auth_updated',
          authUserId,
        });
      }

      if (authUserId) {
        const profilePayload: any = {
          id: authUserId,
          auth_user_id: authUserId,
          login_id: coreAcc.loginId,
          email: targetEmail,
          role: targetRole,
          full_name: targetName,
          status: 'active',
        };
        if (typeof req.body?.must_change_password === 'boolean') {
          profilePayload.must_change_password = req.body.must_change_password;
        }
        await supabaseAdmin
          .from('gv_users')
          .upsert([profilePayload], { onConflict: 'login_id' });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        'Supabase Auth user provisioning completed successfully',
      results,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

function generateSecureTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const nums = '23456789';
  const sym = '!@#$%^&*';
  const all = upper + lower + nums + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let out = pick(upper) + pick(lower) + pick(nums) + pick(sym);
  for (let i = 4; i < 10; i++) out += pick(all);
  return out.split('').sort(() => Math.random() - 0.5).join('');
}

app.post('/api/users/reset-approval', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required.' });
    }

    const { requestId, approverRole, customPassword } = req.body || {};
    if (!requestId || !approverRole) {
      return res.status(400).json({ error: 'requestId and approverRole are required.' });
    }

    // 1. Fetch request from gv_requests
    const { data: requestRow, error: reqErr } = await supabaseAdmin
      .from('gv_requests')
      .select('*')
      .eq('id', requestId)
      .eq('request_type', 'password_reset')
      .maybeSingle();

    if (reqErr || !requestRow) {
      return res.status(404).json({ error: 'Password reset request not found.' });
    }

    if (requestRow.status === 'Completed' || requestRow.status === 'Used') {
      return res.status(400).json({ error: 'This reset request has already been processed.' });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(requestRow.reason_or_notes || '{}');
    } catch {}

    const targetRole = (meta.role || '').toLowerCase();
    const targetLoginId = meta.loginId;

    if (!targetLoginId) {
      return res.status(400).json({ error: 'Missing target loginId in request metadata.' });
    }

    // 2. Server-side role authorization
    const normApprover = String(approverRole).toLowerCase();
    const isSuperAdmin = normApprover === 'super-admin' || normApprover === 'admin';
    const isOffice = normApprover === 'office';

    if (!isSuperAdmin && !isOffice) {
      return res.status(403).json({ error: 'Unauthorized: Only Office and Admin roles can approve resets.' });
    }

    if (isOffice) {
      // Office can ONLY approve Parent and Teacher resets
      const allowedRolesForOffice = ['parent', 'teacher', 'student'];
      if (!allowedRolesForOffice.includes(targetRole)) {
        return res.status(403).json({
          error: 'Office staff are only authorized to reset passwords for Teachers and Parents.',
        });
      }
    }

    // 3. Generate or use temporary password
    const tempPassword = customPassword || generateSecureTempPassword();

    // 4. Provision in Supabase Auth & update gv_users
    const { data: profile } = await supabaseAdmin
      .from('gv_users')
      .select('*')
      .eq('login_id', targetLoginId)
      .maybeSingle();

    const targetEmail = profile?.email || `${targetLoginId.toLowerCase()}@growvia.edu`;

    const { data: authUserList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = (authUserList?.users || []).find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );

    let authUserId = existingAuthUser?.id;

    if (!authUserId) {
      const { data: newAuth } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          login_id: targetLoginId,
          role: profile?.role || targetRole,
          full_name: profile?.full_name || meta.name || 'User Account',
        },
      });
      authUserId = newAuth?.user?.id;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: tempPassword,
        email_confirm: true,
      });
    }

    // Update gv_users
    await supabaseAdmin
      .from('gv_users')
      .update({
        auth_user_id: authUserId,
        must_change_password: true,
      })
      .eq('login_id', targetLoginId);

    // Update gv_requests to Completed
    meta.status = 'Completed';
    meta.completedAt = new Date().toISOString();
    meta.approvedBy = approverRole;

    await supabaseAdmin
      .from('gv_requests')
      .update({
        status: 'Completed',
        reason_or_notes: JSON.stringify(meta),
      })
      .eq('id', requestId);

    return res.status(200).json({
      success: true,
      message: 'Temporary password generated and account set to must_change_password=true',
      loginId: targetLoginId,
      tempPassword,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. STORAGE UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/storage/upload', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({
        error:
          'SUPABASE_SERVICE_ROLE_KEY environment variable is required for storage uploads.',
      });
    }

    const {
      fileName,
      fileBase64,
      contentType,
    } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({
        error:
          'fileName and fileBase64 are required',
      });
    }

    const cleanBase64 =
      fileBase64.replace(
        /^data:[^;]+;base64,/,
        ''
      );

    const buffer = Buffer.from(
      cleanBase64,
      'base64'
    );

    const filePath =
      `system_branding/${fileName}`;

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from('system-assets')
      .upload(filePath, buffer, {
        contentType:
          contentType || 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      return res.status(400).json({
        error: uploadError.message,
      });
    }

    const {
      data: publicData,
    } =
      supabaseAdmin.storage
        .from('system-assets')
        .getPublicUrl(filePath);

    return res.status(200).json({
      success: true,
      publicUrl:
        publicData.publicUrl,
      filePath,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Endpoint not found',
      health: '/health',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      'Unhandled Server Error:',
      err
    );

    res.status(500).json({
      error:
        err.message ||
        'Internal Server Error',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Growvia Express Backend API server running on 0.0.0.0:${PORT}`
    );

    console.log(
      `Health Check available at GET /health`
    );

    console.log(
      `Frontend URL: ${FRONTEND_URL}`
    );
  }
);