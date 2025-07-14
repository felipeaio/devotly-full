import fetch from 'node-fetch';
import crypto from 'crypto';

/**
 * Serviço para enviar eventos para a API do TikTok
 * API Events do TikTok para rastreamento server-side
 */
class TikTokEventsService {
    constructor() {
        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/';
        this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '08538eef624276105c15fff5c1dfefe76b9726f2';
        this.pixelCode = process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG';
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.eventQueue = [];
        this.processQueueInterval = null;
        this.testMode = process.env.NODE_ENV === 'development';

        console.log(`[TikTok Events] Inicializado com Pixel: ${this.pixelCode}`);
        console.log(`[TikTok Events] Modo de teste: ${this.testMode}`);

        // Iniciar processamento da fila
        this.startQueueProcessor();
    }

    /**
     * Hash de dados sensíveis (como email e telefone)
     * @param {string} data - Dado a ser hasheado
     * @returns {string} - Dado hasheado em SHA256
     */
    hashData(data) {
        if (!data) return null;
        return crypto.createHash('sha256').update(String(data).trim().toLowerCase()).digest('hex');
    }

    /**
     * Gera um ID de evento único
     * @returns {string} - ID único para o evento
     */
    generateEventId() {
        return `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    /**
     * Obtém IP do usuário de forma segura
     * @param {Object} req - Request object
     * @returns {string} - IP do usuário
     */
    getUserIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               '127.0.0.1';
    }

    /**
     * Obtém User Agent de forma segura
     * @param {Object} req - Request object
     * @returns {string} - User Agent
     */
    getUserAgent(req) {
        return req.headers['user-agent'] || 'Unknown';
    }

    /**
     * Inicia o processador de fila de eventos
     */
    startQueueProcessor() {
        if (this.processQueueInterval) return;
        
        this.processQueueInterval = setInterval(() => {
            this.processQueue();
        }, 5000);
    }

    /**
     * Processa a fila de eventos pendentes
     */
    async processQueue() {
        if (this.eventQueue.length === 0) return;

        console.log(`[TikTok Events] Processando fila: ${this.eventQueue.length} eventos pendentes`);
        
        const event = this.eventQueue[0];
        
        try {
            await this.sendEventWithRetry(
                event.eventName, 
                event.eventProperties, 
                event.userData,
                event.context || {},
                0,
                true
            );
            
            this.eventQueue.shift();
            console.log('[TikTok Events] Evento processado da fila com sucesso');
        } catch (error) {
            console.error('[TikTok Events] Falha ao processar evento da fila:', error);
            
            if (event.retries >= this.maxRetries) {
                console.error('[TikTok Events] Número máximo de tentativas excedido, removendo evento da fila');
                this.eventQueue.shift();
            } else {
                event.retries = (event.retries || 0) + 1;
            }
        }
    }

    /**
     * Envia um evento para a API do TikTok com lógica de retry
     */
    async sendEventWithRetry(eventName, eventProperties, userData = {}, context = {}, retryCount = 0, fromQueue = false) {
        try {
            console.log(`[TikTok Events] Enviando evento ${eventName} (tentativa ${retryCount + 1})`);

            const timestamp = Math.floor(Date.now() / 1000);
            const eventId = this.generateEventId();

            const user = {};
            if (userData.email) {
                user.email = this.hashData(userData.email);
            }
            if (userData.phone) {
                user.phone_number = this.hashData(userData.phone);
            }
            if (userData.externalId) {
                user.external_id = this.hashData(userData.externalId);
            }

            if (context.ip) {
                user.ip = context.ip;
            }
            if (context.userAgent) {
                user.user_agent = context.userAgent;
            }

            const payload = {
                pixel_code: this.pixelCode,
                event: eventName,
                event_id: eventId,
                timestamp,
                context: {
                    user_agent: context.userAgent || 'Devotly-Server/1.0',
                    ip: context.ip || '127.0.0.1',
                    ad: {
                        callback: context.callback || null
                    },
                    page: {
                        url: context.pageUrl || 'https://devotly.shop',
                        referrer: context.referrer || ''
                    }
                },
                properties: {
                    ...eventProperties,
                    currency: eventProperties.currency || 'BRL',
                    value: eventProperties.value || 0,
                    contents: eventProperties.contents || []
                },
                user
            };

            if (this.testMode) {
                console.log(`[TikTok Events] Payload completo:`, JSON.stringify(payload, null, 2));
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Token': this.accessToken,
                    'User-Agent': 'Devotly-TikTok-Events/1.0'
                },
                body: JSON.stringify(payload),
                timeout: 10000
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(`TikTok API Error: ${response.status} - ${JSON.stringify(responseData)}`);
            }

            console.log(`[TikTok Events] Evento ${eventName} enviado com sucesso:`, responseData);
            return responseData;

        } catch (error) {
            console.error(`[TikTok Events] Erro ao enviar evento ${eventName}:`, error.message);

            if (retryCount < this.maxRetries && !fromQueue) {
                console.log(`[TikTok Events] Tentando novamente em ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
                return this.sendEventWithRetry(eventName, eventProperties, userData, context, retryCount + 1, fromQueue);
            }

