import express from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
const router = express.Router();

router.post('/create-preference', async (req, res) => {
    try {
        const { plano, email, cardId } = req.body;

        console.log('Dados recebidos:', { plano, email, cardId });

        // Verificar se todos os dados necessários foram enviados
        if (!plano || !email || !cardId) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos'
            });
        }

        // Inicializar o Mercado Pago com o token de acesso
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
        });

        // Definir preços e descrições
        const precos = {
            para_sempre: 297.00,
            anual: 97.00
        };

        const descricoes = {
            para_sempre: "Plano Para Sempre - Devotly",
            anual: "Plano Anual - Devotly"
        };

        // Criar o objeto de preferência
        const preferenceData = {
            items: [{
                id: cardId.toString(),
                title: descricoes[plano],
                unit_price: Number(precos[plano]),
                quantity: 1,
                currency_id: 'BRL'
            }],
            payer: {
                email: email
            },
            payment_methods: {
                installments: 12,
                excluded_payment_types: []
            },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/success.html`,
                failure: `${process.env.FRONTEND_URL}/failure.html`,
                pending: `${process.env.FRONTEND_URL}/pending.html`
            },
            auto_return: "approved",
            external_reference: `${cardId}|${email}|${plano}`,
            notification_url: `${process.env.NGROK_URL}/webhook/mercadopago`
        };

        console.log('Criando preferência:', JSON.stringify(preferenceData, null, 2));

        // Criar a preferência no Mercado Pago
        const preference = new Preference(client);
        const response = await preference.create(preferenceData);

        console.log('Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

        // Retornar os dados necessários
        res.json({
            success: true,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point || response.init_point
        });

    } catch (error) {
        console.error('Erro ao criar preferência:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar checkout',
            details: error.message
        });
    }
});

// Webhook para receber notificações do Mercado Pago
router.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        console.log('Webhook recebido:', { type, data });

        if (type === 'payment') {
            const paymentId = data.id;
            
            // Buscar informações do pagamento
            const payment = await client.payment.findById(paymentId);
            
            if (payment.status === 'approved') {
                const [cardId, email, plano] = payment.external_reference.split('|'); // Atualizado para cardId|email|plano
                
                // Atualizar status no Supabase
                const { error } = await req.supabase
                    .from('cards')
                    .update({ 
                        status_pagamento: 'aprovado',
                        payment_id: paymentId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', email);

                if (error) {
                    console.error('Erro ao atualizar status:', error);
                }
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).send('Error');
    }
});

export default router;