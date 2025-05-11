import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configuração do Multer para processar os uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Endpoint para upload de imagem
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Nenhum arquivo enviado' 
      });
    }

    if (!req.supabase) {
      console.error(`[${new Date().toISOString()}] Erro: Cliente Supabase não inicializado`);
      return res.status(500).json({
        status: 'error',
        message: 'Erro de configuração do servidor'
      });
    }
    
    // Gerar um nome único para o arquivo
    const fileName = `${uuidv4()}.webp`;
    
    // Alterar 'images' para 'card-images' para corresponder ao nome do bucket existente
    const { data, error } = await req.supabase
      .storage
      .from('card-images')
      .upload(`devotly-cards/${fileName}`, req.file.buffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error(`[${new Date().toISOString()}] Erro ao fazer upload para o Supabase:`, error);
      throw new Error(`Falha ao fazer upload: ${error.message}`);
    }
    
    // Obter URL pública para a imagem (também ajustar aqui)
    const { data: urlData } = req.supabase
      .storage
      .from('card-images')
      .getPublicUrl(`devotly-cards/${fileName}`);
    
    const imageUrl = urlData.publicUrl;
    
    // Responder com sucesso e URL da imagem
    res.status(201).json({
      status: 'success',
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro no upload de imagem:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no servidor'
    });
  }
});

export default router;