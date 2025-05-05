import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Resolve o caminho do diretório raiz do projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'BIBLE_API_KEY', 'SUPABASE_JWT_SECRET'];
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
app.use(cors({
    origin: ['http://localhost:3000', 'https://devotly.com'], // Ajustar para produção
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'X-Token-Edit', 'Authorization'],
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

// Log de requisições
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Requisição: ${req.method} ${req.url} from ${req.ip}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[${new Date().toISOString()}] Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// Middleware de autenticação JWT
app.use('/cards', (req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/id/') || req.path.startsWith('/verse/')) {
        return next(); // Permite GET /cards/id/:id e /cards/verse/:book/:chapter/:verse sem autenticação
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Token de autenticação ausente' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
});

// Rotas
app.use('/cards', (req, res, next) => {
    import('./routes/cards.js').then(module => {
        module.default(req, res, next);
    }).catch(err => {
        console.error(`[${new Date().toISOString()}] Erro ao carregar cards.js:`, err.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    });
});

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
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Servidor rodando na porta ${PORT}`);
});