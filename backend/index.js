import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configuração correta para o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env ANTES de qualquer outro código
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log para depuração
console.log(`[${new Date().toISOString()}] Variáveis de ambiente carregadas:`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Definida' : 'Indefinida'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Definida' : 'Indefinida'}`);

// Importar o middleware de Supabase
import supabaseMiddleware from './middleware/supabase.js';

// Ao importar o módulo cards.js, verifique se está utilizando o caminho correto
import cardsRouter from './routes/cards.js';

// Resolve o caminho do diretório raiz
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Verifica se o arquivo .env existe
try {
  if (!fs.existsSync(envPath)) {
    console.error(`[${new Date().toISOString()}] Erro: Arquivo .env não encontrado em: ${envPath}`);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] Arquivo .env encontrado em: ${envPath}`);
} catch (err) {
  console.error(`[${new Date().toISOString()}] Erro ao verificar .env:`, err.message);
  process.exit(1);
}

// Carrega variáveis de ambiente
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error(`[${new Date().toISOString()}] Erro ao carregar .env:`, dotenvResult.error.message);
  process.exit(1);
}

// Valida variáveis de ambiente
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`[${new Date().toISOString()}] Erro: Variáveis de ambiente faltando: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Inicializa o aplicativo Express
const app = express();

// Configurar trust proxy
app.set('trust proxy', 1);

// Middlewares
app.use(cors({ origin: '*', methods: ['POST'], allowedHeaders: ['Content-Type', 'X-User-Email', 'X-Token-Edit'] }));
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requisição: ${req.method} ${req.url} from ${req.ip}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${new Date().toISOString()}] Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// Rotas
app.use('/cards', supabaseMiddleware);
app.use('/cards', cardsRouter);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'Devotly Backend' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Erro:`, err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Servidor rodando na porta ${PORT}`);
});