/**
 * TikTok Events Manager - RESTRUTURAÇÃO COMPLETA v3.0
 * Sistema otimizado para máxima qualidade EMQ (Event Match Quality)
 * 
 * Características principais:
 * - EMQ Score Target: 70+ pontos
 * - Advanced Matching aprimorado
 * - Validação rigorosa de dados
 * - Sistema de retry inteligente
 * - Cache otimizado para performance
 * - Deduplicação avançada
 */

class TikTokEventsManager {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://devotly-full-production.up.railway.app';
        
        // Cache de dados do usuário com validação
        this.userCache = {
            email: null,
            phone: null,
            userId: null,
            hashedData: {},
            ttclid: null,
            ttp: null,
            fbp: null,
            fbc: null,
            validated: false
        };
        
        // Configurações EMQ
        this.emqConfig = {
            minEmailCoverage: 90,
            minPhoneCoverage: 90,
            requiredFields: ['email', 'phone_number', 'external_id', 'user_agent', 'url'],
            hashFormat: 'sha256_base64'
        };
        
        // Fila de eventos para retry
        this.eventQueue = [];
        this.isProcessingQueue = false;
        
        // Métricas de qualidade
        this.qualityMetrics = {
            emailHashSuccess: 0,
            phoneHashSuccess: 0,
            eventsSent: 0,
            eventsSuccess: 0,
            averageEMQ: 0
        };
        
