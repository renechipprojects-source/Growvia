import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Supabase client initialization (public client with fallback credentials)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server-only Admin Client with Service Role privileges for Auth user provisioning
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── ROOT ENDPOINT ─────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Growvia School ERP Express Backend API Foundation',
    health: '/health',
    version: '1.0.0',
  });
});

// ─── HEALTH CHECK ENDPOINT (RENDER REQUIREMENT) ──────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ─── API ENDPOINTS FOR 6 CONSOLIDATED GV_ TABLES ──────────────────────────────

// 1. User Management Endpoint (GV_users)
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string;
    let query = supabase.from('GV_users').select('*');
    if (role) {
      query = query.eq('role', role);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Inventory & Expenses Endpoint (GV_inventory_expenses)
app.get('/api/inventory-expenses', async (req: Request, res: Response) => {
  try {
    const recordType = req.query.record_type as string;
    let query = supabase.from('GV_inventory_expenses').select('*');
    if (recordType) {
      query = query.eq('record_type', recordType);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Fees & Payments Endpoint (GV_fees_payments)
app.get('/api/fees-payments', async (req: Request, res: Response) => {
  try {
    const studentId = req.query.student_id as string;
    let query = supabase.from('GV_fees_payments').select('*');
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Communications Endpoint (GV_communications)
app.get('/api/communications', async (req: Request, res: Response) => {
  try {
    const channel = req.query.channel as string;
    let query = supabase.from('GV_communications').select('*');
    if (channel) {
      query = query.eq('channel', channel);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Requests Endpoint (GV_requests)
app.get('/api/requests', async (req: Request, res: Response) => {
  try {
    const requestType = req.query.request_type as string;
    let query = supabase.from('GV_requests').select('*');
    if (requestType) {
      query = query.eq('request_type', requestType);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. System Settings & Branding Endpoint (GV_system_settings)
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('GV_system_settings').select('*').eq('id', 'PRIMARY').maybeSingle();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── SECURE SERVER-SIDE SUPABASE AUTH USER PROVISIONING ENDPOINTS ─────────────

// Core default account definitions for standard ERP roles
const CORE_ERP_ACCOUNTS = [
  { loginId: 'ADM001', email: 'admin@growvia.com', password: 'Admin@123', role: 'admin', name: 'System Administrator' },
  { loginId: 'PRN001', email: 'principal@growvia.com', password: 'Principal@123', role: 'principal', name: 'Principal' },
  { loginId: 'OFF001', email: 'office@growvia.com', password: 'Office@123', role: 'office', name: 'Office Staff' },
  { loginId: 'TCH001', email: 'teacher@growvia.com', password: 'Teacher@123', role: 'teacher', name: 'Lead Teacher' },
  { loginId: 'PAR001', email: 'parent@growvia.com', password: 'Parent@123', role: 'parent', name: 'Parent Account' },
  { loginId: 'DEV001', email: 'developer@growvia.com', password: 'Dev@123', role: 'developer', name: 'Lead Developer' },
];

/**
 * Bulk Provisioning Endpoint:
 * Ensures all core ERP role accounts (Admin, Principal, Office, Teacher, Parent, Developer)
 * and unlinked records in GV_users are provisioned in Supabase Auth and linked via auth_user_id.
 */
app.post('/api/users/provision', async (req: Request, res: Response) => {
  try {
    const results: Array<{ loginId: string; status: string; authUserId?: string; details?: string }> = [];

    // 1. Fetch existing Auth users from Supabase Auth admin API
    const { data: authUserList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUsers = authUserList?.users || [];

    if (listErr && !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is required on server to provision Auth users.',
      });
    }

    // 2. Loop through core accounts
    for (const coreAcc of CORE_ERP_ACCOUNTS) {
      // Check if profile exists in GV_users
      const { data: profile } = await supabase
        .from('GV_users')
        .select('*')
        .eq('login_id', coreAcc.loginId)
        .maybeSingle();

      const targetEmail = profile?.email || coreAcc.email;
      const targetRole = profile?.role || coreAcc.role;
      const targetName = profile?.full_name || coreAcc.name;

      // Check if Auth user exists in Supabase Auth
      let existingAuthUser = existingAuthUsers.find(
        (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
      );

      let authUserId = existingAuthUser?.id;

      if (!authUserId) {
        // Create new Auth user with auto-confirmed email
        const { data: newAuthData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: coreAcc.password,
          email_confirm: true,
          user_metadata: {
            login_id: coreAcc.loginId,
            role: targetRole,
            full_name: targetName,
          },
        });

        if (createErr) {
          results.push({ loginId: coreAcc.loginId, status: 'error', details: createErr.message });
          continue;
        }

        authUserId = newAuthData?.user?.id;
        results.push({ loginId: coreAcc.loginId, status: 'created', authUserId });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, { email_confirm: true });
        results.push({ loginId: coreAcc.loginId, status: 'existing_auth_confirmed', authUserId });
      }

      // Link auth_user_id to GV_users record
      if (authUserId) {
        const payload = {
          id: authUserId,
          auth_user_id: authUserId,
          login_id: coreAcc.loginId,
          email: targetEmail,
          full_name: targetName,
          role: targetRole,
          status: 'active',
          must_change_password: false,
        };

        await supabase.from('GV_users').upsert([payload], { onConflict: 'login_id' });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase Auth user provisioning completed successfully',
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Single User Provisioning Endpoint:
 * Called when an admin/office user creates a new staff/student/parent account.
 */
app.post('/api/users/provision-single', async (req: Request, res: Response) => {
  try {
    const { login_id, email, password, role, full_name } = req.body;

    if (!login_id || !email || !password) {
      return res.status(400).json({ error: 'login_id, email, and password are required' });
    }

    // Check if Auth user already exists
    const { data: authUserList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = authUserList?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let authUserId = existingAuthUser?.id;

    if (!authUserId) {
      const { data: newAuthData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          login_id,
          role: role || 'parent',
          full_name: full_name || login_id,
        },
      });

      if (createErr) {
        return res.status(400).json({ error: createErr.message });
      }

      authUserId = newAuthData?.user?.id;
    }

    if (authUserId) {
      await supabase
        .from('GV_users')
        .update({ auth_user_id: authUserId, id: authUserId })
        .eq('login_id', login_id);
    }

    return res.status(200).json({
      success: true,
      authUserId,
      login_id,
      message: `User ${login_id} successfully provisioned in Supabase Auth`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── STORAGE BUCKET PROVISIONING ENDPOINT ─────────────────────────────────────
app.post('/api/storage/init-bucket', async (_req: Request, res: Response) => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === 'system-assets' || b.name === 'system-assets');

    if (!exists) {
      const { data, error } = await supabaseAdmin.storage.createBucket('system-assets', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif', 'image/x-icon'],
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true, message: 'Storage bucket system-assets created successfully', data });
    }

    return res.status(200).json({ success: true, message: 'Storage bucket system-assets already exists' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── STORAGE FILE UPLOAD ENDPOINT (ADMIN PRIVILEGED) ─────────────────────────
app.post('/api/storage/upload', async (req: Request, res: Response) => {
  try {
    const { fileName, fileBase64, contentType } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'fileName and fileBase64 are required' });
    }

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const filePath = `system_branding/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('system-assets')
      .upload(filePath, buffer, {
        contentType: contentType || 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    const { data: publicData } = supabaseAdmin.storage.from('system-assets').getPublicUrl(filePath);

    return res.status(200).json({
      success: true,
      publicUrl: publicData.publicUrl,
      filePath,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Auto-initialize storage bucket at server start
supabaseAdmin.storage.listBuckets().then(({ data: buckets }) => {
  const exists = buckets?.some((b) => b.id === 'system-assets' || b.name === 'system-assets');
  if (!exists) {
    supabaseAdmin.storage.createBucket('system-assets', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif', 'image/x-icon'],
    }).catch(() => {});
  }
}).catch(() => {});

// ─── 404 FALLBACK ROUTE HANDLER ────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found', health: '/health' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Growvia Express Backend API server running on 0.0.0.0:${PORT}`);
  console.log(`Health Check available at GET /health`);
});
