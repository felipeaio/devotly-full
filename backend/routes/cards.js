import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { z } from 'zod';

const router = express.Router();

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
    images: z.array(z.string()),
    musicLink: z.string().url().nullable(),
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
    const cardUrl = `devotly.com/${cardId}-${conteudo.cardName}`;

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

export default router;