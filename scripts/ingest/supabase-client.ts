/**
 * Cliente Supabase com SERVICE ROLE KEY.
 *
 * IMPORTANTE: Este arquivo existe APENAS em scripts/ingest/.
 * Nunca importar em src/ — a service role key nunca deve
 * ir para o bundle do Next.js ou ser configurada na Vercel.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
  );
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
