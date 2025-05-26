import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export function supabaseMiddleware(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[${new Date().toISOString()}] Erro: Credenciais Supabase não definidas`);
    return NextResponse.json({
      status: 'error',
      message: 'Erro de configuração do servidor'
    }, { status: 500 });
  }

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Adicionar ao contexto da requisição
    req.supabase = supabase;
    
    console.log(`[${new Date().toISOString()}] Cliente Supabase inicializado com sucesso`);
    return req;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar Supabase:`, error);
    return NextResponse.json({
      status: 'error',
      message: 'Erro interno no servidor'
    }, { status: 500 });
  }
}

export default async function middleware(req) {
  return supabaseMiddleware(req);
}
