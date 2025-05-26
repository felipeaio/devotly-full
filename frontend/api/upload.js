// Upload image API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../utils/supabaseClient';
import multiparty from 'multiparty';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable built-in bodyParser to use multiparty
  },
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }
  
  try {
    // Parse form data with multiparty
    const form = new multiparty.Form({
      maxFilesSize: 2 * 1024 * 1024 // 2MB
    });
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });
    
    // Check if a file was uploaded
    if (!files || !files.image || !files.image[0]) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }
    
    const file = files.image[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.headers['content-type'])) {
      return res.status(400).json({
        success: false,
        error: 'Formato de arquivo inválido. Use JPEG, PNG ou WebP.'
      });
    }
    
    // Initialize Supabase client
    const supabase = getSupabaseClient();
    
    // Create unique filename
    const fileExt = path.extname(file.originalFilename);
    const fileName = `devotly-cards/${uuidv4()}${fileExt}`;
    
    // Read file data into buffer
    const fileBuffer = await new Promise((resolve, reject) => {
      let data = [];
      file.on('data', chunk => data.push(chunk));
      file.on('end', () => resolve(Buffer.concat(data)));
      file.on('error', reject);
    });
    
    // Upload to Supabase storage
    const { error: uploadError } = await supabase
      .storage
      .from('card-images')
      .upload(fileName, fileBuffer, {
        contentType: file.headers['content-type'],
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = await supabase
      .storage
      .from('card-images')
      .getPublicUrl(fileName);
    
    if (!urlData?.publicUrl) {
      throw new Error('Erro ao obter URL pública');
    }
    
    return res.status(200).json({
      success: true,
      url: urlData.publicUrl
    });
    
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno no servidor'
    });
  }
}
