// Enhanced error handling utilities for Devotly - SEM RATE LIMITING
class DevotlyErrorHandler {
    constructor() {
        this.retryAttempts = new Map(); // Track retry attempts per request type
        this.maxRetries = 3;
        this.pendingRequests = new Map(); // Track pending requests to avoid duplicates
    }

    // Create a unique key for the request type
    getRequestKey(url, method = 'POST') {
        return `${method}:${url}`;
    }

    // Enhanced fetch with retry logic and error handling - SEM RATE LIMITING
    async enhancedFetch(url, options = {}, requestType = 'generic') {
        const key = this.getRequestKey(url, options.method || 'POST');
        
        // Check for pending identical request apenas para evitar duplicatas
        if (this.pendingRequests.has(key)) {
            console.log(`[DevotlyErrorHandler] Request já em andamento para ${requestType}, aguardando...`);
            return await this.pendingRequests.get(key);
        }

        // Create promise for this request and store it
        const requestPromise = this._executeRequest(url, options, requestType, key);
        this.pendingRequests.set(key, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Clean up pending request
            this.pendingRequests.delete(key);
        }
    }

    // Internal method to execute the actual request
    async _executeRequest(url, options, requestType, key) {
        // Retry logic
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`[DevotlyErrorHandler] Tentativa ${attempt}/${this.maxRetries} para ${requestType}`);
                
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Accept': 'application/json',
                        ...options.headers
                    }
                });

                // Handle different response types
                const contentType = response.headers.get('content-type');
                let responseData;
                let responseText;

                try {
                    responseText = await response.text();
                    
                    if (responseText.trim() === '') {
                        throw new Error('Resposta vazia do servidor');
                    }

                    // Check for rate limiting before parsing JSON - SIMPLIFICADO
                    if (response.status === 429) {
                        console.warn(`[DevotlyErrorHandler] Rate limited (429) na tentativa ${attempt}`);
                        
                        // Simple backoff without throwing immediate errors
                        const backoffTime = 1000 * attempt;
                        
                        if (attempt < this.maxRetries) {
                            console.log(`[DevotlyErrorHandler] Aguardando ${backoffTime}ms antes da próxima tentativa...`);
                            await this.delay(backoffTime);
                            continue; // Retry
                        }
                        // Se esgotar tentativas, deixa prosseguir para tentar processar mesmo assim
                    }

                    // Check for HTML error pages (like Railway error pages)
                    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
                        console.error(`[DevotlyErrorHandler] Recebido HTML ao invés de JSON:`, responseText.substring(0, 200));
                        throw new Error('Servidor retornou página HTML ao invés de JSON. Verifique a URL da API.');
                    }

                    // Check for plain text errors
                    if (!contentType || !contentType.includes('application/json')) {
                        console.error(`[DevotlyErrorHandler] Content-Type inesperado:`, contentType);
                        console.error(`[DevotlyErrorHandler] Resposta:`, responseText.substring(0, 200));
                        
                        if (responseText.includes('Too many requests')) {
                            // Não bloquear mais por rate limit, apenas tentar novamente
                            if (attempt < this.maxRetries) {
                                const backoffTime = 500 * attempt; // Backoff reduzido
                                console.log(`[DevotlyErrorHandler] Rate limit detectado, tentativa ${attempt}, aguardando ${backoffTime}ms...`);
                                await this.delay(backoffTime);
                                continue; // Retry
                            }
                            // Se esgotar tentativas, deixa prosseguir
                        }
                        
                        throw new Error(`Resposta do servidor não é JSON válido: ${responseText.substring(0, 100)}`);
                    }

                    // Try to parse as JSON
                    try {
                        responseData = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.error(`[DevotlyErrorHandler] Erro ao fazer parse do JSON:`, jsonError);
                        console.error(`[DevotlyErrorHandler] Texto da resposta:`, responseText.substring(0, 300));
                        throw new Error(`JSON inválido do servidor: ${jsonError.message}`);
                    }

                } catch (readError) {
                    console.error(`[DevotlyErrorHandler] Erro ao ler resposta:`, readError);
                    throw new Error(`Erro ao processar resposta do servidor: ${readError.message}`);
                }

                // Check for HTTP errors
                if (!response.ok) {
                    const errorMessage = responseData?.error || responseData?.message || `HTTP ${response.status}`;
                    console.error(`[DevotlyErrorHandler] HTTP Error ${response.status}:`, errorMessage);
                    throw new Error(errorMessage);
                }

                // Success!
                console.log(`[DevotlyErrorHandler] ✅ ${requestType} bem-sucedido na tentativa ${attempt}`);
                return {
                    ok: true,
                    status: response.status,
                    data: responseData,
                    attempt: attempt
                };

            } catch (error) {
                console.error(`[DevotlyErrorHandler] Erro na tentativa ${attempt}:`, error.message);
                
                // If it's the last attempt, throw the error
                if (attempt === this.maxRetries) {
                    throw error;
                }

                // If it's a network error, wait before retrying
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    const backoffTime = this.rateLimitBackoff * attempt;
                    console.log(`[DevotlyErrorHandler] Erro de rede, aguardando ${backoffTime}ms...`);
                    await this.delay(backoffTime);
                }
                
                // If it's not a rate limit error, don't retry unless it's a network error
                if (!error.message.includes('Too many requests') && 
                    !error.message.includes('Rate limit') && 
                    !error.message.includes('fetch') && 
                    !error.message.includes('network')) {
                    throw error;
                }
            }
        }
    }

    // Simple delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Format error message for user display
    formatErrorMessage(error) {
        if (error.message.includes('Rate limit') || error.message.includes('Too many requests')) {
            return '🚦 Muitas requisições. Aguarde um momento antes de tentar novamente.';
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return '🌐 Erro de conexão. Verifique sua internet e tente novamente.';
        }
        
        if (error.message.includes('JSON')) {
            return '⚠️ Erro de comunicação com o servidor. Tente novamente em alguns segundos.';
        }
        
        if (error.message.includes('HTTP 500')) {
            return '🔧 Erro interno do servidor. Nossa equipe foi notificada.';
        }
        
        if (error.message.includes('HTTP 404')) {
            return '❓ Serviço não encontrado. Verifique se a aplicação está atualizada.';
        }
        
        // Generic error
        return `❌ ${error.message}`;
    }

    // Reset retry state for a specific request type
    resetRetryState(url, method = 'POST') {
        const key = this.getRequestKey(url, method);
        this.retryAttempts.delete(key);
        this.lastRequestTimes.delete(key);
    }

    // Get remaining cooldown time
    getCooldownTime(url, method = 'POST') {
        const key = this.getRequestKey(url, method);
        const lastTime = this.lastRequestTimes.get(key);
        
        if (!lastTime) return 0;
        
        const timeSince = Date.now() - lastTime;
        const remaining = this.minInterval - timeSince;
        
        return Math.max(0, remaining);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevotlyErrorHandler;
} else if (typeof window !== 'undefined') {
    window.DevotlyErrorHandler = DevotlyErrorHandler;
}
