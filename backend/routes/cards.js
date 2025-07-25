import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { z } from 'zod';
import tiktokEvents from '../services/tiktokEvents.js';

const router = express.Router();

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

// Usando o formato de rota para ESM
router.post('/', async (req, res) => {
  try {
    // Verificar se o cliente Supabase existe
    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }

    const validatedData = cardSchema.parse(req.body);
    const { email, plano, conteudo } = validatedData;
    const cardId = uuidv4();
    const cardUrl = `https://devotly.shop/view?id=${cardId}`;
    
    console.log(`[${new Date().toISOString()}] Gerando cartão com URL:`, cardUrl);

    // Antes de criar o cartão, verifique se as imagens são URLs válidas
    const { images } = conteudo;
    if (images && Array.isArray(images)) {
      // Verificar se todas as imagens são URLs (não base64)
      const validImages = images.every(img => img.startsWith('http'));

      if (!validImages) {
        return res.status(400).json({
          status: 'error',
          message: 'Todas as imagens devem ser URLs válidas'
        });
      }

      // Se todas são URLs válidas, continuar com a criação do cartão
    }

    const qrCodeBuffer = await QRCode.toBuffer(cardUrl);
    const qrCodePath = `qr_code_${cardId}.png`;

    const supabase = req.supabase;

    // Verificar se o arquivo já existe e removê-lo
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('qrcodes')
      .list('', { search: qrCodePath });
    if (listError) {
      throw new Error(`Falha ao verificar arquivos existentes: ${listError.message}`);
    }
    if (existingFiles.some(file => file.name === qrCodePath)) {
      await supabase.storage.from('qrcodes').remove([qrCodePath]);
    }

    // Fazer upload do QR code
    const { error: uploadError } = await supabase.storage
      .from('qrcodes')
      .upload(qrCodePath, qrCodeBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    if (uploadError) {
      throw new Error(`Falha ao fazer upload do QR code: ${uploadError.message}`);
    }

    const { data: qrCodeData, error: qrCodeError } = await supabase.storage
      .from('qrcodes')
      .getPublicUrl(qrCodePath);
    if (qrCodeError) {
      throw new Error(`Falha ao obter URL do QR code: ${qrCodeError.message}`);
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
      throw new Error(`Falha ao criar cartão: ${error.message}`);
    }
    
    // Rastrear evento de criação de cartão (AddToCart) via TikTok API Events
    try {
      await tiktokEvents.trackAddToCart(cardId, email, req);
      console.log(`[${new Date().toISOString()}] TikTok AddToCart event tracked for card: ${cardId}`);
    } catch (tikTokError) {
      console.error(`[${new Date().toISOString()}] Erro ao rastrear TikTok AddToCart:`, tikTokError.message);
      // Não falha a criação do cartão por erro no tracking
    }

    res.status(201).json({
      status: 'success',
      data: {
        id: data.id,
        url: data.url,
        qrCode: qrCodeData.publicUrl,
        tokenEdit
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de validação:', error.errors);
      return res.status(400).json({
        status: 'error',
        message: 'Erro de validação',
        details: error.errors
      });
    }
    console.error('Erro ao criar cartão:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
});

// Adicionar nova rota para busca por email
router.get('/search', async (req, res) => {
  try {
    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }

    const email = req.query.email;
    console.log(`[${new Date().toISOString()}] Buscando cartões para o email:`, email);

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email não fornecido'
      });
    }

    // Buscar cartões pelo email e status de pagamento
    const { data, error } = await req.supabase
      .from('cards')
      .select('*')
      .eq('email', email)
      .eq('status_pagamento', 'aprovado')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${new Date().toISOString()}] Erro ao buscar cartões:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao buscar cartões'
      });
    }

    // Log para debug
    console.log(`[${new Date().toISOString()}] Cartões encontrados:`, data?.length || 0);

    return res.json({
      status: 'success',
      cards: data || []
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar requisição:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
});

