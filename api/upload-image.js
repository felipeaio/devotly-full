import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseClient } from './lib/supabase';
import { handleCORS, addCORSHeaders } from './lib/cors';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
  api: {
    bodyParser: false,
  },
};

export default async function handler(req) {
  // Tratamento CORS usando a biblioteca compartilhada  
  const corsResult = handleCORS(req, {
    allowMethods: 'POST, OPTIONS',
    allowHeaders: 'Content-Type, X-Requested-With'
  });
  
  // Se for uma requisição OPTIONS, retorna a resposta CORS imediatamente
  if (req.method === 'OPTIONS') {
    return corsResult;
  }
  
  // Para solicitações não-OPTIONS, precisamos manter os cabeçalhos CORS para a resposta final
  const { corsHeaders } = corsResult;
  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  if (req.method === 'POST') {
    try {
      // Necessário verificar a Content-Type para processamento adequado
      const contentType = req.headers.get('content-type');
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return NextResponse.json({
          success: false,
          error: 'Formato de requisição inválido. Use multipart/form-data'
        }, { status: 400 });
      }

      // Processar os dados do formulário (multipart)
      const formData = await req.formData();
      const file = formData.get('image');
      
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'Nenhum arquivo enviado'
        }, { status: 400 });
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: 'Formato de arquivo inválido. Use JPEG, PNG ou WebP.'
        }, { status: 400 });
      }

      // Validar tamanho do arquivo (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({
          success: false,
          error: 'O arquivo é muito grande. O tamanho máximo é de 2MB.'
        }, { status: 400 });
      }

      // Gerar nome de arquivo único
      const fileExt = file.name.split('.').pop();
      const fileName = `devotly-cards/${uuidv4()}.${fileExt}`;

      // Converter o arquivo para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('card-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = await supabase
        .storage
        .from('card-images')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Erro ao obter URL pública');
      }      const response = NextResponse.json({
        success: true,
        url: urlData.publicUrl
      });
      
      // Adicionar cabeçalhos CORS à resposta
      return addCORSHeaders(response, corsHeaders);

    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      const errorResponse = NextResponse.json({
        success: false,
        error: error.message || 'Erro interno no servidor'
      }, { status: 500 });
      
      // Adicionar cabeçalhos CORS à resposta de erro
      return addCORSHeaders(errorResponse, corsHeaders);
    }
  }

  // Resposta padrão para outros métodos
  const methodNotAllowedResponse = NextResponse.json({
    success: false,
    error: 'Método não suportado'
  }, { status: 405 });
  
  // Adicionar cabeçalhos CORS à resposta
  return addCORSHeaders(methodNotAllowedResponse, corsHeaders);
}
