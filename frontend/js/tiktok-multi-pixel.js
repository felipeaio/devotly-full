/**
 * TikTok Multiple Pixels Frontend Integration
 * Cliente JavaScript para enviar eventos para múltiplos pixels via backend
 */

class TikTokMultiPixelClient {
    constructor() {
        this.apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://devotly-full-production.up.railway.app';
        
        this.isEnabled = true;
        this.debug = true; // Ativar logs detalhados
        
        console.log('🎯 TikTok Multi-Pixel Client inicializado');
    }

    /**
     * Método genérico para enviar eventos
     */
    async sendEvent(eventName, eventData = {}) {
        if (!this.isEnabled) {
            console.log(`[DISABLED] ${eventName} não enviado`);
            return;
        }

        try {
            if (this.debug) {
                console.log(`📡 Enviando ${eventName} para múltiplos pixels:`, eventData);
            }

            const response = await fetch(`${this.apiBaseUrl}/api/tiktok-pixels/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventName,
                    eventData,
                    userEmail: this.extractEmail(),
                    userPhone: this.extractPhone()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${eventName} enviado para ${result.successCount}/${result.pixelsTarget} pixels`);
            } else {
                console.error(`❌ Falha ao enviar ${eventName}:`, result.error);
            }

            return result;

        } catch (error) {
            console.error(`❌ Erro ao enviar ${eventName}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Métodos específicos para eventos
     */
    async trackViewContent(contentId, contentName, value = 0, currency = 'BRL') {
        return this.sendEvent('ViewContent', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency
        });
    }

    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL') {
        return this.sendEvent('InitiateCheckout', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency
        });
    }

    async trackPurchase(contentId, contentName, value, currency = 'BRL') {
        return this.sendEvent('Purchase', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency
        });
    }

    async trackAddToCart(contentId, contentName, value, currency = 'BRL') {
        return this.sendEvent('AddToCart', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency
        });
    }

    /**
     * Métodos utilitários
     */
    extractEmail() {
        // Tentar extrair email de campos comuns
        const emailFields = ['#userEmail', '#email', '[name="email"]', '[type="email"]'];
        for (const selector of emailFields) {
            const field = document.querySelector(selector);
            if (field && field.value && this.isValidEmail(field.value)) {
                return field.value;
            }
        }
        return '';
    }

    extractPhone() {
        // Tentar extrair telefone de campos comuns
        const phoneFields = ['#userPhone', '#phone', '[name="phone"]', '[type="tel"]'];
        for (const selector of phoneFields) {
            const field = document.querySelector(selector);
            if (field && field.value) {
                return field.value;
            }
        }
        return '';
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Obter estatísticas dos pixels
     */
    async getStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/tiktok-pixels/stats`);
            return await response.json();
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/tiktok-pixels/health`);
            const result = await response.json();
            console.log('🔍 Health Check:', result);
            return result;
        } catch (error) {
            console.error('❌ Health check falhou:', error);
            return null;
        }
    }

    /**
     * Ativar/desativar o serviço
     */
    enable() {
        this.isEnabled = true;
        console.log('✅ TikTok Multi-Pixel habilitado');
    }

    disable() {
        this.isEnabled = false;
        console.log('⏸️ TikTok Multi-Pixel desabilitado');
    }

    /**
     * Ativar/desativar debug
     */
    enableDebug() {
        this.debug = true;
        console.log('🐛 Debug habilitado');
    }

    disableDebug() {
        this.debug = false;
        console.log('🔇 Debug desabilitado');
    }
}

// Instância global
window.TikTokMultiPixel = new TikTokMultiPixelClient();

// Interface compatível com o sistema existente
window.TikTokMultiPixelEvents = {
    viewContent: (id, name, value, currency) => window.TikTokMultiPixel.trackViewContent(id, name, value, currency),
    initiateCheckout: (id, name, value, currency) => window.TikTokMultiPixel.trackInitiateCheckout(id, name, value, currency),
    purchase: (id, name, value, currency) => window.TikTokMultiPixel.trackPurchase(id, name, value, currency),
    addToCart: (id, name, value, currency) => window.TikTokMultiPixel.trackAddToCart(id, name, value, currency)
};

// Export para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TikTokMultiPixelClient;
}
