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
     * Gera userId único baseado em características do dispositivo
     */
    generateUserId() {
        const components = [
            navigator.userAgent.slice(0, 50),
            screen.width + 'x' + screen.height,
            navigator.language,
            new Date().getTimezoneOffset(),
            Math.random().toString(36).substr(2, 9)
        ];
        
        const combined = components.join('|');
        const hash = btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
        return `devotly_${Date.now()}_${hash}`;
    }
    
    /**
     * Busca dados em formulários da página
     */
    autoDetectUserData() {
        try {
            // Buscar emails
            const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
            for (const input of emailInputs) {
                if (input.value && input.value.includes('@')) {
                    return { email: input.value.trim() };
                }
            }
            
            // Buscar telefones
            const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[name*="telefone"]');
            for (const input of phoneInputs) {
                if (input.value && input.value.replace(/\D/g, '').length >= 8) {
                    return { phone: input.value.trim() };
                }
            }
        } catch (error) {
            console.warn('Erro na detecção automática:', error);
        }
        
        return {};
    }
    
    /**
     * Prepara dados de Advanced Matching com máxima qualidade
     */
    async prepareAdvancedMatching() {
        const baseData = {
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer || '',
            ip: '', // Será capturado pelo servidor
        };
        
        // Email hasheado
        if (this.userCache.hashedData.email) {
            baseData.email = this.userCache.hashedData.email;
        } else if (this.userCache.email) {
            baseData.email = await this.hashData(this.userCache.email);
            this.userCache.hashedData.email = baseData.email;
        } else {
            baseData.email = '';
        }
        
        // Telefone hasheado
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
            baseData.phone_number = '';
        }
        
        // External ID hasheado
        if (this.userCache.hashedData.external_id) {
            baseData.external_id = this.userCache.hashedData.external_id;
        } else {
            const userId = this.userCache.userId || this.generateUserId();
            baseData.external_id = await this.hashData(userId);
            this.userCache.hashedData.external_id = baseData.external_id;
        }
        
        // Parâmetros do TikTok
        if (this.userCache.ttclid) {
            baseData.ttclid = this.userCache.ttclid;
        }
        if (this.userCache.ttp) {
            baseData.ttp = this.userCache.ttp;
        }
        
        // Parâmetros do Facebook para cross-platform
        if (this.userCache.fbp) {
            baseData.fbp = this.userCache.fbp;
        }
        if (this.userCache.fbc) {
            baseData.fbc = this.userCache.fbc;
        }
        
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
     * Configura listeners de eventos
     */
    setupEventListeners() {
        // Auto-detect quando TikTok carregar
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof ttq !== 'undefined') {
                this.processQueue();
            }
        });
        
        // Processar quando página ficar visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.processQueue();
            }
        });
        
        // Auto-track PageView
        if (document.readyState === 'complete') {
            setTimeout(() => this.trackPageView(), 100);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.trackPageView(), 100);
            });
        }
    }
    
    // ============================================================================
    // MÉTODOS DE EVENTOS ESPECÍFICOS
    // ============================================================================
    
    /**
     * PageView - Visualização de página
     */
    async trackPageView() {
        // Auto-detectar dados se não temos
        if (!this.userCache.validated) {
            const autoData = this.autoDetectUserData();
            if (autoData.email || autoData.phone) {
                await this.identifyUser(autoData.email, autoData.phone);
            }
        }
        
        return this.sendEvent('PageView', {
            content_name: document.title,
            content_category: 'page_view'
        });
    }
    
    /**
     * ViewContent - Visualização de conteúdo
     */
    async trackViewContent(contentId, contentName, value = null, currency = 'BRL') {
        return this.sendEvent('ViewContent', {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Conteúdo'),
            content_type: 'product',
            value: this.validateValue(value),
            currency: String(currency),
            contents: [{
                content_id: String(contentId || 'unknown'),
                content_name: String(contentName || 'Conteúdo'),
                content_type: 'product',
                quantity: 1,
                price: this.validateValue(value)
            }]
        });
    }
    
    /**
     * Purchase - Compra finalizada
     */
    async trackPurchase(contentId, contentName, value, currency = 'BRL') {
        // Purchase DEVE ter valor > 0
        const validValue = this.validateValue(value);
        if (validValue <= 0) {
            console.error('❌ Purchase requer value > 0');
            return { success: false, error: 'Value must be > 0' };
        }
        
        return this.sendEvent('Purchase', {
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
        });
    }
    
    /**
     * InitiateCheckout - Início de checkout
     */
    async trackInitiateCheckout(contentId, contentName, value, currency = 'BRL') {
        return this.sendEvent('InitiateCheckout', {
            content_id: String(contentId || 'unknown'),
            content_name: String(contentName || 'Produto'),
            content_type: 'product',
            value: this.validateValue(value),
            currency: String(currency),
            contents: [{
                content_id: String(contentId || 'unknown'),
                content_name: String(contentName || 'Produto'),
                content_type: 'product',
                quantity: 1,
                price: this.validateValue(value)
            }]
        });
    }
    
    /**
     * ClickButton - Clique em botão
     */
    async trackClickButton(buttonText, buttonType = 'cta', value = null) {
        return this.sendEvent('ClickButton', {
            button_text: String(buttonText || 'Botão'),
            button_type: String(buttonType),
            value: value !== null ? this.validateValue(value) : undefined
        });
    }
    
    /**
     * Contact - Formulário de contato
     */
    async trackContact(contactType = 'form', value = 5) {
        return this.sendEvent('Contact', {
            contact_type: String(contactType),
            value: this.validateValue(value),
            currency: 'BRL'
        });
    }
    
    /**
     * Lead - Geração de lead
     */
    async trackLead(leadType = 'lead', value = 10) {
        return this.sendEvent('Lead', {
            lead_type: String(leadType),
            value: this.validateValue(value),
            currency: 'BRL'
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
     * Obtém métricas de qualidade
     */
    getQualityMetrics() {
        return {
            ...this.qualityMetrics,
            userDataQuality: {
                email: !!this.userCache.email,
                phone: !!this.userCache.phone,
                userId: !!this.userCache.userId,
                ttclid: !!this.userCache.ttclid
            },
            emqCoverage: {
                email: this.userCache.hashedData.email ? 100 : 0,
                phone: this.userCache.hashedData.phone_number ? 100 : 0,
                external_id: this.userCache.hashedData.external_id ? 100 : 0
            }
        };
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
    trackPageView: () => window.TikTokManager.trackPageView(),
    trackViewContent: (id, name, value, currency) => window.TikTokManager.trackViewContent(id, name, value, currency),
    trackPurchase: (id, name, value, currency) => window.TikTokManager.trackPurchase(id, name, value, currency),
    trackInitiateCheckout: (id, name, value, currency) => window.TikTokManager.trackInitiateCheckout(id, name, value, currency),
    trackClickButton: (text, type, value) => window.TikTokManager.trackClickButton(text, type, value),
    trackContact: (type, value) => window.TikTokManager.trackContact(type, value),
    trackLead: (type, value) => window.TikTokManager.trackLead(type, value),
    
    // Métodos específicos do Devotly
    viewHomePage: () => window.TikTokManager.trackViewContent('home', 'Página Inicial', 0, 'BRL'),
    viewCreatePage: () => window.TikTokManager.trackViewContent('create', 'Página de Criação', 15, 'BRL'),
    viewCard: (cardId) => window.TikTokManager.trackViewContent(cardId, 'Visualizar Cartão', 10, 'BRL'),
    selectPlan: (planType, value) => window.TikTokManager.trackClickButton(`Plano ${planType}`, 'plan_selection', value),
    startCheckout: (cardId, planType, value) => window.TikTokManager.trackInitiateCheckout(cardId, `Plano ${planType}`, value),
    completePurchase: (cardId, planType, value) => window.TikTokManager.trackPurchase(cardId, `Plano ${planType}`, value),
    
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
    
    // Utilitários
    getMetrics: () => window.TikTokManager.getQualityMetrics()
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

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initTikTokEvents);
} else {
    window.initTikTokEvents();
}

console.log('🚀 TikTok Events Manager v3.0 carregado');
console.log('🎯 Target: EMQ 70+ pontos');
