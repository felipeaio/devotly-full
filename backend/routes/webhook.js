import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
const router = express.Router();

router.post('/mercadopago', async (req, res) => {
    try {
        console.log('Webhook recebido:', {
            query: req.query,
            body: req.body
        });

        const { type, action, data } = req.body;
        
        // Primeiro, verificar se é uma notificação de pagamento
        if ((type === 'payment' || action === 'payment.created') && data?.id) {
            console.log(`Processando pagamento ID: ${data.id}`);

            try {
                // Configurar cliente do Mercado Pago
                const client = new MercadoPagoConfig({
                    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
                });

                // Criar instância de Payment
                const payment = new Payment(client);

                // Buscar informações do pagamento - Correção aqui
                const paymentInfo = await payment.get({
                    id: data.id // Mudança importante aqui
                });

                console.log('Informações do pagamento:', paymentInfo);

                // Verificar se o pagamento foi aprovado
                if (paymentInfo.status === 'approved') {
                    // Extrair informações do external_reference
                    const [cardId, email, plano] = paymentInfo.external_reference.split('|');

                    console.log('Atualizando status do cartão:', {
                        cardId,
                        email,
                        plano,
                        status: 'aprovado'
                    });

                    // Atualizar status no Supabase
                    const { error } = await req.supabase
                        .from('cards')
                        .update({
                            status_pagamento: 'aprovado',
                            payment_id: data.id,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', cardId);

                    if (error) {
                        console.error('Erro ao atualizar status:', error);
                        throw error;
                    }

                    console.log('Status atualizado com sucesso');
                } else {
                    console.log(`Status do pagamento: ${paymentInfo.status}`);
                }
            } catch (paymentError) {
                console.error('Erro ao processar pagamento:', {
                    message: paymentError.message,
                    stack: paymentError.stack,
                    response: paymentError.response?.data
                });
                throw paymentError;
            }
        }

        // Sempre retornar 200 para o Mercado Pago
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Erro no webhook:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        
        // Ainda retornar 200 para o Mercado Pago não retentar
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;