/**
 * TikTok Pixel Events - Devotly OTIMIZADO
 * Implementa eventos de rastreamento com Advanced Matching e deduplicação
 * Versão: 2.0.0 - ALTA QUALIDADE E CORRESPONDÊNCIA
 */

// Configuração da API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://devotly-full-production.up.railway.app';

// Fila local para eventos não enviados
const TIKTOK_EVENT_QUEUE_KEY = 'devotly_tiktok_event_queue';
let eventQueueProcessing = false;

// Cache para dados do usuário
let userDataCache = {
    email: null,
    phone: null,
    userId: null,
    hashedData: {}
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

// Função para hash SHA-256 + Base64 (Advanced Matching)
async function sha256Base64(str) {
    if (!str) return null;
    
    try {
        const buffer = new TextEncoder().encode(str.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Converter para Base64
        return btoa(hashHex.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join(''));
    } catch (error) {
        console.error('Erro ao gerar hash SHA-256 + Base64:', error);
        return null;
    }
}

// Gera ID único para eventos (para deduplicação)
function generateEventId() {
    return `devotly_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Obtém dados de Advanced Matching
function getAdvancedMatchingData() {
    return {
        ...userDataCache.hashedData,
        user_agent: navigator.userAgent,
        url: window.location.href
    };
}

// Enfileira evento para tentativa posterior
function enqueueEvent(eventType, eventData, eventOptions = {}) {
    try {
        const queue = JSON.parse(localStorage.getItem(TIKTOK_EVENT_QUEUE_KEY) || '[]');
        queue.push({
            eventType,
            eventData,
            eventOptions,
            timestamp: Date.now(),
            attempts: 0
        });
        localStorage.setItem(TIKTOK_EVENT_QUEUE_KEY, JSON.stringify(queue));
        console.log(`TikTok: Evento ${eventType} enfileirado para tentativa posterior`);
    } catch (error) {
        console.error('Erro ao enfileirar evento TikTok:', error);
    }
}

// Processa a fila de eventos pendentes
async function processEventQueue() {
    if (eventQueueProcessing || typeof ttq === 'undefined') return;
    
    try {
        eventQueueProcessing = true;
        const queue = JSON.parse(localStorage.getItem(TIKTOK_EVENT_QUEUE_KEY) || '[]');
        
        if (queue.length === 0) {
            eventQueueProcessing = false;
            return;
        }
        
        console.log(`TikTok: Processando fila com ${queue.length} eventos pendentes`);
        
        const eventsToProcess = queue.slice(0, 10);
        const remainingEvents = queue.slice(10);
        const failedEvents = [];
        
        for (const event of eventsToProcess) {
            try {
                event.attempts++;
                
                if (event.attempts > 5 || (Date.now() - event.timestamp > 24 * 60 * 60 * 1000)) {
                    console.log(`TikTok: Descartando evento antigo: ${event.eventType}`);
                    continue;
                }
                
                ttq.track(event.eventType, event.eventData, event.eventOptions);
                console.log(`TikTok: Evento ${event.eventType} processado da fila`);
            } catch (error) {
                console.error(`TikTok: Erro ao processar evento ${event.eventType}:`, error);
                failedEvents.push(event);
            }
        }
        
        const newQueue = [...remainingEvents, ...failedEvents];
        localStorage.setItem(TIKTOK_EVENT_QUEUE_KEY, JSON.stringify(newQueue));
        
        console.log(`TikTok: Fila processada. Restam ${newQueue.length} eventos pendentes`);
    } catch (error) {
        console.error('TikTok: Erro ao processar fila de eventos:', error);
    } finally {
        eventQueueProcessing = false;
    }
}

// ============================================================================
// INICIALIZAÇÃO DO SISTEMA DE EVENTOS
// ============================================================================

// Função para inicializar o sistema de eventos (para compatibilidade)
function initTikTokEvents() {
    try {
        // Verificar se ttq está disponível
        if (typeof ttq === 'undefined') {
            console.warn('TikTok Pixel (ttq) não está disponível. Eventos serão enfileirados para tentativa posterior.');
        } else {
            console.log('TikTok Pixel inicializado com sucesso');
            
            // Iniciar processamento da fila
            processEventQueue();
            
            // Rastrear PageView automaticamente se ainda não foi feito
            if (!window.tiktokPageViewTracked) {
                trackPageView();
                window.tiktokPageViewTracked = true;
            }
        }
        
        // Adicionar listeners para eventos de visibilidade da página
        if (!window.tiktokVisibilityListenerAdded) {
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible' && typeof ttq !== 'undefined') {
                    processEventQueue();
                }
            });
            window.tiktokVisibilityListenerAdded = true;
        }

        // Tenta processar a fila a cada minuto
        if (!window.tiktokQueueIntervalSet) {
            setInterval(processEventQueue, 60000);
            window.tiktokQueueIntervalSet = true;
        }
        
        // Processa a fila no carregamento inicial da página
        setTimeout(processEventQueue, 3000);
        
        console.log('TikTok Events otimizado inicializado com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao inicializar TikTok Events:', error);
        return false;
    }
}

// ============================================================================
// IDENTIFICAÇÃO DO USUÁRIO COM ADVANCED MATCHING
// ============================================================================

async function identifyUser(email, phone, userId) {
    try {
        const hashedData = {};
        
        if (email) {
            const hashedEmail = await sha256Base64(email);
            if (hashedEmail) {
                hashedData.email = hashedEmail;
                userDataCache.email = email;
                userDataCache.hashedData.email = hashedEmail;
            }
        }
        
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const hashedPhone = await sha256Base64(cleanPhone);
            if (hashedPhone) {
                hashedData.phone_number = hashedPhone;
                userDataCache.phone = cleanPhone;
                userDataCache.hashedData.phone_number = hashedPhone;
            }
        }
        
        if (userId) {
            const hashedUserId = await sha256Base64(userId);
            if (hashedUserId) {
                hashedData.external_id = hashedUserId;
                userDataCache.userId = userId;
                userDataCache.hashedData.external_id = hashedUserId;
            }
        }
        
        if (Object.keys(hashedData).length > 0) {
            if (typeof ttq !== 'undefined') {
                ttq.identify(hashedData);
                console.log('TikTok: Usuário identificado com Advanced Matching', Object.keys(hashedData).join(', '));
                return true;
            } else {
                enqueueEvent('identify', hashedData);
                return false;
            }
        }
        return false;
    } catch (error) {
        console.error('Erro ao identificar usuário para TikTok Pixel:', error);
        return false;
    }
}

// ============================================================================
// EVENTOS API SERVER-SIDE (DEDUPLICAÇÃO)
// ============================================================================

async function sendEventToServer(eventName, eventData, userData = {}, eventId = null) {
    try {
        const payload = {
            eventName,
            eventData,
            userData,
            eventId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer
        };

        const response = await fetch(`${API_BASE_URL}/api/tiktok/track-event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`TikTok Server: Evento ${eventName} enviado para Events API`);
        }
    } catch (error) {
        console.error('Erro ao enviar evento para servidor:', error);
    }
}

