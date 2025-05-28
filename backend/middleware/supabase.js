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
    console.warn(`[${new Date().toISOString()}] Aviso: Credenciais Supabase não definidas`);
    // Apenas para desenvolvimento/teste, permite continuar sem Supabase
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        status: 'error',
        message: 'Serviço temporariamente indisponível'
      });
    } else {
      // Em modo de desenvolvimento, permite prosseguir mesmo sem credenciais
      console.warn(`[${new Date().toISOString()}] Continuando sem Supabase em modo de desenvolvimento`);
      req.supabase = null;
      return next();
    }
  }

  try {
    // Criar cliente Supabase apenas se as credenciais estiverem disponíveis
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Injetar na requisição
      req.supabase = supabase;
      console.log(`[${new Date().toISOString()}] Cliente Supabase inicializado com sucesso`);
    } else {
      // Criar um objeto vazio para evitar erros
      req.supabase = {
        auth: { onAuthStateChange: () => {} },
        from: () => ({ select: () => ({ data: null, error: { message: 'Supabase não configurado' } }) })
      };
      console.warn(`[${new Date().toISOString()}] Usando cliente Supabase simulado (modo de contingência)`);
    }
    
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar Supabase:`, error);
    // Continuar mesmo com erro, mas com funcionalidade limitada
    req.supabase = null;
    next();
  }
}

export default supabaseMiddleware;