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
            console.warn('MERCADO_PAGO_ACCESS_TOKEN não configurado. Modo de demonstração ativado.');
            return res.json({
                success: true,
                init_point: `${req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'}/success?demo=true&cardId=${cardId}`,
                message: 'Modo de demonstração: Pagamento simulado'
            });
        }
        console.log('Access Token:', process.env.MERCADO_PAGO_ACCESS_TOKEN);

        // Obter base URL para callbacks
        let backendUrl = process.env.BACKEND_URL;
        if (!backendUrl || !backendUrl.startsWith('http')) {
            console.warn('BACKEND_URL não configurado ou inválido. Usando URL da requisição como fallback.');
            backendUrl = `${req.protocol}://${req.get('host')}`;
        }
        
        // Frontend URL para redirecionamentos
        const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
        
        console.log('Backend URL para webhooks:', backendUrl);
        console.log('Frontend URL para redirecionamentos:', frontendUrl);

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

        // Atualizar o objeto preferenceData:
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
                success: `${frontendUrl}/success.html`,
                failure: `${frontendUrl}/failure.html`,
                pending: `${frontendUrl}/pending.html`
            },
            external_reference: `${cardId}|${email}|${plano}`,
            notification_url: `${backendUrl}/webhook/mercadopago`,
            auto_return: 'approved'
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