import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
// Removendo QRCode que causa problemas em Edge Functions
// import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { supabaseClient } from '../lib/supabase';

// Atualizar o schema de validação
const cardSchema = z.object({
  email: z.string().email(),
  plano: z.enum(['para_sempre', 'anual']),
  conteudo: z.object({
    cardName: z.string().min(3).regex(/^[a-z0-9-]+$/),
    cardTitle: z.string().min(3),
    cardMessage: z.string().min(10),
    finalMessage: z.string().min(5),
    bibleVerse: z.object({
      book: z.string(),
      chapter: z.string(),
      verse: z.string(),
      text: z.string(),
      reference: z.string()
    }),
    images: z.array(
      z.string().url()
      .or(z.string().startsWith('https://'))
    ),
    musicLink: z.string().url().nullish().or(z.literal('')),
    userName: z.string().optional(),
    userPhone: z.string().optional()
  })
});

export const config = {
  runtime: 'edge',
  regions: ['fra1'], // Escolha a região mais próxima do seu público-alvo
};

export default async function handler(req) {
  // Tratamento CORS  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, X-Token-Edit, X-Requested-With',
      },
    });
  }
  
  // Para solicitações não-OPTIONS, adicionar cabeçalhos CORS na resposta
  if (req.method !== 'OPTIONS') {
    req.headers.set('Access-Control-Allow-Origin', '*');
  }
  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  // Processando a solicitação POST
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const validatedData = cardSchema.parse(body);
      const { email, plano, conteudo } = validatedData;      const cardId = uuidv4();
      const cardUrl = `devotly.shop/${cardId}-${conteudo.cardName}`;

      // Antes de criar o cartão, verifique se as imagens são URLs válidas
      const { images } = conteudo;
      if (images && Array.isArray(images)) {
        for (const imageUrl of images) {
          if (!imageUrl.startsWith('https://')) {
            return NextResponse.json({
              status: 'error',
              message: 'Todas as imagens devem ser URLs seguras (HTTPS)'
            }, { status: 400 });
          }
        }
      }      // QR Code generation removed for Edge Functions compatibility
      // Usando uma abordagem simplificada sem gerar QR code
      const qrCodePath = `qr_code_${cardId}.png`;
      
      // Para compatibilidade, ainda declaramos variables mas não geramos o QR code
      const existingFiles = [];
      const listError = null;
        
      if (listError) {
        console.error('Erro ao listar arquivos:', listError.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao verificar QR code existente'
        }, { status: 500 });
      }
      
      if (existingFiles.some(file => file.name === qrCodePath)) {
        await supabase.storage
          .from('qrcodes')
          .remove([qrCodePath]);
      }

      // Fazer upload do QR code
      const { error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(qrCodePath, qrCodeBuffer, {
          contentType: 'image/png',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Erro ao fazer upload do QR code:', uploadError.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao gerar QR code'
        }, { status: 500 });
      }

      const { data: qrCodeData, error: qrCodeError } = await supabase.storage
        .from('qrcodes')
        .getPublicUrl(qrCodePath);
        
      if (qrCodeError) {
        console.error('Erro ao obter URL do QR code:', qrCodeError.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao obter URL do QR code'
        }, { status: 500 });
      }

      const tokenEdit = uuidv4();
      const { data, error } = await supabase
        .from('cards')
        .insert([
          {
            id: cardId,
            email,
            url: cardUrl,
            plano,
            conteudo,
            token_edit: tokenEdit
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir cartão no banco:', error.message);
        return NextResponse.json({
          status: 'error',
          message: 'Erro ao criar cartão no banco de dados'
        }, { status: 500 });
      }

      return NextResponse.json({
        status: 'success',
        data: {
          id: data.id,
          url: data.url,
          qrCode: qrCodeData.publicUrl,
          tokenEdit
        }
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          status: 'error',
          message: 'Dados de entrada inválidos',
          errors: error.errors
        }, { status: 400 });
      }
      
      console.error('Erro ao criar cartão:', error);
      return NextResponse.json({
        status: 'error',
        message: error.message || 'Erro interno no servidor'
      }, { status: 500 });
    }
  } 
  
  // Processando a solicitação GET para /api/cards/search
  else if (req.method === 'GET' && req.url.includes('/search')) {
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
  
  // Resposta padrão para outros métodos ou rotas não suportados
  return NextResponse.json({
    status: 'error',
    message: 'Método não suportado'
  }, { status: 405 });
}