// ============================================================================
// EVENTOS OTIMIZADOS COM ADVANCED MATCHING
// ============================================================================

/**
 * 1. PAGE VIEW - Visualização de Página
 */
function trackPageView() {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('PageView', eventData);
            console.log('TikTok: PageView rastreado', window.location.pathname);
        } else {
            enqueueEvent('PageView', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('PageView', {
            url: window.location.href,
            title: document.title,
            path: window.location.pathname
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear PageView:', error);
        return false;
    }
}

/**
 * 2. VIEW CONTENT - Visualização de Conteúdo
 */
function trackViewContent(contentId, contentName, value = null, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            contents: [{
                content_id: contentId || 'unknown',
                content_type: 'product',
                content_name: contentName || 'Conteúdo Devotly'
            }],
            value: value || 0,
            currency: currency,
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('ViewContent', eventData);
            console.log('TikTok: ViewContent rastreado', {contentId, contentName, value});
        } else {
            enqueueEvent('ViewContent', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('ViewContent', {
            content_id: contentId,
            content_type: 'product',
            content_name: contentName,
            content_category: 'digital_product',
            value: value || 0,
            currency: currency
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear ViewContent:', error);
        enqueueEvent('ViewContent', eventData);
        return false;
    }
}

/**
 * 3. CLICK BUTTON - Clique em Botão
 */
function trackClickButton(buttonText, buttonType = 'cta', value = null, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            button_text: buttonText,
            button_type: buttonType,
            value: value || 0,
            currency: currency,
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('ClickButton', eventData);
            console.log('TikTok: ClickButton rastreado', {buttonText, buttonType});
        } else {
            enqueueEvent('ClickButton', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('ClickButton', {
            button_text: buttonText,
            button_type: buttonType,
            value: value || 0,
            currency: currency
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear ClickButton:', error);
        return false;
    }
}

/**
 * 4. LEAD - Geração de Lead
 */
function trackLead(leadType, value = 10, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            lead_type: leadType,
            value: value, // OBRIGATÓRIO para otimização
            currency: currency, // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('Lead', eventData);
            console.log('TikTok: Lead rastreado', {leadType, value});
        } else {
            enqueueEvent('Lead', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('Lead', {
            lead_type: leadType,
            value: value,
            currency: currency,
            content_category: 'lead_generation'
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear Lead:', error);
        return false;
    }
}

/**
 * 5. CONTACT - Contato/Formulário
 */
function trackContact(contactType, value = 5, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            contact_type: contactType,
            value: value, // OBRIGATÓRIO para otimização
            currency: currency, // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('Contact', eventData);
            console.log('TikTok: Contact rastreado', {contactType, value});
        } else {
            enqueueEvent('Contact', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('Contact', {
            contact_type: contactType,
            value: value,
            currency: currency,
            content_category: 'contact_form'
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear Contact:', error);
        return false;
    }
}

/**
 * 6. INITIATE CHECKOUT - Início de Checkout
 */
function trackInitiateCheckout(contentId, contentName, value, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            contents: [{
                content_id: contentId || 'unknown',
                content_type: 'product',
                content_name: contentName || 'Produto Devotly'
            }],
            value: value, // OBRIGATÓRIO
            currency: currency, // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('InitiateCheckout', eventData);
            console.log('TikTok: InitiateCheckout rastreado', {contentId, contentName, value});
        } else {
            enqueueEvent('InitiateCheckout', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('InitiateCheckout', {
            content_id: contentId,
            content_type: 'product',
            content_name: contentName,
            content_category: 'digital_product',
            value: value,
            currency: currency
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear InitiateCheckout:', error);
        return false;
    }
}

/**
 * 7. PURCHASE - Compra Finalizada
 */
function trackPurchase(contentId, contentName, value, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        const eventData = {
            event_id: eventId,
            contents: [{
                content_id: contentId || 'unknown',
                content_type: 'product',
                content_name: contentName || 'Produto Devotly'
            }],
            value: value, // OBRIGATÓRIO
            currency: currency, // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('Purchase', eventData);
            console.log('TikTok: Purchase rastreado', {contentId, contentName, value});
        } else {
            enqueueEvent('Purchase', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('Purchase', {
            content_id: contentId,
            content_type: 'product',
            content_name: contentName,
            content_category: 'digital_product',
            value: value,
            currency: currency
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear Purchase:', error);
        return false;
    }
}

// ============================================================================
// INICIALIZAÇÃO E AUTO-TRACKING
// ============================================================================

function initTikTokEvents() {
    try {
        if (typeof ttq === 'undefined') {
            console.warn('TikTok Pixel (ttq) não está disponível. Eventos serão enfileirados.');
        } else {
            console.log('TikTok Pixel inicializado com sucesso');
            processEventQueue();
            trackPageView(); // Auto-track PageView
        }
        
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible' && typeof ttq !== 'undefined') {
                processEventQueue();
            }
        });

        setInterval(processEventQueue, 60000);
        setTimeout(processEventQueue, 3000);
    } catch (error) {
        console.error('Erro ao inicializar TikTok Events:', error);
    }
}

// ============================================================================
// TRACKING AUTOMÁTICO DE EVENTOS
// ============================================================================

// Auto-track de cliques em botões
document.addEventListener('click', function(e) {
    const button = e.target.closest('button, .btn, [role="button"], input[type="submit"]');
    if (button) {
        const buttonText = button.textContent.trim() || button.value || button.getAttribute('aria-label') || 'Botão';
        const buttonType = button.className.includes('cta') ? 'cta' : 
                          button.className.includes('primary') ? 'primary' : 'secondary';
        
        trackClickButton(buttonText, buttonType);
    }
});

// Auto-track de formulários
document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName === 'FORM') {
        const formType = form.id || form.className || 'contact_form';
        trackContact(formType, 5);
        
        // Se for um formulário com email, identificar usuário
        const emailField = form.querySelector('input[type="email"], input[name*="email"]');
        const phoneField = form.querySelector('input[type="tel"], input[name*="phone"], input[name*="telefone"]');
        
        if (emailField && emailField.value) {
            identifyUser(emailField.value, phoneField?.value);
        }
    }
});

// ============================================================================
// FUNÇÕES ESPECÍFICAS PARA DEVOTLY
// ============================================================================

const TikTokEvents = {
    // Página inicial
    viewHomePage() {
        trackViewContent('home', 'Página Inicial Devotly');
    },
    
    // Página de criação
    viewCreatePage() {
        trackViewContent('create', 'Criar Cartão Devocional');
        trackLead('create_page_view', 15);
    },
    
    // Visualização de cartão
    viewCard(cardId) {
        trackViewContent(cardId || 'card', 'Visualizar Cartão Devocional', 10);
    },
    
    // Plano selecionado
    selectPlan(planType, planValue) {
        trackClickButton(`Plano ${planType}`, 'plan_selection', planValue);
        trackLead('plan_selection', planValue);
    },
    
    // Checkout iniciado
    startCheckout(cardId, planType, planValue) {
        trackInitiateCheckout(cardId, `Plano ${planType}`, planValue);
    },
    
    // Compra finalizada
    completePurchase(cardId, planType, planValue) {
        trackPurchase(cardId, `Plano ${planType}`, planValue);
    },
    
    // Eventos específicos para página Create
    create: {
        startCreation() {
            trackLead('start_creation', 15);
            trackClickButton('Iniciar Criação', 'creation_start', 15);
        },
        
        fillStep(stepNumber, stepName) {
            trackViewContent(`step-${stepNumber}`, `Etapa ${stepNumber}: ${stepName}`, 5);
        },
        
        uploadImage() {
            trackClickButton('Upload Imagem', 'upload', 5);
        },
        
        selectVerse() {
            trackClickButton('Selecionar Versículo', 'verse_selection', 5);
        },
        
        addMusic() {
            trackClickButton('Adicionar Música', 'music', 5);
        },
        
        previewCard() {
            trackClickButton('Visualizar Cartão', 'preview', 5);
        },
        
        editCard() {
            trackClickButton('Editar Cartão', 'edit', 5);
        },
        
        completeCreation(cardId) {
            trackLead('complete_creation', 25);
            if (cardId) {
                trackViewContent(cardId, 'Cartão Criado', 25);
            }
        },
        
        navigateSteps(from, to) {
            trackClickButton(`Etapa ${from} para ${to}`, 'navigation', 2);
        }
    },
    
    // Outros eventos úteis
    startCardCreation() {
        trackLead('card_creation_start', 20);
    },
    
    identifyUser(email, phone, userId) {
        return identifyUser(email, phone, userId);
    },
    
    addPaymentInfo(planType, planValue) {
        trackLead('payment_info', planValue);
    },
    
    trackEngagement(type, description, value = 1) {
        trackClickButton(description, type, value);
    }
};

// Exportar para uso global
window.TikTokEvents = TikTokEvents;
window.identifyUser = identifyUser;
window.initTikTokEvents = initTikTokEvents;

// Auto-inicializar apenas se não foi inicializado manualmente
document.addEventListener('DOMContentLoaded', function() {
    if (!window.tiktokEventsInitialized) {
        initTikTokEvents();
        window.tiktokEventsInitialized = true;
    }
});

// Fallback se já carregou
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.tiktokEventsInitialized) {
        setTimeout(() => {
            if (!window.tiktokEventsInitialized) {
                initTikTokEvents();
                window.tiktokEventsInitialized = true;
            }
        }, 100);
    }
}
