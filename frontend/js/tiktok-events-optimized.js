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
    hashedData: {},
    ttclid: null,
    ttp: null
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

// Função para hash SHA-256 + Base64 (Advanced Matching)
async function sha256Base64(str) {
    if (!str || str === null || str === undefined || str.trim() === '') {
        return "";
    }
    
    try {
        // Normalizar dados: trim e lowercase para email, apenas trim para outros
        const normalizedStr = typeof str === 'string' ? 
            (str.includes('@') ? str.trim().toLowerCase() : str.trim()) : 
            String(str).trim();
            
        if (normalizedStr === '') return "";
        
        const buffer = new TextEncoder().encode(normalizedStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Converter para Base64
        return btoa(hashHex.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join(''));
    } catch (error) {
        console.error('Erro ao gerar hash SHA-256 + Base64:', error);
        return "";
    }
}

// Gera ID único para eventos (para deduplicação)
function generateEventId() {
    return `devotly_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Função para validar content_type
function validateContentType(contentType) {
    const validTypes = ['product', 'product_group', 'destination', 'hotel', 'flight', 'vehicle'];
    if (!contentType || !validTypes.includes(contentType)) {
        console.warn('TikTok: content_type inválido, usando "product" como padrão:', contentType);
        return 'product';
    }
    return contentType;
}

// Gera content_id baseado no contexto da página
function generateContentId(fallbackId = null) {
    // Tentar extrair ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get('id');
    if (cardId) {
        return `card_${cardId}`;
    }
    
    // Baseado na página atual
    const path = window.location.pathname;
    if (path.includes('/view')) {
        return 'card_view_page';
    } else if (path.includes('/create')) {
        return 'create_tool_page';
    } else if (path.includes('/home') || path === '/' || path === '/index.html') {
        return 'home_page';
    } else if (path.includes('/checkout')) {
        return 'checkout_page';
    } else if (path.includes('/success')) {
        return 'success_page';
    } else if (path.includes('/failure')) {
        return 'failure_page';
    } else if (path.includes('/pending')) {
        return 'pending_page';
    }
    
    // Se foi fornecido um fallback, usar ele
    if (fallbackId) {
        return String(fallbackId);
    }
    
    // Fallback final baseado no título da página
    const title = document.title.toLowerCase();
    if (title.includes('devotly')) {
        return 'devotly_content';
    }
    
    return 'general_content';
}

// Gera content_name baseado no contexto
function generateContentName(fallbackName = null) {
    const path = window.location.pathname;
    
    if (path.includes('/view')) {
        return 'Visualização de Cartão Devotly';
    } else if (path.includes('/create')) {
        return 'Ferramenta de Criação Devotly';
    } else if (path.includes('/home') || path === '/' || path === '/index.html') {
        return 'Página Inicial Devotly';
    } else if (path.includes('/checkout')) {
        return 'Checkout Devotly';
    } else if (path.includes('/success')) {
        return 'Página de Sucesso Devotly';
    }
    
    if (fallbackName) {
        return String(fallbackName);
    }
    
    return document.title || 'Conteúdo Devotly';
}

// Função para normalizar telefone para formato E.164
function normalizePhoneNumber(phone) {
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

// Função para extrair parâmetros do TikTok da URL
function extractTikTokParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    // TikTok Click ID (mais importante para EMQ)
    const ttclid = urlParams.get('ttclid') || 
                  localStorage.getItem('ttclid') || 
                  getCookie('ttclid');
    if (ttclid) {
        params.ttclid = ttclid;
        userDataCache.ttclid = ttclid;
        // Armazenar para uso futuro
        localStorage.setItem('ttclid', ttclid);
        setCookie('ttclid', ttclid, 30); // 30 dias
    }
    
    // TikTok Tracking Parameter
    const ttp = urlParams.get('ttp') || 
               localStorage.getItem('ttp') || 
               getCookie('ttp');
    if (ttp) {
        params.ttp = ttp;
        userDataCache.ttp = ttp;
        localStorage.setItem('ttp', ttp);
        setCookie('ttp', ttp, 30);
    }
    
    return params;
}

// Funções auxiliares para cookies
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Função para gerar external_id baseado em dados disponíveis
function generateExternalId() {
    // Tentar pegar de localStorage primeiro
    let externalId = localStorage.getItem('devotly_external_id');
    
    if (!externalId) {
        // Gerar um ID único baseado em dados do usuário
        const components = [
            userDataCache.email || '',
            userDataCache.phone || '',
            navigator.userAgent,
            window.screen.width + 'x' + window.screen.height,
            navigator.language || navigator.userLanguage || '',
            new Date().getTimezoneOffset().toString()
        ].filter(Boolean);
        
        // Criar um hash simples dos componentes
        const simpleHash = components.join('|');
        externalId = `devotly_${btoa(simpleHash).replace(/[+/=]/g, '').substring(0, 16)}_${Date.now()}`;
        
        localStorage.setItem('devotly_external_id', externalId);
    }
    
    return externalId;
}

// Obtém dados de Advanced Matching com cobertura máxima para EMQ otimizado (ASYNC para PageView)
async function getAdvancedMatchingDataAsync() {
    const baseData = {
        user_agent: navigator.userAgent,
        url: window.location.href
    };
    
    // EMAIL - Sempre presente para máxima cobertura EMQ (meta: >90%)
    // Sempre validar formato rigorosamente para evitar avisos do TikTok Pixel
    if (userDataCache.hashedData.email) {
        baseData.email = userDataCache.hashedData.email;
    } else if (userDataCache.email && validateEmailFormat(userDataCache.email)) {
        // Email já foi validado anteriormente, podemos usar diretamente
        const hashedEmail = await sha256Base64(userDataCache.email);
        userDataCache.hashedData.email = hashedEmail;
        baseData.email = hashedEmail;
    } else {
        // Tentar encontrar email em formulários da página
        const emailFromForm = findEmailInPage();
        if (emailFromForm && validateEmailFormat(emailFromForm)) {
            userDataCache.email = emailFromForm;
            const hashedEmail = await sha256Base64(emailFromForm);
            userDataCache.hashedData.email = hashedEmail;
            baseData.email = hashedEmail;
        } else {
            // Não enviar campo email se não for válido para evitar avisos do TikTok
            baseData.email = ""; // Campo vazio mas presente para compatibilidade
            console.log('TikTok: Email não disponível ou com formato inválido');
        }
    }
    
    // PHONE_NUMBER - Sempre presente para máxima cobertura EMQ (meta: >90%)
    if (userDataCache.hashedData.phone_number) {
        baseData.phone_number = userDataCache.hashedData.phone_number;
    } else if (userDataCache.phone && userDataCache.phone.trim() !== '') {
        // Normalizar para E.164 e hashear
        const normalizedPhone = normalizePhoneNumber(userDataCache.phone);
        if (normalizedPhone) {
            const hashedPhone = await sha256Base64(normalizedPhone);
            userDataCache.hashedData.phone_number = hashedPhone;
            baseData.phone_number = hashedPhone;
        } else {
            baseData.phone_number = "";
        }
    } else {
        // Tentar encontrar telefone em formulários da página
        const phoneFromForm = findPhoneInPage();
        if (phoneFromForm) {
            userDataCache.phone = phoneFromForm;
            const normalizedPhone = normalizePhoneNumber(phoneFromForm);
            if (normalizedPhone) {
                const hashedPhone = await sha256Base64(normalizedPhone);
                userDataCache.hashedData.phone_number = hashedPhone;
                baseData.phone_number = hashedPhone;
            } else {
                baseData.phone_number = "";
            }
        } else {
            baseData.phone_number = ""; // Sempre enviar campo phone_number para cobertura
        }
    }
    
    // EXTERNAL_ID - Sempre presente (identificador único do usuário)
    if (userDataCache.hashedData.external_id) {
        baseData.external_id = userDataCache.hashedData.external_id;
    } else {
        const externalId = generateExternalId();
        const hashedExternalId = await sha256Base64(externalId);
        userDataCache.hashedData.external_id = hashedExternalId;
        baseData.external_id = hashedExternalId;
    }
    
    // IP ADDRESS - Capturado automaticamente pelo TikTok, mas podemos incluir
    // O TikTok captura automaticamente, mas vamos garantir que está presente
    if (!baseData.ip) {
        // O IP será capturado automaticamente pelo TikTok Pixel
        baseData.ip = ""; // Campo presente para cobertura
    }
    
    // TTCLID - Parâmetro crítico para EMQ
    const tikTokParams = extractTikTokParams();
    if (tikTokParams.ttclid) {
        baseData.ttclid = tikTokParams.ttclid;
    }
    
    // TTP - Parâmetro adicional do TikTok
    if (tikTokParams.ttp) {
        baseData.ttp = tikTokParams.ttp;
    }
    
    return baseData;
}

// Obtém dados de Advanced Matching (versão síncrona para compatibilidade)
async function getAdvancedMatchingData() {
    const baseData = {
        user_agent: navigator.userAgent,
        url: window.location.href
    };
    
    // Adicionar dados hasheados se disponíveis (versão simplificada para outros eventos)
    if (userDataCache.hashedData.email) {
        baseData.email = userDataCache.hashedData.email;
    } else {
        baseData.email = "";
    }
    
    if (userDataCache.hashedData.phone_number) {
        baseData.phone_number = userDataCache.hashedData.phone_number;
    } else {
        baseData.phone_number = "";
    }
    
    // External ID sempre presente
    if (userDataCache.hashedData.external_id) {
        baseData.external_id = userDataCache.hashedData.external_id;
    } else {
        const externalId = generateExternalId();
        const hashedExternalId = await sha256Base64(externalId);
        userDataCache.hashedData.external_id = hashedExternalId;
        baseData.external_id = hashedExternalId;
    }
    
    // Adicionar parâmetros do TikTok se disponíveis
    const tikTokParams = extractTikTokParams();
    if (tikTokParams.ttclid) {
        baseData.ttclid = tikTokParams.ttclid;
    }
    if (tikTokParams.ttp) {
        baseData.ttp = tikTokParams.ttp;
    }
    
    return baseData;
}

// Função para validar formato de e-mail rigorosamente
function validateEmailFormat(email) {
    if (!email || typeof email !== 'string') return false;
    
    // Validação rigorosa conforme padrão xxx@xxx.com do TikTok
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(email);
}

// Função para encontrar email em formulários da página atual
function findEmailInPage() {
    try {
        // Procurar por inputs de email
        const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
        for (const input of emailInputs) {
            const potentialEmail = input.value.trim().toLowerCase();
            if (potentialEmail && validateEmailFormat(potentialEmail)) {
                return potentialEmail;
            }
        }
        
        // Procurar por dados salvos em localStorage
        const savedEmail = localStorage.getItem('userEmail') || localStorage.getItem('user_email');
        if (savedEmail) {
            const potentialEmail = savedEmail.trim().toLowerCase();
            if (validateEmailFormat(potentialEmail)) {
                return potentialEmail;
            }
        }
        
        return null;
    } catch (error) {
        console.warn('Erro ao buscar email na página:', error);
        return null;
    }
}

// Função para encontrar telefone em formulários da página atual
function findPhoneInPage() {
    try {
        // Procurar por inputs de telefone
        const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[name*="telefone"], input[id*="phone"], input[id*="telefone"]');
        for (const input of phoneInputs) {
            if (input.value && input.value.replace(/\D/g, '').length >= 8) {
                return input.value.trim();
            }
        }
        
        // Procurar por dados salvos em localStorage
        const savedPhone = localStorage.getItem('userPhone') || localStorage.getItem('user_phone');
        if (savedPhone && savedPhone.replace(/\D/g, '').length >= 8) {
            return savedPhone.trim();
        }
        
        return null;
    } catch (error) {
        console.warn('Erro ao buscar telefone na página:', error);
        return null;
    }
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
        console.log('TikTok Events: Iniciando sistema otimizado para EMQ...');
        
        // Capturar parâmetros do TikTok da URL imediatamente
        const tikTokParams = extractTikTokParams();
        if (Object.keys(tikTokParams).length > 0) {
            console.log('TikTok: Parâmetros capturados da URL:', tikTokParams);
        }
        
        // Gerar external_id se não existir
        if (!userDataCache.userId) {
            const externalId = generateExternalId();
            userDataCache.userId = externalId;
            console.log('TikTok: External ID gerado:', externalId);
        }
        
        // Verificar se ttq está disponível
        if (typeof ttq === 'undefined') {
            console.warn('TikTok Pixel (ttq) não está disponível. Eventos serão enfileirados para tentativa posterior.');
        } else {
            console.log('TikTok Pixel inicializado com sucesso');
            
            // Identificar usuário automaticamente se houver dados disponíveis
            const hasStoredEmail = localStorage.getItem('user_email');
            const hasStoredPhone = localStorage.getItem('user_phone');
            
            if (hasStoredEmail || hasStoredPhone || userDataCache.userId) {
                identifyUser(hasStoredEmail, hasStoredPhone, userDataCache.userId);
            }
            
            // Iniciar processamento da fila
            processEventQueue();
            
            // Rastrear PageView automaticamente se ainda não foi feito
            if (!window.tiktokPageViewTracked) {
                trackPageView().catch(error => {
                    console.error('[TikTok EMQ] Erro no auto-track PageView:', error);
                });
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
        
        console.log('TikTok Events otimizado inicializado com sucesso - EMQ melhorado');
        console.log('TikTok: Estado inicial do cache:', {
            email: userDataCache.email ? '✓ Presente' : '✗ Ausente',
            phone: userDataCache.phone ? '✓ Presente' : '✗ Ausente',
            userId: userDataCache.userId ? '✓ Presente' : '✗ Ausente',
            ttclid: userDataCache.ttclid ? '✓ Presente' : '✗ Ausente',
            ttp: userDataCache.ttp ? '✓ Presente' : '✗ Ausente'
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao inicializar TikTok Events:', error);
        return false;
    }
}

// ============================================================================
// IDENTIFICAÇÃO DO USUÁRIO COM ADVANCED MATCHING OTIMIZADO
// ============================================================================

async function identifyUser(email, phone, userId) {
    try {
        const hashedData = {};
        let identificationCount = 0;
        
        // Hash do email (sempre aplicar se disponível e válido)
        if (email && email.trim() !== '') {
            const normalizedEmail = email.trim().toLowerCase();
            
            // Validar formato do email antes de usar
            if (validateEmailFormat(normalizedEmail)) {
                const hashedEmail = await sha256Base64(normalizedEmail);
                hashedData.email = hashedEmail;
                userDataCache.email = normalizedEmail;
                userDataCache.hashedData.email = hashedEmail;
                identificationCount++;
                console.log('TikTok: Email identificado e hasheado');
            } else {
                console.warn('TikTok: Email com formato inválido descartado:', normalizedEmail);
            }
        }
        
        // Hash do telefone (normalizar para E.164 antes)
        if (phone && phone.trim() !== '') {
            const normalizedPhone = normalizePhoneNumber(phone.trim());
            if (normalizedPhone) {
                const hashedPhone = await sha256Base64(normalizedPhone);
                hashedData.phone_number = hashedPhone;
                userDataCache.phone = normalizedPhone;
                userDataCache.hashedData.phone_number = hashedPhone;
                identificationCount++;
                console.log(`TikTok: Telefone normalizado (${normalizedPhone}) e hasheado`);
            }
        }
        
        // Hash do External ID (sempre gerar se não existir)
        let finalUserId = userId;
        if (!finalUserId) {
            finalUserId = generateExternalId();
        }
        
        if (finalUserId) {
            const hashedUserId = await sha256Base64(finalUserId);
            hashedData.external_id = hashedUserId;
            userDataCache.userId = finalUserId;
            userDataCache.hashedData.external_id = hashedUserId;
            identificationCount++;
            console.log('TikTok: External ID gerado e hasheado');
        }
        
        // Adicionar parâmetros do TikTok
        const tikTokParams = extractTikTokParams();
        if (tikTokParams.ttclid) {
            hashedData.ttclid = tikTokParams.ttclid;
            identificationCount++;
            console.log('TikTok: Click ID capturado');
        }
        if (tikTokParams.ttp) {
            hashedData.ttp = tikTokParams.ttp;
            identificationCount++;
            console.log('TikTok: Tracking parameter capturado');
        }
        
        // Enviar identificação se tiver dados
        if (Object.keys(hashedData).length > 0) {
            if (typeof ttq !== 'undefined') {
                ttq.identify(hashedData);
                console.log(`TikTok: Usuário identificado com ${identificationCount} parâmetros de correspondência:`, Object.keys(hashedData));
                console.log('TikTok: Dados de identificação:', {
                    email: hashedData.email ? '✓ Hasheado' : '✗ Ausente',
                    phone_number: hashedData.phone_number ? '✓ Hasheado' : '✗ Ausente',
                    external_id: hashedData.external_id ? '✓ Hasheado' : '✗ Ausente',
                    ttclid: hashedData.ttclid ? '✓ Presente' : '✗ Ausente',
                    ttp: hashedData.ttp ? '✓ Presente' : '✗ Ausente'
                });
                return true;
            } else {
                enqueueEvent('identify', hashedData);
                console.log('TikTok: Identificação enfileirada (pixel não disponível)');
                return false;
            }
        }
        
        console.warn('TikTok: Nenhum dado de identificação disponível para Advanced Matching');
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
        // Preparar payload
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

        // URLs para tentar (principal e fallback)
        const apiUrls = [
            `${API_BASE_URL}/api/tiktok/track-event`,
            `${API_BASE_URL}/api/tiktok-v3/track-event`
        ];
        
        let response = null;
        let error = null;
        
        // Tentar URLs em sequência
        for (const url of apiUrls) {
            try {
                console.log(`TikTok Server: Tentando enviar ${eventName} para ${url}`);
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    // Adicionar timeout para evitar espera infinita
                    signal: AbortSignal.timeout(5000) // 5 segundos
                });
                
                if (response.ok) {
                    console.log(`TikTok Server: Evento ${eventName} enviado com sucesso para ${url}`);
                    break; // Sucesso, sair do loop
                } else {
                    console.warn(`TikTok Server: Resposta não-ok de ${url}:`, response.status);
                }
            } catch (e) {
                error = e;
                console.warn(`TikTok Server: Falha ao enviar para ${url}:`, e.message);
                continue; // Tentar próxima URL
            }
        }

        if (response && response.ok) {
            console.log(`TikTok Server: Evento ${eventName} enviado para Events API`);
            return true;
        } else {
            // Adicionar à fila de eventos não enviados para retry posterior
            console.log(`TikTok Server: Adicionando evento ${eventName} à fila local para retry posterior`);
            
            // Obter fila atual
            let queue = [];
            try {
                const storedQueue = localStorage.getItem(TIKTOK_EVENT_QUEUE_KEY);
                if (storedQueue) {
                    queue = JSON.parse(storedQueue);
                }
            } catch (e) {
                console.warn('Erro ao recuperar fila de eventos:', e);
            }
            
            // Adicionar evento à fila com informações para retry
            queue.push({
                eventType: eventName,
                eventData: eventData,
                userData: userData,
                eventId: eventId || generateEventId(),
                timestamp: Date.now(),
                attempts: 0
            });
            
            // Limitar tamanho da fila (manter últimos 50 eventos)
            if (queue.length > 50) {
                queue = queue.slice(-50);
            }
            
            // Salvar fila atualizada
            try {
                localStorage.setItem(TIKTOK_EVENT_QUEUE_KEY, JSON.stringify(queue));
                console.log(`TikTok Server: Evento ${eventName} salvo na fila (${queue.length} eventos pendentes)`);
            } catch (e) {
                console.warn('Erro ao salvar fila de eventos:', e);
            }
            
            return false;
        }
    } catch (error) {
        console.warn('Erro ao enviar evento para servidor:', error);
        return false;
    }
}

// ============================================================================
// EVENTOS OTIMIZADOS COM ADVANCED MATCHING
// ============================================================================

/**
 * 1. PAGE VIEW - Visualização de Página (EMQ OTIMIZADO)
 * Meta: Elevar EMQ de 29/100 para 60+/100
 */
async function trackPageView() {
    try {
        const eventId = generateEventId();
        
        // Capturar parâmetros TikTok logo no início para máxima captura
        extractTikTokParams();
        
        // Obter dados de Advanced Matching com máxima qualidade EMQ
        const advancedMatchingData = await getAdvancedMatchingDataAsync();
        
        const eventData = {
            event_id: eventId,
            ...advancedMatchingData
        };

        // Log detalhado para monitoramento EMQ
        console.log('[TikTok EMQ] PageView dados preparados:', {
            email_coverage: eventData.email ? '100%' : '0%',
            phone_coverage: eventData.phone_number ? '100%' : '0%',
            external_id_coverage: eventData.external_id ? '100%' : '0%',
            ttclid_present: !!eventData.ttclid,
            ttp_present: !!eventData.ttp,
            user_agent_present: !!eventData.user_agent,
            url_present: !!eventData.url,
            estimated_emq: calculateEstimatedEMQ(eventData)
        });

        // Enviar via TikTok Pixel (frontend)
        if (typeof ttq !== 'undefined') {
            ttq.track('PageView', eventData);
            console.log('[TikTok Pixel] PageView enviado para:', window.location.pathname);
        } else {
            enqueueEvent('PageView', eventData);
            console.warn('[TikTok Pixel] ttq não disponível, evento enfileirado');
        }

        // Enviar via Events API (backend) com mesmos dados para deduplicação
        sendEventToServer('PageView', {
            url: window.location.href,
            title: document.title,
            path: window.location.pathname,
            referrer: document.referrer || '',
            timestamp: new Date().toISOString()
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('[TikTok EMQ] Erro ao rastrear PageView:', error);
        return false;
    }
}

// Função para calcular EMQ estimado baseado nos dados presentes
function calculateEstimatedEMQ(eventData) {
    let score = 0;
    
    // Base score para PageView
    score += 15;
    
    // Email (30 pontos máximo)
    if (eventData.email && eventData.email !== '') {
        score += 30;
    }
    
    // Phone (25 pontos máximo)
    if (eventData.phone_number && eventData.phone_number !== '') {
        score += 25;
    }
    
    // External ID (15 pontos máximo)
    if (eventData.external_id && eventData.external_id !== '') {
        score += 15;
    }
    
    // User Agent (5 pontos)
    if (eventData.user_agent) {
        score += 5;
    }
    
    // TTCLID (5 pontos extra)
    if (eventData.ttclid) {
        score += 5;
    }
    
    // URL presente (5 pontos)
    if (eventData.url) {
        score += 5;
    }
    
    return Math.min(score, 100); // Máximo 100
}

/**
 * 2. VIEW CONTENT - Visualização de Conteúdo (OTIMIZADO PARA EMQ)
 */
function trackViewContent(contentId, contentName, value = null, currency = 'BRL', contentType = 'product', contentCategory = 'digital_product') {
    try {
        const eventId = generateEventId();
        
        // Garantir dados de Advanced Matching atualizados e completos
        const advancedMatching = getAdvancedMatchingData();
        
        // Garantir que value seja um número decimal válido
        const validValue = value !== null && !isNaN(value) && value >= 0 ? Number(parseFloat(value).toFixed(2)) : 0.00;
        
        // Gerar content_id e content_name inteligentes se não fornecidos
        const smartContentId = contentId || generateContentId();
        const smartContentName = contentName || generateContentName();
        
        // Validar content_type
        const validContentType = validateContentType(contentType);
        
        // Estrutura obrigatória do contents array conforme TikTok API
        const contents = [{
            content_id: String(smartContentId),
            content_type: validContentType,
            content_name: String(smartContentName),
            content_category: contentCategory,
            quantity: 1,
            price: validValue
        }];

        const eventData = {
            event_id: eventId,
            contents: contents,
            // Campos obrigatórios para otimização - sempre números decimais válidos
            value: validValue,
            currency: String(currency || 'BRL'),
            // Advanced Matching Data para máximo EMQ
            ...advancedMatching
        };

        // Log detalhado para monitoramento da qualidade EMQ
        console.log('TikTok: ViewContent - Qualidade EMQ otimizada:', {
            event_id: '✓ Presente',
            content_id: contentId ? '✓ Fornecido pelo usuário' : '⚠️ Gerado automaticamente',
            content_id_value: smartContentId,
            content_type: '✓ Presente',
            content_name: contentName ? '✓ Fornecido pelo usuário' : '⚠️ Gerado automaticamente',
            content_name_value: smartContentName,
            value: `✓ ${validValue} (número decimal)`,
            currency: `✓ ${currency}`,
            email: eventData.email && eventData.email !== "" ? '✓ Hash SHA-256+Base64' : '✗ Ausente/vazio',
            phone_number: eventData.phone_number && eventData.phone_number !== "" ? '✓ Hash SHA-256+Base64' : '✗ Ausente/vazio',
            external_id: eventData.external_id && eventData.external_id !== "" ? '✓ Hash SHA-256+Base64' : '✗ Ausente/vazio',
            ttclid: eventData.ttclid ? '✓ Presente' : '✗ Ausente',
            ttp: eventData.ttp ? '✓ Presente' : '✗ Ausente',
            user_agent: '✓ Presente',
            url: '✓ Presente'
        });

        if (typeof ttq !== 'undefined') {
            ttq.track('ViewContent', eventData);
            console.log('TikTok: ViewContent enviado com EMQ otimizado', {
                contentId, 
                contentName, 
                value: validValue,
                matchingFields: Object.keys(advancedMatching).length
            });
        } else {
            enqueueEvent('ViewContent', eventData);
            console.log('TikTok: ViewContent enfileirado (pixel indisponível)');
        }

        // Enviar para servidor (Events API) com mesma qualidade EMQ
        sendEventToServer('ViewContent', {
            content_id: String(smartContentId),
            content_type: contentType,
            content_name: String(smartContentName),
            content_category: contentCategory,
            value: validValue,
            currency: String(currency || 'BRL'),
            quantity: 1
        }, {
            email: userDataCache.email || "",
            phone: userDataCache.phone || "",
            userId: userDataCache.userId || generateExternalId()
        }, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear ViewContent:', error);
        // Tentar enfileirar mesmo com erro para não perder o evento
        try {
            const fallbackContentId = contentId || generateContentId();
            const fallbackContentName = contentName || generateContentName();
            
            const fallbackEventData = {
                event_id: generateEventId(),
                contents: [{
                    content_id: String(fallbackContentId),
                    content_type: validateContentType(contentType),
                    content_name: String(fallbackContentName)
                }],
                value: 0.00,
                currency: String(currency || 'BRL'),
                ...getAdvancedMatchingData()
            };
            enqueueEvent('ViewContent', fallbackEventData);
        } catch (fallbackError) {
            console.error('TikTok: Erro crítico ao enfileirar ViewContent:', fallbackError);
        }
        return false;
    }
}

/**
 * 3. CLICK BUTTON - Clique em Botão (OTIMIZADO PARA EMQ)
 */
function trackClickButton(buttonText, buttonType = 'cta', value = null, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        
        // Garantir dados de Advanced Matching atualizados
        const advancedMatching = getAdvancedMatchingData();
        
        // Garantir que value seja um número decimal válido
        const validValue = value !== null && !isNaN(value) && value >= 0 ? Number(parseFloat(value).toFixed(2)) : 0.00;
        
        const eventData = {
            event_id: eventId,
            button_text: String(buttonText || 'Botão'),
            button_type: String(buttonType),
            value: validValue,
            currency: String(currency || 'BRL'),
            ...advancedMatching
        };

        // Log para monitoramento da qualidade
        console.log('TikTok: ClickButton - Qualidade dos dados:', {
            event_id: '✓ Presente',
            button_text: '✓ Presente',
            value: `✓ ${validValue} (número decimal)`,
            currency: `✓ ${currency}`,
            email: eventData.email && eventData.email !== "" ? '✓ Hash presente' : '✗ Ausente/vazio',
            phone_number: eventData.phone_number && eventData.phone_number !== "" ? '✓ Hash presente' : '✗ Ausente/vazio',
            external_id: eventData.external_id && eventData.external_id !== "" ? '✓ Hash presente' : '✗ Ausente/vazio',
            ttclid: eventData.ttclid ? '✓ Presente' : '✗ Ausente',
            ttp: eventData.ttp ? '✓ Presente' : '✗ Ausente',
            user_agent: '✓ Presente',
            url: '✓ Presente'
        });

        if (typeof ttq !== 'undefined') {
            ttq.track('ClickButton', eventData);
            console.log('TikTok: ClickButton rastreado com EMQ otimizado', {buttonText, buttonType, value: validValue});
        } else {
            enqueueEvent('ClickButton', eventData);
        }

        // Enviar para servidor (Events API) com mesma qualidade
        sendEventToServer('ClickButton', {
            button_text: String(buttonText || 'Botão'),
            button_type: String(buttonType),
            value: validValue,
            currency: String(currency || 'BRL')
        }, {
            email: userDataCache.email || "",
            phone: userDataCache.phone || "",
            userId: userDataCache.userId || generateExternalId()
        }, eventId);

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
        
        // Garantir que value seja um número decimal válido
        const validValue = value !== null && !isNaN(value) && value >= 0 ? Number(parseFloat(value).toFixed(2)) : 10.00;
        
        const eventData = {
            event_id: eventId,
            lead_type: String(leadType || 'lead'),
            value: validValue, // OBRIGATÓRIO para otimização
            currency: String(currency || 'BRL'), // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('Lead', eventData);
            console.log('TikTok: Lead rastreado', {leadType, value: validValue});
        } else {
            enqueueEvent('Lead', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('Lead', {
            lead_type: String(leadType || 'lead'),
            value: validValue,
            currency: String(currency || 'BRL'),
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
        
        // Garantir que value seja um número decimal válido
        const validValue = value !== null && !isNaN(value) && value >= 0 ? Number(parseFloat(value).toFixed(2)) : 5.00;
        
        const eventData = {
            event_id: eventId,
            contact_type: String(contactType || 'contact'),
            value: validValue, // OBRIGATÓRIO para otimização
            currency: String(currency || 'BRL'), // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('Contact', eventData);
            console.log('TikTok: Contact rastreado', {contactType, value: validValue});
        } else {
            enqueueEvent('Contact', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('Contact', {
            contact_type: String(contactType || 'contact'),
            value: validValue,
            currency: String(currency || 'BRL'),
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
        
        // Gerar content_id e content_name inteligentes se não fornecidos
        const smartContentId = contentId || generateContentId('checkout_item');
        const smartContentName = contentName || generateContentName('Produto Devotly');
        
        // Garantir que value seja um número decimal válido e obrigatório para checkout
        const validValue = value !== null && !isNaN(value) && value > 0 ? Number(parseFloat(value).toFixed(2)) : 0.01;
        
        const eventData = {
            event_id: eventId,
            contents: [{
                content_id: String(smartContentId),
                content_type: 'product',
                content_name: String(smartContentName),
                quantity: 1,
                price: validValue
            }],
            value: validValue, // OBRIGATÓRIO
            currency: String(currency || 'BRL'), // OBRIGATÓRIO
            ...getAdvancedMatchingData()
        };

        if (typeof ttq !== 'undefined') {
            ttq.track('InitiateCheckout', eventData);
            console.log('TikTok: InitiateCheckout rastreado', {contentId: smartContentId, contentName: smartContentName, value: validValue});
        } else {
            enqueueEvent('InitiateCheckout', eventData);
        }

        // Enviar para servidor (Events API)
        sendEventToServer('InitiateCheckout', {
            content_id: String(smartContentId),
            content_type: 'product',
            content_name: String(smartContentName),
            content_category: 'digital_product',
            value: validValue,
            currency: String(currency || 'BRL'),
            quantity: 1
        }, userDataCache, eventId);

        return true;
    } catch (error) {
        console.error('TikTok: Erro ao rastrear InitiateCheckout:', error);
        return false;
    }
}

/**
 * 7. PURCHASE - Compra Finalizada (CRÍTICO PARA EMQ) - VERSÃO ULTRA-OTIMIZADA
 */
async function trackPurchase(contentId, contentName, value, currency = 'BRL') {
    try {
        const eventId = generateEventId();
        
        // CRITICAL: Purchase DEVE ter value > 0 - validação rigorosa
        if (!value || isNaN(value) || value <= 0) {
            console.error('TikTok: Purchase requer value > 0. Valor recebido:', value);
            return false;
        }
        
        // Preparar dados ultra-otimizados para máximo EMQ
        const enhancedUserData = await getUltraOptimizedUserData();
        
        // Gerar content_id e content_name inteligentes se não fornecidos
        const smartContentId = contentId || generateContentId('purchase_item');
        const smartContentName = contentName || generateContentName('Produto Devotly');
        
        const validValue = Number(parseFloat(value).toFixed(2));
        const eventTime = Math.floor(Date.now() / 1000);
        
        // Dados do evento com máxima qualidade EMQ
        const eventData = {
            event_id: eventId,
            event_time: eventTime,
            contents: [{
                content_id: String(smartContentId),
                content_type: 'product',
                content_name: String(smartContentName),
                content_category: 'digital_service',
                brand: 'Devotly',
                quantity: 1,
                price: validValue
            }],
            value: validValue, // OBRIGATÓRIO - valor da compra
            currency: String(currency || 'BRL'), // OBRIGATÓRIO - moeda
            order_id: `order_${smartContentId}_${eventTime}`,
            
            // Advanced Matching - Dados hasheados
            email: enhancedUserData.email || '',
            phone_number: enhancedUserData.phone_number || '',
            external_id: enhancedUserData.external_id || '',
            
            // Dados de localização e dispositivo
            ip: enhancedUserData.ip || '',
            user_agent: enhancedUserData.user_agent || navigator.userAgent || '',
            
            // Parâmetros do TikTok para better matching
            ttp: enhancedUserData.ttp || getCookie('_ttp') || '',
            ttclid: enhancedUserData.ttclid || extractTikTokParams().ttclid || '',
            
            // Dados adicionais para EMQ
            page_url: window.location.href,
            referrer_url: document.referrer || '',
            browser_language: navigator.language || 'pt-BR',
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        };

        // Adicionar test_event_code se estivermos em ambiente de desenvolvimento
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            eventData.test_event_code = 'test_purchase_devotly_' + Date.now();
        }

        // Calcular score EMQ estimado
        const emqScore = calculateEMQScore(eventData);

        console.log('🎯 TikTok: Purchase - ULTRA-OTIMIZADO (EMQ Score: ' + emqScore + '/100):', {
            event: '✓ Purchase',
            event_id: '✓ ' + eventId,
            event_time: '✓ ' + eventTime,
            value: `✓ ${validValue} BRL (decimal válido)`,
            currency: `✓ ${currency}`,
            order_id: `✓ ${eventData.order_id}`,
            content_id: contentId ? '✓ Real' : '⚠️ Gerado',
            email: eventData.email ? '✓ Hash SHA-256+Base64' : '❌ Ausente',
            phone_number: eventData.phone_number ? '✓ Hash SHA-256+Base64' : '❌ Ausente',
            external_id: eventData.external_id ? '✓ Hash SHA-256+Base64' : '❌ Ausente',
            ip: eventData.ip ? '✓ Presente' : '❌ Ausente',
            user_agent: '✓ Presente',
            ttp: eventData.ttp ? '✓ TikTok Parameter' : '❌ Ausente',
            ttclid: eventData.ttclid ? '✓ TikTok Click ID' : '❌ Ausente',
            browser_data: '✓ Completo',
            emq_score: `${emqScore}/100 ${emqScore >= 80 ? '🟢' : emqScore >= 60 ? '🟡' : '🔴'}`,
            test_event_code: eventData.test_event_code ? '✓ ' + eventData.test_event_code : '✓ Produção'
        });

        // Enviar via ttq (Pixel JavaScript) com dados ultra-otimizados
        if (typeof ttq !== 'undefined') {
            ttq.track('Purchase', eventData);
            console.log('✅ TikTok: Purchase disparado via Pixel (EMQ: ' + emqScore + '/100)');
        } else {
            enqueueEvent('Purchase', eventData);
        }

        // Enviar para servidor (Events API v1.3) com dados completos
        sendEventToServer('Purchase', {
            content_id: String(smartContentId),
            content_type: 'product',
            content_name: String(smartContentName),
            content_category: 'digital_service',
            brand: 'Devotly',
            value: validValue,
            currency: String(currency || 'BRL'),
            quantity: 1,
            order_id: eventData.order_id,
            page_url: eventData.page_url,
            referrer_url: eventData.referrer_url
        }, enhancedUserData, eventId);

        // Armazenar para deduplicação
        const purchaseKey = `purchase_${smartContentId}_${validValue}`;
        localStorage.setItem('last_purchase_tracked', purchaseKey);
        
        return true;
    } catch (error) {
        console.error('❌ TikTok: Erro ao rastrear Purchase:', error);
        return false;
    }
}

/**
 * Obter dados de usuário ultra-otimizados para máximo EMQ
 */
async function getUltraOptimizedUserData() {
    try {
        // Combinar todas as fontes possíveis de dados do usuário
        const email = findBestEmail();
        const phone = findBestPhone();
        const userAgent = navigator.userAgent || '';
        const ip = await getClientIP();
        
        // Gerar external_id baseado em dados disponíveis
        let externalId = '';
        if (email) {
            externalId = await sha256Base64(`devotly_${email}_${Date.now()}`);
        } else if (phone) {
            externalId = await sha256Base64(`devotly_${phone}_${Date.now()}`);
        } else {
            // Fallback usando fingerprint do dispositivo
            const fingerprint = generateDeviceFingerprint();
            externalId = await sha256Base64(`devotly_${fingerprint}`);
        }
        
        return {
            email: email ? await sha256Base64(email.toLowerCase().trim()) : '',
            phone_number: phone ? await sha256Base64(normalizePhoneNumber(phone)) : '',
            external_id: externalId,
            ip: ip || '',
            user_agent: userAgent,
            ttp: getCookie('_ttp') || '',
            ttclid: extractTikTokParams().ttclid || ''
        };
    } catch (error) {
        console.warn('⚠️ Erro ao obter dados otimizados:', error);
        return getAdvancedMatchingData(); // Fallback
    }
}

/**
 * Encontrar o melhor email disponível
 */
function findBestEmail() {
    // Prioridade: input atual > localStorage > formulários na página
    const sources = [
        document.getElementById('userEmail')?.value,
        localStorage.getItem('devotly_user_email'),
        localStorage.getItem('user_email'),
        findEmailInPage(),
        userDataCache.email
    ];
    
    for (const email of sources) {
        if (email && validateEmailFormat(email)) {
            return email.toLowerCase().trim();
        }
    }
    
    return null;
}

/**
 * Encontrar o melhor telefone disponível
 */
function findBestPhone() {
    const sources = [
        document.getElementById('userPhone')?.value,
        localStorage.getItem('user_phone'),
        findPhoneInPage(),
        userDataCache.phone
    ];
    
    for (const phone of sources) {
        if (phone && phone.length >= 8) {
            return normalizePhoneNumber(phone);
        }
    }
    
    return null;
}

/**
 * Gerar fingerprint único do dispositivo
 */
function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('DevotlyFingerprint', 2, 2);
    
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substr(0, 32);
}

/**
 * Obter IP do cliente via serviço externo
 */
async function getClientIP() {
    try {
        // Tentar múltiplos serviços para obter IP
        const services = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://httpbin.org/ip'
        ];
        
        for (const service of services) {
            try {
                const response = await fetch(service, { timeout: 2000 });
                const data = await response.json();
                return data.ip || data.origin;
            } catch (e) {
                continue;
            }
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível obter IP:', error);
    }
    
    return '';
}

/**
 * Calcular score EMQ estimado
 */
function calculateEMQScore(eventData) {
    let score = 0;
    
    // Dados de identificação (60% do score)
    if (eventData.email) score += 25;
    if (eventData.phone_number) score += 20;
    if (eventData.external_id) score += 15;
    
    // Dados de contexto (25% do score)
    if (eventData.ip) score += 10;
    if (eventData.user_agent) score += 8;
    if (eventData.ttp) score += 4;
    if (eventData.ttclid) score += 3;
    
    // Dados do evento (15% do score)
    if (eventData.value > 0) score += 5;
    if (eventData.currency) score += 3;
    if (eventData.order_id) score += 3;
    if (eventData.contents && eventData.contents.length > 0) score += 4;
    
    return Math.min(score, 100);
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
            trackPageView().catch(error => {
                console.error('[TikTok EMQ] Erro no auto-track PageView:', error);
            }); // Auto-track PageView
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
        
        // Determinar valor baseado no tipo de botão
        let buttonValue = 2; // Valor padrão
        if (buttonType === 'cta') buttonValue = 10;
        else if (buttonType === 'primary') buttonValue = 5;
        
        trackClickButton(buttonText, buttonType, buttonValue);
    }
});

// Auto-track de formulários
document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName === 'FORM') {
        const formType = form.id || form.className || 'contact_form';
        
        // Capturar dados do usuário antes de rastrear
        const emailField = form.querySelector('input[type="email"], input[name*="email"], input[id*="email"]');
        const phoneField = form.querySelector('input[type="tel"], input[name*="phone"], input[name*="telefone"], input[id*="phone"]');
        const nameField = form.querySelector('input[name*="name"], input[name*="nome"], input[id*="name"], input[id*="nome"]');
        
        let emailValue = null;
        let phoneValue = null;
        let userIdValue = null;
        
        if (emailField && emailField.value && emailField.value.trim() !== '') {
            emailValue = emailField.value.trim();
            // Armazenar para uso futuro
            localStorage.setItem('user_email', emailValue);
        }
        
        if (phoneField && phoneField.value && phoneField.value.trim() !== '') {
            phoneValue = phoneField.value.trim();
            localStorage.setItem('user_phone', phoneValue);
        }
        
        if (nameField && nameField.value && nameField.value.trim() !== '') {
            localStorage.setItem('user_name', nameField.value.trim());
        }
        
        // Identificar usuário se houver dados
        if (emailValue || phoneValue) {
            identifyUser(emailValue, phoneValue, userIdValue);
            
            // Pequeno delay para garantir que a identificação foi processada
            setTimeout(() => {
                trackContact(formType, 5);
            }, 100);
        } else {
            trackContact(formType, 5);
        }
        
        console.log('TikTok: Formulário submetido com dados do usuário capturados:', {
            email: emailValue ? '✓ Capturado' : '✗ Não encontrado',
            phone: phoneValue ? '✓ Capturado' : '✗ Não encontrado',
            name: nameField?.value ? '✓ Capturado' : '✗ Não encontrado'
        });
    }
});

// ============================================================================
// FUNÇÕES ESPECÍFICAS PARA DEVOTLY
// ============================================================================

const TikTokEvents = {
    // Página inicial
    viewHomePage() {
        trackViewContent('home', 'Página Inicial Devotly', 0, 'BRL', 'page', 'landing_page');
    },
    
    // Página de criação
    viewCreatePage() {
        trackViewContent('create', 'Criar Cartão Devocional', 15, 'BRL', 'page', 'creation_tool');
        trackLead('create_page_view', 15);
    },
    
    // Visualização de cartão
    viewCard(cardId) {
        trackViewContent(cardId || 'card', 'Visualizar Cartão Devocional', 10, 'BRL', 'product', 'digital_card');
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
    
    // Métodos de compatibilidade com v3
    forceDataDetection() {
        // Força re-detecção de dados de usuário
        console.log('🔍 TikTok: Forçando detecção de dados...');
        const email = findEmailInPage();
        const phone = findPhoneInPage();
        if (email || phone) {
            identifyUser(email, phone, null);
        }
    },
    
    getCoverage() {
        // Retorna cobertura de dados para EMQ
        const hasEmail = userDataCache.email && userDataCache.email !== '';
        const hasPhone = userDataCache.phone && userDataCache.phone !== '';
        const hasTtclid = userDataCache.ttclid && userDataCache.ttclid !== '';
        
        return {
            email: hasEmail,
            phone: hasPhone,
            ttclid: hasTtclid,
            score: (hasEmail ? 40 : 0) + (hasPhone ? 35 : 0) + (hasTtclid ? 25 : 0)
        };
    },
    
    // Eventos específicos para página Create
    create: {
        startCreation() {
            trackLead('start_creation', 15);
            trackClickButton('Iniciar Criação', 'creation_start', 15);
        },
        
        fillStep(stepNumber, stepName) {
            trackViewContent(`step-${stepNumber}`, `Etapa ${stepNumber}: ${stepName}`, 5, 'BRL', 'form_step', 'creation_process');
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
                trackViewContent(cardId, 'Cartão Criado', 25, 'BRL', 'product', 'completed_card');
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
    },
    
    // Função para rastrear visualização de conteúdo específico na página de criação
    viewCreateContent(contentType, contentName) {
        console.log(`🔍 TikTok: ViewCreateContent - ${contentType}: ${contentName}`);
        return trackViewContent(
            generateContentId(`create_${contentType}`),
            contentName || `Visualização: ${contentType}`,
            5,
            'BRL',
            'product',
            'creation_process'
        );
    },
    
    // Função para rastrear cliques em botões
    trackClickButton(buttonText, buttonType = 'cta', value = null, currency = 'BRL') {
        console.log(`🖱️ TikTok: TrackClickButton - ${buttonText} (${buttonType})`);
        return trackClickButton(buttonText, buttonType, value, currency);
    },
    
    // Função para rastrear visualizações de conteúdo
    trackViewContent(contentId, contentName, value = null, currency = 'BRL', contentType = 'product', contentCategory = 'digital_product') {
        console.log(`👁️ TikTok: TrackViewContent - ${contentName} (${contentId})`);
        return trackViewContent(contentId, contentName, value, currency, contentType, contentCategory);
    },
    
    // Função para rastrear leads
    trackLead(leadType, value = null) {
        console.log(`🎯 TikTok: TrackLead - ${leadType}`);
        return trackLead(leadType, value);
    },
    
    // Função para rastrear checkout iniciado
    trackInitiateCheckout(contentId, contentName, value = null, currency = 'BRL') {
        console.log(`🛒 TikTok: TrackInitiateCheckout - ${contentName}`);
        return trackInitiateCheckout(contentId, contentName, value, currency);
    },
    
    // Função para rastrear compra finalizada
    trackPurchase(contentId, contentName, value, currency = 'BRL') {
        console.log(`💰 TikTok: TrackPurchase - ${contentName}`);
        return trackPurchase(contentId, contentName, value, currency);
    }
};

// Exportar para uso global
window.TikTokEvents = TikTokEvents;
window.identifyUser = identifyUser;
window.initTikTokEvents = initTikTokEvents;

// Auto-inicializar apenas se não foi inicializado manualmente
document.addEventListener('DOMContentLoaded', function() {
    if (!window.tiktokEventsInitialized) {
        console.log('TikTok: Inicializando sistema na DOMContentLoaded...');
        initTikTokEvents();
        window.tiktokEventsInitialized = true;
    }
});

// Fallback se já carregou
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.tiktokEventsInitialized) {
        setTimeout(() => {
            if (!window.tiktokEventsInitialized) {
                console.log('TikTok: Inicializando sistema via fallback...');
                initTikTokEvents();
                window.tiktokEventsInitialized = true;
            }
        }, 100);
    }
}

// Verificação adicional para garantir que TikTokEvents esteja sempre disponível
setTimeout(() => {
    if (typeof window.TikTokEvents === 'undefined') {
        console.warn('TikTok: TikTokEvents não encontrado, criando objeto básico...');
        window.TikTokEvents = TikTokEvents;
    }
    
    // Adicionar métodos que podem estar faltando
    if (!window.TikTokEvents.trackClickButton) {
        window.TikTokEvents.trackClickButton = function(buttonText, buttonType = 'cta', value = null, currency = 'BRL') {
            console.log(`🖱️ TikTok: TrackClickButton - ${buttonText} (${buttonType})`);
            if (typeof trackClickButton === 'function') {
                return trackClickButton(buttonText, buttonType, value, currency);
            }
            return false;
        };
    }
    
    if (!window.TikTokEvents.trackViewContent) {
        window.TikTokEvents.trackViewContent = function(contentId, contentName, value = null, currency = 'BRL', contentType = 'product', contentCategory = 'digital_product') {
            console.log(`👁️ TikTok: TrackViewContent - ${contentName} (${contentId})`);
            if (typeof trackViewContent === 'function') {
                return trackViewContent(contentId, contentName, value, currency, contentType, contentCategory);
            }
            return false;
        };
    }
}, 500);