        this.init();
    }
    
    /**
     * Inicialização do sistema
     */
    init() {
        this.loadStoredUserData();
        this.extractUrlParameters();
        this.setupEventListeners();
        this.startQueueProcessor();
        
        console.log('🎯 TikTok Events Manager v3.0 inicializado');
        console.log('📊 Target EMQ: 70+ pontos');
    }
    
    /**
     * Carrega dados armazenados do usuário
     */
    loadStoredUserData() {
        try {
            const storedEmail = localStorage.getItem('devotly_user_email');
            const storedPhone = localStorage.getItem('devotly_user_phone');
            const storedUserId = localStorage.getItem('devotly_user_id');
            
            if (storedEmail) {
                this.userCache.email = storedEmail;
            }
            if (storedPhone) {
                this.userCache.phone = storedPhone;
            }
            if (storedUserId) {
                this.userCache.userId = storedUserId;
            }
            
            // Auto-identificar se temos dados
            if (storedEmail || storedPhone) {
                this.identifyUser(storedEmail, storedPhone, storedUserId);
            }
        } catch (error) {
            console.warn('Erro ao carregar dados do usuário:', error);
        }
    }
    
    /**
     * Extrai parâmetros importantes da URL
     */
    extractUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Parâmetros do TikTok
        this.userCache.ttclid = urlParams.get('ttclid') || this.getCookie('ttclid');
        this.userCache.ttp = urlParams.get('ttp') || this.getCookie('ttp');
        
        // Parâmetros do Facebook (para cross-platform matching)
        this.userCache.fbp = this.getCookie('_fbp');
        this.userCache.fbc = this.getCookie('_fbc');
        
        // Armazenar parâmetros importantes
        if (this.userCache.ttclid) {
            this.setCookie('ttclid', this.userCache.ttclid, 30);
            localStorage.setItem('devotly_ttclid', this.userCache.ttclid);
        }
        if (this.userCache.ttp) {
            this.setCookie('ttp', this.userCache.ttp, 30);
            localStorage.setItem('devotly_ttp', this.userCache.ttp);
        }
    }
    
    /**
     * Hash SHA-256 + Base64 otimizado
     */
    async hashData(data) {
        if (!data || typeof data !== 'string' || data.trim() === '') {
            return '';
        }
        
        try {
            const normalized = data.trim().toLowerCase();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(normalized);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = new Uint8Array(hashBuffer);
            
            // Converter para Base64
            let binary = '';
            for (let i = 0; i < hashArray.byteLength; i++) {
                binary += String.fromCharCode(hashArray[i]);
            }
            return btoa(binary);
        } catch (error) {
            console.error('Erro no hash:', error);
            return '';
        }
    }
    
    /**
     * Normaliza telefone para formato E.164 internacional
     */
    normalizePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }
        
        // Remove tudo exceto números
        const digitsOnly = phone.replace(/\D/g, '');
        
        // Validação mínima
        if (digitsOnly.length < 8) {
            return '';
        }
        
        // Lógica para números brasileiros
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
        
        // Se já tem +, validar formato
        if (phone.startsWith('+') && digitsOnly.length >= 10) {
            return phone;
        }
        
        return '';
    }
    
    /**
     * Identifica usuário com dados avançados
     */
    async identifyUser(email, phone, userId) {
        console.log('🔍 Identificando usuário...');
        
        try {
            // Validar e processar email
            if (email && email.includes('@')) {
                const normalizedEmail = email.trim().toLowerCase();
                this.userCache.email = normalizedEmail;
                this.userCache.hashedData.email = await this.hashData(normalizedEmail);
                localStorage.setItem('devotly_user_email', normalizedEmail);
                this.qualityMetrics.emailHashSuccess++;
            }
            
            // Validar e processar telefone
            if (phone) {
                const normalizedPhone = this.normalizePhone(phone);
                if (normalizedPhone) {
                    this.userCache.phone = normalizedPhone;
                    this.userCache.hashedData.phone_number = await this.hashData(normalizedPhone);
                    localStorage.setItem('devotly_user_phone', normalizedPhone);
                    this.qualityMetrics.phoneHashSuccess++;
                }
            }
            
            // Processar userId
            if (userId) {
                this.userCache.userId = userId;
                this.userCache.hashedData.external_id = await this.hashData(userId);
                localStorage.setItem('devotly_user_id', userId);
            } else {
                // Gerar userId único
                const generatedId = this.generateUserId();
                this.userCache.userId = generatedId;
                this.userCache.hashedData.external_id = await this.hashData(generatedId);
                localStorage.setItem('devotly_user_id', generatedId);
            }
            
            this.userCache.validated = true;
            
            console.log('✅ Usuário identificado com sucesso');
            console.log('📊 Dados validados:', {
                email: this.userCache.email ? '✓' : '✗',
                phone: this.userCache.phone ? '✓' : '✗',
                userId: this.userCache.userId ? '✓' : '✗',
                ttclid: this.userCache.ttclid ? '✓' : '✗'
            });
            
            return true;
        } catch (error) {
            console.error('Erro na identificação:', error);
            return false;
        }
    }
    
    /**
     * Gera userId único baseado em características do dispositivo e dados disponíveis - EMQ OTIMIZADO
     */
    generateUserId() {
        // Tentar usar dados reais se disponíveis
        const email = this.userCache.email || localStorage.getItem('devotly_auto_email');
        const phone = this.userCache.phone || localStorage.getItem('devotly_auto_phone');
        const name = localStorage.getItem('devotly_auto_name');
        
        let baseComponents = [];
        
        // 1. Priorizar dados reais do usuário
        if (email) {
            baseComponents.push(`email_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8)}`);
        }
        if (phone) {
            baseComponents.push(`phone_${btoa(phone).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8)}`);
        }
        if (name) {
            baseComponents.push(`name_${btoa(name).replace(/[^a-zA-Z0-9]/g, '').substr(0, 6)}`);
        }
        
        // 2. Adicionar características do dispositivo/sessão
        const deviceFingerprint = [
            navigator.userAgent.slice(0, 30),
            screen.width + 'x' + screen.height,
            navigator.language,
            new Date().getTimezoneOffset().toString(),
            navigator.platform?.slice(0, 10) || 'unknown'
        ];
        
        // 3. Dados de sessão persistentes
        const sessionData = [
            this.userCache.ttclid || 'no_ttclid',
            this.userCache.fbp || 'no_fbp',
            localStorage.getItem('devotly_session_id') || this.generateSessionId()
        ];
        
        // 4. Combinar todos os componentes
        const allComponents = [
            ...baseComponents,
            ...deviceFingerprint,
            ...sessionData,
            Math.random().toString(36).substr(2, 6) // Componente aleatório para unicidade
        ];
        
        const combined = allComponents.join('|');
        const hash = btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substr(0, 20);
        
        const userId = `devotly_${Date.now()}_${hash}`;
        
        console.log('🆔 UserId gerado:', userId);
        console.log('📊 Componentes usados:', {
            hasEmail: !!email,
            hasPhone: !!phone, 
            hasName: !!name,
            hasttclid: !!this.userCache.ttclid,
            components: baseComponents.length
        });
        
        return userId;
    }
    
    /**
     * Gera ID de sessão persistente
     */
    generateSessionId() {
        let sessionId = localStorage.getItem('devotly_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
            localStorage.setItem('devotly_session_id', sessionId);
        }
        return sessionId;
    }
    
    /**
     * Busca dados em formulários da página - EMQ OTIMIZADO
     */
    autoDetectUserData() {
        const detectedData = {
            email: null,
            phone: null,
            name: null
        };
        
        try {
            // 1. DETECÇÃO DE EMAIL (Meta: 90%+ cobertura)
            const emailSelectors = [
                'input[type="email"]',
                'input[name*="email"]', 
                'input[id*="email"]',
                'input[name*="Email"]',
                'input[id*="userEmail"]',
                'input[placeholder*="email"]',
                'input[placeholder*="@"]'
            ];
            
            for (const selector of emailSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.includes('@') && input.value.includes('.')) {
                        const email = input.value.trim().toLowerCase();
                        if (this.validateEmail(email)) {
                            detectedData.email = email;
                            console.log('📧 Email detectado automaticamente:', email);
                            break;
                        }
                    }
                }
                if (detectedData.email) break;
            }
            
            // 2. DETECÇÃO DE TELEFONE (Meta: 90%+ cobertura)
            const phoneSelectors = [
                'input[type="tel"]',
                'input[name*="phone"]',
                'input[name*="Phone"]', 
                'input[id*="phone"]',
                'input[id*="Phone"]',
                'input[name*="telefone"]',
                'input[id*="telefone"]',
                'input[id*="userPhone"]',
                'input[placeholder*="telefone"]',
                'input[placeholder*="WhatsApp"]',
                'input[placeholder*="(99)"]'
            ];
            
            for (const selector of phoneSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.replace(/\D/g, '').length >= 8) {
                        const phone = input.value.trim();
                        const normalizedPhone = this.normalizePhone(phone);
                        if (normalizedPhone) {
                            detectedData.phone = normalizedPhone;
                            console.log('📱 Telefone detectado automaticamente:', normalizedPhone);
                            break;
                        }
                    }
                }
                if (detectedData.phone) break;
            }
            
            // 3. DETECÇÃO DE NOME (para external_id)
            const nameSelectors = [
                'input[name*="name"]',
                'input[name*="Name"]',
                'input[id*="name"]',
                'input[id*="Name"]',
                'input[id*="userName"]',
                'input[placeholder*="nome"]'
            ];
            
            for (const selector of nameSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.value && input.value.trim().length > 2) {
                        detectedData.name = input.value.trim();
                        console.log('👤 Nome detectado automaticamente:', detectedData.name);
                        break;
                    }
                }
                if (detectedData.name) break;
            }
            
            // 4. AUTO-IDENTIFICAR SE DADOS VÁLIDOS ENCONTRADOS
            if (detectedData.email || detectedData.phone) {
                this.autoIdentifyFromDetection(detectedData);
            }
            
        } catch (error) {
            console.warn('⚠️ Erro na detecção automática:', error);
        }
        
        return detectedData;
    }
    
    /**
     * Valida formato de email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Auto-identifica usuário com dados detectados
     */
    async autoIdentifyFromDetection(detectedData) {
        try {
            // Só identifica se temos novos dados válidos
            const hasNewEmail = detectedData.email && detectedData.email !== this.userCache.email;
            const hasNewPhone = detectedData.phone && detectedData.phone !== this.userCache.phone;
            
            if (hasNewEmail || hasNewPhone) {
                console.log('🔍 Auto-identificando usuário com dados detectados...');
                
                // Gerar userId baseado nos dados detectados
                let userId = this.userCache.userId;
                if (!userId && (detectedData.email || detectedData.name)) {
                    const baseData = detectedData.email || detectedData.name || 'anonymous';
                    userId = `devotly_auto_${btoa(baseData).replace(/[^a-zA-Z0-9]/g, '').substr(0, 12)}_${Date.now()}`;
                }
                
                await this.identifyUser(detectedData.email, detectedData.phone, userId);
                
                // Salvar dados detectados
                if (detectedData.email) {
                    localStorage.setItem('devotly_auto_email', detectedData.email);
                }
                if (detectedData.phone) {
                    localStorage.setItem('devotly_auto_phone', detectedData.phone);
                }
                if (detectedData.name) {
                    localStorage.setItem('devotly_auto_name', detectedData.name);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro na auto-identificação:', error);
        }
    }
    
    /**
     * Prepara dados de Advanced Matching com máxima qualidade - EMQ OTIMIZADO
     */
    async prepareAdvancedMatching() {
        // Tentar detectar dados automaticamente se não temos
        if (!this.userCache.validated || !this.userCache.email || !this.userCache.phone) {
            this.autoDetectUserData();
        }
        
        const baseData = {
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer || '',
            ip: '', // Será capturado pelo servidor
        };
        
        // EMAIL - Meta: 90%+ cobertura
        if (this.userCache.hashedData.email) {
            baseData.email = this.userCache.hashedData.email;
        } else if (this.userCache.email) {
            baseData.email = await this.hashData(this.userCache.email);
            this.userCache.hashedData.email = baseData.email;
        } else {
            // Tentar detecção last-minute
            const autoData = this.autoDetectUserData();
            if (autoData.email) {
                baseData.email = await this.hashData(autoData.email);
                this.userCache.hashedData.email = baseData.email;
            } else {
                baseData.email = ''; // String vazia em vez de null/undefined
            }
        }
        
        // TELEFONE - Meta: 90%+ cobertura
        if (this.userCache.hashedData.phone_number) {
            baseData.phone_number = this.userCache.hashedData.phone_number;
        } else if (this.userCache.phone) {
            const normalizedPhone = this.normalizePhone(this.userCache.phone);
            if (normalizedPhone) {
                baseData.phone_number = await this.hashData(normalizedPhone);
                this.userCache.hashedData.phone_number = baseData.phone_number;
            } else {
                baseData.phone_number = '';
            }
        } else {
            // Tentar detecção last-minute
            const autoData = this.autoDetectUserData();
            if (autoData.phone) {
                const normalizedPhone = this.normalizePhone(autoData.phone);
                if (normalizedPhone) {
                    baseData.phone_number = await this.hashData(normalizedPhone);
                    this.userCache.hashedData.phone_number = baseData.phone_number;
                } else {
                    baseData.phone_number = '';
                }
            } else {
                baseData.phone_number = '';
            }
        }
        
        // EXTERNAL_ID - Meta: 100% cobertura (sempre garantido)
        if (this.userCache.hashedData.external_id) {
            baseData.external_id = this.userCache.hashedData.external_id;
        } else {
            // Garantir external_id sempre presente
            const userId = this.userCache.userId || this.generateUserId();
            this.userCache.userId = userId;
            baseData.external_id = await this.hashData(userId);
            this.userCache.hashedData.external_id = baseData.external_id;
            localStorage.setItem('devotly_user_id', userId);
        }
        
        // Parâmetros do TikTok - Bonus EMQ
        if (this.userCache.ttclid) {
            baseData.ttclid = this.userCache.ttclid;
        }
        if (this.userCache.ttp) {
            baseData.ttp = this.userCache.ttp;
        }
        
        // Parâmetros do Facebook para cross-platform matching
        if (this.userCache.fbp) {
            baseData.fbp = this.userCache.fbp;
        }
        if (this.userCache.fbc) {
            baseData.fbc = this.userCache.fbc;
        }
        
        // Validação final - Garantir que nunca enviamos null/undefined
        Object.keys(baseData).forEach(key => {
            if (baseData[key] === null || baseData[key] === undefined) {
                baseData[key] = '';
            }
        });
        
        // Log de cobertura EMQ
        const coverage = {
            email: baseData.email !== '' ? '✅' : '❌',
            phone: baseData.phone_number !== '' ? '✅' : '❌', 
            external_id: baseData.external_id !== '' ? '✅' : '❌',
            ttclid: baseData.ttclid ? '✅' : '⚪',
            fbp: baseData.fbp ? '✅' : '⚪'
        };
        
        console.log('📊 Cobertura EMQ:', coverage);
        
        return baseData;
    }
    
    /**
     * Valida valor monetário
     */
    validateValue(value) {
        if (value === null || value === undefined || value === '') {
            return 0.00;
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            return 0.00;
        }
        
        return Number(numValue.toFixed(2));
    }
    
    /**
     * Calcula qualidade EMQ estimada
     */
    calculateEMQScore(eventData) {
        let score = 0;
        
        // Base score
        score += 20;
        
        // Email (25 pontos)
        if (eventData.email && eventData.email !== '') {
            score += 25;
        }
        
        // Telefone (25 pontos)
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
        
        // TTCLID (10 pontos bonus)
        if (eventData.ttclid) {
            score += 10;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Gera ID único para evento
     */
    generateEventId() {
        return `devotly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Envia evento para TikTok Pixel e API
     */
    async sendEvent(eventName, eventData = {}, options = {}) {
        try {
            const eventId = this.generateEventId();
            const advancedMatching = await this.prepareAdvancedMatching();
            
            // Preparar dados do evento
            const finalEventData = {
                event_id: eventId,
                ...eventData,
                ...advancedMatching
            };
            
            // Validar valor se presente
            if (finalEventData.value !== undefined) {
                finalEventData.value = this.validateValue(finalEventData.value);
            }
            
            // Garantir currency
            if (finalEventData.currency === undefined) {
                finalEventData.currency = 'BRL';
            }
            
            // Calcular EMQ
            const emqScore = this.calculateEMQScore(finalEventData);
            
            console.log(`🎯 Enviando ${eventName} (EMQ: ${emqScore})`);
            console.log('📊 Qualidade dos dados:', {
                email: finalEventData.email ? '✓ Hash' : '✗ Ausente',
                phone: finalEventData.phone_number ? '✓ Hash' : '✗ Ausente',
                external_id: finalEventData.external_id ? '✓ Hash' : '✗ Ausente',
                ttclid: finalEventData.ttclid ? '✓ Presente' : '✗ Ausente',
                value: finalEventData.value !== undefined ? `✓ ${finalEventData.value}` : 'N/A',
                emq_score: `${emqScore}/100`
            });
            
            // Enviar para TikTok Pixel
            if (typeof ttq !== 'undefined') {
                ttq.track(eventName, finalEventData);
                console.log(`✅ ${eventName} enviado para TikTok Pixel`);
            } else {
                console.warn('⚠️ TikTok Pixel não disponível, adicionando à fila');
                this.addToQueue(eventName, finalEventData);
            }
            
            // Enviar para API Events (server-side)
            await this.sendToServer(eventName, finalEventData, eventId);
            
            // Atualizar métricas
            this.qualityMetrics.eventsSent++;
            this.qualityMetrics.eventsSuccess++;
            this.qualityMetrics.averageEMQ = 
                (this.qualityMetrics.averageEMQ * (this.qualityMetrics.eventsSent - 1) + emqScore) / 
                this.qualityMetrics.eventsSent;
            
            return { success: true, eventId, emqScore };
            
        } catch (error) {
            console.error(`❌ Erro ao enviar ${eventName}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Envia evento para servidor (API Events)
     */
    async sendToServer(eventName, eventData, eventId) {
        try {
            const payload = {
                eventName,
                eventData,
                userData: {
                    email: this.userCache.email || '',
                    phone: this.userCache.phone || '',
                    userId: this.userCache.userId || ''
                },
                eventId,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                referrer: document.referrer
            };
            
            const response = await fetch(`${this.apiUrl}/api/tiktok/track-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`✅ ${eventName} enviado para API Events`);
            } else {
                console.error(`❌ Erro na API Events: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar para servidor:', error);
        }
    }
    
    /**
     * Adiciona evento à fila para retry
     */
    addToQueue(eventName, eventData) {
        this.eventQueue.push({
            eventName,
            eventData,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Salvar fila no localStorage
        try {
            localStorage.setItem('devotly_tiktok_queue', JSON.stringify(this.eventQueue));
        } catch (error) {
            console.warn('Erro ao salvar fila:', error);
        }
    }
    
    /**
     * Processa fila de eventos
     */
    async processQueue() {
        if (this.isProcessingQueue || this.eventQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        try {
            const eventsToProcess = [...this.eventQueue];
            this.eventQueue = [];
            
            for (const event of eventsToProcess) {
                if (typeof ttq !== 'undefined' && event.attempts < 3) {
                    ttq.track(event.eventName, event.eventData);
                    console.log(`🔄 Evento da fila enviado: ${event.eventName}`);
                } else if (event.attempts < 3) {
                    event.attempts++;
                    this.eventQueue.push(event);
                }
            }
            
            // Atualizar localStorage
            localStorage.setItem('devotly_tiktok_queue', JSON.stringify(this.eventQueue));
            
        } catch (error) {
            console.error('Erro ao processar fila:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Inicia processador da fila
     */
    startQueueProcessor() {
        // Carregar fila do localStorage
        try {
            const savedQueue = localStorage.getItem('devotly_tiktok_queue');
            if (savedQueue) {
                this.eventQueue = JSON.parse(savedQueue);
            }
        } catch (error) {
            console.warn('Erro ao carregar fila:', error);
        }
        
        // Processar fila periodicamente
        setInterval(() => {
            this.processQueue();
        }, 5000);
        
        // Processar quando TikTok Pixel carregar
        if (typeof ttq !== 'undefined') {
            this.processQueue();
        }
    }
    
    /**
     * Configura listeners de eventos - EMQ OTIMIZADO
     */
    setupEventListeners() {
        // Auto-detect quando TikTok carregar
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof ttq !== 'undefined') {
                this.processQueue();
            }
            // Detectar dados automaticamente no carregamento
            setTimeout(() => this.autoDetectUserData(), 500);
        });
        
        // Processar quando página ficar visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.processQueue();
                this.autoDetectUserData();
            }
        });
        
        // LISTENERS PARA DETECÇÃO EM TEMPO REAL
        this.setupFormListeners();
        this.setupInputListeners();
        
        // ⚠️ REMOÇÃO DO AUTO-TRACK PAGEVIEW
        // Cada página deve controlar seu próprio PageView com valor específico
        // para garantir ROAS correto no TikTok Ads
        console.log('🎯 TikTok Events v3.0: PageView manual para controle de ROAS');
    }
    
    /**
     * Configura listeners para formulários
     */
    setupFormListeners() {
        // Listener para submissão de formulários (sem captura para não interferir)
        document.addEventListener('submit', (event) => {
            // Não interferir com botões de navegação
            if (event.target.closest('.btn-next, .btn-prev, .navigation-button')) {
                return;
            }
            console.log('📋 Formulário submetido, detectando dados...');
            // Usar setTimeout para não interferir com o processamento normal
            setTimeout(() => this.autoDetectUserData(), 10);
        }, false); // Mudado para false para não capturar
        
        // Listener para mudanças em formulários (sem captura)
        document.addEventListener('change', (event) => {
            // Não interferir com elementos de navegação
            if (event.target.closest('.btn-next, .btn-prev, .navigation-button')) {
                return;
            }
            if (event.target.matches('input[type="email"], input[name*="email"], input[id*="email"]')) {
                console.log('📧 Campo de email alterado');
                setTimeout(() => this.autoDetectUserData(), 100);
            }
            if (event.target.matches('input[type="tel"], input[name*="phone"], input[id*="phone"]')) {
                console.log('📱 Campo de telefone alterado');
                setTimeout(() => this.autoDetectUserData(), 100);
            }
        }, false); // Mudado para false para não capturar
    }
    
    /**
     * Configura listeners para campos de input
     */
    setupInputListeners() {
        // Listener para blur (quando usuário sai do campo) - sem captura
        document.addEventListener('blur', (event) => {
            if (event.target.matches('input[type="email"], input[name*="email"], input[id*="email"]')) {
                if (event.target.value && event.target.value.includes('@')) {
                    console.log('📧 Email preenchido:', event.target.value);
                    setTimeout(() => this.autoDetectUserData(), 100);
                }
            }
            if (event.target.matches('input[type="tel"], input[name*="phone"], input[id*="phone"]')) {
                if (event.target.value && event.target.value.replace(/\D/g, '').length >= 8) {
                    console.log('📱 Telefone preenchido:', event.target.value);
                    setTimeout(() => this.autoDetectUserData(), 100);
                }
            }
        }, false); // Mudado para false para não capturar
        
        // Detectar dados a cada 3 segundos (para capturar preenchimento automático)
        setInterval(() => {
            if (!this.userCache.validated || (!this.userCache.email || !this.userCache.phone)) {
                this.autoDetectUserData();
            }
        }, 3000);
    }
    
    // ============================================================================
    // MÉTODOS DE EVENTOS ESPECÍFICOS
    // ============================================================================
    
    /**
     * PageView - Visualização de página com valor para ROAS
     * @param {number} value - Valor estimado da página (opcional, será calculado automaticamente se não fornecido)
     * @param {string} currency - Moeda (padrão: BRL)
     */
    async trackPageView(value = null, currency = 'BRL') {
        // Auto-detectar dados se não temos
        if (!this.userCache.validated) {
            const autoData = this.autoDetectUserData();
            if (autoData.email || autoData.phone) {
                await this.identifyUser(autoData.email, autoData.phone);
            }
        }
        
        // Calcular valor automaticamente se não fornecido
        if (value === null) {
            value = this.calculatePageValue();
            console.log(`🤖 PageView valor auto-calculado: R$ ${value}`);
        } else {
            console.log(`🎯 PageView valor específico: R$ ${value}`);
        }
        
        console.log(`📄 PageView disparado - Valor: R$ ${value}, Moeda: ${currency}`);
        
        return this.sendEvent('PageView', {
            content_name: document.title,
            content_category: 'page_view',
            value: value,
            currency: currency
        });
    }
    
    /**
     * Calcula o valor estimado da página atual para ROAS
     */
    calculatePageValue() {
        const path = window.location.pathname.toLowerCase();
        const hostname = window.location.hostname;
        
        // Valores baseados no funil de conversão e potencial de negócio
        if (path.includes('success') || path.includes('pagamento-confirmado')) {
            return 50; // Página de sucesso - alta conversão
        } else if (path.includes('checkout') || path.includes('pagamento')) {
            return 30; // Página de checkout - intenção de compra alta
        } else if (path.includes('create') || path.includes('criar')) {
            return 25; // Página de criação - engajamento alto
        } else if (path.includes('view') || path.includes('cartao') || path.includes('card')) {
            return 15; // Visualização de cartão - engajamento médio
        } else if (path.includes('pricing') || path.includes('planos') || path.includes('precos')) {
            return 20; // Página de preços - interesse comercial
        } else if (path === '/' || path.includes('home') || path.includes('index')) {
            return 10; // Página inicial - entrada no funil
        } else if (path.includes('about') || path.includes('sobre')) {
            return 8; // Página sobre - interesse na marca
        } else if (path.includes('contact') || path.includes('contato')) {
            return 12; // Página de contato - lead potential
        } else if (path.includes('blog') || path.includes('artigo')) {
            return 5; // Conteúdo - SEO e engajamento
        } else if (path.includes('termos') || path.includes('privacidade') || path.includes('legal')) {
            return 2; // Páginas legais - baixo valor comercial
        } else if (path.includes('pending') || path.includes('aguardando')) {
            return 25; // Página de pagamento pendente - meio do funil
        } else if (path.includes('test') || hostname.includes('localhost')) {
            return 1; // Páginas de teste - valor mínimo
        } else {
            return 5; // Valor padrão para outras páginas
        }
    }
    
    /**
     * ViewContent - Visualização de conteúdo
     */
    async trackViewContent(contentId, contentName, value = null, currency = 'BRL', category = 'product') {
        const validValue = this.validateValue(value);
        
        return this.sendEvent('ViewContent', {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Conteúdo'),
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            contents: [{
                id: String(contentId || 'unknown'),
                name: String(contentName || 'Conteúdo'),
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }
    
    /**
     * Purchase - Compra finalizada
     */
    async trackPurchase(contentId, contentName, value, currency = 'BRL', category = 'product') {
        // Purchase DEVE ter valor > 0
        const validValue = this.validateValue(value);
        if (validValue <= 0) {
            console.error('❌ Purchase requer value > 0');
            return { success: false, error: 'Value must be > 0' };
        }
        
        return this.sendEvent('Purchase', {
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
        });
    }
    
    /**
     * InitiateCheckout - Início de checkout
     */
    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL', category = 'product') {
        const validValue = this.validateValue(value);
        
        return this.sendEvent('InitiateCheckout', {
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
        });
    }
    
    /**
     * ClickButton - Clique em botão - EMQ OTIMIZADO
     */
    async trackClickButton(buttonText, buttonType = 'cta', value = null) {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento ClickButton...');
            this.autoDetectUserData();
        }
        
        return this.sendEvent('ClickButton', {
            button_text: String(buttonText || 'Botão'),
            button_type: String(buttonType),
            value: value !== null ? this.validateValue(value) : undefined
        });
    }
    
    /**
     * Contact - Formulário de contato - EMQ OTIMIZADO
     */
    async trackContact(contactType = 'form', value = 5) {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento Contact...');
            this.autoDetectUserData();
        }
        
        return this.sendEvent('Contact', {
            contact_type: String(contactType),
            value: this.validateValue(value),
            currency: 'BRL'
        });
    }
    
    /**
     * Lead - Geração de lead - EMQ OTIMIZADO
     */
    async trackLead(leadType = 'lead', value = 10) {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento Lead...');
            this.autoDetectUserData();
        }
        
        return this.sendEvent('Lead', {
            lead_type: String(leadType),
            value: this.validateValue(value),
            currency: 'BRL'
        });
    }
    
    /**
     * AddToCart - Adicionar ao carrinho - EMQ OTIMIZADO
     */
    async trackAddToCart(contentId, contentName, value, currency = 'BRL', category = 'product') {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento AddToCart...');
            this.autoDetectUserData();
        }
        
        const validValue = this.validateValue(value);
        
        return this.sendEvent('AddToCart', {
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
        });
    }
    
    /**
     * AddPaymentInfo - Adicionar informações de pagamento - EMQ OTIMIZADO
     */
    async trackAddPaymentInfo(contentId, contentName, value, currency = 'BRL', category = 'subscription') {
        // Detectar dados automaticamente antes do evento
        if (!this.userCache.validated) {
            console.log('🔍 Detectando dados antes do evento AddPaymentInfo...');
            this.autoDetectUserData();
        }
        
        const validValue = this.validateValue(value);
        
        console.log(`💳 AddPaymentInfo: ${contentName} - R$ ${validValue}`);
        
        return this.sendEvent('AddPaymentInfo', {
            content_id: String(contentId || 'payment_info'),
            content_name: String(contentName || 'Informações de Pagamento'),
            content_type: String(category),
            value: validValue,
            currency: String(currency),
            payment_method: 'mercadopago',
            contents: [{
                id: String(contentId || 'payment_info'),
                name: String(contentName || 'Informações de Pagamento'),
                category: String(category),
                quantity: 1,
                price: validValue
            }]
        });
    }

    // ============================================================================
    // MÉTODOS UTILITÁRIOS
    // ============================================================================
    
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
    
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
    
    /**
     * Obtém métricas de qualidade EMQ
     */
    getQualityMetrics() {
        const emailCoverage = this.userCache.hashedData.email !== '' ? 100 : 0;
        const phoneCoverage = this.userCache.hashedData.phone_number !== '' ? 100 : 0;
        const externalIdCoverage = this.userCache.hashedData.external_id !== '' ? 100 : 0;
        
        const averageCoverage = (emailCoverage + phoneCoverage + externalIdCoverage) / 3;
        
        return {
            ...this.qualityMetrics,
            userDataQuality: {
                email: !!this.userCache.email,
                phone: !!this.userCache.phone,
                userId: !!this.userCache.userId,
                ttclid: !!this.userCache.ttclid,
                validated: this.userCache.validated
            },
            emqCoverage: {
                email: emailCoverage,
                phone: phoneCoverage,
                external_id: externalIdCoverage,
                average: averageCoverage,
                target: 90 // Meta de cobertura
            },
            emqScore: {
                current: this.qualityMetrics.averageEMQ,
                target: 70,
                status: this.qualityMetrics.averageEMQ >= 70 ? '✅ Meta atingida' : '🎯 Em progresso'
            },
            recommendations: this.getEMQRecommendations()
        };
    }
    
    /**
     * Gera recomendações para melhorar EMQ
     */
    getEMQRecommendations() {
        const recommendations = [];
        
        if (!this.userCache.email) {
            recommendations.push('📧 Implementar captura de email nos formulários');
        }
        if (!this.userCache.phone) {
            recommendations.push('📱 Adicionar campo de telefone opcional');
        }
        if (!this.userCache.ttclid) {
            recommendations.push('🔗 Implementar parâmetros de tracking nas URLs');
        }
        if (this.qualityMetrics.averageEMQ < 70) {
            recommendations.push('🎯 Melhorar identificação do usuário antes dos eventos');
        }
        
        return recommendations;
    }
}

// ============================================================================
// INTERFACE GLOBAL COMPATÍVEL
// ============================================================================

// Instanciar manager global
window.TikTokManager = new TikTokEventsManager();

// Interface compatível com código existente
window.TikTokEvents = {
    // Métodos principais
    identifyUser: (email, phone, userId) => window.TikTokManager.identifyUser(email, phone, userId),
    trackPageView: (value = null, currency = 'BRL') => window.TikTokManager.trackPageView(value, currency),
    trackViewContent: (id, name, value, currency) => window.TikTokManager.trackViewContent(id, name, value, currency),
    trackPurchase: (id, name, value, currency) => window.TikTokManager.trackPurchase(id, name, value, currency),
    trackInitiateCheckout: (id, name, value, currency) => window.TikTokManager.trackInitiateCheckout(id, name, value, currency),
    trackAddToCart: (id, name, value, currency) => window.TikTokManager.trackAddToCart(id, name, value, currency),
    trackAddPaymentInfo: (id, name, value, currency) => window.TikTokManager.trackAddPaymentInfo(id, name, value, currency),
    trackClickButton: (text, type, value) => window.TikTokManager.trackClickButton(text, type, value),
    trackContact: (type, value) => window.TikTokManager.trackContact(type, value),
    trackLead: (type, value) => window.TikTokManager.trackLead(type, value),
    
    // Alias para compatibilidade com versão anterior
    trackEngagement: (type, description, value = 1) => window.TikTokManager.trackClickButton(description, type, value),
    
    // Métodos específicos do Devotly com valores otimizados para ROAS
    viewHomePage: () => window.TikTokManager.trackPageView(10, 'BRL'), // Página inicial - entrada no funil
    viewCreatePage: () => {
        console.log('🎨 CREATE PAGE: Disparando PageView com valor R$ 25,00 para ROAS');
        return window.TikTokManager.trackPageView(25, 'BRL'); // Página de criação - alta intenção
    },
    viewCard: (cardId) => window.TikTokManager.trackViewContent(cardId, 'Visualizar Cartão', 15, 'BRL'),
    selectPlan: (planType, value) => window.TikTokManager.trackAddToCart('plan', `Plano ${planType}`, value),
    startCheckout: (cardId, planType, value) => window.TikTokManager.trackInitiateCheckout(cardId, `Plano ${planType}`, value),
    completePurchase: (cardId, planType, value) => window.TikTokManager.trackPurchase(cardId, `Plano ${planType}`, value),
    
    // Novos métodos EMQ otimizados
    startCardCreation: () => window.TikTokManager.trackLead('start_creation', 15),
    addPaymentInfo: (planType, value) => {
        console.log(`💳 PAYMENT INFO: Disparando AddPaymentInfo para ${planType} - R$ ${value}`);
        return window.TikTokManager.trackAddPaymentInfo(`plan_${planType}`, `Plano ${planType}`, value, 'BRL', 'subscription');
    },
    
    // Métodos de criação
    create: {
        startCreation: () => window.TikTokManager.trackLead('start_creation', 15),
        fillStep: (step, name) => window.TikTokManager.trackViewContent(`step-${step}`, name, 5),
        uploadImage: () => window.TikTokManager.trackClickButton('Upload Imagem', 'upload', 5),
        selectVerse: () => window.TikTokManager.trackClickButton('Selecionar Versículo', 'verse_selection', 5),
        addMusic: () => window.TikTokManager.trackClickButton('Adicionar Música', 'music', 5),
        previewCard: () => window.TikTokManager.trackClickButton('Visualizar Cartão', 'preview', 5),
        completeCreation: (cardId) => window.TikTokManager.trackLead('complete_creation', 25)
    },
    
    // Utilitários EMQ
    getMetrics: () => window.TikTokManager.getQualityMetrics(),
    forceDataDetection: () => window.TikTokManager.autoDetectUserData(),
    forcePageView: (value = null) => window.TikTokManager.trackPageView(value), // Força disparo do PageView
    getCoverage: () => {
        const metrics = window.TikTokManager.getQualityMetrics();
        return {
            email: metrics.emqCoverage.email,
            phone: metrics.emqCoverage.phone,
            external_id: metrics.emqCoverage.external_id,
            average: metrics.emqCoverage.average
        };
    }
};

// Função de inicialização compatível
window.initTikTokEvents = function() {
    console.log('🎯 TikTok Events reestruturado e inicializado');
    console.log('📊 Sistema v3.0 com target EMQ 70+');
    
    // Auto-processar fila se TikTok já carregou
    if (typeof ttq !== 'undefined') {
        window.TikTokManager.processQueue();
    }
};

// Auto-inicializar com delay para permitir que outros scripts configurem primeiro
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.initTikTokEvents, 100); // Pequeno delay
    });
} else {
    setTimeout(window.initTikTokEvents, 100); // Pequeno delay
}

console.log('🚀 TikTok Events Manager v3.0 carregado');
console.log('🎯 Target: EMQ 70+ pontos');