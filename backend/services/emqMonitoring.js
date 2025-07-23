/**
 * Serviço de Monitoramento EMQ (Event Match Quality) - Ultra-Otimizado
 * Monitora e otimiza em tempo real a qualidade dos eventos TikTok
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

class EMQMonitoringService {
    constructor() {
        this.emqHistory = [];
        this.thresholds = {
            excellent: 80,
            good: 60,
            poor: 40
        };
        this.initializeSupabase();
        this.setupRealTimeMonitoring();
    }

    initializeSupabase() {
        try {
            this.supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY
            );
            console.log('✅ EMQ Monitoring: Supabase inicializado');
        } catch (error) {
            console.error('❌ EMQ Monitoring: Erro ao inicializar Supabase:', error);
        }
    }

    setupRealTimeMonitoring() {
        // Monitoramento em tempo real dos scores EMQ
        setInterval(() => {
            this.analyzeEMQTrends();
        }, 30000); // A cada 30 segundos

        console.log('🔄 EMQ Monitoring: Sistema de monitoramento em tempo real ativo');
    }

    /**
     * Calcula o EMQ Score de um evento Purchase
     */
    calculateEMQScore(eventData, userData, contextData = {}) {
        let score = 0;
        const scoreDetails = {
            email: 0,
            phone: 0,
            externalId: 0,
            userAgent: 0,
            ip: 0,
            tiktokParams: 0,
            contentData: 0,
            timestamp: 0,
            fingerprint: 0,
            location: 0
        };

        try {
            // Email Hash (25 pontos - mais importante)
            if (userData.email && this.isValidEmail(userData.email)) {
                scoreDetails.email = 25;
                score += 25;
            }

            // Phone Hash (20 pontos)
            if (userData.phone && this.isValidPhone(userData.phone)) {
                scoreDetails.phone = 20;
                score += 20;
            }

            // External ID (15 pontos)
            if (userData.email || userData.phone) {
                scoreDetails.externalId = 15;
                score += 15;
            }

            // User Agent (10 pontos)
            if (contextData.userAgent && contextData.userAgent.length > 20) {
                scoreDetails.userAgent = 10;
                score += 10;
            }

            // IP Address (8 pontos)
            if (contextData.ip && this.isValidIP(contextData.ip)) {
                scoreDetails.ip = 8;
                score += 8;
            }

            // TikTok Parameters (7 pontos)
            if (contextData.ttp || contextData.ttclid) {
                scoreDetails.tiktokParams = 7;
                score += 7;
            }

            // Content Data Quality (6 pontos)
            if (eventData.content_id && eventData.value > 0) {
                scoreDetails.contentData = 6;
                score += 6;
            }

            // Timestamp Precision (4 pontos)
            if (eventData.event_time && Math.abs(Date.now() - eventData.event_time) < 60000) {
                scoreDetails.timestamp = 4;
                score += 4;
            }

            // Device Fingerprint (3 pontos)
            if (contextData.fingerprint) {
                scoreDetails.fingerprint = 3;
                score += 3;
            }

            // Location Data (2 pontos)
            if (contextData.timezone || contextData.language) {
                scoreDetails.location = 2;
                score += 2;
            }

            // Registrar o score
            this.recordEMQScore(score, scoreDetails, eventData);

            return {
                score,
                grade: this.getEMQGrade(score),
                details: scoreDetails,
                recommendations: this.getOptimizationRecommendations(scoreDetails)
            };

        } catch (error) {
            console.error('❌ EMQ Score Calculation Error:', error);
            return { score: 0, grade: 'ERROR', details: scoreDetails };
        }
    }

    /**
     * Enriquece dados do usuário para maximizar EMQ
     */
    async enrichUserDataForEMQ(userData, request) {
        const enrichedData = { ...userData };

        try {
            // IP Address (múltiplas fontes)
            enrichedData.ip = this.extractClientIP(request);

            // User Agent
            enrichedData.userAgent = request.headers['user-agent'] || '';

            // Accept Language
            enrichedData.language = request.headers['accept-language'] || '';

            // TikTok Parameters
            enrichedData.ttp = request.headers['x-ttp'] || '';
            enrichedData.ttclid = request.headers['x-ttclid'] || '';

            // Timezone
            enrichedData.timezone = request.headers['x-timezone'] || '';

            // Hash de dados sensíveis
            if (enrichedData.email) {
                enrichedData.emailHash = this.hashData(enrichedData.email.toLowerCase().trim());
            }

            if (enrichedData.phone) {
                enrichedData.phoneHash = this.hashData(enrichedData.phone.replace(/\D/g, ''));
            }

            // External ID (combinação única)
            if (enrichedData.email || enrichedData.phone) {
                const idSource = enrichedData.email || enrichedData.phone;
                enrichedData.externalId = this.hashData(`devotly_${idSource}_${Date.now()}`);
            }

            console.log(`✅ EMQ Enrichment: Dados enriquecidos para EMQ (Score estimado: ${this.estimateEMQScore(enrichedData)})`);
            return enrichedData;

        } catch (error) {
            console.error('❌ EMQ Enrichment Error:', error);
            return userData;
        }
    }

    /**
     * Otimiza payload para TikTok Events API
     */
    optimizePayloadForEMQ(eventData, userData, contextData) {
        const optimizedPayload = {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: `devotly_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event_source_url: contextData.url || 'https://devotly.shop',
            
            // User Data Ultra-Otimizado
            user: {},
            
            // Context Data Ultra-Otimizado
            context: {
                ad: {},
                page: {},
                user: {}
            },
            
            // Properties do Evento
            properties: {
                content_type: 'product',
                currency: eventData.currency || 'BRL',
                value: parseFloat(eventData.value) || 0,
                contents: [{
                    content_id: eventData.content_id,
                    content_name: eventData.content_name || 'Devotly Card',
                    content_category: 'digital_product',
                    content_type: 'product',
                    quantity: 1,
                    price: parseFloat(eventData.value) || 0
                }]
            }
        };

        // User Data com hashes otimizados
        if (userData.emailHash) {
            optimizedPayload.user.email = userData.emailHash;
        }
        if (userData.phoneHash) {
            optimizedPayload.user.phone_number = userData.phoneHash;
        }
        if (userData.externalId) {
            optimizedPayload.user.external_id = userData.externalId;
        }

        // Context User Data
        if (userData.ip) {
            optimizedPayload.context.user.ip = userData.ip;
        }
        if (userData.userAgent) {
            optimizedPayload.context.user.user_agent = userData.userAgent;
        }

        // Context Page Data
        optimizedPayload.context.page = {
            url: contextData.url || 'https://devotly.shop/create',
            referrer: contextData.referrer || '',
            title: 'Devotly - Criação de Card'
        };

        // Context Ad Data (TikTok específico)
        if (userData.ttp) {
            optimizedPayload.context.ad.ttp = userData.ttp;
        }
        if (userData.ttclid) {
            optimizedPayload.context.ad.ttclid = userData.ttclid;
        }

        // Adicionar timestamp de alta precisão
        optimizedPayload.properties.event_time = Math.floor(Date.now() / 1000);

        return optimizedPayload;
    }

    /**
     * Registra score EMQ no histórico
     */
    async recordEMQScore(score, details, eventData) {
        const record = {
            timestamp: new Date().toISOString(),
            score,
            grade: this.getEMQGrade(score),
            details,
            eventData: {
                content_id: eventData.content_id,
                value: eventData.value,
                currency: eventData.currency
            }
        };

        // Adicionar ao histórico local
        this.emqHistory.push(record);

        // Manter apenas últimos 1000 registros
        if (this.emqHistory.length > 1000) {
            this.emqHistory = this.emqHistory.slice(-1000);
        }

        // Salvar no Supabase (opcional)
        try {
            if (this.supabase) {
                await this.supabase
                    .from('emq_scores')
                    .insert(record);
            }
        } catch (error) {
            console.log('ℹ️ EMQ Storage: Não foi possível salvar no Supabase (continuando...)');
        }

        console.log(`📊 EMQ Score Recorded: ${score}/100 (${this.getEMQGrade(score)})`);
    }

    /**
     * Análise de tendências EMQ
     */
    analyzeEMQTrends() {
        if (this.emqHistory.length < 5) return;

        const recent = this.emqHistory.slice(-20);
        const avgScore = recent.reduce((sum, record) => sum + record.score, 0) / recent.length;
        const trend = this.calculateTrend(recent);

        console.log(`📈 EMQ Trends: Score médio: ${avgScore.toFixed(1)}, Tendência: ${trend}`);

        // Alertas automáticos
        if (avgScore < this.thresholds.poor) {
            console.warn(`⚠️ EMQ Alert: Score médio baixo detectado (${avgScore.toFixed(1)})`);
            this.triggerOptimizationAlert();
        }
    }

    /**
     * Recomendações de otimização
     */
    getOptimizationRecommendations(scoreDetails) {
        const recommendations = [];

        if (scoreDetails.email === 0) {
            recommendations.push('✅ Coletar e hashar email do usuário (+25 pontos)');
        }
        if (scoreDetails.phone === 0) {
            recommendations.push('✅ Coletar e hashar telefone do usuário (+20 pontos)');
        }
        if (scoreDetails.ip === 0) {
            recommendations.push('✅ Capturar IP do cliente (+8 pontos)');
        }
        if (scoreDetails.tiktokParams === 0) {
            recommendations.push('✅ Implementar captura de parâmetros TikTok (+7 pontos)');
        }
        if (scoreDetails.userAgent === 0) {
            recommendations.push('✅ Capturar User-Agent completo (+10 pontos)');
        }

        return recommendations;
    }

    // Métodos auxiliares
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    isValidIP(ip) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    hashData(data) {
        return crypto.createHash('sha256').update(data.toString()).digest('base64');
    }

    extractClientIP(request) {
        return request.headers['x-forwarded-for']?.split(',')[0] ||
               request.headers['x-real-ip'] ||
               request.headers['x-client-ip'] ||
               request.connection?.remoteAddress ||
               request.socket?.remoteAddress ||
               request.ip ||
               '127.0.0.1';
    }

    getEMQGrade(score) {
        if (score >= this.thresholds.excellent) return 'EXCELLENT';
        if (score >= this.thresholds.good) return 'GOOD';
        if (score >= this.thresholds.poor) return 'FAIR';
        return 'POOR';
    }

    estimateEMQScore(userData) {
        let estimate = 0;
        if (userData.email) estimate += 25;
        if (userData.phone) estimate += 20;
        if (userData.ip) estimate += 8;
        if (userData.userAgent) estimate += 10;
        estimate += 15; // Base score para outros dados
        return Math.min(estimate, 100);
    }

    calculateTrend(records) {
        if (records.length < 2) return 'STABLE';
        const first = records.slice(0, Math.floor(records.length / 2));
        const second = records.slice(Math.floor(records.length / 2));
        const firstAvg = first.reduce((sum, r) => sum + r.score, 0) / first.length;
        const secondAvg = second.reduce((sum, r) => sum + r.score, 0) / second.length;
        const diff = secondAvg - firstAvg;
        if (diff > 5) return 'IMPROVING';
        if (diff < -5) return 'DECLINING';
        return 'STABLE';
    }

    triggerOptimizationAlert() {
        console.log('🚨 EMQ Optimization Alert Triggered - Implementing auto-optimizations...');
        // Aqui poderia implementar otimizações automáticas
    }

    /**
     * Relatório de status EMQ
     */
    getEMQReport() {
        const recent = this.emqHistory.slice(-50);
        if (recent.length === 0) {
            return {
                status: 'NO_DATA',
                message: 'Nenhum dado EMQ disponível'
            };
        }

        const avgScore = recent.reduce((sum, record) => sum + record.score, 0) / recent.length;
        const distribution = {
            excellent: recent.filter(r => r.score >= this.thresholds.excellent).length,
            good: recent.filter(r => r.score >= this.thresholds.good && r.score < this.thresholds.excellent).length,
            fair: recent.filter(r => r.score >= this.thresholds.poor && r.score < this.thresholds.good).length,
            poor: recent.filter(r => r.score < this.thresholds.poor).length
        };

        return {
            avgScore: avgScore.toFixed(1),
            grade: this.getEMQGrade(avgScore),
            totalEvents: recent.length,
            distribution,
            trend: this.calculateTrend(recent),
            lastUpdated: new Date().toISOString()
        };
    }
}

export default EMQMonitoringService;
