import express from 'express';
import { MercadoPagoConfig } from 'mercadopago';
const router = express.Router();

router.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;
        console.log('Webhook recebido:', { type, data });

        if (!req.supabase) {
            throw new Error('Cliente Supabase não inicializado');
        }

        if (type === 'payment' && data?.id) {
            const paymentId = data.id;
            console.log(`Processando pagamento ID: ${paymentId}`);

            // Verificar access token
            if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
                throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
            }
            console.log('Access Token:', process.env.MERCADO_PAGO_ACCESS_TOKEN);

            // Inicializar Mercado Pago
            const client = new MercadoPagoConfig({
                accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
                options: { timeout: 5000 }
            });

            // Buscar informações do pagamento
            const payment = await client.payment.findById(paymentId);
            console.log('Pagamento encontrado:', JSON.stringify(payment, null, 2));

            if (payment.status === 'approved') {
                if (!payment.external_reference) {
                    throw new Error('external_reference não encontrado no pagamento');
                }

                const [cardId, email, plano] = payment.external_reference.split('|');
                if (!cardId) {
                    throw new Error('cardId inválido em external_reference');
                }
                console.log('Dados extraídos:', { cardId, email, plano });

                // Verificar se o cartão existe
                const { data: card, error: fetchError } = await req.supabase
                    .from('cards')
                    .select('*')
                    .eq('id', cardId)
                    .single();

                if (fetchError || !card) {
                    console.error('Erro ao buscar cartão:', JSON.stringify(fetchError, null, 2));
                    throw new Error(`Cartão com ID ${cardId} não encontrado`);
                }
                console.log('Cartão encontrado:', JSON.stringify(card, null, 2));

                // Atualizar status no Supabase
                const { data, error } = await req.supabase
                    .from('cards')
                    .update({
                        status_pagamento: 'aprovado',
                        payment_id: paymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', cardId)
                    .select();

                if (error) {
                    console.error('Erro ao atualizar status no Supabase:', JSON.stringify(error, null, 2));
                    throw new Error(`Erro ao atualizar Supabase: ${error.message}`);
                }

                console.log('Status atualizado no Supabase:', JSON.stringify(data, null, 2));
            } else {
                console.log(`Pagamento não aprovado. Status: ${payment.status}`);
            }
        } else {
            console.log('Notificação ignorada: tipo não é payment ou data.id ausente');
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        return res.status(500).send('Error');
    }
});

export default router;