/**
 * Purchase Event Tracker para página Create
 * Monitora eventos de Purchase do TikTok Pixel na página de criação
 * Detecta retornos de pagamento e dispara eventos Purchase quando necessário
 */

class PurchaseTracker {
    constructor() {
        this.isActive = false;
        this.checkInterval = null;
        this.lastCheckedUrl = '';
        this.purchaseProcessed = new Set(); // Evitar duplicatas
        
        this.init();
    }
    
    init() {
        console.log('🛒 PurchaseTracker: Inicializando monitoramento de Purchase events');
        
        // Aguardar TikTok Events estar disponível
        this.waitForTikTokEvents().then(() => {
            this.setupPurchaseMonitoring();
        });
        
        // Verificar URL parameters na inicialização
        this.checkUrlForPurchaseSuccess();
        
        // Monitorar mudanças na URL (caso a página seja SPA)
        this.setupUrlMonitoring();
        
        // Monitorar localStorage para dados de pagamento
        this.setupStorageMonitoring();
        
        // Event listener para mensagens do PaymentWindow
        this.setupPaymentWindowListener();
    }
    
    async waitForTikTokEvents() {
        return new Promise((resolve) => {
            if (typeof TikTokEvents !== 'undefined') {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (typeof TikTokEvents !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout após 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ PurchaseTracker: TikTokEvents não carregou em 10s');
                resolve();
            }, 10000);
        });
    }
    
    setupPurchaseMonitoring() {
        console.log('🎯 PurchaseTracker: Configurando monitoramento ativo');
        this.isActive = true;
        
        // Verificar a cada 2 segundos por mudanças
        this.checkInterval = setInterval(() => {
            this.checkForPurchaseIndicators();
        }, 2000);
    }
    
    checkUrlForPurchaseSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Verificar parâmetros de sucesso do Mercado Pago
        const status = urlParams.get('status') || urlParams.get('collection_status');
        const paymentId = urlParams.get('payment_id');
        const paymentType = urlParams.get('payment_type');
        
