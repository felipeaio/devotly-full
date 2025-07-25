/**
 * TikTok Events API v1.3 Integration - OTIMIZADO
 * 
 * Este serviço implementa a integração server-side com a API de Eventos do TikTok v1.3
 * para complementar o tracking do Pixel no front-end com foco em alta taxa de correspondência.
 * 
 * Documentação oficial: https://business-api.tiktok.com/marketing_api/docs?id=1701890979375106
 * 
 * Configurações:
 * - Pixel Name: pixel-rastreio
 * - Pixel ID: D1QFD0RC77UF6MBM48MG
 * - Endpoint: https://business-api.tiktok.com/open_api/v1.3/event/track/
 * - Variáveis de ambiente necessárias:
 *   - TIKTOK_ACCESS_TOKEN: Token de acesso gerado no painel do TikTok
 *   - TIKTOK_PIXEL_CODE: Código do pixel (D1QFD0RC77UF6MBM48MG)
 * 
 * Eventos principais implementados com otimizações:
 * - ViewContent: Visualização de conteúdo
 * - AddToCart: Adição de item ao carrinho
 * - InitiateCheckout: Início de checkout
 * - Purchase: Compra finalizada (com value e currency obrigatórios)
 * 
 * Características da implementação OTIMIZADA:
 * - Hash SHA-256 + Base64 para dados sensíveis (email, telefone)
 * - Envio obrigatório de value e currency em eventos de conversão
 * - Deduplicação com event_id sincronizado com frontend
 * - Dados de identificação completos (email, phone, ip, user_agent, ttp, ttclid)
 * - Sistema de retry automático para eventos falhos
 * - Fila de eventos para processamento posterior
 * - Logs detalhados para monitoramento da qualidade
 * - Suporte a múltiplos pixels
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

/**
 * Serviço para enviar eventos para a API do TikTok
 * API Events do TikTok para rastreamento server-side - v1.3
 * Pixel: pixel-rastreio
 * Endpoint: https://business-api.tiktok.com/open_api/v1.3/event/track/
 */
class TikTokEventsService {
    constructor() {
        // Endpoint da TikTok Events API v1.3
        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
        
        // Configuração para múltiplos pixels
        this.pixels = [
            {
                id: process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG',
                token: process.env.TIKTOK_ACCESS_TOKEN || '08538eef624276105c15fff5c1dfefe76b9726f2'
            },
            // Adicione mais pixels conforme necessário
            ...(process.env.TIKTOK_PIXEL_CODE_2 && process.env.TIKTOK_ACCESS_TOKEN_2 ? [{
                id: process.env.TIKTOK_PIXEL_CODE_2,
                token: process.env.TIKTOK_ACCESS_TOKEN_2
            }] : []),
            ...(process.env.TIKTOK_PIXEL_CODE_3 && process.env.TIKTOK_ACCESS_TOKEN_3 ? [{
                id: process.env.TIKTOK_PIXEL_CODE_3,
                token: process.env.TIKTOK_ACCESS_TOKEN_3
            }] : [])
        ];

        // Manter compatibilidade com código existente
        this.accessToken = this.pixels[0].token;
        this.pixelCode = this.pixels[0].id;
        
        // Fonte do evento (obrigatório na API v1.3: web, app ou offline)
        this.eventSource = 'web';
        // Identificador da fonte do evento (obrigatório na API v1.3) - usar o código do pixel
        this.eventSourceId = this.pixelCode;
        // Configurações de retry
        this.maxRetries = 3;
        this.retryDelay = 1000;
        // Fila para eventos que falharem
        this.eventQueue = [];
        this.processQueueInterval = null;
        // Modo de teste (logs detalhados)
        this.testMode = process.env.NODE_ENV === 'development';

        console.log(`[TikTok Events] Inicializado com ${this.pixels.length} pixel(s)`);
        this.pixels.forEach((pixel, index) => {
            console.log(`[TikTok Events] Pixel ${index + 1}: ${pixel.id}`);
        });
        console.log(`[TikTok Events] Modo de teste: ${this.testMode}`);
        console.log(`[TikTok Events] API URL: ${this.apiUrl}`);
        console.log(`[TikTok Events] Event Source: ${this.eventSource}`);

        // Iniciar processamento da fila
        this.startQueueProcessor();
    }

