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
     * Prepara dados do usuário com validação rigorosa - EMQ OTIMIZADO
     */
    prepareUserData(userData = {}) {
        const hashedUserData = {};
        let hashSuccessCount = 0;
        
        console.log('🔍 Preparando dados do usuário para EMQ:', {
            hasEmail: !!userData.email,
            hasPhone: !!userData.phone,
            hasUserId: !!userData.userId
        });
        
        // EMAIL - Meta: 90%+ cobertura
        if (userData.email && typeof userData.email === 'string' && userData.email.trim() !== '') {
            const normalizedEmail = userData.email.trim().toLowerCase();
            if (normalizedEmail.includes('@') && normalizedEmail.includes('.') && normalizedEmail.length > 5) {
                hashedUserData.email = this.hashData(normalizedEmail);
                if (hashedUserData.email) {
                    hashSuccessCount++;
                    console.log('✅ Email hasheado com sucesso');
                } else {
                    hashedUserData.email = '';
                    console.log('❌ Falha no hash do email');
                }
            } else {
                hashedUserData.email = '';
                console.log('❌ Email inválido:', normalizedEmail);
            }
        } else {
            hashedUserData.email = '';
            console.log('⚪ Email não fornecido');
        }
        
        // TELEFONE - Meta: 90%+ cobertura
        if (userData.phone && typeof userData.phone === 'string' && userData.phone.trim() !== '') {
            const normalizedPhone = this.normalizePhoneNumber(userData.phone);
            if (normalizedPhone && normalizedPhone.length >= 12) { // +55 + 10/11 dígitos
                hashedUserData.phone_number = this.hashData(normalizedPhone);
                if (hashedUserData.phone_number) {
                    hashSuccessCount++;
                    console.log('✅ Telefone hasheado com sucesso:', normalizedPhone);
                } else {
                    hashedUserData.phone_number = '';
                    console.log('❌ Falha no hash do telefone');
                }
            } else {
                hashedUserData.phone_number = '';
                console.log('❌ Telefone inválido após normalização:', userData.phone, '->', normalizedPhone);
            }
        } else {
            hashedUserData.phone_number = '';
            console.log('⚪ Telefone não fornecido');
        }
        
        // EXTERNAL_ID - Meta: 100% cobertura (sempre garantido)
        if (userData.userId && typeof userData.userId === 'string' && userData.userId.trim() !== '') {
            const cleanUserId = userData.userId.trim();
            hashedUserData.external_id = this.hashData(cleanUserId);
            if (hashedUserData.external_id) {
                hashSuccessCount++;
                console.log('✅ External ID hasheado com sucesso');
            } else {
                console.log('❌ Falha no hash do external_id, gerando fallback');
                const fallbackId = this.generateFallbackExternalId(userData);
                hashedUserData.external_id = this.hashData(fallbackId);
            }
        } else {
            // Sempre gerar external_id como fallback
            const fallbackId = this.generateFallbackExternalId(userData);
            hashedUserData.external_id = this.hashData(fallbackId);
            console.log('🔄 External ID de fallback gerado');
        }
        
        // Calcular taxa de sucesso EMQ
        const totalFields = 3; // email, phone, external_id
        this.metrics.hashSuccessRate = (hashSuccessCount / totalFields) * 100;
        this.metrics.dataQuality = {
            email_coverage: hashedUserData.email !== '' ? 100 : 0,
            phone_coverage: hashedUserData.phone_number !== '' ? 100 : 0,
            external_id_coverage: 100, // Sempre garantido
            total_coverage: ((hashedUserData.email !== '' ? 1 : 0) + 
                           (hashedUserData.phone_number !== '' ? 1 : 0) + 1) / 3 * 100
        };
        
        console.log('📊 Cobertura EMQ calculada:', this.metrics.dataQuality);
        
        return hashedUserData;
    }
    
    /**
     * Gera external_id de fallback baseado em dados disponíveis - EMQ OTIMIZADO
     */
    generateFallbackExternalId(userData) {
        const components = [];
        
        // 1. Dados primários do usuário
        if (userData.email && userData.email.trim()) {
            components.push(`email_${userData.email.trim().toLowerCase()}`);
        }
        if (userData.phone && userData.phone.trim()) {
            const phoneDigits = userData.phone.replace(/\D/g, '');
            if (phoneDigits.length >= 8) {
                components.push(`phone_${phoneDigits}`);
            }
        }
        
        // 2. Dados de contexto
        if (userData.ip && userData.ip !== '127.0.0.1') {
            components.push(`ip_${userData.ip}`);
        }
        if (userData.user_agent) {
            const uaHash = crypto.createHash('md5').update(userData.user_agent).digest('hex').substr(0, 8);
            components.push(`ua_${uaHash}`);
        }
        
        // 3. Dados temporais para unicidade
        const timestamp = Date.now();
        components.push(`ts_${timestamp}`);
        
        // 4. Componente aleatório como fallback final
        if (components.length === 1) { // Só timestamp
            const randomId = Math.random().toString(36).substr(2, 12);
            components.push(`rand_${randomId}`);
        }
        
        const combined = components.join('|');
        const hash = crypto.createHash('sha256').update(combined).digest('hex').substr(0, 24);
        
        const externalId = `devotly_${hash}`;
        
        console.log('🆔 External ID de fallback gerado:', {
            components: components.length,
            hasEmail: !!userData.email,
            hasPhone: !!userData.phone,
            hasIP: !!userData.ip,
            externalId: externalId.substr(0, 20) + '...'
        });
        
        return externalId;
    }
    
    /**
     * BACKEND: Validação rigorosa de content_id
     */
    validateContentIdServer(contentId, context = {}) {
        try {
            // 1. Se contentId é válido, usar ele
            if (contentId && typeof contentId === 'string' && contentId.trim() !== '') {
                return String(contentId).trim();
            }
            
            // 2. Se contentId é um número válido, converter para string
            if (typeof contentId === 'number' && !isNaN(contentId)) {
                return String(contentId);
            }
            
            // 3. Gerar contentId baseado no contexto
            return this.generateContentIdServer(this.detectPageContextServer(context));
            
        } catch (error) {
            console.error('Erro na validação de content_id no backend:', error);
            return this.generateFallbackContentIdServer();
        }
    }
    
    /**
     * BACKEND: Validação rigorosa de content_name
     */
    validateContentNameServer(contentName) {
        try {
            // 1. Se contentName é válido, usar ele
            if (contentName && typeof contentName === 'string' && contentName.trim() !== '') {
                return String(contentName).trim();
            }
            
            // 2. Fallback padrão
            return 'Conteúdo Devotly';
            
        } catch (error) {
            console.error('Erro na validação de content_name no backend:', error);
            return 'Conteúdo Devotly';
        }
    }
    
    /**
     * BACKEND: Validação rigorosa de content_type
     */
    validateContentTypeServer(category, context = {}) {
        try {
            // Lista de content_type válidos aceitos pelo TikTok
            const validTypes = ['product', 'website'];
            
            // 1. Se category é válido e aceito, usar ele
            if (category && typeof category === 'string') {
                const normalizedCategory = category.toLowerCase().trim();
                if (validTypes.includes(normalizedCategory)) {
                    return normalizedCategory;
                }
            }
            
            // 2. Determinar baseado no contexto da página
            const pageContext = this.detectPageContextServer(context);
            if (pageContext.page === 'create' || pageContext.page === 'view') {
                return 'product'; // Ferramentas e cartões como produtos digitais
            }
            
            return 'website'; // Default seguro
            
        } catch (error) {
            console.error('Erro na validação de content_type no backend:', error);
            return 'website'; // Fallback seguro sempre aceito
        }
    }
    
    /**
     * BACKEND: Validação rigorosa de currency
     */
    validateCurrencyServer(currency) {
        try {
            // Lista de moedas válidas comuns
            const validCurrencies = ['BRL', 'USD', 'EUR', 'GBP'];
            
            if (currency && typeof currency === 'string') {
                const normalizedCurrency = currency.toUpperCase().trim();
                if (validCurrencies.includes(normalizedCurrency)) {
                    return normalizedCurrency;
                }
            }
            
            return 'BRL'; // Default para o Brasil
            
        } catch (error) {
            console.error('Erro na validação de currency no backend:', error);
            return 'BRL';
        }
    }
    
    /**
     * BACKEND: Fallback seguro para content_id
     */
    generateFallbackContentIdServer() {
        return `backend_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
                data: [{
                    event: eventType,
                    event_id: eventId,
                    event_source_id: 'devotly_website_001', // Unique identifier for this event source
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
                }]
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
     * PageView com valor para ROAS
     */
    async trackPageView(context = {}, userData = {}) {
        // Calcular valor baseado na URL/referer
        const url = context.url || context.referer || '';
        const value = this.calculatePageValueFromUrl(url);
        
        return this.sendEvent('PageView', {
            content_name: 'Page View',
            content_category: 'page_view',
            value: value,
            currency: 'BRL'
        }, context, userData);
    }
    
    /**
     * Calcula valor da página baseado na URL (servidor)
     */
    calculatePageValueFromUrl(url) {
        if (!url || typeof url !== 'string') return 5;
        
        const urlLower = url.toLowerCase();
        
        // Valores baseados no funil de conversão
        if (urlLower.includes('success') || urlLower.includes('pagamento-confirmado')) {
            return 50;
        } else if (urlLower.includes('checkout') || urlLower.includes('pagamento')) {
            return 30;
        } else if (urlLower.includes('create') || urlLower.includes('criar')) {
            return 25;
        } else if (urlLower.includes('view') || urlLower.includes('cartao') || urlLower.includes('card')) {
            return 15;
        } else if (urlLower.includes('pricing') || urlLower.includes('planos')) {
            return 20;
        } else if (urlLower.includes('home') || urlLower.includes('index') || url.endsWith('/')) {
            return 10;
        } else if (urlLower.includes('about') || urlLower.includes('sobre')) {
            return 8;
        } else if (urlLower.includes('contact') || urlLower.includes('contato')) {
            return 12;
        } else if (urlLower.includes('pending') || urlLower.includes('aguardando')) {
            return 25;
        } else if (urlLower.includes('termos') || urlLower.includes('privacidade')) {
            return 2;
        } else if (urlLower.includes('test') || urlLower.includes('localhost')) {
            return 1;
        } else {
            return 5;
        }
    }
    
    /**
     * ViewContent OTIMIZADO para EMQ máximo
     */
    async trackViewContent(contentId, contentName, value = null, currency = 'BRL', category = 'product', context = {}, userData = {}) {
        try {
            console.log('👁️ Backend: Validando dados para ViewContent...');
            
            // VALIDAÇÃO RIGOROSA PARA PREVENIR ERROS
            const validContentId = this.validateContentIdServer(contentId, context);
            const validContentName = this.validateContentNameServer(contentName);
            const validCategory = this.validateContentTypeServer(category, context);
            const validCurrency = this.validateCurrencyServer(currency);
            const validValue = this.validateValue(value);
            
            console.log('🔍 Backend - Dados validados:', {
                original: { contentId, contentName, category, value, currency },
                validated: {
                    content_id: validContentId,
                    content_name: validContentName,
                    content_type: validCategory,
                    value: validValue,
                    currency: validCurrency
                }
            });
            
            // Garantir que campos críticos não sejam undefined/null
            if (!validContentId || !validContentName || !validCategory) {
                throw new Error(`Campos críticos inválidos: content_id=${validContentId}, content_name=${validContentName}, content_type=${validCategory}`);
            }
            
            // Detectar contexto da página para melhor categorização
            const pageContext = this.detectPageContextServer(context);
            
            const eventData = {
                content_id: String(validContentId),
                content_name: String(validContentName),
                content_type: String(validCategory),
                currency: String(validCurrency),
                // Dados adicionais para melhor EMQ
                content_category: String(validCategory),
                content_group_id: String(pageContext.group || 'general'),
                description: String(this.generateContentDescriptionServer(validContentName, pageContext)),
                brand: 'Devotly',
                funnel_stage: String(pageContext.funnel_stage || 'consideration'),
                contents: [{
                    id: String(validContentId),
                    name: String(validContentName),
                    category: String(validCategory),
                    quantity: 1,
                    price: validValue || 0,
                    brand: 'Devotly',
                    item_group_id: String(pageContext.group || 'general')
                }]
            };
            
            // Adicionar value apenas se válido e positivo
            if (validValue !== null && validValue > 0) {
                eventData.value = validValue;
            }
            
            console.log(`✅ Backend ViewContent preparado: ${validContentName} - EMQ Score estimado: ${this.calculateEMQScore(eventData)}`);
            
            return this.sendEvent('ViewContent', eventData, context, userData);
            
        } catch (error) {
            console.error('❌ Erro no backend trackViewContent:', error);
            throw error; // Re-throw para ser capturado pelo router
        }
    }
    
    /**
     * Detecta contexto da página no servidor
     * Atualizado para usar content_type válidos no TikTok
     */
    detectPageContextServer(context) {
        const url = context.url || '';
        const referer = context.referer || '';
        
        if (url.includes('/create') || referer.includes('/create')) {
            return {
                page: 'create',
                group: 'card_creation',
                funnel_stage: 'consideration',
                content_type: 'product' // Ferramenta de criação como produto
            };
        } else if (url.includes('/view') || referer.includes('/view')) {
            return {
                page: 'view',
                group: 'card_viewing',
                funnel_stage: 'engagement',
                content_type: 'product' // Cartão como produto digital
            };
        } else if (url === '/' || url.includes('home') || referer.includes('devotly.shop')) {
            return {
                page: 'home',
                group: 'landing',
                funnel_stage: 'awareness',
                content_type: 'website' // Página inicial como website
            };
        }
        
        return {
            page: 'other',
            group: 'general',
            funnel_stage: 'awareness',
            content_type: 'website' // Default como website
        };
    }
    
    /**
     * Melhora categoria no servidor
     * Atualizado para usar valores válidos no TikTok
     */
    enhanceContentCategoryServer(originalCategory, pageContext) {
        if (pageContext.page === 'create') {
            // Página de criação = ferramenta/produto
            return 'product';
        } else if (pageContext.page === 'view') {
            // Visualização de cartão = produto digital
            return 'product';
        } else if (pageContext.page === 'home') {
            // Página inicial = website
            return 'website';
        }
        
        // Default para conteúdo geral
        return 'website';
    }
    
    /**
     * Gera descrição rica no servidor
     */
    generateContentDescriptionServer(contentName, pageContext) {
        const baseDescription = contentName || 'Conteúdo';
        
        if (pageContext.page === 'create') {
            return `Ferramenta de criação: ${baseDescription} - Devotly Cards`;
        } else if (pageContext.page === 'view') {
            return `Cartão digital: ${baseDescription} - Devotly Cards`;
        } else if (pageContext.page === 'home') {
            return `Página inicial: ${baseDescription} - Devotly Cards`;
        }
        
        return `${baseDescription} - Devotly Cards`;
    }
    
    /**
     * Gera ID único no servidor
     */
    generateContentIdServer(pageContext) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `${pageContext.page}_server_${timestamp}_${random}`;
    }
    
    /**
     * Purchase - Compra (DEVE ter value > 0)
     */
    async trackPurchase(contentId, contentName, value, currency = 'BRL', category = 'product', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        if (!validValue || validValue <= 0) {
            throw new Error('Purchase requer value > 0');
        }
        
        const eventData = {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            contents: [{
                id: String(contentId || 'unknown'),
                name: String(contentName || 'Produto'),
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        };
        
        return this.sendEvent('Purchase', eventData, context, userData);
    }
    
    /**
     * InitiateCheckout
     */
    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL', category = 'product', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        const eventData = {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: String(category),
            currency: String(currency),
            contents: [{
                id: String(contentId || 'unknown'),
                name: String(contentName || 'Produto'),
                category: String(category),
                quantity: 1,
                price: validValue || 0
            }]
        };
        
        if (validValue !== null && validValue > 0) {
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
    
    /**
     * AddPaymentInfo - Adicionar informações de pagamento
     */
    async trackAddPaymentInfo(contentId, contentName, value, currency = 'BRL', category = 'subscription', context = {}, userData = {}) {
        const validValue = this.validateValue(value);
        
        const eventData = {
            content_id: String(contentId || 'payment_info'),
            content_name: String(contentName || 'Informações de Pagamento'),
            content_type: String(category),
            currency: String(currency),
            payment_method: 'mercadopago'
        };
        
        if (validValue !== null && validValue > 0) {
            eventData.value = validValue;
            eventData.contents = [{
                id: String(contentId || 'payment_info'),
                name: String(contentName || 'Informações de Pagamento'),
                category: String(category),
                quantity: 1,
                price: validValue
            }];
        }
        
        console.log(`💳 Backend AddPaymentInfo: ${contentName} - R$ ${validValue}`);
        return this.sendEvent('AddPaymentInfo', eventData, context, userData);
    }
    
    /**
     * Obtém métricas de qualidade EMQ
     */
    getMetrics() {
        const emqScore = this.calculateAverageEMQ();
        
        return {
            ...this.metrics,
            emq: {
                currentScore: emqScore,
                targetScore: 70,
                status: emqScore >= 70 ? 'TARGET_ACHIEVED' : 'IMPROVING',
                coverage: this.metrics.dataQuality || {
                    email_coverage: 0,
                    phone_coverage: 0,
                    external_id_coverage: 100,
                    total_coverage: 33
                }
            },
            recommendations: this.getEMQRecommendations(emqScore)
        };
    }
    
    /**
     * Calcula EMQ médio
     */
    calculateAverageEMQ() {
        if (this.metrics.eventsSent === 0) return 0;
        
        const totalScore = this.metrics.eventsSent * 20 + // Base score
                          (this.metrics.dataQuality?.email_coverage || 0) * this.metrics.eventsSent * 0.25 +
                          (this.metrics.dataQuality?.phone_coverage || 0) * this.metrics.eventsSent * 0.25 +
                          (this.metrics.dataQuality?.external_id_coverage || 0) * this.metrics.eventsSent * 0.15;
        
        return Math.round(totalScore / this.metrics.eventsSent / 100 * 100);
    }
    
    /**
     * Gera recomendações para melhorar EMQ
     */
    getEMQRecommendations(currentScore) {
        const recommendations = [];
        
        if (!this.metrics.dataQuality) {
            recommendations.push('⚠️ Implementar coleta de dados do usuário');
            return recommendations;
        }
        
        if (this.metrics.dataQuality.email_coverage < 90) {
            recommendations.push('📧 Melhorar captura de email (atual: ' + this.metrics.dataQuality.email_coverage + '%)');
        }
        if (this.metrics.dataQuality.phone_coverage < 90) {
            recommendations.push('📱 Implementar captura de telefone (atual: ' + this.metrics.dataQuality.phone_coverage + '%)');
        }
        if (currentScore < 70) {
            recommendations.push('🎯 Priorizar identificação do usuário antes dos eventos');
        }
        if (this.metrics.dataQuality.total_coverage < 80) {
            recommendations.push('📊 Aumentar cobertura geral dos identificadores');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ Excelente! Mantenha a qualidade EMQ atual');
        }
        
        return recommendations;
    }
}

export default new TikTokEventsServiceV3();
