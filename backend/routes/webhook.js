import express from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
const router = express.Router();

// Inicializar o Mercado Pago com sua chave de acesso
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

router.post('/mercadopago', async (req, res) => {
    try {
        console.log('Webhook recebido:', {
            headers: req.headers,
            body: req.body,
            query: req.query
        });

        const { query } = req;
        const topic = query.topic || query.type;

        if (topic === 'payment') {
            const paymentId = query.id || query['data.id'];
            
            console.log('Processando pagamento:', paymentId);

            // Buscar detalhes do pagamento
            const payment = await client.payment.findById(Number(paymentId));
            console.log('[Webhook] Detalhes do pagamento:', payment);

            if (payment.status === 'approved') {
                const [cardId, email, plano] = payment.external_reference.split('|');
                
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
                        payment_id: paymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', cardId);

                if (error) {
                    console.error('Erro ao atualizar status:', error);
                    throw error;
                }

                console.log('Status atualizado com sucesso');
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;