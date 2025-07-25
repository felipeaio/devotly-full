/**
 * Rotas para TikTok Pixel Service - Múltiplos Pixels
 * Sistema de rotas para gerenciar múltiplos pixels TikTok
 */

import express from 'express';
import tiktokPixelService from '../services/tiktokPixelService.js';

const router = express.Router();

/**
 * POST /api/tiktok-pixels/track - Enviar evento para todos os pixels
 */
router.post('/track', async (req, res) => {
    try {
        const { 
            eventName, 
            eventData = {},
            userEmail,
            userPhone,
            contentId,
            contentName,
            value,
            currency = 'BRL'
        } = req.body;

        // Validação básica
        if (!eventName) {
            return res.status(400).json({
                success: false,
                error: 'eventName é obrigatório'
            });
        }

        // Preparar dados do evento com contexto da requisição
        const enhancedEventData = {
            ...eventData,
            email: userEmail || eventData.email,
            phone_number: userPhone || eventData.phone_number,
            content_id: contentId || eventData.content_id,
            content_name: contentName || eventData.content_name,
            value: value || eventData.value,
            currency: currency || eventData.currency,
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            page_url: req.headers.referer || `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            ttclid: req.query.ttclid || req.body.ttclid || '',
            ttp: req.query.ttp || req.body.ttp || ''
        };

        console.log(`📡 Recebendo evento ${eventName} para múltiplos pixels`);

        const result = await tiktokPixelService.sendTikTokEvent(eventName, enhancedEventData);

        res.json({
            success: result.success,
            eventName,
            pixelsTarget: result.totalPixels,
            successCount: result.successCount,
            errorCount: result.errorCount,
            message: `Evento enviado para ${result.successCount}/${result.totalPixels} pixels`
        });

    } catch (error) {
        console.error('❌ Erro na rota de tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

/**
 * POST /api/tiktok-pixels/view-content - Evento ViewContent otimizado
 */
router.post('/view-content', async (req, res) => {
    try {
        const { contentId, contentName, value = 0, currency = 'BRL', ...eventData } = req.body;

        if (!contentId || !contentName) {
            return res.status(400).json({
                success: false,
                error: 'contentId e contentName são obrigatórios'
            });
        }

        // Adicionar dados da requisição
        const enhancedEventData = {
            ...eventData,
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            page_url: req.headers.referer || `${req.protocol}://${req.get('host')}`
        };

        const result = await tiktokPixelService.trackViewContent(
            contentId, 
            contentName, 
            value, 
            currency, 
            enhancedEventData
        );

        res.json({
            success: result.success,
            eventName: 'ViewContent',
            ...result
        });

    } catch (error) {
        console.error('❌ Erro no ViewContent:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/tiktok-pixels/initiate-checkout - Evento InitiateCheckout otimizado
 */
router.post('/initiate-checkout', async (req, res) => {
    try {
        const { contentId, contentName, value, currency = 'BRL', ...eventData } = req.body;

        if (!contentId || !contentName || !value) {
            return res.status(400).json({
                success: false,
                error: 'contentId, contentName e value são obrigatórios para InitiateCheckout'
            });
        }

        // Validar valor
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue <= 0) {
            return res.status(400).json({
                success: false,
                error: 'value deve ser um número positivo'
            });
        }

        // Adicionar dados da requisição
        const enhancedEventData = {
            ...eventData,
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            page_url: req.headers.referer || `${req.protocol}://${req.get('host')}`
        };

        const result = await tiktokPixelService.trackInitiateCheckout(
            contentId, 
            contentName, 
            numericValue, 
            currency, 
            enhancedEventData
        );

        res.json({
            success: result.success,
            eventName: 'InitiateCheckout',
            value: numericValue,
            currency,
            ...result
        });

    } catch (error) {
        console.error('❌ Erro no InitiateCheckout:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/tiktok-pixels/purchase - Evento Purchase otimizado
 */
router.post('/purchase', async (req, res) => {
    try {
        const { contentId, contentName, value, currency = 'BRL', ...eventData } = req.body;

        if (!contentId || !contentName || !value) {
            return res.status(400).json({
                success: false,
                error: 'contentId, contentName e value são obrigatórios para Purchase'
            });
        }

        // Validar valor
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue <= 0) {
            return res.status(400).json({
                success: false,
                error: 'value deve ser um número positivo'
            });
        }

        // Adicionar dados da requisição
        const enhancedEventData = {
            ...eventData,
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            page_url: req.headers.referer || `${req.protocol}://${req.get('host')}`
        };

        const result = await tiktokPixelService.trackPurchase(
            contentId, 
            contentName, 
            numericValue, 
            currency, 
            enhancedEventData
        );

        res.json({
            success: result.success,
            eventName: 'Purchase',
            value: numericValue,
            currency,
            ...result
        });

    } catch (error) {
        console.error('❌ Erro no Purchase:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tiktok-pixels/stats - Estatísticas dos pixels
 */
router.get('/stats', (req, res) => {
    try {
        const stats = tiktokPixelService.getStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/tiktok-pixels/reset-stats - Reset das estatísticas
 */
router.post('/reset-stats', (req, res) => {
    try {
        tiktokPixelService.resetStats();
        res.json({
            success: true,
            message: 'Estatísticas resetadas com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao resetar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tiktok-pixels/health - Health check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'TikTok Pixel Service',
        status: 'healthy',
        pixelsConfigured: tiktokPixelService.pixels.length,
        timestamp: new Date().toISOString()
    });
});

export default router;
