import express from 'express';
import tiktokEvents from '../services/tiktokEvents.js';

const router = express.Router();

/**
 * Rota para receber eventos do frontend e enviar para TikTok Events API
 * Implementa deduplicação entre frontend (Pixel) e backend (Events API)
 */
router.post('/track-event', async (req, res) => {
    try {
        const { 
            eventName, 
            eventData, 
            userData = {}, 
            eventId, 
            timestamp, 
            userAgent, 
            url, 
            referrer 
        } = req.body;

        console.log(`[TikTok API] Recebendo evento ${eventName} do frontend`);

        // Validar dados obrigatórios
        if (!eventName) {
            return res.status(400).json({
                error: 'EventName é obrigatório',
                status: 'error'
            });
        }

        // Preparar contexto completo
        const context = tiktokEvents.prepareEventContext(req, eventId);
        
        // Adicionar dados do frontend
        if (userAgent) context.userAgent = userAgent;
        if (url) context.pageUrl = url;
        if (referrer) context.referrer = referrer;

        // Preparar userData com dados do frontend se disponíveis
        const serverUserData = {
            ...userData,
            // Adicionar email/phone se disponível no cache do frontend
            email: userData.email || req.headers['x-user-email'],
            phone: userData.phone || req.headers['x-user-phone']
        };

        // Enviar evento baseado no tipo
        let result;
        
        switch (eventName) {
            case 'PageView':
                // PageView otimizado para máximo EMQ
                result = await tiktokEvents.sendEventToAllPixels(
                    'PageView',
                    {
                        // Dados específicos da página
                        content_type: 'page',
                        content_name: eventData.title || document?.title || 'Página',
                        content_category: 'website_page',
                        url: eventData.url || context.pageUrl,
                        referrer: eventData.referrer || context.referrer || '',
                        page_title: eventData.title || 'Página',
                        page_path: eventData.path || '/',
                        timestamp: timestamp || new Date().toISOString()
                    },
                    serverUserData,
                    context
                );
                
                console.log('[TikTok EMQ] PageView processado com dados otimizados:', {
                    email_present: !!serverUserData.email,
                    phone_present: !!serverUserData.phone,
                    external_id_present: !!serverUserData.userId,
                    ttclid_present: !!context.ttclid,
                    user_agent_present: !!context.userAgent,
                    url_present: !!context.pageUrl
                });
                break;

            case 'ViewContent':
                result = await tiktokEvents.sendEventToAllPixels(
                    'ViewContent',
                    {
                        content_id: eventData.content_id || 'unknown',
                        content_type: eventData.content_type || 'product',
                        content_name: eventData.content_name || 'Conteúdo',
                        content_category: eventData.content_category || 'digital_product',
                        value: Number(eventData.value || 0),
                        currency: eventData.currency || 'BRL',
                        quantity: eventData.quantity || 1
                    },
                    serverUserData,
                    context
                );
                break;

            case 'ClickButton':
                result = await tiktokEvents.trackCustomEvent(
                    'ClickButton',
                    {
                        button_text: eventData.button_text,
                        button_type: eventData.button_type,
                        value: eventData.value || 0,
                        currency: eventData.currency || 'BRL'
                    },
                    serverUserData,
                    req
                );
                break;

            case 'Lead':
                result = await tiktokEvents.trackCustomEvent(
                    'Lead',
                    {
                        lead_type: eventData.lead_type,
                        value: eventData.value || 10,
                        currency: eventData.currency || 'BRL',
                        content_category: 'lead_generation'
                    },
                    serverUserData,
                    req
                );
                break;

            case 'Contact':
                result = await tiktokEvents.trackCustomEvent(
                    'Contact',
                    {
                        contact_type: eventData.contact_type,
                        value: eventData.value || 5,
                        currency: eventData.currency || 'BRL',
                        content_category: 'contact_form'
                    },
                    serverUserData,
                    req
                );
                break;

            case 'InitiateCheckout':
                result = await tiktokEvents.trackInitiateCheckout(
                    eventData.content_id,
                    eventData.content_name,
                    eventData.value,
                    serverUserData.email,
                    req,
                    eventId
                );
                break;

            case 'Purchase':
                result = await tiktokEvents.trackPurchase(
                    eventData.content_id,
                    eventData.content_name || 'para_sempre',
                    eventData.value,
                    serverUserData.email,
                    serverUserData.phone,
                    req,
                    eventId
                );
                break;

            case 'AddPaymentInfo':
                result = await tiktokEvents.trackAddPaymentInfo(
                    eventData.content_id || 'payment_info',
                    eventData.content_name || 'Informações de Pagamento',
                    eventData.value,
                    eventData.currency || 'BRL',
                    eventData.content_type || 'subscription',
                    context,
                    serverUserData
                );
                break;

            default:
                // Evento personalizado
                result = await tiktokEvents.trackCustomEvent(
                    eventName,
                    eventData,
                    serverUserData,
                    req
                );
                break;
        }

        console.log(`[TikTok API] Evento ${eventName} processado:`, result.status || 'success');

        res.json({
            success: true,
            eventName,
            eventId,
            result,
            message: `Evento ${eventName} enviado para TikTok Events API`
        });

    } catch (error) {
        console.error('[TikTok API] Erro ao processar evento:', error);
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            status: 'error'
        });
    }
});

/**
 * Rota para identificar usuário via Events API
 */
router.post('/identify', async (req, res) => {
    try {
        const { email, phone, userId } = req.body;

        if (!email && !phone && !userId) {
            return res.status(400).json({
                error: 'Pelo menos um identificador (email, phone, userId) é obrigatório',
                status: 'error'
            });
        }

        // Por enquanto, apenas loggar - a identificação é feita principalmente via eventos
        console.log('[TikTok API] Usuário identificado:', { email: !!email, phone: !!phone, userId: !!userId });

        res.json({
            success: true,
            message: 'Usuário identificado com sucesso'
        });

    } catch (error) {
        console.error('[TikTok API] Erro ao identificar usuário:', error);
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            status: 'error'
        });
    }
});

/**
 * Rota para verificar configuração do TikTok Events
 */
router.get('/status', (req, res) => {
    try {
        res.json({
            success: true,
            pixels: tiktokEvents.pixels.length,
            pixelIds: tiktokEvents.pixels.map(p => p.id),
            apiUrl: tiktokEvents.apiUrl,
            testMode: tiktokEvents.testMode,
            queueSize: tiktokEvents.eventQueue.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Erro ao verificar status',
            message: error.message
        });
    }
});

export default router;
