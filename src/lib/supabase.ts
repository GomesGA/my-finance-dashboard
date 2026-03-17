import { createClient } from '@supabase/supabase-js';

// Estas variáveis são puxadas automaticamente do seu .env.local (no seu PC) 
// ou das Environment Variables (no Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as chaves do Supabase nas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);