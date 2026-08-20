import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || process?.env || {};
const rawUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
const supabaseUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  ? rawUrl.replace(/\/+$/, '')
  : (() => { console.warn('[Growvia] VITE_SUPABASE_URL not set — using hardcoded fallback. Set this env var for production.'); return 'https://nyhnkftlkigoliyogwvp.supabase.co'; })();

const rawKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
const supabaseAnonKey = (rawKey.length > 20)
  ? rawKey
  : (() => { console.warn('[Growvia] VITE_SUPABASE_ANON_KEY not set — using hardcoded fallback. Set this env var for production.'); return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4'; })();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'growvia-school-erp',
    },
  },
});