// Rota para verificar o status de pagamento de um cartão específico
router.get('/:id/status', async (req, res) => {
  try {
    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }

    const cardId = req.params.id;
    console.log(`[${new Date().toISOString()}] Verificando status do cartão:`, cardId);

    if (!cardId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do cartão não fornecido'
      });
    }

    // Buscar apenas os campos necessários para verificação de status
    const { data, error } = await req.supabase
      .from('cards')
      .select('id, status_pagamento, email_sent, payment_id, created_at')
      .eq('id', cardId)
      .single();

    if (error) {
      console.error(`[${new Date().toISOString()}] Erro ao buscar status do cartão:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao verificar status do cartão'
      });
    }

    if (!data) {
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }

    console.log(`[${new Date().toISOString()}] Status do cartão ${cardId}:`, {
      status_pagamento: data.status_pagamento,
      email_sent: data.email_sent,
      payment_id: data.payment_id
    });

    return res.json({
      status: 'success',
      id: data.id,
      status_pagamento: data.status_pagamento,
      email_sent: data.email_sent,
      payment_id: data.payment_id,
      created_at: data.created_at
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar verificação de status:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
});

// Rota para obter um cartão específico pelo ID
router.get('/:id', async (req, res) => {
  try {
    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }

    const cardId = req.params.id;
    
    // Buscar o cartão pelo ID
    const { data, error } = await req.supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] Erro ao buscar cartão:`, error);
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }
    
    if (!data) {
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }
    
    // Obter URL do QR Code
    const qrCodePath = `qr_code_${cardId}.png`;
    const { data: qrCodeData } = await req.supabase
      .storage
      .from('qrcodes')
      .getPublicUrl(qrCodePath);
    
    // Adicionar URL do QR Code aos dados
    data.qr_code_url = qrCodeData?.publicUrl;
    
    // Rastrear evento de visualização de cartão via TikTok API Events
    try {
      await tiktokEvents.trackViewContent(
        cardId, 
        'product',
        data.conteudo?.cardTitle || 'Cartão Cristão Digital',
        data.email
      );
      console.log(`Evento ViewContent enviado para TikTok API Events para cartão ${cardId}`);
    } catch (tikTokError) {
      console.error('Erro ao enviar evento para TikTok API:', tikTokError);
      // Continuamos o fluxo mesmo se o evento falhar
    }
    
    // Retornar os dados do cartão
    res.json({
      status: 'success',
      data: data
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar requisição:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
});

// Adicionar após as rotas existentes
// Rota para editar um cartão
router.put('/:id/edit', async (req, res) => {
  try {
    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }

    const cardId = req.params.id;
    const { conteudo } = req.body;

    console.log(`[${new Date().toISOString()}] Tentando atualizar cartão:`, {
      id: cardId,
      conteudo
    });

    // 1. Primeiro, buscar o cartão existente
    const { data: existingCard, error: fetchError } = await req.supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !existingCard) {
      console.error(`[${new Date().toISOString()}] Cartão não encontrado:`, fetchError);
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }

    // 2. Mesclar o conteúdo existente com as atualizações
    const updatedContent = {
      ...existingCard.conteudo,
      cardTitle: conteudo.cardTitle || existingCard.conteudo.cardTitle,
      cardMessage: conteudo.cardMessage || existingCard.conteudo.cardMessage,
      finalMessage: conteudo.finalMessage || existingCard.conteudo.finalMessage
    };

    // 3. Realizar a atualização
    const { error: updateError } = await req.supabase
      .from('cards')
      .update({
        conteudo: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Erro na atualização:`, updateError);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao atualizar cartão'
      });
    }

    // 4. Buscar o cartão atualizado
    const { data: updatedCard, error: fetchUpdatedError } = await req.supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchUpdatedError) {
      console.error(`[${new Date().toISOString()}] Erro ao buscar cartão atualizado:`, fetchUpdatedError);
      return res.status(500).json({
        status: 'error',
        message: 'Cartão atualizado mas erro ao buscar dados atualizados'
      });
    }

    // 5. Retornar sucesso com os dados atualizados
    return res.json({
      status: 'success',
      data: updatedCard
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar requisição:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
});

// Rota para rastrear visualização de cartão via API
router.get('/:id/track-view', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'] || null;

    if (!req.supabase) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase client não disponível'
      });
    }

    // Verificar se o cartão existe
    const { data: card, error: fetchError } = await req.supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !card) {
      return res.status(404).json({
        status: 'error',
        message: 'Cartão não encontrado'
      });
    }

    // Rastrear visualização via TikTok API Events
    try {
      await tiktokEvents.trackViewContent(
        id,
        'card',
        card.conteudo?.cardTitle || 'Cartão Devocional',
        userEmail,
        req
      );
      console.log(`[${new Date().toISOString()}] TikTok ViewContent event tracked for card: ${id}`);
    } catch (tikTokError) {
      console.error(`[${new Date().toISOString()}] Erro ao rastrear TikTok ViewContent:`, tikTokError.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Visualização rastreada'
    });

  } catch (error) {
    console.error('Erro ao rastrear visualização:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor'
    });
  }
});

export default router;