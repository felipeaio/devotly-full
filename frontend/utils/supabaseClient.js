// Supabase Client Utility
import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  // Log for debugging (only during development)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] Inicializando cliente Supabase`);
    console.log(`URL: ${supabaseUrl ? 'Definida' : 'Indefinida'}`);
    console.log(`KEY: ${supabaseKey ? 'Definida' : 'Indefinida'}`);
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Credenciais Supabase não definidas');
  }

  // Create and return Supabase client
  return createClient(supabaseUrl, supabaseKey);
}

// Helper for CORS headers
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

// Helper for responding to OPTIONS requests (CORS preflight)
export function handleCorsOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  return false;
}
