import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Supabase client initialization (with fallback to current live credentials)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

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
