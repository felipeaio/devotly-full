/**
 * TikTok Events Routes - RESTRUTURAÇÃO COMPLETA v3.0
 * 
 * Sistema de rotas otimizado para máxima qualidade EMQ
 * Trabalha em conjunto com TikTokEventsServiceV3
 */

import express from 'express';
import tiktokEventsV3 from '../services/tiktokEventsV3.js';

const router = express.Router();

/**
 * Middleware para log de requisições
 */
router.use((req, res, next) => {
    console.log(`📡 TikTok API Request: ${req.method} ${req.path}`);
    console.log('📊 Headers:', {
        userAgent: req.headers['user-agent']?.slice(0, 50) + '...',
        referer: req.headers.referer,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    next();
});

/**
 * Rota principal para tracking de eventos
 * POST /api/tiktok/track-event
 */
router.post('/track-event', async (req, res) => {
    try {
        const { 
            eventName, 
            eventData = {}, 
            userData = {}, 
            eventId, 
            timestamp, 
            userAgent, 
            url, 
            referrer 
        } = req.body;

        console.log(`🎯 Processando evento: ${eventName}`);
        console.log(`📋 Dados do evento:`, {
            eventName,
            hasValue: eventData.value !== undefined,
            value: eventData.value,
            currency: eventData.currency,
            contentId: eventData.content_id || eventData.contentId,
            contentName: eventData.content_name || eventData.contentName,
            userEmail: userData.email || 'não fornecido',
            userPhone: userData.phone || 'não fornecido'
        });
        
        // Validar configuração do TikTok antes de processar
        try {
            tiktokEventsV3.validateConfig();
        } catch (configError) {
            console.error('❌ Erro de configuração TikTok:', configError.message);
            return res.status(500).json({
                success: false,
                error: 'Configuração TikTok inválida',
                message: configError.message,
                code: 'CONFIG_ERROR'
            });
        }

        // Validação de dados obrigatórios
        if (!eventName) {
            return res.status(400).json({
                success: false,
                error: 'eventName é obrigatório',
                code: 'MISSING_EVENT_NAME'
            });
        }

        // Preparar contexto completo do evento
        const context = tiktokEventsV3.prepareEventContext(req, eventId);
        
        // Adicionar dados extras do frontend se disponíveis
        if (userAgent) context.user_agent = userAgent;
        if (url) context.url = url;
        if (referrer) context.referrer = referrer;
        if (timestamp) context.timestamp = Math.floor(timestamp / 1000);

        // Preparar dados do usuário
        const enhancedUserData = {
            ...userData,
            ip: context.ip,
            user_agent: context.user_agent
        };

        let result;

        // Processar evento baseado no tipo
        switch (eventName) {
            case 'PageView':
                result = await tiktokEventsV3.trackPageView(context, enhancedUserData);
                break;

            case 'ViewContent':
                // VALIDAÇÃO RIGOROSA PARA PREVENIR HTTP 500
                const contentId = eventData.content_id || eventData.contentId || `content_${Date.now()}`;
                const contentName = eventData.content_name || eventData.contentName || 'Conteúdo';
                const contentType = eventData.content_type || eventData.category || 'product';
                
                // Garantir que content_type é válido
                const validContentTypes = ['product', 'website'];
                const validatedContentType = validContentTypes.includes(contentType) ? contentType : 'product';
                
                console.log('🔍 ViewContent validado no backend:', {
                    content_id: contentId,
                    content_name: contentName,
                    content_type: validatedContentType
                });
                
                result = await tiktokEventsV3.trackViewContent(
                    contentId,
                    contentName,
                    eventData.value,
                    eventData.currency || 'BRL',
                    validatedContentType,
                    context,
                    enhancedUserData
                );
                break;

            case 'Purchase':
                if (!eventData.value || eventData.value <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Purchase requer value > 0',
                        code: 'INVALID_VALUE'
                    });
                }
                
                result = await tiktokEventsV3.trackPurchase(
                    eventData.content_id || eventData.contentId,
                    eventData.content_name || eventData.contentName || 'Produto',
                    eventData.value,
                    eventData.currency || 'BRL',
                    eventData.category || 'product',
                    context,
                    enhancedUserData
                );
                break;

            case 'InitiateCheckout':
                result = await tiktokEventsV3.trackInitiateCheckout(
                    eventData.content_id || eventData.contentId,
                    eventData.content_name || eventData.contentName || 'Produto',
                    eventData.value,
                    eventData.currency || 'BRL',
                    eventData.category || 'product',
                    context,
                    enhancedUserData
                );
                break;

            case 'Lead':
                result = await tiktokEventsV3.trackLead(
                    eventData.lead_type || 'lead',
                    eventData.value || 10,
                    eventData.currency || 'BRL',
                    context,
                    enhancedUserData
                );
                break;

            case 'AddPaymentInfo':
                result = await tiktokEventsV3.trackAddPaymentInfo(
                    eventData.content_id || eventData.contentId || 'payment_info',
                    eventData.content_name || eventData.contentName || 'Informações de Pagamento',
                    eventData.value || 0,
                    eventData.currency || 'BRL',
                    eventData.category || 'subscription',
                    context,
                    enhancedUserData
                );
                break;

            case 'Contact':
                result = await tiktokEventsV3.trackContact(
                    eventData.contact_type || 'form',
                    eventData.value || 5,
                    eventData.currency || 'BRL',
                    context,
                    enhancedUserData
                );
                break;

            case 'ClickButton':
                // Para ClickButton, tratamos como Contact
                result = await tiktokEventsV3.trackContact(
                    'button_click',
                    eventData.value || 1,
                    eventData.currency || 'BRL',
                    context,
                    enhancedUserData
                );
                break;

            default:
                // Evento genérico - usar ViewContent como fallback
                console.warn(`⚠️ Evento desconhecido: ${eventName}, usando ViewContent`);
                result = await tiktokEventsV3.trackViewContent(
                    eventData.content_id || 'unknown',
                    eventName,
                    eventData.value || null,
                    eventData.currency || 'BRL',
                    context,
                    enhancedUserData
                );
                break;
        }

        console.log(`✅ Evento ${eventName} processado:`, {
            success: result.success,
            emq_score: result.emq_score,
            event_id: result.event_id,
            duplicate: result.duplicate || false
        });

        // Resposta de sucesso
        res.json({
            success: true,
            eventName,
            eventId: result.event_id,
            emqScore: result.emq_score,
            duplicate: result.duplicate || false,
            result,
            message: `Evento ${eventName} processado com sucesso`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao processar evento TikTok:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Evento:', eventName);
        console.error('❌ EventData:', eventData);
        console.error('❌ UserData:', userData);
        
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message,
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            debug: {
                eventName,
                error: error.message,
                stack: error.stack
            }
        });
    }
});

