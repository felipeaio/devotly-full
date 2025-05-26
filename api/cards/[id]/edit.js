import { z } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseClient } from '../../lib/supabase';

// Schema para validação de edição
const editCardSchema = z.object({
  conteudo: z.object({
    cardName: z.string().min(3).regex(/^[a-z0-9-]+$/).optional(),
    cardTitle: z.string().min(3).optional(),
    cardMessage: z.string().min(10).optional(),
    finalMessage: z.string().min(5).optional(),
    bibleVerse: z.object({
      book: z.string(),
      chapter: z.string(),
      verse: z.string(),
      text: z.string(),
      reference: z.string()
    }).optional(),
    images: z.array(
      z.string().url().or(z.string().startsWith('https://'))
    ).optional(),
    musicLink: z.string().url().nullish().or(z.literal('')).optional(),
    userName: z.string().optional(),
    userPhone: z.string().optional()
  })
});

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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, X-Token-Edit',
      },
    });
  }  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  // Processa solicitação PUT
  if (req.method === 'PUT') {
    try {
      // Extrair ID do cartão da URL
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const index = pathParts.indexOf('edit') - 1;
      const cardId = pathParts[index];

      if (!cardId) {
        return NextResponse.json({
          status: 'error',
          message: 'ID do cartão não fornecido'
        }, { status: 400 });
      }

      // Obter o token de autenticação
      const tokenEdit = req.headers.get('X-Token-Edit');
      const userEmail = req.headers.get('X-User-Email');

      if (!tokenEdit && !userEmail) {
        return NextResponse.json({
          status: 'error',
          message: 'Autenticação necessária'
        }, { status: 401 });
      }

      // Verificar se o cartão existe e se o token ou email é válido
      let query = supabase.from('cards').select('id, token_edit, email').eq('id', cardId);
      
      const { data: existingCard, error: fetchError } = await query.single();

      if (fetchError || !existingCard) {
        console.error('Erro ao buscar cartão para edição:', fetchError?.message);
        return NextResponse.json({
          status: 'error',
          message: 'Cartão não encontrado'
        }, { status: 404 });
      }

      // Verificar permissão de edição
      const authorized = (tokenEdit && existingCard.token_edit === tokenEdit) || 
                         (userEmail && existingCard.email === userEmail);
      
      if (!authorized) {
        return NextResponse.json({
          status: 'error',
          message: 'Sem permissão para editar este cartão'
        }, { status: 403 });
      }

      // Validar dados de entrada
      const body = await req.json();
      const validatedData = editCardSchema.parse(body);

      // Buscar o conteúdo atual para mesclá-lo com as atualizações
      const { data: currentCardData, error: currentCardError } = await supabase
        .from('cards')
        .select('conteudo')
        .eq('id', cardId)
        .single();

      if (currentCardError) {
        console.error('Erro ao buscar conteúdo atual do cartão:', currentCardError.message);
        return NextResponse.json({
          status: 'error', 
          message: 'Erro ao buscar conteúdo atual do cartão'
        }, { status: 500 });
      }

      // Mesclar conteúdo atual com atualizações
      const updatedContent = {
        ...currentCardData.conteudo,
        ...validatedData.conteudo
      };

      // Atualizar o cartão
      const { data: updateResult, error: updateError } = await supabase
        .from('cards')
        .update({ conteudo: updatedContent })
        .eq('id', cardId)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar cartão:', updateError.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao atualizar cartão'
        }, { status: 500 });
      }

      // Remover token_edit da resposta para segurança
      const { token_edit: _, ...safeData } = updateResult;

      return NextResponse.json({
        status: 'success',
        message: 'Cartão atualizado com sucesso',
        data: safeData
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          status: 'error',
          message: 'Dados de entrada inválidos',
          errors: error.errors
        }, { status: 400 });
      }
      
      console.error('Erro ao editar cartão:', error);
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
