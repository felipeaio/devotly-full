import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseMiddleware } from '../_middleware';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
  api: {
    bodyParser: false,
  },
};

export default async function handler(req) {
  // Tratamento CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Inicialize o Supabase
  const middlewareResponse = await supabaseMiddleware(req);
  if (middlewareResponse instanceof NextResponse) {
    return middlewareResponse; // Retorna erro do middleware se houver
  }

  const { supabase } = req;

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
      }

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl
      });

    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Erro interno no servidor'
      }, { status: 500 });
    }
  }

  // Resposta padrão para outros métodos
  return NextResponse.json({
    success: false,
    error: 'Método não suportado'
  }, { status: 405 });
}