/**
 * Rota para identificar usuário
 * POST /api/tiktok/identify
 */
router.post('/identify', async (req, res) => {
    try {
        const { email, phone, userId, eventId } = req.body;

        console.log('🔍 Identificando usuário via API');

        if (!email && !phone && !userId) {
            return res.status(400).json({
                success: false,
                error: 'Pelo menos um identificador (email, phone, userId) é obrigatório',
                code: 'MISSING_IDENTIFIERS'
            });
        }

        // Preparar contexto
        const context = tiktokEventsV3.prepareEventContext(req, eventId);
        
        // Preparar dados do usuário
        const userData = {
            email: email || '',
            phone: phone || '',
            userId: userId || '',
            ip: context.ip,
            user_agent: context.user_agent
        };

        // Processar identificação usando evento Lead
        const result = await tiktokEventsV3.trackLead(
            'user_identification',
            15, // Valor para identificação
            'BRL',
            context,
            userData
        );

        console.log('✅ Usuário identificado:', {
            email: email ? '✓' : '✗',
            phone: phone ? '✓' : '✗',
            userId: userId ? '✓' : '✗',
            emq_score: result.emq_score
        });

        res.json({
            success: true,
            message: 'Usuário identificado com sucesso',
            eventId: result.event_id,
            emqScore: result.emq_score,
            userData: {
                hasEmail: !!email,
                hasPhone: !!phone,
                hasUserId: !!userId
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro na identificação:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro ao identificar usuário',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rota para obter status e métricas do serviço - EMQ OTIMIZADO
 * GET /api/tiktok/status
 */
router.get('/status', (req, res) => {
    try {
        const metrics = tiktokEventsV3.getMetrics();
        
        console.log('📊 Consultando status do TikTok Events (EMQ Otimizado)');

        res.json({
            success: true,
            status: 'ativo',
            version: '3.0 - EMQ Optimized',
            config: {
                pixelCode: process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG',
                hasAccessToken: !!process.env.TIKTOK_ACCESS_TOKEN,
                targetEMQ: '70+ pontos',
                emqOptimizations: true
            },
            metrics,
            emq: metrics.emq || {
                currentScore: 0,
                targetScore: 70,
                status: 'INITIALIZING',
                coverage: {
                    email_coverage: 0,
                    phone_coverage: 0,
                    external_id_coverage: 100,
                    total_coverage: 33
                }
            },
            health: {
                serviceActive: true,
                configValid: !!process.env.TIKTOK_ACCESS_TOKEN,
                emqStatus: (metrics.emq?.currentScore || 0) >= 70 ? 'excellent' : 
                          (metrics.emq?.currentScore || 0) >= 60 ? 'good' : 
                          (metrics.emq?.currentScore || 0) >= 40 ? 'fair' : 'poor',
                coverageStatus: (metrics.emq?.coverage?.total_coverage || 0) >= 80 ? 'optimal' :
                               (metrics.emq?.coverage?.total_coverage || 0) >= 60 ? 'good' : 'needs_improvement'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao obter status:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro ao obter status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rota para teste de configuração
 * POST /api/tiktok/test
 */
router.post('/test', async (req, res) => {
    try {
        console.log('🧪 Executando teste de configuração TikTok');

        // Testar configuração
        tiktokEventsV3.validateConfig();

        // Preparar contexto de teste
        const context = tiktokEventsV3.prepareEventContext(req);
        
        // Dados de usuário de teste
        const testUserData = {
            email: 'teste@devotly.com',
            phone: '+5511999999999',
            userId: 'test_user_123',
            ip: context.ip,
            user_agent: context.user_agent
        };

        // Enviar evento de teste
        const result = await tiktokEventsV3.trackLead(
            'test_event',
            1,
            'BRL',
            context,
            testUserData
        );

        console.log('✅ Teste executado com sucesso');

        res.json({
            success: true,
            message: 'Teste executado com sucesso',
            testResult: result,
            config: {
                pixelCode: process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG',
                hasAccessToken: !!process.env.TIKTOK_ACCESS_TOKEN
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro no teste:', error);
        
        res.status(500).json({
            success: false,
            error: 'Erro no teste de configuração',
            message: error.message,
            details: {
                hasAccessToken: !!process.env.TIKTOK_ACCESS_TOKEN,
                hasPixelCode: !!process.env.TIKTOK_PIXEL_CODE
            },
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Rota para reset de métricas (apenas para desenvolvimento)
 * POST /api/tiktok/reset-metrics
 */
router.post('/reset-metrics', (req, res) => {
    try {
        // Reset das métricas (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Reset de métricas não permitido em produção'
            });
        }

        tiktokEventsV3.metrics = {
            totalEvents: 0,
            successfulEvents: 0,
            failedEvents: 0,
            averageEMQ: 0,
            duplicateEvents: 0,
            hashSuccessRate: 0
        };

        console.log('🔄 Métricas resetadas');

        res.json({
            success: true,
            message: 'Métricas resetadas com sucesso',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao resetar métricas',
            message: error.message
        });
    }
});

export default router;
