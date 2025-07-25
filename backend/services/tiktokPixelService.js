/**
 * TikTok Pixel Service - Múltiplos Pixels
 * Serviço para envio de eventos para múltiplos pixels TikTok via Events API v1.3
 * 
 * Características:
 * - Suporte a múltiplos pixels
 * - Hash SHA-256 para dados sensíveis
 * - Retry automático em caso de falha
 * - Logs detalhados para debug
 * - Compatível com estrutura existente
 */

import axios from 'axios';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

class TikTokPixelService {
    constructor() {
        // Configuração dos pixels - pode ser expandida facilmente
        this.pixels = [
            {
                id: process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG',
                token: process.env.TIKTOK_ACCESS_TOKEN || '08538eef624276105c15fff5c1dfefe76b9726f2',
                name: 'Primary Pixel'
            }
            // Adicione mais pixels aqui conforme necessário:
            // {
            //     id: process.env.TIKTOK_PIXEL_ID_2,
            //     token: process.env.TIKTOK_ACCESS_TOKEN_2,
            //     name: 'Secondary Pixel'
            // }
        ];

        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
        
        // Estatísticas do serviço
        this.stats = {
            totalEvents: 0,
            successfulEvents: 0,
            failedEvents: 0,
            pixelStats: new Map()
        };

        console.log(`🎯 TikTok Pixel Service inicializado com ${this.pixels.length} pixel(s)`);
        this.validateConfiguration();
    }

    /**
     * Valida configuração dos pixels
     */
    validateConfiguration() {
        let validPixels = 0;
        
        this.pixels.forEach((pixel, index) => {
            if (pixel.id && pixel.token) {
                validPixels++;
                this.stats.pixelStats.set(pixel.id, {
                    name: pixel.name,
                    events: 0,
                    success: 0,
                    errors: 0
                });
                console.log(`✅ Pixel ${index + 1} (${pixel.name}): ID=${pixel.id}`);
            } else {
                console.warn(`⚠️ Pixel ${index + 1} inválido: ID ou Token ausente`);
            }
        });

        if (validPixels === 0) {
            console.error('❌ Nenhum pixel TikTok válido configurado!');
        }
    }

    /**
     * Gera hash SHA-256 para dados sensíveis
     */
    hashSHA256(value) {
        if (!value || typeof value !== 'string') return '';
        return createHash('sha256')
            .update(value.trim().toLowerCase())
            .digest('hex');
    }

    /**
     * Gera event_id único
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Prepara dados do usuário com hash
     */
    prepareUserData(eventData) {
        return {
            email: eventData.email ? this.hashSHA256(eventData.email) : '',
            phone: eventData.phone_number ? this.hashSHA256(eventData.phone_number) : '',
            external_id: eventData.email ? this.hashSHA256(eventData.email) : '',
            ip: eventData.ip || '',
            user_agent: eventData.user_agent || '',
            ttclid: eventData.ttclid || '',
            ttp: eventData.ttp || ''
        };
    }

    /**
     * Prepara payload do evento
     */
    prepareEventPayload(eventName, eventData, pixelId) {
        const eventId = this.generateEventId();
        const userData = this.prepareUserData(eventData);

        const eventBody = {
            event: eventName,
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            user: userData,
            properties: {
                currency: eventData.currency || 'BRL',
                value: eventData.value || 0,
                content_id: eventData.content_id || '',
                content_name: eventData.content_name || '',
                content_type: eventData.content_type || 'product',
                content_category: eventData.content_category || ''
            },
            page: {
                url: eventData.page_url || process.env.FRONTEND_URL || 'https://www.devotly.shop',
                referrer: eventData.page_referrer || ''
            }
        };

        return {
            event_source: 'web',
            event_source_id: pixelId,
            data: [eventBody]
        };
    }

    /**
     * Envia evento para um pixel específico com retry
     */
    async sendToPixel(pixel, payload, eventName, attempt = 1) {
        try {
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Access-Token': pixel.token,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos
            });

            // Atualizar estatísticas
            const pixelStats = this.stats.pixelStats.get(pixel.id);
            if (pixelStats) {
                pixelStats.events++;
                pixelStats.success++;
            }

