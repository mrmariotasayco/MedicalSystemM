import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE BASE DE DATOS (POSTGRESQL via SUPABASE) ---

// Tus credenciales configuradas:
const SUPABASE_URL = 'https://tojlmapwqgpsahfrgqgo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1RjdJdeLjO7qQoUKx7a41A_y57LgDWE';

// Verificamos que las credenciales existan y no estén vacías
export const isDbConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Create client
export const supabase = isDbConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;