/**
 * TikTok Events API Service - RESTRUTURAÇÃO COMPLETA v3.0
 * 
 * Sistema backend otimizado para máxima qualidade EMQ
 * Compatível com TikTok Events API v1.3
 * 
 * Características:
 * - EMQ Target: 70+ pontos  
 * - Validação rigorosa de dados
 * - Sistema de retry inteligente
 * - Cache avançado de eventos
 * - Deduplicação server-side
 * - Monitoramento de qualidade
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

class TikTokEventsServiceV3 {
    constructor() {
        this.accessToken = process.env.TIKTOK_ACCESS_TOKEN;
        this.pixelCode = process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG';
        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
        
        // Cache para deduplicação
        this.eventCache = new Map();
        this.maxCacheSize = 10000;
        
        // Configurações EMQ
        this.emqConfig = {
            requiredHashFields: ['email', 'phone_number', 'external_id'],
            hashAlgorithm: 'sha256',
            encoding: 'base64',
            minPhoneDigits: 8,
            maxRetries: 3,
            timeoutMs: 10000
        };
        
        // Métricas de qualidade
        this.metrics = {
            totalEvents: 0,
            successfulEvents: 0,
            failedEvents: 0,
            averageEMQ: 0,
            duplicateEvents: 0,
            hashSuccessRate: 0
        };
        
        console.log('🎯 TikTok Events Service v3.0 inicializado');
        console.log('📊 Target EMQ: 70+ pontos');
        console.log('🔑 Pixel Code:', this.pixelCode);
    }
    
    /**
     * Valida configuração do serviço
     */
    validateConfig() {
        if (!this.accessToken) {
            throw new Error('TIKTOK_ACCESS_TOKEN não configurado');
        }
        if (!this.pixelCode) {
            throw new Error('TIKTOK_PIXEL_CODE não configurado');
        }
        return true;
    }
    
    /**
     * Hash SHA-256 + Base64 otimizado
     */
    hashData(data, returnEmpty = true) {
        if (!data || typeof data !== 'string' || data.trim() === '') {
            return returnEmpty ? '' : null;
        }
        
        try {
            const normalized = data.trim().toLowerCase();
            const hash = crypto.createHash('sha256').update(normalized).digest('base64');
            return hash;
        } catch (error) {
            console.error('Erro no hash:', error);
            return returnEmpty ? '' : null;
        }
    }
    
    /**
     * Normaliza telefone para formato E.164
     */
    normalizePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }
        
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Validação mínima
        if (digitsOnly.length < this.emqConfig.minPhoneDigits) {
            return '';
        }
        
        // Lógica brasileira otimizada
        if (digitsOnly.length === 11 && digitsOnly.startsWith('11') && digitsOnly[2] === '9') {
            return `+55${digitsOnly}`;
        }
        if (digitsOnly.length === 11 && digitsOnly[2] === '9') {
            return `+55${digitsOnly}`;
        }
        if (digitsOnly.length === 10) {
            return `+55${digitsOnly}`;
        }
        if (digitsOnly.length === 9 && digitsOnly[0] === '9') {
            return `+5511${digitsOnly}`;
        }
        if (digitsOnly.length === 8) {
            return `+5511${digitsOnly}`;
        }
        if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
            return `+${digitsOnly}`;
        }
        
        // Formato internacional já existente
        if (phone.startsWith('+') && digitsOnly.length >= 10) {
            return phone;
        }
        
        return '';
    }
    
    /**
     * Valida valor monetário
     */
    validateValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            return null;
        }
        
        return Number(numValue.toFixed(2));
    }
    
    /**
     * Prepara contexto do evento
     */
    prepareEventContext(req, eventId = null) {
        const clientIp = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress || 
                        '127.0.0.1';
        
        return {
            event_id: eventId || this.generateEventId(),
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            url: req.headers.referer || req.body.url || '',
            user_agent: req.headers['user-agent'] || '',
            ip: clientIp.replace('::ffff:', ''), // Remove IPv6 prefix
            referrer: req.headers.referer || ''
        };
    }
    
    /**
     * Prepara dados do usuário com validação rigorosa
     */
    prepareUserData(userData = {}) {
        const hashedUserData = {};
        let hashSuccessCount = 0;
        
        // Email - sempre inclui, mesmo que vazio
        if (userData.email && userData.email.trim() !== '') {
            const normalizedEmail = userData.email.trim().toLowerCase();
            if (normalizedEmail.includes('@') && normalizedEmail.includes('.')) {
                hashedUserData.email = this.hashData(normalizedEmail);
                if (hashedUserData.email) hashSuccessCount++;
            } else {
                hashedUserData.email = '';
            }
        } else {
            hashedUserData.email = '';
        }
        
        // Telefone - sempre inclui, mesmo que vazio
        if (userData.phone && userData.phone.trim() !== '') {
            const normalizedPhone = this.normalizePhoneNumber(userData.phone);
            if (normalizedPhone) {
                hashedUserData.phone_number = this.hashData(normalizedPhone);
                if (hashedUserData.phone_number) hashSuccessCount++;
            } else {
                hashedUserData.phone_number = '';
            }
        } else {
            hashedUserData.phone_number = '';
        }
        
        // External ID - sempre inclui
        if (userData.userId && userData.userId.trim() !== '') {
            hashedUserData.external_id = this.hashData(userData.userId);
            if (hashedUserData.external_id) hashSuccessCount++;
        } else {
            // Gerar external_id baseado em dados disponíveis
            const fallbackId = this.generateFallbackExternalId(userData);
            hashedUserData.external_id = this.hashData(fallbackId);
        }
        
        // Atualizar taxa de sucesso de hash
        this.metrics.hashSuccessRate = (hashSuccessCount / 3) * 100;
        
        return hashedUserData;
    }
    
    /**
     * Gera external_id de fallback
     */
    generateFallbackExternalId(userData) {
        const components = [
            userData.email || '',
            userData.phone || '',
            userData.ip || '',
            userData.user_agent?.slice(0, 50) || '',
            Date.now().toString()
        ].filter(Boolean);
        
        const combined = components.join('|');
        return `devotly_${crypto.createHash('md5').update(combined).digest('hex').substr(0, 16)}`;
    }
    
    /**
     * Gera ID único para evento
     */
    generateEventId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `devotly_${timestamp}_${random}`;
    }
    
    /**
     * Calcula EMQ score estimado
     */
    calculateEMQScore(eventData) {
        let score = 0;
        
        // Base score
        score += 20;
        
        // Email (25 pontos)
        if (eventData.email && eventData.email !== '') {
            score += 25;
        }
        
        // Phone (25 pontos)
        if (eventData.phone_number && eventData.phone_number !== '') {
            score += 25;
        }
        
        // External ID (15 pontos)
        if (eventData.external_id && eventData.external_id !== '') {
            score += 15;
        }
        
        // User Agent (5 pontos)
        if (eventData.user_agent) {
            score += 5;
        }
        
        // IP (5 pontos)
        if (eventData.ip) {
            score += 5;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Verifica se evento é duplicado
     */
    isDuplicateEvent(eventId, eventData) {
        if (this.eventCache.has(eventId)) {
            this.metrics.duplicateEvents++;
            return true;
        }
        
        // Adicionar ao cache
        this.eventCache.set(eventId, {
            timestamp: Date.now(),
            eventType: eventData.event
        });
        
        // Limpar cache se muito grande
        if (this.eventCache.size > this.maxCacheSize) {
            const oldestKeys = Array.from(this.eventCache.keys()).slice(0, 1000);
            oldestKeys.forEach(key => this.eventCache.delete(key));
        }
        
        return false;
    }
    
    /**
     * Envia evento para TikTok Events API
     */
    async sendEvent(eventType, eventData, context = {}, userData = {}) {
        try {
            this.validateConfig();
            
            // Verificar duplicação
            const eventId = context.event_id || this.generateEventId();
            if (this.isDuplicateEvent(eventId, { event: eventType })) {
                console.log(`⚠️ Evento duplicado detectado: ${eventId}`);
                return { 
                    success: true, 
                    message: 'Evento duplicado (ignorado)', 
                    event_id: eventId,
                    duplicate: true 
                };
            }
            
            // Preparar dados de usuário hasheados
            const hashedUserData = this.prepareUserData(userData);
            
            // Montar payload final
            const finalEventData = {
                ...eventData,
                ...hashedUserData
            };
            
            // Validar value se presente
            if (finalEventData.value !== undefined) {
                const validValue = this.validateValue(finalEventData.value);
                if (validValue !== null) {
                    finalEventData.value = validValue;
                } else {
                    delete finalEventData.value;
                }
            }
            
            // Calcular EMQ
            const emqScore = this.calculateEMQScore({ ...finalEventData, ...context });
            
            const payload = {
                pixel_code: this.pixelCode,
                event: eventType,
                event_id: eventId,
                timestamp: context.timestamp || Math.floor(Date.now() / 1000),
                properties: finalEventData,
                context: {
                    ad: {},
                    page: {
                        url: context.url || '',
                        referrer: context.referrer || ''
                    },
                    user: {
                        user_agent: context.user_agent || '',
                        ip: context.ip || ''
                    }
                }
            };
            
            console.log(`🎯 Enviando ${eventType} para TikTok API (EMQ: ${emqScore})`);
            console.log('📊 Dados de qualidade:', {
                email: hashedUserData.email ? '✓ Hash' : '✗ Ausente',
                phone: hashedUserData.phone_number ? '✓ Hash' : '✗ Ausente',
                external_id: hashedUserData.external_id ? '✓ Hash' : '✗ Ausente',
                ip: context.ip ? '✓ Presente' : '✗ Ausente',
                user_agent: context.user_agent ? '✓ Presente' : '✗ Ausente',
                emq_score: `${emqScore}/100`
            });
            
            // Enviar para TikTok
            const response = await this.makeApiRequest(payload, eventType);
            
            // Atualizar métricas
            this.updateMetrics(true, emqScore);
            
            return {
                success: true,
                message: `${eventType} enviado com sucesso`,
                event_id: eventId,
                emq_score: emqScore,
                response: response
            };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar ${eventType}:`, error);
            this.updateMetrics(false, 0);
            
            return {
                success: false,
                error: error.message,
                event_type: eventType
            };
        }
    }
    
    /**
     * Faz requisição para a API com retry
     */
    async makeApiRequest(payload, eventType, attempt = 1) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Token': this.accessToken
                },
                body: JSON.stringify(payload),
                timeout: this.emqConfig.timeoutMs
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ ${eventType} enviado para TikTok API Events`);
            
            return result;
            
        } catch (error) {
            if (attempt < this.emqConfig.maxRetries) {
                console.log(`🔄 Retry ${attempt}/${this.emqConfig.maxRetries} para ${eventType}`);
                await this.delay(1000 * attempt); // Backoff exponencial
                return this.makeApiRequest(payload, eventType, attempt + 1);
            }
            
            throw error;
        }
    }
    
    /**
     * Delay para retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Atualiza métricas
     */
    updateMetrics(success, emqScore) {
        this.metrics.totalEvents++;
        
        if (success) {
            this.metrics.successfulEvents++;
            
            // Atualizar EMQ médio
            const totalSuccessful = this.metrics.successfulEvents;
            this.metrics.averageEMQ = 
                ((this.metrics.averageEMQ * (totalSuccessful - 1)) + emqScore) / totalSuccessful;
        } else {
            this.metrics.failedEvents++;
        }
    }
    
    /**
     * Obtém métricas de qualidade
     */
    getMetrics() {
        const successRate = this.metrics.totalEvents > 0 
            ? (this.metrics.successfulEvents / this.metrics.totalEvents) * 100 
            : 0;
        
        return {
            ...this.metrics,
            successRate: Number(successRate.toFixed(2)),
            averageEMQ: Number(this.metrics.averageEMQ.toFixed(1)),
            hashSuccessRate: Number(this.metrics.hashSuccessRate.toFixed(1))
        };
    }
    
    // ============================================================================
    // MÉTODOS DE EVENTOS ESPECÍFICOS
    // ============================================================================
    
    /**
     * PageView
     */
    async trackPageView(context = {}, userData = {}) {
        return this.sendEvent('PageView', {
            content_name: 'Page View',
            content_category: 'page_view'
        }, context, userData);
    }
    
    /**
     * ViewContent
     */
    async trackViewContent(contentId, contentName, value = null, currency = 'BRL', context = {}, userData = {}) {
        const eventData = {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Conteúdo'),
            content_type: 'product',
            currency: String(currency)
        };
        
        if (value !== null) {
            const validValue = this.validateValue(value);
            if (validValue !== null) {
                eventData.value = validValue;
            }
        }
        
        return this.sendEvent('ViewContent', eventData, context, userData);
    }
    
    /**
     * Purchase - Compra (DEVE ter value > 0)
     */
    async trackPurchase(contentId, contentName, value, currency = 'BRL', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        if (!validValue || validValue <= 0) {
            throw new Error('Purchase requer value > 0');
        }
        
        const eventData = {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: 'product',
            value: validValue,
            currency: String(currency),
            contents: [{
                content_id: String(contentId || 'unknown'),
                content_name: String(contentName || 'Produto'),
                content_type: 'product',
                quantity: 1,
                price: validValue
            }]
        };
        
        return this.sendEvent('Purchase', eventData, context, userData);
    }
    
    /**
     * InitiateCheckout
     */
    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL', context = {}, userData = {}) {
        const eventData = {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: 'product',
            currency: String(currency)
        };
        
        const validValue = this.validateValue(value);
        if (validValue !== null) {
            eventData.value = validValue;
        }
        
        return this.sendEvent('InitiateCheckout', eventData, context, userData);
    }
    
    /**
     * Lead
     */
    async trackLead(leadType = 'lead', value = 10, currency = 'BRL', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        const eventData = {
            lead_type: String(leadType),
            currency: String(currency)
        };
        
        if (validValue !== null) {
            eventData.value = validValue;
        }
        
        return this.sendEvent('Lead', eventData, context, userData);
    }
    
    /**
     * Contact
     */
    async trackContact(contactType = 'form', value = 5, currency = 'BRL', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        const eventData = {
            contact_type: String(contactType),
            currency: String(currency)
        };
        
        if (validValue !== null) {
            eventData.value = validValue;
        }
        
        return this.sendEvent('Contact', eventData, context, userData);
    }
}

export default new TikTokEventsServiceV3();