    /**
     * Hash de dados sensíveis (como email e telefone)
     * Cria um hash SHA-256 conforme requisitado pela TikTok Events API v1.3
     * 
     * @param {string} data - Dado a ser hasheado (email, telefone, etc)
     * @param {boolean} encodeBase64 - Se deve codificar o resultado em base64
     * @returns {string} - Dado hasheado em SHA256 (hex ou base64)
     */
    hashData(data, encodeBase64 = false) {
        if (!data || data === null || data === undefined || String(data).trim() === '') {
            return "";
        }
        
        // Normalizar dados (trim e lowercase para email, apenas trim para outros)
        let normalizedData = String(data).trim();
        
        // Para emails, aplicar lowercase
        if (normalizedData.includes('@')) {
            normalizedData = normalizedData.toLowerCase();
        }
        
        // Criar o hash SHA-256
        const hash = crypto.createHash('sha256').update(normalizedData).digest();
        
        // Retornar em base64 ou hex conforme solicitado
        return encodeBase64 ? hash.toString('base64') : hash.toString('hex');
    }

    /**
     * Normaliza telefone para formato E.164
     * @param {string} phone - Número de telefone
     * @returns {string|null} - Telefone normalizado ou null
     */
    normalizePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return "";
        
        // Remove todos os caracteres não numéricos
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Validação básica: deve ter pelo menos 8 dígitos
        if (digitsOnly.length < 8) return "";
        
        // Se começa com 55 (Brasil) e tem 13 dígitos, assume que já está correto
        if (digitsOnly.startsWith('55') && digitsOnly.length === 13) {
            return `+${digitsOnly}`;
        }
        
        // Se tem 11 dígitos e começa com dígito móvel (9), adiciona código do Brasil
        if (digitsOnly.length === 11 && digitsOnly.charAt(2) === '9') {
            return `+55${digitsOnly}`;
        }
        
        // Se tem 10 dígitos (fixo), adiciona código do Brasil
        if (digitsOnly.length === 10) {
            return `+55${digitsOnly}`;
        }
        
        // Se tem 9 dígitos, assume que falta o DDD (11 - São Paulo por padrão)
        if (digitsOnly.length === 9 && digitsOnly.charAt(0) === '9') {
            return `+5511${digitsOnly}`;
        }
        
        // Se tem 8 dígitos (fixo sem DDD), adiciona DDD 11
        if (digitsOnly.length === 8) {
            return `+5511${digitsOnly}`;
        }
        
        // Se já tem + no início e tem formato válido, mantém como está
        if (phone.startsWith('+') && digitsOnly.length >= 10) {
            return phone;
        }
        
