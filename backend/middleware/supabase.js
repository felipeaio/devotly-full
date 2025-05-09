import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env diretamente neste arquivo também para garantir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

function supabaseMiddleware(req, res, next) {
  // Log para depuração
  console.log(`[${new Date().toISOString()}] Inicializando cliente Supabase`);
  console.log(`URL: ${supabaseUrl ? 'Definida' : 'Indefinida'}`);
  console.log(`ANON_KEY: ${supabaseKey ? 'Definida' : 'Indefinida'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[${new Date().toISOString()}] Erro: Credenciais Supabase não definidas`);
    return res.status(500).json({
      status: 'error',
      message: 'Erro de configuração do servidor'
    });
  }

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Injetar na requisição
    req.supabase = supabase;
    
    console.log(`[${new Date().toISOString()}] Cliente Supabase inicializado com sucesso`);
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar Supabase:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
}

export default supabaseMiddleware;