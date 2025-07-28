/**
 * Smart Rate Limiting Middleware
 * Sistema inteligente que se ajusta baseado no tráfego real
 */

import rateLimit from 'express-rate-limit';

// Store para tracking de requisições por IP
const requestStore = new Map();

/**
 * Rate limiter inteligente que se adapta ao padrão de uso
 */
export const smartRateLimit = (baseConfig = {}) => {
    const {
        windowMs = 60 * 1000, // 1 minuto por padrão
        maxBase = 20, // Limite base
        burstMultiplier = 2, // Multiplicador para rajadas
        adaptiveThreshold = 0.8, // Threshold para começar adaptação
        name = 'generic'
    } = baseConfig;

    return rateLimit({
        windowMs,
        max: (req, res) => {
            const ip = req.ip;
            const now = Date.now();
            
            // Obter histórico de requests deste IP
            if (!requestStore.has(ip)) {
                requestStore.set(ip, {
                    requests: [],
                    violations: 0,
                    lastViolation: 0,
                    goodBehaviorStreak: 0
                });
            }
            
            const ipData = requestStore.get(ip);
            
            // Limpar requests antigos (fora da janela)
            ipData.requests = ipData.requests.filter(time => now - time < windowMs);
            
            // Adicionar request atual
            ipData.requests.push(now);
            
            // Calcular limite dinâmico
            let dynamicMax = maxBase;
            
            // Se usuário tem bom comportamento, aumentar limite
            if (ipData.violations === 0 && ipData.goodBehaviorStreak > 5) {
                dynamicMax = Math.min(maxBase * burstMultiplier, maxBase * 3);
            }
            
            // Se teve violações recentes, reduzir limite
            if (ipData.violations > 0 && (now - ipData.lastViolation) < windowMs * 5) {
                dynamicMax = Math.max(Math.floor(maxBase / 2), 5);
            }
            
            console.log(`[SmartRateLimit-${name}] IP: ${ip}, Requests: ${ipData.requests.length}, Limit: ${dynamicMax}, Violations: ${ipData.violations}`);
            
            return dynamicMax;
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) => {
            const ip = req.ip;
            const ipData = requestStore.get(ip);
            
            if (ipData) {
                ipData.violations++;
                ipData.lastViolation = Date.now();
                ipData.goodBehaviorStreak = 0;
            }
            
            console.log(`[SmartRateLimit-${name}] Rate limit violation for IP: ${ip}`);
            
            res.status(429).json({
                error: `Too many ${name} requests. Please slow down.`,
                status: 429,
                retryAfter: Math.ceil(baseConfig.windowMs / 1000),
                adaptive: true
            });
        },
        onLimitReached: (req, res, options) => {
            console.log(`[SmartRateLimit-${name}] Limit reached for IP: ${req.ip}`);
        },
        skip: (req, res) => {
            const ip = req.ip;
            
            // Atualizar streak de bom comportamento
            if (requestStore.has(ip)) {
                const ipData = requestStore.get(ip);
                if (Date.now() - ipData.lastViolation > windowMs * 2) {
                    ipData.goodBehaviorStreak++;
                }
            }
            
            return false; // Não pular nenhuma request
        }
    });
};

/**
 * Rate limiter específico para uploads com burst handling
 */
export const uploadRateLimit = smartRateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxBase: 15, // 15 uploads por minuto base
    burstMultiplier: 2,
    name: 'upload'
});

/**
 * Rate limiter específico para tracking events
 */
export const trackingRateLimit = smartRateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxBase: 50, // 50 tracking events por minuto
    burstMultiplier: 1.5,
    name: 'tracking'
});

/**
 * Rate limiter específico para creation endpoints
 */
export const creationRateLimit = smartRateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxBase: 8, // 8 criações por minuto
    burstMultiplier: 1.5,
    name: 'creation'
});

/**
 * Rate limiter geral mais permissivo
 */
export const generalRateLimit = smartRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxBase: 300, // 300 requests por 15 minutos
    burstMultiplier: 1.5,
    name: 'general'
});

/**
 * Cleanup periódico para evitar memory leaks
 */
setInterval(() => {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 30 * 60 * 1000; // 30 minutos
    
    for (const [ip, data] of requestStore.entries()) {
        // Remover IPs que não fazem requests há muito tempo
        if (data.requests.length === 0 && (now - data.lastViolation) > CLEANUP_THRESHOLD) {
            requestStore.delete(ip);
        }
    }
    
    console.log(`[SmartRateLimit] Cleanup completed. Active IPs: ${requestStore.size}`);
}, 10 * 60 * 1000); // Cleanup a cada 10 minutos
