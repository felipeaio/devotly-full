import { NextResponse } from 'next/server';
import { supabaseClient } from '../lib/supabase';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async function handler(req, { params }) {
  // Tratamento CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, X-Token-Edit',
      },
    });
  }
  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  // Obtém o ID do cartão da URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const cardId = pathParts[pathParts.length - 1];

  if (!cardId) {
    return NextResponse.json({
      status: 'error',
      message: 'ID do cartão não fornecido'
    }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (error) {
      console.error('Erro ao buscar cartão:', error.message);
      return NextResponse.json({
        status: 'error',
        message: 'Erro ao buscar cartão'
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        status: 'error',
        message: 'Cartão não encontrado'
      }, { status: 404 });
    }

    // Remove o token de edição da resposta para segurança
    const { token_edit, ...safeData } = data;

    return NextResponse.json({
      status: 'success',
      data: safeData
    });
  } catch (error) {
    console.error('Erro ao buscar cartão por ID:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    }, { status: 500 });
  }
}