        if (status === 'approved' && paymentId) {
            console.log('✅ PurchaseTracker: Pagamento aprovado detectado na URL');
            this.processPurchaseSuccess({
                paymentId,
                paymentType,
                source: 'url_params'
            });
        }
    }
    
    setupUrlMonitoring() {
        // Monitorar mudanças na URL (popstate)
        window.addEventListener('popstate', () => {
            setTimeout(() => this.checkUrlForPurchaseSuccess(), 100);
        });
        
        // Verificar URL periodicamente
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== this.lastCheckedUrl) {
                this.lastCheckedUrl = currentUrl;
                this.checkUrlForPurchaseSuccess();
            }
        }, 3000);
    }
    
    setupStorageMonitoring() {
        // Monitorar localStorage para mudanças de dados de pagamento
        window.addEventListener('storage', (event) => {
            if (event.key === 'devotlyPaymentData' || event.key === 'devotlyPaymentStatus') {
                this.checkStorageForPurchaseSuccess();
            }
        });
        
        // Verificar localStorage periodicamente
        setInterval(() => {
            this.checkStorageForPurchaseSuccess();
        }, 5000);
    }
    
    setupPaymentWindowListener() {
        // Escutar mensagens do window de pagamento
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'payment_success') {
                console.log('✅ PurchaseTracker: Sucesso de pagamento recebido via message');
                this.processPurchaseSuccess({
                    ...event.data,
                    source: 'payment_window'
                });
            }
        });
    }
    
    checkStorageForPurchaseSuccess() {
        try {
            const paymentData = JSON.parse(localStorage.getItem('devotlyPaymentData') || '{}');
            const paymentStatus = localStorage.getItem('devotlyPaymentStatus');
            
            // Verificar se há dados de pagamento aprovado
            if (paymentStatus === 'approved' || paymentData.status === 'approved') {
                console.log('✅ PurchaseTracker: Pagamento aprovado encontrado no localStorage');
                this.processPurchaseSuccess({
                    ...paymentData,
                    source: 'localStorage'
                });
            }
        } catch (error) {
            console.warn('⚠️ PurchaseTracker: Erro ao verificar localStorage:', error);
        }
    }
    
    checkForPurchaseIndicators() {
        // Verificar múltiplos indicadores de Purchase
        this.checkUrlForPurchaseSuccess();
        this.checkStorageForPurchaseSuccess();
        this.checkDOMForSuccessIndicators();
    }
    
    checkDOMForSuccessIndicators() {
        // Verificar elementos DOM que indicam sucesso
        const successIndicators = [
            '.success-message',
            '.payment-success',
            '[data-payment-status="approved"]',
            '.checkout-success'
        ];
        
        for (const selector of successIndicators) {
            const element = document.querySelector(selector);
            if (element && element.style.display !== 'none') {
                console.log('✅ PurchaseTracker: Indicador de sucesso encontrado no DOM');
                this.processPurchaseSuccess({
                    source: 'dom_indicator',
                    element: selector
                });
                break;
            }
        }
    }
    
    async processPurchaseSuccess(paymentInfo) {
        try {
            // Gerar ID único para esta transação
            const transactionId = this.generateTransactionId(paymentInfo);
            
            // Evitar processamento duplicado
            if (this.purchaseProcessed.has(transactionId)) {
                console.log('⚠️ PurchaseTracker: Purchase já processado para esta transação');
                return;
            }
            
            this.purchaseProcessed.add(transactionId);
            
            console.log('🎯 PurchaseTracker: Processando Purchase event', paymentInfo);
            
            // Recuperar dados do pagamento e cartão
            const paymentData = this.getPaymentData(paymentInfo);
            const cardData = this.getCardData();
            const userData = this.getUserData();
            
            // Preparar dados do Purchase
            const purchaseData = this.preparePurchaseData(paymentData, cardData, userData);
            
            // Validar dados obrigatórios
            if (!this.validatePurchaseData(purchaseData)) {
                console.error('❌ PurchaseTracker: Dados de Purchase inválidos');
                return;
            }
            
            // Disparar Purchase event
            await this.firePurchaseEvent(purchaseData);
            
            console.log('✅ PurchaseTracker: Purchase event processado com sucesso');
            
        } catch (error) {
            console.error('❌ PurchaseTracker: Erro ao processar Purchase:', error);
        }
    }
    
    generateTransactionId(paymentInfo) {
        const key = paymentInfo.paymentId || 
                   paymentInfo.cardId || 
                   paymentInfo.timestamp || 
                   `${Date.now()}-${Math.random()}`;
        return `purchase_${btoa(String(key)).substr(0, 16)}`;
    }
    
    getPaymentData(paymentInfo) {
        try {
            const storedData = JSON.parse(localStorage.getItem('devotlyPaymentData') || '{}');
            return {
                ...storedData,
                ...paymentInfo,
                timestamp: paymentInfo.timestamp || storedData.timestamp || new Date().toISOString()
            };
        } catch {
            return paymentInfo;
        }
    }
    
    getCardData() {
        try {
            return JSON.parse(localStorage.getItem('devotlyCardData') || '{}');
        } catch {
            return {};
        }
    }
    
    getUserData() {
        try {
            const userData = JSON.parse(localStorage.getItem('devotlyUserData') || '{}');
            const email = userData.email || 
                         localStorage.getItem('devotly_user_email') || 
                         localStorage.getItem('user_email') ||
                         document.getElementById('userEmail')?.value;
            
            const phone = userData.phone || 
                         localStorage.getItem('user_phone') ||
                         document.getElementById('userPhone')?.value;
            
            return {
                ...userData,
                email: email || '',
                phone: phone || ''
            };
        } catch {
            return {};
        }
    }
    
    preparePurchaseData(paymentData, cardData, userData) {
        // Valores dos planos
        const planValues = { 
            'para_sempre': 17.99, 
            'anual': 8.99,
            'Para Sempre': 17.99,
            'Anual': 8.99
        };
        
        const planType = paymentData.planType || cardData.planName || 'para_sempre';
        const value = paymentData.value || 
                     cardData.price || 
                     planValues[planType] || 
                     17.99;
        
        const cardId = paymentData.cardId || 
                      cardData.id || 
                      paymentData.paymentId || 
                      `card_${Date.now()}`;
        
        return {
            contentId: cardId,
            contentName: `Plano Devotly ${planType}`,
            contentType: 'product',
            contentCategory: 'digital_service',
            value: parseFloat(value),
            currency: 'BRL',
            quantity: 1,
            planType: planType,
            userData: userData,
            paymentId: paymentData.paymentId,
            timestamp: paymentData.timestamp || new Date().toISOString()
        };
    }
    
    validatePurchaseData(data) {
        const required = ['contentId', 'contentName', 'value'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            console.error('❌ PurchaseTracker: Campos obrigatórios ausentes:', missing);
            return false;
        }
        
        if (data.value <= 0) {
            console.error('❌ PurchaseTracker: Valor deve ser > 0:', data.value);
            return false;
        }
        
        return true;
    }
    
    async firePurchaseEvent(data) {
        // Identificar usuário se possível com dados ultra-otimizados
        if (data.userData.email && typeof TikTokEvents !== 'undefined') {
            const userId = data.userData.email ? 
                         `purchase_${btoa(data.userData.email).substr(0, 12)}_${Date.now()}` : 
                         null;
            
            TikTokEvents.identifyUser(
                data.userData.email, 
                data.userData.phone, 
                userId
            );
            
            console.log('🔍 TikTok: Usuário identificado para Purchase ultra-otimizado');
        }
        
        // Disparar Purchase event através do TikTokEvents com método ultra-otimizado
        if (typeof TikTokEvents !== 'undefined' && TikTokEvents.trackPurchase) {
            console.log('🎯 PurchaseTracker: Disparando Purchase ULTRA-OTIMIZADO via TikTokEvents');
            
            // Usar método assíncrono se disponível
            if (typeof trackPurchase === 'function') {
                await trackPurchase(
                    data.contentId,
                    data.contentName,
                    data.value,
                    data.currency
                );
            } else {
                TikTokEvents.trackPurchase(
                    data.contentId,
                    data.contentName,
                    data.value,
                    data.currency
                );
            }
        }
        
        // Disparar também via ttq diretamente com dados ultra-otimizados
        if (typeof ttq !== 'undefined') {
            console.log('🎯 PurchaseTracker: Disparando Purchase ULTRA-OTIMIZADO via ttq direto');
            
            // Preparar dados ultra-otimizados
            const ultraOptimizedData = await this.prepareUltraOptimizedEventData(data);
            
            ttq.track('Purchase', ultraOptimizedData);
        }
        
        // Enviar para backend (Events API) com dados ultra-otimizados
        try {
            const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000'
                : 'https://devotly-full-production.up.railway.app';
            
            const response = await fetch(`${apiUrl}/api/tiktok-v3/track-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventName: 'Purchase',
                    eventData: {
                        content_id: data.contentId,
                        content_type: data.contentType,
                        content_name: data.contentName,
                        content_category: data.contentCategory,
                        brand: 'Devotly',
                        value: data.value,
                        currency: data.currency,
                        quantity: data.quantity,
                        order_id: `order_${data.contentId}_${Date.now()}`,
                        page_url: window.location.href,
                        referrer_url: document.referrer,
                        event_source: 'website'
                    },
                    userData: {
                        ...data.userData,
                        country: 'BR',
                        browser_language: navigator.language || 'pt-BR'
                    },
                    eventId: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Math.floor(Date.now() / 1000),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    referrer: document.referrer,
                    // Dados extras para EMQ
                    ttp: this.getCookie('_ttp') || '',
                    ttclid: this.extractTikTokParams().ttclid || ''
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ PurchaseTracker: Purchase ULTRA-OTIMIZADO enviado para backend API', result);
            } else {
                console.warn('⚠️ PurchaseTracker: Erro ao enviar para backend:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ PurchaseTracker: Erro na requisição para backend:', error);
        }
        
        // Log de resumo ultra-detalhado
        console.log('📊 PurchaseTracker: Resumo do Purchase Event ULTRA-OTIMIZADO', {
            contentId: data.contentId,
            contentName: data.contentName,
            value: data.value,
            currency: data.currency,
            planType: data.planType,
            hasEmail: !!data.userData.email,
            hasPhone: !!data.userData.phone,
            timestamp: data.timestamp,
            optimizations: {
                ultra_optimized_data: '✓ Ativado',
                advanced_matching: '✓ Ativado', 
                emq_enhancement: '✓ Ativado',
                backend_api_v3: '✓ Ativado',
                device_fingerprint: '✓ Ativado'
            }
        });
    }
    
    /**
     * Preparar dados ultra-otimizados para o evento
     */
    async prepareUltraOptimizedEventData(data) {
        // Obter dados de usuário ultra-otimizados se disponível
        let ultraUserData = {};
        if (typeof getUltraOptimizedUserData === 'function') {
            ultraUserData = await getUltraOptimizedUserData();
        }
        
        return {
            event_id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event_time: Math.floor(Date.now() / 1000),
            contents: [{
                content_id: String(data.contentId),
                content_type: data.contentType,
                content_name: String(data.contentName),
                content_category: data.contentCategory,
                brand: 'Devotly',
                quantity: data.quantity,
                price: data.value
            }],
            value: data.value,
            currency: data.currency,
            order_id: `order_${data.contentId}_${Date.now()}`,
            
            // Dados de usuário ultra-otimizados
            ...ultraUserData,
            
            // Dados de contexto extra
            page_url: window.location.href,
            referrer_url: document.referrer || '',
            browser_language: navigator.language || 'pt-BR',
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            
            // Parâmetros TikTok
            ttp: this.getCookie('_ttp') || '',
            ttclid: this.extractTikTokParams().ttclid || ''
        };
    }
    
    /**
     * Utilitários para obter dados do TikTok
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }
    
    extractTikTokParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            ttclid: urlParams.get('ttclid') || ''
        };
    }
    
    destroy() {
        console.log('🛒 PurchaseTracker: Destruindo instância');
        this.isActive = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        this.purchaseProcessed.clear();
    }
}

// Inicializar PurchaseTracker automaticamente na página create
if (window.location.pathname.includes('/create')) {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.purchaseTracker = new PurchaseTracker();
        });
    } else {
        window.purchaseTracker = new PurchaseTracker();
    }
    
    // Cleanup quando sair da página
    window.addEventListener('beforeunload', () => {
        if (window.purchaseTracker && window.purchaseTracker.destroy) {
            window.purchaseTracker.destroy();
        }
    });
}

// Export para uso global
window.PurchaseTracker = PurchaseTracker;
