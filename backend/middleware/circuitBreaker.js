/**
 * Circuit Breaker para prevenir cascata de erros 429
 * Pausa temporariamente endpoints quando detecta sobrecarga
 */

class CircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.threshold = options.threshold || 5; // Número de falhas para abrir
        this.timeout = options.timeout || 30000; // Tempo em ms para tentar fechar
        this.monitor = options.monitor || 60000; // Janela de monitoramento
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = [];
        this.lastFailureTime = null;
        this.nextAttempt = Date.now();
        
        console.log(`🔌 Circuit Breaker '${this.name}' inicializado`);
    }
    
    /**
     * Executa uma função através do circuit breaker
     */
    async execute(fn) {
        const now = Date.now();
        
        // Limpar falhas antigas
        this.clearOldFailures(now);
        
        if (this.state === 'OPEN') {
            if (now < this.nextAttempt) {
                throw new Error(`Circuit breaker '${this.name}' is OPEN. Try again in ${Math.ceil((this.nextAttempt - now) / 1000)}s`);
            } else {
                this.state = 'HALF_OPEN';
                console.log(`🔌 Circuit Breaker '${this.name}' movendo para HALF_OPEN`);
            }
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    
    /**
     * Registra sucesso
     */
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            this.failures = [];
            console.log(`✅ Circuit Breaker '${this.name}' fechado - operação bem-sucedida`);
        }
    }
    
    /**
     * Registra falha
     */
    onFailure(error) {
        const now = Date.now();
        this.failures.push({ time: now, error: error.message });
        this.lastFailureTime = now;
        
        // Verificar se é erro de rate limiting
        const isRateLimit = error.message?.includes('429') || 
                           error.message?.includes('Too many') ||
                           error.message?.includes('Rate limit');
        
        if (isRateLimit) {
            console.log(`⚠️ Circuit Breaker '${this.name}' detectou rate limiting: ${error.message}`);
        }
        
        if (this.failures.length >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = now + this.timeout;
            console.log(`🔥 Circuit Breaker '${this.name}' ABERTO - muitas falhas (${this.failures.length})`);
            console.log(`⏰ Próxima tentativa em ${Math.ceil(this.timeout / 1000)} segundos`);
        }
    }
    
    /**
     * Remove falhas antigas da janela de monitoramento
     */
    clearOldFailures(now) {
        this.failures = this.failures.filter(failure => 
            now - failure.time < this.monitor
        );
    }
    
    /**
     * Retorna status atual
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures.length,
            lastFailure: this.lastFailureTime,
            nextAttempt: this.nextAttempt,
            isHealthy: this.state === 'CLOSED'
        };
    }
    
    /**
     * Força reset do circuit breaker
     */
    reset() {
        this.state = 'CLOSED';
        this.failures = [];
        this.lastFailureTime = null;
        this.nextAttempt = Date.now();
        console.log(`🔄 Circuit Breaker '${this.name}' resetado manualmente`);
    }
}

// Circuit breakers globais para diferentes tipos de operação
const circuitBreakers = {
    tiktokEvents: new CircuitBreaker({
        name: 'TikTokEvents',
        threshold: 3,
        timeout: 20000, // 20 segundos
        monitor: 60000
    }),
    
    upload: new CircuitBreaker({
        name: 'Upload',
        threshold: 5,
        timeout: 30000, // 30 segundos
        monitor: 120000
    }),
    
    tracking: new CircuitBreaker({
        name: 'Tracking',
        threshold: 10,
        timeout: 15000, // 15 segundos
        monitor: 60000
    })
};

/**
 * Middleware para aplicar circuit breaker
 */
export const withCircuitBreaker = (breakerName) => {
    return (req, res, next) => {
        const breaker = circuitBreakers[breakerName];
        
        if (!breaker) {
            console.warn(`⚠️ Circuit breaker '${breakerName}' não encontrado`);
            return next();
        }
        
        // Verificar estado do circuit breaker
        if (breaker.state === 'OPEN' && Date.now() < breaker.nextAttempt) {
            return res.status(503).json({
                error: 'Service temporarily unavailable',
                message: `Circuit breaker '${breakerName}' is open`,
                retryAfter: Math.ceil((breaker.nextAttempt - Date.now()) / 1000),
                status: 503
            });
        }
        
        // Interceptar resposta para monitorar erros
        const originalSend = res.send;
        res.send = function(data) {
            const statusCode = res.statusCode;
            
            if (statusCode === 429 || statusCode >= 500) {
                breaker.onFailure(new Error(`HTTP ${statusCode}`));
            } else if (statusCode >= 200 && statusCode < 400) {
                breaker.onSuccess();
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Endpoint para monitoramento dos circuit breakers
 */
export const getCircuitBreakerStatus = (req, res) => {
    const status = {};
    
    for (const [name, breaker] of Object.entries(circuitBreakers)) {
        status[name] = breaker.getStatus();
    }
    
    res.json({
        timestamp: new Date().toISOString(),
        circuitBreakers: status,
        healthy: Object.values(status).every(cb => cb.isHealthy)
    });
};

/**
 * Endpoint para reset manual dos circuit breakers
 */
export const resetCircuitBreakers = (req, res) => {
    const { name } = req.body;
    
    if (name && circuitBreakers[name]) {
        circuitBreakers[name].reset();
        res.json({ message: `Circuit breaker '${name}' resetado` });
    } else if (!name) {
        Object.values(circuitBreakers).forEach(cb => cb.reset());
        res.json({ message: 'Todos os circuit breakers resetados' });
    } else {
        res.status(404).json({ error: `Circuit breaker '${name}' não encontrado` });
    }
};

export { CircuitBreaker, circuitBreakers };
