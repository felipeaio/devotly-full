import { NextResponse } from 'next/server';
import { supabaseClient } from '../lib/supabase';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async function handler(req) {
  // Tratamento CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
      },
    });
  }
  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const email = url.searchParams.get('email');
      
      if (!email) {
        return NextResponse.json({
          status: 'error',
          message: 'Email é obrigatório'
        }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('cards')
        .select('id, url, conteudo:conteudo->cardName, created_at')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cartões:', error.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao buscar cartões'
        }, { status: 500 });
      }

      return NextResponse.json({
        status: 'success',
        data
      });
    } catch (error) {
      console.error('Erro ao buscar cartões por email:', error);
      return NextResponse.json({
        status: 'error',
        message: error.message || 'Erro interno no servidor'
      }, { status: 500 });
    }
  }

  // Resposta padrão para outros métodos
  return NextResponse.json({
    status: 'error',
    message: 'Método não suportado'
  }, { status: 405 });
}