            console.log(`✅ Evento ${eventName} enviado para ${pixel.name} (${pixel.id})`);
            return { success: true, data: response.data };

        } catch (error) {
            // Atualizar estatísticas de erro
            const pixelStats = this.stats.pixelStats.get(pixel.id);
            if (pixelStats) {
                pixelStats.events++;
                pixelStats.errors++;
            }

            const errorMessage = axios.isAxiosError(error) 
                ? error.response?.data || error.message 
                : error.message || 'Erro desconhecido';

            console.error(`❌ Erro ao enviar ${eventName} para ${pixel.name} (tentativa ${attempt}):`, errorMessage);

            // Retry logic
            if (attempt < this.maxRetries) {
                console.log(`🔄 Tentando novamente em ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.sendToPixel(pixel, payload, eventName, attempt + 1);
            }

            return { success: false, error: errorMessage };
        }
    }

    /**
     * Método principal para envio de eventos
     */
    async sendTikTokEvent(eventName, eventData = {}) {
        // Verificar se estamos em modo de desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV MODE] TikTok event "${eventName}" não enviado (modo desenvolvimento)`);
            return { success: true, message: 'Modo desenvolvimento - evento não enviado' };
        }

        console.log(`🎯 Enviando evento ${eventName} para ${this.pixels.length} pixel(s)...`);
        this.stats.totalEvents++;

        const results = await Promise.allSettled(
            this.pixels.map(async (pixel) => {
                const payload = this.prepareEventPayload(eventName, eventData, pixel.id);
                return this.sendToPixel(pixel, payload, eventName);
            })
        );

        // Analisar resultados
        let successCount = 0;
        let errorCount = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                successCount++;
            } else {
                errorCount++;
                console.error(`❌ Falha no pixel ${this.pixels[index].name}:`, 
                    result.status === 'rejected' ? result.reason : result.value.error);
            }
        });

        // Atualizar estatísticas globais
        if (successCount > 0) {
            this.stats.successfulEvents++;
        } else {
            this.stats.failedEvents++;
        }

        console.log(`📊 Resultado: ${successCount} sucessos, ${errorCount} falhas`);

        return {
            success: successCount > 0,
            successCount,
            errorCount,
            totalPixels: this.pixels.length
        };
    }

    /**
     * Métodos de conveniência para eventos específicos
     */
    async trackViewContent(contentId, contentName, value = 0, currency = 'BRL', eventData = {}) {
        return this.sendTikTokEvent('ViewContent', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency,
            ...eventData
        });
    }

    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL', eventData = {}) {
        return this.sendTikTokEvent('InitiateCheckout', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency,
            ...eventData
        });
    }

    async trackPurchase(contentId, contentName, value, currency = 'BRL', eventData = {}) {
        return this.sendTikTokEvent('Purchase', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency,
            ...eventData
        });
    }

    async trackAddToCart(contentId, contentName, value, currency = 'BRL', eventData = {}) {
        return this.sendTikTokEvent('AddToCart', {
            content_id: contentId,
            content_name: contentName,
            content_type: 'product',
            value,
            currency,
            ...eventData
        });
    }

    /**
     * Obtém estatísticas do serviço
     */
    getStats() {
        const pixelDetails = Array.from(this.stats.pixelStats.entries()).map(([id, stats]) => ({
            id,
            name: stats.name,
            events: stats.events,
            successRate: stats.events > 0 ? ((stats.success / stats.events) * 100).toFixed(1) + '%' : '0%',
            success: stats.success,
            errors: stats.errors
        }));

        return {
            global: {
                totalEvents: this.stats.totalEvents,
                successfulEvents: this.stats.successfulEvents,
                failedEvents: this.stats.failedEvents,
                successRate: this.stats.totalEvents > 0 
                    ? ((this.stats.successfulEvents / this.stats.totalEvents) * 100).toFixed(1) + '%' 
                    : '0%'
            },
            pixels: pixelDetails
        };
    }

    /**
     * Reset das estatísticas
     */
    resetStats() {
        this.stats.totalEvents = 0;
        this.stats.successfulEvents = 0;
        this.stats.failedEvents = 0;
        this.stats.pixelStats.forEach(stats => {
            stats.events = 0;
            stats.success = 0;
            stats.errors = 0;
        });
        console.log('📊 Estatísticas resetadas');
    }
}

// Exportar instância singleton
export default new TikTokPixelService();
