import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Inicializa o cliente Supabase para Edge Functions
 * Esta abordagem evita problemas com importações entre arquivos em Edge Functions
 */
export function supabaseClient(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[${new Date().toISOString()}] Erro: Credenciais Supabase não definidas`);
    return {
      error: NextResponse.json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      }, { status: 500 })
    };
  }

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Injetar na requisição
    req.supabase = supabase;
    
    console.log(`[${new Date().toISOString()}] Cliente Supabase inicializado com sucesso`);
    return { supabase };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar Supabase:`, error);
    return {
      error: NextResponse.json({
        status: 'error',
        message: 'Erro interno no servidor'
      }, { status: 500 })
    };
  }
}
