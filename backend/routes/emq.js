/**
 * Rota para Monitoramento EMQ - Sistema de Teste e Otimização
 * Endpoint para validação e monitoramento da qualidade EMQ dos eventos TikTok
 */

import express from 'express';
import EMQMonitoringService from '../services/emqMonitoring.js';
import tiktokEventsService from '../services/tiktokEventsV3.js';

const router = express.Router();
const emqMonitoring = new EMQMonitoringService();
// tiktokEventsService já é uma instância, não precisa de 'new'

/**
 * GET /api/emq/status - Status geral do EMQ
 */
router.get('/status', (req, res) => {
    try {
        const report = emqMonitoring.getEMQReport();
        res.json({
            success: true,
            data: report,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/emq/calculate-score - Calcular EMQ Score de dados
 */
router.post('/calculate-score', (req, res) => {
    try {
        const { eventData, userData, contextData } = req.body;
        
        const emqResult = emqMonitoring.calculateEMQScore(
            eventData || {},
            userData || {},
            contextData || {}
        );
        
        res.json({
            success: true,
            data: emqResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/emq/test-purchase - Teste de Purchase Event Ultra-Otimizado
 */
router.post('/test-purchase', async (req, res) => {
    try {
        const {
            contentId,
            contentName,
            value,
            currency = 'BRL',
            email,
            phone
        } = req.body;

        // Validações básicas
        if (!contentId || !contentName || !value) {
            return res.status(400).json({
                success: false,
                error: 'contentId, contentName e value são obrigatórios'
            });
        }

        if (value <= 0) {
            return res.status(400).json({
                success: false,
                error: 'value deve ser maior que 0'
            });
        }

        // Enriquecer dados do usuário
        const userData = await emqMonitoring.enrichUserDataForEMQ(
            { email, phone },
            req
        );

        // Preparar contexto
        const context = {
            url: req.headers.referer || 'https://devotly.shop/test-emq-purchase.html',
            referrer: req.headers.referer || '',
            ip: emqMonitoring.extractClientIP(req),
            userAgent: req.headers['user-agent'] || '',
            timestamp: Math.floor(Date.now() / 1000)
        };

        // Executar Purchase tracking
        const result = await tiktokEventsService.trackPurchase(
            contentId,
            contentName,
            parseFloat(value),
            currency,
            'product',
            context,
            userData
        );

        // Calcular EMQ Score final
        const emqResult = emqMonitoring.calculateEMQScore(
            {
                content_id: contentId,
                content_name: contentName,
                value: parseFloat(value),
                currency
            },
            userData,
            context
        );

        res.json({
            success: true,
            data: {
                trackingResult: result,
                emqScore: emqResult,
                userData: {
                    hasEmail: !!userData.email,
                    hasPhone: !!userData.phone,
                    hasExternalId: !!userData.externalId,
                    ip: userData.ip
                },
                context: {
                    url: context.url,
                    userAgent: !!context.userAgent,
                    timestamp: context.timestamp
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro no teste EMQ Purchase:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * POST /api/emq/optimize-payload - Otimizar payload para máximo EMQ
 */
router.post('/optimize-payload', (req, res) => {
    try {
        const { eventData, userData, contextData } = req.body;
        
        const optimizedPayload = emqMonitoring.optimizePayloadForEMQ(
            eventData || {},
            userData || {},
            contextData || {}
        );
        
        const emqResult = emqMonitoring.calculateEMQScore(
            eventData || {},
            userData || {},
            contextData || {}
        );
        
        res.json({
            success: true,
            data: {
                originalPayload: { eventData, userData, contextData },
                optimizedPayload,
                emqScore: emqResult,
                improvements: emqResult.recommendations
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emq/recommendations - Recomendações de otimização
 */
router.get('/recommendations', (req, res) => {
    try {
        const recommendations = [
            {
                category: 'Email Collection',
                importance: 'HIGH',
                points: 25,
                description: 'Coletar e hashar email do usuário',
                implementation: 'Implementar formulário de captura de email'
            },
            {
                category: 'Phone Collection',
                importance: 'HIGH',
                points: 20,
                description: 'Coletar e hashar telefone do usuário',
                implementation: 'Adicionar campo de telefone opcional'
            },
            {
                category: 'IP Address',
                importance: 'MEDIUM',
                points: 8,
                description: 'Capturar IP do cliente automaticamente',
                implementation: 'Configurar headers de proxy corretamente'
            },
            {
                category: 'TikTok Parameters',
                importance: 'MEDIUM',
                points: 7,
                description: 'Capturar parâmetros TikTok (ttp, ttclid)',
                implementation: 'Implementar captura de URL parameters'
            },
            {
                category: 'User Agent',
                importance: 'MEDIUM',
                points: 10,
                description: 'Capturar User-Agent completo',
                implementation: 'Automático via headers HTTP'
            },
            {
                category: 'Device Fingerprinting',
                importance: 'LOW',
                points: 3,
                description: 'Implementar fingerprinting de dispositivo',
                implementation: 'Canvas fingerprinting, screen resolution'
            }
        ];

        res.json({
            success: true,
            data: {
                recommendations,
                maxPossibleScore: 100,
                currentImplementedFeatures: [
                    'IP Address Capture',
                    'User Agent Detection',
                    'Content Data Quality',
                    'Timestamp Precision'
                ]
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/emq/history - Histórico de scores EMQ
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = emqMonitoring.emqHistory.slice(-limit);
        
        const analysis = {
            totalEvents: history.length,
            averageScore: history.length > 0 ? 
                history.reduce((sum, h) => sum + h.score, 0) / history.length : 0,
            scoreDistribution: {
                excellent: history.filter(h => h.score >= 80).length,
                good: history.filter(h => h.score >= 60 && h.score < 80).length,
                fair: history.filter(h => h.score >= 40 && h.score < 60).length,
                poor: history.filter(h => h.score < 40).length
            },
            trend: history.length >= 10 ? 
                emqMonitoring.calculateTrend(history.slice(-10)) : 'INSUFFICIENT_DATA'
        };
        
        res.json({
            success: true,
            data: {
                history,
                analysis
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/emq/simulate-events - Simular múltiplos eventos para teste
 */
router.post('/simulate-events', async (req, res) => {
    try {
        const { count = 5 } = req.body;
        const results = [];
        
        for (let i = 0; i < Math.min(count, 10); i++) {
            const testData = {
                contentId: `test_card_${Date.now()}_${i}`,
                contentName: `Devotly Card Teste ${i + 1}`,
                value: 17.99,
                currency: 'BRL',
                email: `teste${i}@devotly.shop`,
                phone: `+551199999${String(i).padStart(4, '0')}`
            };
            
            // Simular Purchase
            const userData = await emqMonitoring.enrichUserDataForEMQ(
                { email: testData.email, phone: testData.phone },
                req
            );
            
            const context = {
                url: 'https://devotly.shop/test-emq-purchase.html',
                ip: emqMonitoring.extractClientIP(req),
                userAgent: req.headers['user-agent'] || '',
                timestamp: Math.floor(Date.now() / 1000)
            };
            
            const emqResult = emqMonitoring.calculateEMQScore(
                {
                    content_id: testData.contentId,
                    content_name: testData.contentName,
                    value: testData.value,
                    currency: testData.currency
                },
                userData,
                context
            );
            
            results.push({
                testData,
                emqScore: emqResult.score,
                emqGrade: emqResult.grade,
                timestamp: new Date().toISOString()
            });
            
            // Pequeno delay entre simulações
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        res.json({
            success: true,
            data: {
                simulatedEvents: results,
                summary: {
                    totalSimulated: results.length,
                    averageScore: results.reduce((sum, r) => sum + r.emqScore, 0) / results.length,
                    bestScore: Math.max(...results.map(r => r.emqScore)),
                    worstScore: Math.min(...results.map(r => r.emqScore))
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
