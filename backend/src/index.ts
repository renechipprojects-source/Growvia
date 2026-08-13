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
      const { data: profile } = await supabase
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
        const updatePayload: any = { auth_user_id: authUserId };
        if (typeof req.body?.must_change_password === 'boolean') {
          updatePayload.must_change_password = req.body.must_change_password;
        }
        await supabaseAdmin
          .from('gv_users')
          .update(updatePayload)
          .or(`login_id.eq.${coreAcc.loginId},email.eq.${targetEmail}`);
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