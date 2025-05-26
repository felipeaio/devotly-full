// Upload image API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../utils/supabaseClient';
import multiparty from 'multiparty';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import path from 'path';

// Debug logging function
const log = (message, data) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

export const config = {
  api: {
    bodyParser: false, // Disable built-in bodyParser to use multiparty
  },
};

export default async function handler(req, res) {
  try {
    console.log('Upload handler started', { method: req.method, url: req.url, headers: req.headers });
    
    // Set CORS headers first
    setCorsHeaders(res);
    console.log('Set CORS headers');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Método não permitido'
      });
    }
    console.log('Starting file upload process');
      // Parse form data with multiparty
    console.log('Parsing form data...');
    const form = new multiparty.Form({
      maxFilesSize: 5 * 1024 * 1024, // 5MB limit
      autoFields: true,
      autoFiles: true
    });
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          // Check if it's a file size error
          if (err.message.includes('maxFilesSize')) {
            console.error('File too large:', err);
            reject(new Error('Arquivo muito grande. Limite máximo de 5MB.'));
            return;
          }
          console.error('Form parse error:', err);
          reject(new Error('Erro ao processar o arquivo.'));
          return;
        }
        
        console.log('Form parsed successfully', {
          fieldKeys: Object.keys(fields || {}),
          fileKeys: Object.keys(files || {}),
        });
        resolve({ fields: fields || {}, files: files || {} });
      });
    });
      // Check if a file was uploaded
    if (!files || !files.image || !files.image[0]) {
      console.log('No file uploaded', { files });
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }
    
    const file = files.image[0];
    console.log('File received', {
      name: file.originalFilename,
      size: file.size,
      type: file.headers['content-type']
    });
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.headers['content-type'])) {
      console.log('Invalid file type:', file.headers['content-type']);
      return res.status(400).json({
        success: false,
        error: 'Formato de arquivo inválido. Use JPEG, PNG ou WebP.'
      });
    }
    
    console.log('Initializing Supabase client...');
    // Initialize Supabase client
    const supabase = getSupabaseClient();
      // Create unique filename
    const fileExt = path.extname(file.originalFilename);
    const fileName = `devotly-cards/${uuidv4()}${fileExt}`;
    console.log('Generated filename:', fileName);
    
    // Read file data into buffer
    console.log('Reading file into buffer...');
    const fileBuffer = await new Promise((resolve, reject) => {
      let data = [];
      file.on('data', chunk => {
        data.push(chunk);
        console.log('Received chunk:', chunk.length, 'bytes');
      });
      file.on('end', () => {
        const buffer = Buffer.concat(data);
        console.log('File read complete, total size:', buffer.length, 'bytes');
        resolve(buffer);
      });
      file.on('error', (err) => {
        console.error('Error reading file:', err);
        reject(err);
      });
    });
    
    console.log('Uploading to Supabase storage...');    // Upload to Supabase storage with retry
    let uploadAttempts = 0;
    const maxAttempts = 3;
    let uploadError = null;
    let uploadSuccess = false;

    while (uploadAttempts < maxAttempts && !uploadSuccess) {
      uploadAttempts++;
      console.log(`Upload attempt ${uploadAttempts}/${maxAttempts}...`);

      const { error } = await supabase
        .storage
        .from('card-images')
        .upload(fileName, fileBuffer, {
          contentType: file.headers['content-type'],
          upsert: true
        });

      if (!error) {
        uploadSuccess = true;
        console.log('Upload successful on attempt:', uploadAttempts);
        break;
      } else {
        uploadError = error;
        console.error('Upload attempt failed:', error);
        if (uploadAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts)); // Exponential backoff
        }
      }
    }

    if (!uploadSuccess) {
      console.error('All upload attempts failed:', uploadError);
      throw new Error(`Erro no upload: ${uploadError?.message || 'Falha no upload para o storage'}`);
    }
    
    console.log('Upload successful, getting public URL...');
    // Get public URL
    const { data: urlData } = await supabase
      .storage
      .from('card-images')
      .getPublicUrl(fileName);
      if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      throw new Error('Erro ao obter URL pública da imagem');
    }
    
    // Validate the URL before returning
    try {
      new URL(urlData.publicUrl);
    } catch (e) {
      console.error('Invalid URL generated:', urlData.publicUrl);
      throw new Error('URL da imagem inválida');
    }
    
    console.log('Upload complete, returning URL:', urlData.publicUrl);
    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName
    });
    
  } catch (error) {
    console.error('Upload Error:', error);
    const errorMessage = error.message || 'Erro interno no servidor';
    const statusCode = error.message.includes('inválido') || error.message.includes('grande') ? 400 : 500;
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        code: error.code,
        name: error.name
      } : undefined
    });
  }
  }
