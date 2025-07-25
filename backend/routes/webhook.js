import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmationEmail } from '../services/emailService.js';
import tiktokEventsV3 from '../services/tiktokEventsV3.js';
import QRCode from 'qrcode';
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        service: 'Webhook Service',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/webhook/debug/payment/:paymentId',
            '/webhook/manual-process/:paymentId',
            '/webhook/mercadopago'
        ]
    });
});

// Status endpoint
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        service: 'Devotly Webhook',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Rota de debug para verificar pagamento específico
router.get('/debug/payment/:paymentId', async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        console.log(`🔍 DEBUG: Verificando pagamento ${paymentId}`);
        
        // Configurar Mercado Pago
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
            options: { timeout: 10000 }
        });
        const payment = new Payment(client);
        
        // Buscar dados do pagamento
        const paymentInfo = await payment.get({ id: paymentId });
        console.log('Dados do pagamento:', JSON.stringify(paymentInfo, null, 2));
        
        // Verificar se existe cartão associado
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        
        const externalReference = paymentInfo.external_reference;
        let cardId = null;
        if (externalReference) {
            cardId = externalReference.split('|')[0];
        }
        
        let cardData = null;
        if (cardId) {
            const { data } = await supabase
                .from('cards')
                .select('*')
                .eq('id', cardId)
                .single();
            cardData = data;
        }
        
        return res.json({
            success: true,
            paymentInfo,
            cardId,
            cardData,
            canProcess: paymentInfo.status === 'approved' && cardData
        });
        
    } catch (error) {
        console.error('Erro no debug:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para processar pagamento manualmente quando webhook falha
router.post('/manual-process/:paymentId', async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        console.log(`🔄 PROCESSAMENTO MANUAL: Pagamento ${paymentId}`);
        
        // Buscar dados do pagamento
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
            options: { timeout: 10000 }
        });
        const payment = new Payment(client);
        
        const paymentInfo = await payment.get({ id: paymentId });
        console.log('Status do pagamento:', paymentInfo.status);
        
        if (paymentInfo.status !== 'approved') {
            return res.json({
                success: false,
                message: `Pagamento não aprovado. Status: ${paymentInfo.status}`
            });
        }
        
        // Processar como se fosse webhook
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        
        const externalReference = paymentInfo.external_reference;
        if (!externalReference) {
            throw new Error('External reference não encontrada');
        }
        
        const [cardId, email, plano] = externalReference.split('|');
        console.log('Dados extraídos:', { cardId, email, plano });
        
        // Buscar cartão no banco
        const { data: cardData, error: cardError } = await supabase
            .from('cards')
            .select('*')
            .eq('id', cardId)
            .single();
            
        if (cardError || !cardData) {
            throw new Error(`Cartão não encontrado: ${cardError?.message}`);
        }
        
        // Atualizar status do pagamento
        const { error: updateError } = await supabase
            .from('cards')
            .update({
                status_pagamento: 'aprovado',
                payment_id: paymentId,
                payment_data: paymentInfo,
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId);
            
        if (updateError) {
            throw new Error(`Erro ao atualizar cartão: ${updateError.message}`);
        }
        
        // Enviar email de confirmação
        try {
            await sendPaymentConfirmationEmail(email, cardData);
            console.log('✅ Email de confirmação enviado');
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
        }
        
        // Disparar evento TikTok Purchase
        try {
            const planValues = { 'para_sempre': 17.99, 'anual': 8.99 };
            const planValue = planValues[plano] || parseFloat(paymentInfo.total_amount) || 0;
            
            const context = {
                user_agent: req.headers['user-agent'],
                ip: req.ip || req.connection.remoteAddress,
                source: 'manual_processing'
            };
            
            const userData = {
                email: email,
                external_id: `user_${cardId}`
            };
            
            await tiktokEventsV3.trackPurchase(
                cardId,
                `Plano Devotly ${plano}`,
                planValue,
                'BRL',
                'digital_service',
                context,
                userData
            );
            
            console.log('✅ Evento TikTok Purchase enviado');
        } catch (tiktokError) {
            console.error('❌ Erro ao enviar evento TikTok:', tiktokError);
        }
        
        return res.json({
            success: true,
            message: 'Pagamento processado com sucesso',
            cardId,
            redirectUrl: `https://devotly.shop/success.html?payment_id=${paymentId}&external_reference=${encodeURIComponent(externalReference)}`
        });
        
    } catch (error) {
        console.error('Erro no processamento manual:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/mercadopago', async (req, res) => {
    console.log('\n=== INÍCIO DO PROCESSAMENTO DO WEBHOOK ===');
    console.log('Timestamp:', new Date().toISOString());

    try {
        // Log detalhado da requisição
        console.log('\n1. Dados da Requisição:');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Topic:', req.query.topic || req.body.type);
        console.log('Action:', req.body.action);

        // Verificar o tipo de notificação
        const topic = req.query.topic || req.body.type;
        if (topic === 'merchant_order') {
            console.log('Notificação de merchant_order ignorada');
            return res.status(200).send('OK');
        }
        if (topic !== 'payment') {
            console.log(`Notificação ignorada: topic ${topic} não é 'payment'`);
            return res.status(200).send('OK');
        }

        // Initialize Supabase
        console.log('\n2. Inicializando Supabase...');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        console.log('Supabase inicializado com', process.env.SUPABASE_SERVICE_KEY ? 'chave de serviço' : 'chave anônima');

        // Get payment ID
        let paymentId = req.body.data?.id || req.query['data.id'] || req.body.id || req.query.id;
        console.log('\n3. Identificação do Payment ID:');
        console.log('Payment ID encontrado:', paymentId);
        console.log('Fontes possíveis:', {
            bodyDataId: req.body.data?.id,
            queryDataId: req.query['data.id'],
            bodyId: req.body.id,
            queryId: req.query.id
        });

        if (!paymentId) {
            console.log('❌ Nenhum payment_id encontrado');
            return res.status(200).send('OK');
        }

        // Configure Mercado Pago client
        console.log('\n4. Configurando cliente Mercado Pago...');
        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
            throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
        }
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
            options: { timeout: 5000 }
        });
        console.log('Cliente MP configurado');

        const payment = new Payment(client);

        // Get payment info with retry mechanism
        console.log('\n5. Buscando informações do pagamento...');
        let paymentInfo = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries && !paymentInfo) {
            try {
                console.log(`Tentativa ${retryCount + 1} de buscar pagamento ${paymentId}...`);
                const response = await payment.get({ id: paymentId });
                paymentInfo = response; // Usar response diretamente
                console.log('Resposta do Mercado Pago:', JSON.stringify(paymentInfo, null, 2));
                break;
            } catch (error) {
                console.error(`Erro na tentativa ${retryCount + 1}:`, {
                    message: error.message,
                    status: error.status,
                    cause: error.cause
                });
                retryCount++;
                if (retryCount < maxRetries) {
                    console.log('Aguardando 1 segundo antes de tentar novamente...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (!paymentInfo) {
            throw new Error(`Não foi possível obter informações do pagamento ${paymentId} após ${maxRetries} tentativas`);
        }

        console.log('\n6. Status do pagamento:', paymentInfo.status);

        // Só processar se o pagamento foi realmente aprovado
        if (paymentInfo.status !== 'approved') {
            console.log(`Status do pagamento não aprovado: ${paymentInfo.status}. Finalizando processamento.`);
            return res.status(200).send('OK');
        }

        const externalReference = paymentInfo.external_reference;
        if (!externalReference) {
            throw new Error('external_reference não encontrado no pagamento');
        }

        const [cardId, email, plano] = externalReference.split('|');
        if (!cardId) {
            throw new Error('cardId inválido em external_reference');
        }
        console.log('\n7. Dados extraídos:', { cardId, email, plano });
        
        // Rastrear evento de compra através do TikTok API Events V3
        try {
            console.log('\n7.1. Enviando evento de compra para TikTok API Events V3...');
            const planValues = { 'para_sempre': 17.99, 'anual': 8.99 };
            const planValue = planValues[plano] || parseFloat(paymentInfo.total_amount) || 0;
            
            // Preparar contexto do request
            const context = {
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
                user_agent: req.headers['user-agent'] || '',
                url: `${process.env.FRONTEND_URL}/create`,
                referrer: '',
                order_id: `order_${cardId}_${paymentId}`,
                timestamp: Math.floor(Date.now() / 1000)
            };
            
            // Preparar dados do usuário
            const userData = {
                email: email || '',
                phone: paymentInfo.payer?.phone?.number || '',
                external_id: email ? `devotly_${email}_${cardId}` : null
            };
            
            // Enviar evento de compra com V3 otimizado
            await tiktokEventsV3.trackPurchase(
                cardId,
                `Plano Devotly ${plano}`,
                planValue,
                'BRL',
                'digital_service',
                context,
                userData
            );
            console.log(`[${new Date().toISOString()}] ✅ TikTok Purchase event V3 tracked for card: ${cardId}, plan: ${plano}, value: ${planValue}`);
        } catch (tikTokError) {
            console.error(`[${new Date().toISOString()}] ⚠️ Erro ao rastrear TikTok Purchase V3:`, tikTokError.message);
            // Continuamos o fluxo mesmo se o evento falhar
        }

        // Verificar se o cartão existe
        console.log('\n8. Verificando cartão no Supabase...');
        const { data: card, error: fetchError } = await supabase
            .from('cards')
            .select('*')
            .eq('id', cardId)
            .single();

        if (fetchError || !card) {
            console.error('Erro ao buscar cartão:', JSON.stringify(fetchError, null, 2));
            throw new Error(`Cartão com ID ${cardId} não encontrado`);
        }
        console.log('Cartão encontrado:', JSON.stringify(card, null, 2));

        // Verificar se este payment_id já foi processado para evitar processamento duplicado
        console.log('\n8.3. Verificando se payment_id já foi processado...');
        if (card.payment_id === paymentId) {
            console.log('✅ Este payment_id já foi processado. Evitando processamento duplicado.');
            return res.status(200).send('OK');
        }

        // Verificar se o cartão já tem status aprovado e email enviado
        console.log('\n8.4. Verificando status atual do cartão...');
        if (card.status_pagamento === 'aprovado' && card.email_sent) {
            console.log('✅ Cartão já aprovado e email já enviado. Evitando reprocessamento.');
            return res.status(200).send('OK');
        }        // Verificar se o email já foi enviado para evitar duplicatas
        console.log('\n8.5. Verificando se email já foi enviado...');
        if (card.email_sent) {
            console.log('✅ Email já foi enviado anteriormente para este cartão. Pulando reenvio.');
            return res.status(200).send('OK');
        }

        // Verificar se o email está sendo processado por outra instância
        if (card.email_sending) {
            console.log('✅ Email já está sendo processado por outra instância. Pulando reenvio.');
            return res.status(200).send('OK');
        }// DUAS ETAPAS: (1) Atualizar status de pagamento, (2) Enviar email
        console.log('\n9. Atualizando status do pagamento para APROVADO...');
        
        // PRIMEIRA ETAPA: Atualizar status do pagamento independente do email
        const { data: paymentUpdateData, error: paymentUpdateError } = await supabase
            .from('cards')
            .update({
                status_pagamento: 'aprovado',
                payment_id: paymentId,
                updated_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .select();
            
        if (paymentUpdateError) {
            console.error('❌ Erro ao atualizar status do pagamento:', paymentUpdateError);
            throw new Error(`Erro ao atualizar status: ${paymentUpdateError.message}`);
        }
            
        console.log('✅ Status do pagamento atualizado com sucesso para APROVADO');
          // SEGUNDA ETAPA: Tentar reservar o envio de email
        console.log('\n9.1. Tentando reservar envio de email...');        const { data: reservationData, error: reservationError } = await supabase
            .from('cards')
            .update({
                email_sending: true
                // NÃO marcar email_sent como true ainda - só após envio bem-sucedido
            })
            .eq('id', cardId)
            .eq('email_sent', false) // Só atualiza se email ainda não foi enviado
            .eq('email_sending', false) // E se não está sendo processado
            .select();

        if (reservationError) {
            console.error('❌ Erro ao reservar processamento:', JSON.stringify(reservationError, null, 2));
            throw new Error(`Erro ao reservar processamento: ${reservationError.message}`);
        }

        if (!reservationData || reservationData.length === 0) {
            console.log('✅ Cartão já está sendo processado por outra instância. Finalizando.');
            return res.status(200).send('OK');
        }

        console.log('\n✅ Processamento reservado com sucesso:', JSON.stringify(reservationData, null, 2));
        
        // Agora que temos a reserva exclusiva, enviar o email
        try {
            console.log('\n10. Preparando envio de email de confirmação...');
            
            // URL base do frontend
            const frontendUrl = process.env.FRONTEND_URL;
            
            if (!frontendUrl) {
                console.warn('⚠️ Variável de ambiente FRONTEND_URL não configurada. Usando URL padrão.');
            }
            
            // URL completa do cartão
            const cardUrl = `${frontendUrl || 'https://devotly.shop'}/view?id=${cardId}`;
            
            // Extrair nome e título do cartão dos dados
            const cardData = reservationData[0];
            const name = email.split('@')[0]; // Usa a primeira parte do email como nome se não houver outro
            const title = cardData.conteudo?.cardTitle || 'Seu Cartão Cristão';
            
            console.log(`Enviando email para ${email} com link: ${cardUrl}`);
            
            // Enviar o email
            const emailResult = await sendPaymentConfirmationEmail({
                email,
                cardId,
                name,
                title,
                cardUrl            });
            
            console.log('\n✅ Email enviado com sucesso:', emailResult);
            
            // Marcar email como enviado somente após sucesso
            await supabase
                .from('cards')
                .update({
                    email_sent: true,
                    email_sent_at: new Date().toISOString(),
                    email_sending: false
                })
                .eq('id', cardId);
            
            console.log('✅ Status de email atualizado para enviado');
            
        } catch (emailError) {
            // Se falhar no envio do email, reverter o status para permitir nova tentativa
            console.error('\n⚠️ Erro ao enviar email de confirmação:', emailError);
            console.error('Detalhes:', emailError.message);
              try {
                console.log('Revertendo status email_sending para permitir nova tentativa...');
                await supabase
                    .from('cards')
                    .update({
                        email_sent: false,
                        email_sent_at: null,
                        email_sending: false
                    })
                    .eq('id', cardId);
                console.log('Status revertido com sucesso.');
            } catch (revertError) {
                console.error('Erro ao reverter status:', revertError);
            }
            
            // Não falha o webhook, mas loga o erro
            console.error('Email não pôde ser enviado, mas pagamento foi processado.');
        }

        console.log('\n=== FIM DO PROCESSAMENTO DO WEBHOOK ===');
        return res.status(200).send('OK');
    } catch (error) {
        console.error('\n❌ Erro geral no webhook:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            query: req.query
        });
        return res.status(200).send('OK');
    }
});

export default router;