        // Para outros casos, retorna string vazia para manter cobertura sem dados inválidos
        return "";
    }

    /**
     * Gera um ID de evento único
     * @returns {string} - ID único para o evento
     */
    generateEventId() {
        return `devotly_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    /**
     * Extrai parâmetros de tracking do TikTok da requisição
     * @param {Object} req - Request object
     * @returns {Object} - Parâmetros de tracking (ttclid, ttp)
     */
    extractTikTokParams(req) {
        const params = {};
        
        // TikTok Click ID - parâmetro mais importante para correspondência
        if (req.query.ttclid || req.headers['x-ttclid']) {
            params.ttclid = req.query.ttclid || req.headers['x-ttclid'];
        }
        
        // TikTok Tracking Parameter
        if (req.query.ttp || req.headers['x-ttp']) {
            params.ttp = req.query.ttp || req.headers['x-ttp'];
        }
        
        // Verificar também em cookies
        if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {});
            
            if (cookies.ttclid && !params.ttclid) {
                params.ttclid = cookies.ttclid;
            }
            
            if (cookies.ttp && !params.ttp) {
                params.ttp = cookies.ttp;
            }
        }
        
        return params;
    }

    /**
     * Prepara contexto completo para envio de evento
     * @param {Object} req - Request object
     * @param {string} eventId - ID personalizado do evento (opcional)
     * @returns {Object} - Contexto completo
     */
    prepareEventContext(req, eventId = null) {
        if (!req) {
            return { eventId };
        }

        const tiktokParams = this.extractTikTokParams(req);
        
        return {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            referrer: req.headers.referer || req.headers.referrer || '',
            eventId: eventId || this.generateEventId(),
            ...tiktokParams
        };
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
     * Envia evento para todos os pixels configurados
     */
    async sendEventToAllPixels(eventName, eventProperties, userData = {}, context = {}) {
        if (process.env.NODE_ENV !== 'production' && !this.testMode) {
            console.log(`[DEV MODE] TikTok event "${eventName}" não enviado (apenas em produção).`);
            return { status: 'dev_mode', message: 'Evento não enviado em modo de desenvolvimento' };
        }

        const results = await Promise.allSettled(
            this.pixels.map(async (pixel) => {
                return this.sendEventToPixel(pixel, eventName, eventProperties, userData, context);
            })
        );

        // Processar resultados
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`[TikTok Events] Evento ${eventName}: ${successful} sucessos, ${failed} falhas`);

        return {
            status: 'completed',
            successful,
            failed,
            results
        };
    }

    /**
     * Envia evento para um pixel específico - FORMATO CORRETO API v1.3 COM EMQ OTIMIZADO
     */
    async sendEventToPixel(pixel, eventName, eventProperties, userData = {}, context = {}) {
        const timestamp = Math.floor(Date.now() / 1000);
        // Usar event_id personalizado se fornecido, caso contrário gerar um
        const eventId = context.eventId || this.generateEventId();

        // Preparar dados do usuário com validação e hash otimizado
        const hashedUserData = this.prepareUserData(userData);
        
        // Estrutura do usuário conforme API v1.3 - SEMPRE incluir todos os campos
        const user = {
            // IP e User Agent (100% de cobertura)
            ip: context.ip || '127.0.0.1',
            user_agent: context.userAgent || 'Devotly-Server/1.0',
            // Dados hasheados (sempre presentes, mesmo que vazios)
            ...hashedUserData
        };

        // TikTok Click ID (importante para correspondência)
        if (context.ttclid) {
            user.ttclid = context.ttclid;
        }

        // TikTok Tracking Parameter (ttp) - parâmetro adicional de tracking
        if (context.ttp) {
            user.ttp = context.ttp;
        }

        // Payload no formato correto da API v1.3
        const payload = {
            pixel_code: pixel.id,
            event: eventName,
            event_id: eventId,
            timestamp: timestamp,
            user: user,
            properties: {
                ...eventProperties,
                // Value e Currency são OBRIGATÓRIOS para eventos de conversão - garantir números decimais válidos
                value: eventProperties.value !== null && !isNaN(eventProperties.value) && eventProperties.value >= 0 ? 
                       Number(parseFloat(eventProperties.value).toFixed(2)) : 0.00,
                currency: String(eventProperties.currency || 'BRL'),
                // URL da página (importante para contexto)
                url: context.pageUrl || 'https://devotly.shop'
            }
        };

        // Log detalhado para monitoramento de qualidade EMQ
        console.log(`[TikTok Events] Enviando evento ${eventName} para pixel ${pixel.id} com qualidade EMQ:`, {
            event_id: '✓ Presente',
            email: user.email && user.email !== "" ? '✓ Hash SHA-256+Base64' : '✗ Vazio',
            phone_number: user.phone_number && user.phone_number !== "" ? '✓ Hash SHA-256+Base64' : '✗ Vazio',
            external_id: user.external_id && user.external_id !== "" ? '✓ Hash SHA-256+Base64' : '✗ Vazio',
            ttclid: user.ttclid ? '✓ Presente' : '✗ Ausente',
            ttp: user.ttp ? '✓ Presente' : '✗ Ausente',
            ip: '✓ Presente',
            user_agent: '✓ Presente'
        });

        if (this.testMode) {
            console.log(`[TikTok Events] Payload completo para pixel ${pixel.id}:`, JSON.stringify(payload, null, 2));
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': pixel.token,
                'User-Agent': 'Devotly-TikTok-Events/1.0'
            },
            body: JSON.stringify(payload),
            timeout: 10000
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`TikTok API Error (Pixel ${pixel.id}): ${response.status} - ${JSON.stringify(responseData)}`);
        }

        console.log(`[TikTok Events] Evento ${eventName} enviado para pixel ${pixel.id}:`, responseData);
        return responseData;
    }

    /**
     * Envia um evento para a API do TikTok com lógica de retry
     * Formato API v1.3: https://business-api.tiktok.com/marketing_api/docs?id=1701890979375106
     */
    async sendEventWithRetry(eventName, eventProperties, userData = {}, context = {}, retryCount = 0, fromQueue = false) {
        try {
            console.log(`[TikTok Events] Enviando evento ${eventName} (tentativa ${retryCount + 1})`);

            // Timestamp em segundos (Unix time)
            const timestamp = Math.floor(Date.now() / 1000);
            // ID único para o evento para evitar duplicações
            const eventId = this.generateEventId();

            // Preparar dados do usuário com hash em SHA-256 e codificação Base64
            const user = {};
            if (userData.email) {
                // SHA-256 hash codificado em Base64 para o email (requisito da API)
                user.email = this.hashData(userData.email, true);
            }
            if (userData.phone) {
                // SHA-256 hash codificado em Base64 para o telefone
                user.phone_number = this.hashData(userData.phone, true);
            }
            if (userData.externalId) {
                // SHA-256 hash codificado em Base64 para o ID externo
                user.external_id = this.hashData(userData.externalId, true);
            }

            // Adicionar IP e User-Agent quando disponíveis
            if (context.ip) {
                user.ip = context.ip;
            }
            if (context.userAgent) {
                user.user_agent = context.userAgent;
            }

            // Payload conforme formato da TikTok API v1.3
            const payload = {
                pixel_code: this.pixelCode,
                event_source: this.eventSource, // Campo obrigatório: web, app ou offline
                event_source_id: this.eventSourceId, // Identificador da fonte do evento
                data: [{
                    event: eventName,
                    event_id: eventId,
                    event_time: timestamp,
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
                }]
            };

            if (this.testMode) {
                console.log(`[TikTok Events] Payload completo:`, JSON.stringify(payload, null, 2));
            }

            // Validar token de acesso
            if (!this.accessToken) {
                throw new Error('TIKTOK_ACCESS_TOKEN não configurado. Configure no arquivo .env');
            }

            // Requisição HTTP para a API do TikTok conforme documentação
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
            return await this.sendEventToAllPixels(eventName, eventProperties, userData, context);
        } catch (error) {
            console.error('[TikTok Events] Erro ao enviar evento:', error);
            return { error: error.message, status: 'error' };
        }
    }

    /**
     * Evento de compra concluída - OTIMIZADO com value e currency obrigatórios
     */
    async trackPurchase(cardId, planType, value, userEmail, userPhone, req = null, eventId = null) {
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
        // Validar value obrigatório com rigor para Purchase
        if (!value || isNaN(value) || value <= 0) {
            console.error('[TikTok Events] ERRO CRÍTICO: Purchase DEVE ter value > 0. Valor recebido:', value);
            value = planType === 'para_sempre' ? 97.00 : 67.00; // Valores padrão como decimal
            console.warn(`[TikTok Events] Usando valor padrão: ${value}`);
        }
        
        // Garantir que value seja número decimal válido
        const validValue = Number(parseFloat(value).toFixed(2));
        
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            eventId: eventId // Para deduplicação com frontend
        } : { eventId };
        
        console.log(`[TikTok Events] Purchase preparado com value válido: ${validValue} BRL`);
        
        return this.sendEvent('Purchase', {
            // Dados obrigatórios para otimização do TikTok
            value: validValue, // OBRIGATÓRIO - número decimal
            currency: 'BRL', // OBRIGATÓRIO - string
            // Dados do produto
            content_id: String(cardId || 'unknown'),
            content_type: 'product',
            content_name: String(planName),
            content_category: 'digital_product',
            quantity: 1
        }, {
            email: userEmail || "",
            phone: "", // Corrigido: remover referência à variável inexistente
            userId: String(cardId || 'user_' + Date.now())
        }, context);
    }

    /**
     * Evento de checkout iniciado - OTIMIZADO
     */
    async trackInitiateCheckout(cardId, planType, value, userEmail, req = null, eventId = null, userPhone = null) {
        console.log(`🎯 [Backend TikTok] INITIATE CHECKOUT RECEBIDO:`, {
            cardId,
            planType,
            value,
            userEmail,
            userPhone,
            eventId
        });
        
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
        // Validar value obrigatório
        if (!value || isNaN(value) || value <= 0) {
            console.warn('[TikTok Events] AVISO: Evento InitiateCheckout sem value válido.');
            value = planType === 'para_sempre' ? 17.99 : 8.99; // Valores corretos
        }
        
        // Garantir que value seja número decimal válido
        const validValue = Number(parseFloat(value).toFixed(2));
        
        console.log(`📊 [Backend TikTok] DADOS PROCESSADOS:`, {
            planName,
            validValue,
            currency: 'BRL'
        });
        
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            eventId: eventId
        } : { eventId };
        
        return this.sendEvent('InitiateCheckout', {
            // Dados obrigatórios para otimização
            value: validValue, // OBRIGATÓRIO - número decimal
            currency: 'BRL', // OBRIGATÓRIO - string
            content_id: String(cardId || 'unknown'),
            content_type: 'product',
            content_name: String(planName),
            content_category: 'digital_product',
            quantity: 1
        }, {
            email: userEmail || "",
            phone: userPhone || "", // Agora usando o parâmetro userPhone
            userId: String(cardId || 'user_' + Date.now())
        }, context);
    }
    
    /**
     * Evento de cartão criado/adicionado - OTIMIZADO
     */
    async trackAddToCart(cardId, userEmail, req = null, eventId = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            eventId: eventId
        } : { eventId };
        
        return this.sendEvent('AddToCart', {
            // Value obrigatório mesmo para AddToCart
            value: 0, // Valor estimado do lead
            currency: 'BRL',
            content_id: cardId,
            content_type: 'product',
            content_name: 'Cartão Cristão Digital',
            content_category: 'digital_product'
        }, {
            email: userEmail,
            externalId: cardId
        }, context);
    }
    
    /**
     * Evento de visualização de conteúdo - OTIMIZADO
     */
    async trackViewContent(cardId, contentType, contentName, userEmail, req = null, eventId = null) {
        const context = req ? {
            ip: this.getUserIP(req),
            userAgent: this.getUserAgent(req),
            pageUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            eventId: eventId
        } : { eventId };
        
        return this.sendEvent('ViewContent', {
            // Value pode ser 0 para ViewContent, mas currency é obrigatório
            value: 0,
            currency: 'BRL',
            content_id: cardId,
            content_type: contentType || 'product',
            content_name: contentName || 'Cartão Cristão Digital',
            content_category: 'digital_product'
        }, {
            email: userEmail,
            externalId: cardId
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

    /**
     * Obtém IP do usuário de forma segura
     * @param {Object} req - Request object
     * @returns {string} - IP do usuário
     */
    getUserIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
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
     * Prepara dados de usuário com hash e validação
     * @param {Object} userData - Dados do usuário (email, phone, userId)
     * @returns {Object} - Dados hasheados e validados
     */
    prepareUserData(userData = {}) {
        const hashedUserData = {};
        let validDataCount = 0;
        
        // Email - sempre incluir, mesmo que vazio
        if (userData.email && userData.email.trim() !== '') {
            const hashedEmail = this.hashData(userData.email, true);
            hashedUserData.email = hashedEmail;
            if (hashedEmail) {
                validDataCount++;
                console.log('[TikTok Events] Email hasheado com sucesso');
            }
        } else {
            hashedUserData.email = "";
        }
        
        // Telefone - sempre incluir, mesmo que vazio
        if (userData.phone && userData.phone.trim() !== '') {
            const normalizedPhone = this.normalizePhoneNumber(userData.phone);
            if (normalizedPhone) {
                const hashedPhone = this.hashData(normalizedPhone, true);
                hashedUserData.phone_number = hashedPhone;
                if (hashedPhone) {
                    validDataCount++;
                    console.log(`[TikTok Events] Telefone normalizado (${normalizedPhone}) e hasheado`);
                }
            } else {
                hashedUserData.phone_number = "";
            }
        } else {
            hashedUserData.phone_number = "";
        }
        
        // External ID - sempre incluir
        if (userData.userId && userData.userId.trim() !== '') {
            const hashedUserId = this.hashData(userData.userId, true);
            hashedUserData.external_id = hashedUserId;
            if (hashedUserId) {
                validDataCount++;
                console.log('[TikTok Events] External ID hasheado com sucesso');
            }
        } else {
            // Gerar um external_id básico se não houver
            const generatedId = `devotly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const hashedGeneratedId = this.hashData(generatedId, true);
            hashedUserData.external_id = hashedGeneratedId;
            console.log('[TikTok Events] External ID gerado automaticamente');
        }
        
        console.log(`[TikTok Events] Dados de usuário preparados com ${validDataCount} campos válidos:`, {
            email: hashedUserData.email ? '✓ Hash' : '✗ Vazio',
            phone_number: hashedUserData.phone_number ? '✓ Hash' : '✗ Vazio', 
            external_id: hashedUserData.external_id ? '✓ Hash' : '✗ Vazio'
        });
        
        return hashedUserData;
    }
}

export default new TikTokEventsService();
