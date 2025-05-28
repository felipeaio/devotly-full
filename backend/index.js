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
console.log(`MERCADO_PAGO_ACCESS_TOKEN: ${process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Definida' : 'Indefinida'}`);
console.log(`NGROK_URL: ${process.env.NGROK_URL ? 'Definida' : 'Indefinida'}`);

// Importar o middleware de Supabase
import supabaseMiddleware from './middleware/supabase.js';
import cardsRouter from './routes/cards.js';
import uploadRouter from './routes/upload.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';

// Resolve o caminho do diretório raiz
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Verifica se o arquivo .env existe e carrega se disponível
try {
    if (fs.existsSync(envPath)) {
        console.log(`[${new Date().toISOString()}] Arquivo .env encontrado em: ${envPath}`);
        // Carrega variáveis de ambiente do arquivo
        const dotenvResult = dotenv.config({ path: envPath });
        if (dotenvResult.error) {
            console.warn(`[${new Date().toISOString()}] Aviso ao carregar .env: ${dotenvResult.error.message}`);
        }
    } else {
        console.log(`[${new Date().toISOString()}] Arquivo .env não encontrado. Usando variáveis de ambiente do sistema.`);
    }
} catch (err) {
    console.warn(`[${new Date().toISOString()}] Erro ao verificar .env: ${err.message}`);
    console.log(`[${new Date().toISOString()}] Continuando com as variáveis de ambiente do sistema.`);
}

// Valida variáveis de ambiente
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MERCADO_PAGO_ACCESS_TOKEN', 'NGROK_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.warn(`[${new Date().toISOString()}] Aviso: Algumas variáveis de ambiente estão faltando: ${missingEnvVars.join(', ')}`);
    console.warn(`[${new Date().toISOString()}] Certas funcionalidades podem não funcionar corretamente.`);
}

// Inicializa o aplicativo Express
const app = express();

// Configurar trust proxy
app.set('trust proxy', 1);

// Middlewares
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'X-User-Email', 'X-Token-Edit'] 
}));
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
app.use('/api/cards', supabaseMiddleware);
app.use('/api/cards', cardsRouter);
app.use('/api/upload-image', supabaseMiddleware, uploadRouter);
app.use('/api/checkout', supabaseMiddleware, checkoutRouter);
app.use('/webhook', supabaseMiddleware);
app.use('/webhook', webhookRouter);

// Rota raiz e health check
app.get('/', (req, res) => {
    // Verificar status dos serviços
    const serviceStatus = {
        supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
        mercadoPago: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
        email: !!process.env.RESEND_API_KEY
    };
    
    res.json({ 
        message: 'Devotly Backend',
        status: 'online',
        timestamp: new Date().toISOString(),
        serviceStatus
    });
});

// Rotas para páginas de retorno do Mercado Pago
app.get('/success', (req, res) => {
    // Redirecionar para success.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    res.redirect(`${process.env.FRONTEND_URL}/success.html?${params}`);
});

app.get('/failure', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/failure.html`);
});

app.get('/pending', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/pending.html`);
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