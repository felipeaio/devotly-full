import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// Importar serviço do TikTok API Events
import './services/tiktokEvents.js';

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
console.log(`TIKTOK_ACCESS_TOKEN: ${process.env.TIKTOK_ACCESS_TOKEN ? 'Definida' : 'Indefinida'}`);
console.log(`TIKTOK_PIXEL_CODE: ${process.env.TIKTOK_PIXEL_CODE ? 'Definida' : 'Indefinida'}`);
console.log(`BACKEND_URL: ${process.env.BACKEND_URL}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);

// Debug: Print all URL-related environment variables
console.log('=== All URL Environment Variables ===');
Object.keys(process.env).filter(key => key.includes('URL')).forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
});
console.log('=====================================');

// Importar o middleware de Supabase
import supabaseMiddleware from './middleware/supabase.js';
import cardsRouter from './routes/cards.js';
import uploadRouter from './routes/upload.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';
import tiktokRouter from './routes/tiktok.js';
import tiktokV3Router from './routes/tiktokV3.js';
import emqRouter from './routes/emq.js';

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
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MERCADO_PAGO_ACCESS_TOKEN', 'BACKEND_URL', 'FRONTEND_URL'];
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
    origin: [
        process.env.FRONTEND_URL, 
        'https://devotly.shop',
        'https://www.devotly.shop', 
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-User-Email', 'X-Token-Edit', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Middleware adicional para CORS - tratamento explícito para preflight requests
app.use((req, res, next) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL, 
        'https://devotly.shop',
        'https://www.devotly.shop', 
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Email, X-Token-Edit, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});
app.use(helmet());

// General rate limiter
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests, please try again later.',
        status: 429
    }
}));

// Stricter rate limiter for creation endpoints
const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 creation requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many creation requests, please wait before trying again.',
        status: 429
    }
});

// Stricter rate limiter for upload endpoints
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 upload requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many upload requests, please wait before trying again.',
        status: 429
    }
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requisição: ${req.method} ${req.url} from ${req.ip}`);
    
    // Log especial para problemas de redirecionamento
    if (req.url.includes('devotly.shop') && req.url.includes('/devotly.shop/')) {
        console.error(`[${new Date().toISOString()}] URL PROBLEMÁTICA DETECTADA: ${req.url}`);
        console.error('Headers:', req.headers);
        console.error('Query:', req.query);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[${new Date().toISOString()}] Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// Middleware adicional para CORS preflight requests
app.use((req, res, next) => {
    // Adicionar headers CORS extras para desenvolvimento
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://devotly.shop',
        'https://www.devotly.shop',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-Token-Edit');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Responder a preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// Middleware específico para debug de URLs do Mercado Pago
app.use((req, res, next) => {
    // Detectar requisições vindas do Mercado Pago
    const userAgent = req.headers['user-agent'] || '';
    const isMercadoPagoRequest = userAgent.includes('MercadoPago') || 
                                req.headers.referer?.includes('mercadopago') ||
                                req.query.payment_id || 
                                req.query.collection_id;
    
    if (isMercadoPagoRequest) {
        console.log(`[${new Date().toISOString()}] === REQUISIÇÃO DO MERCADO PAGO DETECTADA ===`);
        console.log('URL completa:', req.url);
        console.log('Path:', req.path);
        console.log('Query:', req.query);
        console.log('Headers relevantes:', {
            'user-agent': req.headers['user-agent'],
            'referer': req.headers.referer,
            'host': req.headers.host,
            'x-forwarded-host': req.headers['x-forwarded-host'],
            'x-forwarded-proto': req.headers['x-forwarded-proto']
        });
        
        // Verificar se há problema na URL
        if (req.url.includes('/devotly.shop/')) {
            console.error(`[${new Date().toISOString()}] PROBLEMA DE URL DETECTADO!`);
            console.error('URL problemática:', req.url);
            console.error('Variáveis de ambiente:', {
                BACKEND_URL: process.env.BACKEND_URL,
                FRONTEND_URL: process.env.FRONTEND_URL
            });
        }
    }
    
    next();
});

// Middleware para prevenir loops de redirecionamento
app.use((req, res, next) => {
    // Verificar se a requisição vem do próprio Mercado Pago
    const userAgent = req.headers['user-agent'] || '';
    const isMercadoPagoRedirect = userAgent.includes('MercadoPago') || req.headers['x-forwarded-for'];
    
    if (isMercadoPagoRedirect) {
        console.log(`[${new Date().toISOString()}] Requisição identificada como redirecionamento do Mercado Pago`);
        
        // Verificar se esta é uma requisição para rotas de redirecionamento
        const isRedirectRoute = ['/success', '/failure', '/pending'].includes(req.path);
        
        if (isRedirectRoute) {
            // Log detalhado para depuração
            console.log(`[${new Date().toISOString()}] Parâmetros de redirecionamento do MP:`, req.query);
        }
    }
    
    next();
});

// Servir arquivos estáticos do frontend (apenas para desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    const frontendPath = path.resolve(__dirname, '../frontend');
    app.use(express.static(frontendPath));
    console.log(`[${new Date().toISOString()}] Servindo arquivos estáticos do frontend: ${frontendPath}`);
}

// Rotas
app.use('/cards', supabaseMiddleware);
app.use('/cards', createLimiter, cardsRouter);
app.use('/api/cards', supabaseMiddleware);
app.use('/api/cards', createLimiter, cardsRouter);
app.use('/api/upload-image', uploadLimiter, supabaseMiddleware, uploadRouter);
app.use('/api/upload', uploadLimiter, supabaseMiddleware, uploadRouter); // Alias para compatibilidade
app.use('/api/checkout', createLimiter, supabaseMiddleware, checkoutRouter);
app.use('/api/tiktok', tiktokRouter);
app.use('/api/tiktok-v3', tiktokV3Router);
app.use('/api/emq', emqRouter);
app.use('/webhook', supabaseMiddleware);
app.use('/webhook', webhookRouter);

// Endpoint de debug para verificar configuração das URLs
app.get('/debug/urls', (req, res) => {
    let backendUrl = process.env.BACKEND_URL;
    if (!backendUrl || !backendUrl.startsWith('http')) {
        backendUrl = `${req.protocol}://${req.get('host')}`;
    }
    backendUrl = backendUrl.replace(/\/+$/, '');
    
    let frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
    frontendUrl = frontendUrl.replace(/\/+$/, '');
    
    const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            BACKEND_URL: process.env.BACKEND_URL,
            FRONTEND_URL: process.env.FRONTEND_URL
        },
        computed: {
            backendUrl,
            frontendUrl
        },
        mercadoPagoUrls: {
            success: `${backendUrl}/success`,
            failure: `${backendUrl}/failure`,
            pending: `${backendUrl}/pending`,
            webhook: `${backendUrl}/webhook/mercadopago`
        },
        finalRedirectUrls: {
            success: `${frontendUrl}/success.html`,
            failure: `${frontendUrl}/failure.html`,
            pending: `${frontendUrl}/pending.html`
        },
        requestInfo: {
            protocol: req.protocol,
            host: req.get('host'),
            originalUrl: req.originalUrl,
            headers: {
                'x-forwarded-proto': req.headers['x-forwarded-proto'],
                'x-forwarded-host': req.headers['x-forwarded-host']
            }
        }
    };
    
    res.json(debugInfo);
});

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
    // Log dos parâmetros recebidos
    console.log(`[${new Date().toISOString()}] Redirecionamento /success recebido:`, req.query);
    console.log('Headers da requisição:', req.headers);
    console.log('User-Agent:', req.get('User-Agent'));
    
    // Verificar se já foi processado com base no payment_id
    const { payment_id, external_reference } = req.query;
    
    // URL fixa para evitar loops de redirecionamento
    const frontendUrl = 'https://devotly.shop';
    
    // Redirecionar para success.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    const redirectUrl = `${frontendUrl}/success.html?${params}`;
    
    console.log(`[${new Date().toISOString()}] Redirecionando para: ${redirectUrl}`);
    
    // Usar status 301 para redirecionamento permanente e evitar loops
    return res.status(301).redirect(redirectUrl);
});