            if (!fromQueue && retryCount >= this.maxRetries) {
                console.log(`[TikTok Events] Adicionando evento ${eventName} à fila para processamento posterior`);
                this.eventQueue.push({
                    eventName,
                    eventProperties,
                    userData,
                    context,
                    retries: 0,
                    timestamp: Date.now()
                });
            }

            throw error;
        }
    }

    /**
     * Envia um evento para a API do TikTok
     */
    async sendEvent(eventName, eventProperties, userData = {}, context = {}) {
        try {
            return await this.sendEventWithRetry(eventName, eventProperties, userData, context);
        } catch (error) {
            console.error('[TikTok Events] Todos os envios falharam. Evento na fila para processamento posterior.');
            return { error: error.message, status: 'queued' };
        }
    }

    /**
     * Evento de compra concluída
     */
    async trackPurchase(cardId, planType, value, userEmail, userPhone, req = null) {
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent('Purchase', {
            contents: [{
                content_id: cardId,
                content_type: 'product',
                content_name: planName,
                quantity: 1
            }],
            value: value,
            currency: 'BRL',
        }, {
            email: userEmail,
            phone: userPhone,
            externalId: cardId
        }, context);
    }

    /**
     * Evento de checkout iniciado
     */
    async trackInitiateCheckout(cardId, planType, value, userEmail, req = null) {
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent('InitiateCheckout', {
            contents: [{
                content_id: cardId,
                content_type: 'product',
                content_name: planName,
                quantity: 1
            }],
            value: value,
            currency: 'BRL',
        }, {
            email: userEmail,
            externalId: cardId
        }, context);
    }
    
    /**
     * Evento de cartão criado/adicionado
     */
    async trackAddToCart(cardId, userEmail, req = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent('AddToCart', {
            contents: [{
                content_id: cardId,
                content_type: 'product',
                content_name: 'Cartão Cristão Digital',
                quantity: 1
            }],
            currency: 'BRL',
        }, {
            email: userEmail,
            externalId: cardId
        }, context);
    }
    
    /**
     * Evento de visualização de conteúdo
     */
    async trackViewContent(cardId, contentType, contentName, userEmail, req = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent('ViewContent', {
            contents: [{
                content_id: cardId,
                content_type: contentType || 'product',
                content_name: contentName || 'Cartão Cristão Digital',
            }],
            currency: 'BRL',
        }, {
            email: userEmail
        }, context);
    }
    
    /**
     * Evento de registro completo
     */
    async trackCompleteRegistration(userId, userEmail, req = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent('CompleteRegistration', {
            contents: [{
                content_id: userId || 'user_registration',
                content_type: 'product',
                content_name: 'Registro de Usuário',
            }],
            currency: 'BRL',
        }, {
            email: userEmail,
            externalId: userId
        }, context);
    }

    /**
     * Evento personalizado
     */
    async trackCustomEvent(eventName, properties, userData = {}, req = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        } : {};
        
        return this.sendEvent(eventName, properties, userData, context);
    }
}

export default new TikTokEventsService();
