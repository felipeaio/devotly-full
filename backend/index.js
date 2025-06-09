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
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    credentials: true,
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

// Rotas
app.use('/cards', supabaseMiddleware);
app.use('/cards', cardsRouter);
app.use('/api/cards', supabaseMiddleware);
app.use('/api/cards', cardsRouter);
app.use('/api/upload-image', supabaseMiddleware, uploadRouter);
app.use('/api/upload', supabaseMiddleware, uploadRouter); // Alias para compatibilidade
app.use('/api/checkout', supabaseMiddleware, checkoutRouter);
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
    
    // Garantir que o FRONTEND_URL esteja configurado corretamente
    const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
    
    // Redirecionar para success.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    const redirectUrl = `${frontendUrl}/success.html?${params}`;
    
    console.log(`[${new Date().toISOString()}] Redirecionando para: ${redirectUrl}`);
    
    // Usar status 302 para evitar caching do redirect
    return res.status(302).redirect(redirectUrl);
});

app.get('/failure', (req, res) => {
    // Log dos parâmetros recebidos
    console.log(`[${new Date().toISOString()}] Redirecionamento /failure recebido:`, req.query);
    
    // Garantir que o FRONTEND_URL esteja configurado corretamente
    const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
    
    // Redirecionar para failure.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    // Usar status 302 para evitar caching do redirect
    return res.status(302).redirect(`${frontendUrl}/failure.html?${params}`);
});

app.get('/pending', (req, res) => {
    // Log dos parâmetros recebidos
    console.log(`[${new Date().toISOString()}] Redirecionamento /pending recebido:`, req.query);
    
    // Garantir que o FRONTEND_URL esteja configurado corretamente
    const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
    
    // Redirecionar para pending.html mantendo os parâmetros da URL
    const params = new URLSearchParams(req.query).toString();
    // Usar status 302 para evitar caching do redirect
    return res.status(302).redirect(`${frontendUrl}/pending.html?${params}`);
});

// Rota de fallback para capturar URLs problemáticas do Mercado Pago
app.get('/devotly.shop/*', (req, res) => {
    console.error(`[${new Date().toISOString()}] URL PROBLEMÁTICA CAPTURADA: ${req.url}`);
    console.error('Path original:', req.path);
    console.error('Query params:', req.query);
    console.error('Headers:', req.headers);
    
    // Extrair a parte correta da URL
    const correctPath = req.path.replace('/devotly.shop', '');
    const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
    
    // Construir a URL correta
    const params = new URLSearchParams(req.query).toString();
    const correctUrl = `${frontendUrl}${correctPath}${params ? '?' + params : ''}`;
    
    console.log(`[${new Date().toISOString()}] Redirecionando para URL correta: ${correctUrl}`);
    
    return res.status(302).redirect(correctUrl);
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