import fetch from 'node-fetch';
import crypto from 'crypto';

/**
 * Serviço para enviar eventos para a API do TikTok
 * API Events do TikTok para rastreamento server-side
 */
class TikTokEventsService {
    constructor() {
        this.apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/';
        this.accessToken = '08538eef624276105c15fff5c1dfefe76b9726f2'; // Seu Access Token
        this.pixelCode = 'D1QFD0RC77UF6MBM48MG'; // Seu Pixel Code
        this.maxRetries = 3; // Número máximo de tentativas
        this.retryDelay = 1000; // Tempo entre tentativas (ms)
        this.eventQueue = []; // Fila para eventos pendentes
        this.processQueueInterval = null; // Intervalo para processar a fila

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
     * Inicia o processador de fila de eventos
     */
    startQueueProcessor() {
        if (this.processQueueInterval) return;
        
        this.processQueueInterval = setInterval(() => {
            this.processQueue();
        }, 5000); // Tenta processar a fila a cada 5 segundos
    }

    /**
     * Processa a fila de eventos pendentes
     */
    async processQueue() {
        if (this.eventQueue.length === 0) return;

        console.log(`Processando fila de eventos TikTok: ${this.eventQueue.length} eventos pendentes`);
        
        const event = this.eventQueue[0]; // Pegar o primeiro da fila
        
        try {
            await this.sendEventWithRetry(
                event.eventName, 
                event.eventProperties, 
                event.userData,
                0, // Contagem de tentativas inicial
                true // É uma tentativa da fila
            );
            
            // Se chegou aqui, o evento foi enviado com sucesso
            this.eventQueue.shift(); // Remove o evento da fila
            console.log('Evento processado da fila com sucesso');
        } catch (error) {
            console.error('Falha ao processar evento da fila:', error);
            
            // Se todas as tentativas falharam, remove da fila também
            if (event.retries >= this.maxRetries) {
                console.error('Número máximo de tentativas excedido, removendo evento da fila');
                this.eventQueue.shift();
            } else {
                // Incrementa contagem de tentativas
                event.retries = (event.retries || 0) + 1;
            }
        }
    }

    /**
     * Envia um evento para a API do TikTok com lógica de retry
     * @param {string} eventName - Nome do evento (ex: 'Purchase')
     * @param {Object} eventProperties - Propriedades do evento
     * @param {Object} userData - Dados do usuário (opcional)
     * @param {number} retryCount - Contador de tentativas atual
     * @param {boolean} fromQueue - Se é um envio da fila de processamento
     * @returns {Promise<Object>} - Resposta da API
     */
    async sendEventWithRetry(eventName, eventProperties, userData = {}, retryCount = 0, fromQueue = false) {
        try {
            console.log(`Enviando evento ${eventName} para TikTok API Events (tentativa ${retryCount + 1})`);

            const timestamp = Math.floor(Date.now() / 1000);
            const eventId = this.generateEventId();

            // Preparar dados do usuário com hash
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

            // Construir payload
            const payload = {
                pixel_code: this.pixelCode,
                event: eventName,
                event_id: eventId,
                timestamp,
                properties: {
                    ...eventProperties,
                    currency: eventProperties.currency || 'BRL',
                },
                context: {
                    user: user
                }
            };

            // Timeout para a requisição
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

            try {
                // Enviar para API do TikTok
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Token': this.accessToken,
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                
                // Verificar se a resposta é 2xx
                if (!response.ok) {
                    throw new Error(`TikTok API respondeu com status ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                
                // Verificar se a API retornou erro
                if (responseData.error_code && responseData.error_code !== 0) {
                    throw new Error(`TikTok API error: ${responseData.message || 'Unknown API error'}`);
                }
                
                console.log('TikTok API response:', JSON.stringify(responseData, null, 2));
                return responseData;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error; // Repassa o erro para ser tratado no retry
            }
        } catch (error) {
            console.error(`Erro ao enviar evento para TikTok API (tentativa ${retryCount + 1}):`, error);

            // Se ainda temos tentativas disponíveis e não estamos processando da fila
            if (retryCount < this.maxRetries && !fromQueue) {
                console.log(`Tentando novamente em ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.sendEventWithRetry(eventName, eventProperties, userData, retryCount + 1, fromQueue);
            } 
            // Se acabaram as tentativas e não estamos processando da fila, adiciona à fila
            else if (!fromQueue) {
                console.log('Adicionando evento à fila para tentativa posterior');
                this.eventQueue.push({
                    eventName,
                    eventProperties,
                    userData,
                    retries: retryCount
                });
            }
            
            throw error; // Repassa o erro
        }
    }

    /**
     * Envia um evento para a API do TikTok
     * @param {string} eventName - Nome do evento (ex: 'Purchase')
     * @param {Object} eventProperties - Propriedades do evento
     * @param {Object} userData - Dados do usuário (opcional)
     * @returns {Promise<Object>} - Resposta da API
     */
    async sendEvent(eventName, eventProperties, userData = {}) {
        try {
            return await this.sendEventWithRetry(eventName, eventProperties, userData);
        } catch (error) {
            console.error('Todos os envios falharam. Evento na fila para processamento posterior.');
            return { error: error.message, status: 'queued' };
        }
    }

    /**
     * Evento de compra concluída
     */
    async trackPurchase(cardId, planType, value, userEmail, userPhone) {
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
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
        });
    }

    /**
     * Evento de checkout iniciado
     */
    async trackInitiateCheckout(cardId, planType, value, userEmail) {
        const planName = planType === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual';
        
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
            email: userEmail
        });
    }
    
    /**
     * Evento de cartão criado/adicionado
     */
    async trackAddToCart(cardId, userEmail) {
        return this.sendEvent('AddToCart', {
            contents: [{
                content_id: cardId,
                content_type: 'product',
                content_name: 'Cartão Cristão Digital',
                quantity: 1
            }],
            currency: 'BRL',
        }, {
            email: userEmail
        });
    }
    
    /**
     * Evento de visualização de conteúdo
     */
    async trackViewContent(cardId, contentType, contentName, userEmail) {
        return this.sendEvent('ViewContent', {
            contents: [{
                content_id: cardId,
                content_type: contentType || 'product',
                content_name: contentName || 'Cartão Cristão Digital',
            }],
            currency: 'BRL',
        }, {
            email: userEmail
        });
    }
    
    /**
     * Evento de registro completo
     */
    async trackCompleteRegistration(userId, userEmail) {
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
        });
    }
}

export default new TikTokEventsService();
