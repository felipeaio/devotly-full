import express from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
const router = express.Router();

router.post('/create-preference', async (req, res) => {
    try {
        const { plano, email, cardId } = req.body;

        console.log('Dados recebidos:', { plano, email, cardId });

        // Validação inicial
        if (!plano || !email || !cardId) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos: plano, email e cardId são obrigatórios'
            });
        }

        // Validar plano
        const validPlans = ['para_sempre', 'anual'];
        if (!validPlans.includes(plano)) {
            return res.status(400).json({
                success: false,
                error: 'Plano inválido'
            });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }

        // Verificar access token
        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
            throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
        }
        console.log('Access Token:', process.env.MERCADO_PAGO_ACCESS_TOKEN);

        // Validar NGROK_URL
        if (!process.env.NGROK_URL || !process.env.NGROK_URL.startsWith('http')) {
            throw new Error('NGROK_URL inválido: deve começar com http ou https');
        }
        console.log('NGROK URL:', process.env.NGROK_URL);

        // Inicializar Mercado Pago
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
            options: { timeout: 5000 }
        });

        const precos = {
            para_sempre: 17.99,
            anual: 8.99
        };

        const descricoes = {
            para_sempre: 'Plano Para Sempre - Devotly',
            anual: 'Plano Anual - Devotly'
        };

        // Criar objeto de preferência
        const preferenceData = {
            items: [
                {
                    id: String(cardId),
                    title: descricoes[plano],
                    unit_price: Number(precos[plano].toFixed(2)),
                    quantity: 1,
                    currency_id: 'BRL'
                }
            ],
            payer: {
                email: email
            },
            back_urls: {
                success: `${process.env.NGROK_URL}/success`,
                failure: `${process.env.NGROK_URL}/failure`,
                pending: `${process.env.NGROK_URL}/pending`
            },
            external_reference: `${cardId}|${email}|${plano}`,
            notification_url: `${process.env.NGROK_URL}/webhook/mercadopago`,
            auto_return: 'approved',
            payment_methods: {
                installments: 12
            }
        };

        console.log('Criando preferência:', JSON.stringify(preferenceData, null, 2));

        // Criar a preferência
        const preference = new Preference(client);
        const response = await preference.create({ body: preferenceData });

        console.log('Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

        // Retornar resposta
        return res.json({
            success: true,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point || response.init_point
        });

    } catch (error) {
        console.error('Erro ao processar requisição:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar checkout',
            details: error.message,
            mpResponse: error.response?.data
        });
    }
});

export default router;