app.get('/failure', (req, res) => {
    // Log dos parâmetros recebidos
    console.log(`[${new Date().toISOString()}] Redirecionamento /failure recebido:`, req.query);
    
    // URL fixa para evitar loops de redirecionamento
    const frontendUrl = 'https://devotly.shop';
    
    // Redirecionar para failure.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    const redirectUrl = `${frontendUrl}/failure.html?${params}`;
    console.log(`[${new Date().toISOString()}] Redirecionando para: ${redirectUrl}`);
    
    // Usar status 301 para redirecionamento permanente
    return res.status(301).redirect(redirectUrl);
});

app.get('/pending', (req, res) => {
    // Log dos parâmetros recebidos
    console.log(`[${new Date().toISOString()}] Redirecionamento /pending recebido:`, req.query);
    
    // URL fixa para evitar loops de redirecionamento
    const frontendUrl = 'https://devotly.shop';
    
    // Redirecionar para pending.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    const redirectUrl = `${frontendUrl}/pending.html?${params}`;
    console.log(`[${new Date().toISOString()}] Redirecionando para: ${redirectUrl}`);
    
    // Usar status 301 para redirecionamento permanente
    return res.status(301).redirect(redirectUrl);
});

// Rota de fallback para capturar URLs problemáticas do Mercado Pago
app.get('/devotly.shop/*', (req, res) => {
    console.error(`[${new Date().toISOString()}] URL PROBLEMÁTICA CAPTURADA: ${req.url}`);
    console.error('Path original:', req.path);
    console.error('Query params:', req.query);
    console.error('Headers:', req.headers);
    
    // Extrair a parte correta da URL - remove TODAS as ocorrências de /devotly.shop
    let correctPath = req.path;
    
    // Remove todas as repetições de /devotly.shop do início
    while (correctPath.startsWith('/devotly.shop')) {
        correctPath = correctPath.replace('/devotly.shop', '');
    }
    
    // Se ainda não há um caminho válido, assumir que é success.html
    if (!correctPath || correctPath === '/') {
        correctPath = '/success.html';
    }
    
    const frontendUrl = 'https://devotly.shop'; // URL fixa para evitar loops
    
    // Construir a URL correta
    const params = new URLSearchParams(req.query).toString();
    const correctUrl = `${frontendUrl}${correctPath}${params ? '?' + params : ''}`;
    
    console.log(`[${new Date().toISOString()}] Redirecionando para URL correta: ${correctUrl}`);
    
    // Usar redirect 301 (permanente) para quebrar o loop
    return res.status(301).redirect(correctUrl);
});

// Rota adicional para capturar qualquer URL que contenha repetições do domínio
app.get('*', (req, res, next) => {
    // Verificar se a URL contém repetições do domínio devotly.shop
    if (req.path.includes('/devotly.shop/') && req.path.split('/devotly.shop/').length > 2) {
        console.error(`[${new Date().toISOString()}] LOOP DETECTADO: ${req.url}`);
        
        // Redirecionar diretamente para success.html com os parâmetros
        const params = new URLSearchParams(req.query).toString();
        const correctUrl = `https://devotly.shop/success.html${params ? '?' + params : ''}`;
        
        console.log(`[${new Date().toISOString()}] Redirecionamento de emergência para: ${correctUrl}`);
        return res.status(301).redirect(correctUrl);
    }
    
    next();
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