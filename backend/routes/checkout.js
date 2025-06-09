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
        console.log('Access Token:', process.env.MERCADO_PAGO_ACCESS_TOKEN);        // Obter base URL para callbacks
        let backendUrl = process.env.BACKEND_URL;
        if (!backendUrl || !backendUrl.startsWith('http')) {
            console.warn('BACKEND_URL não configurado ou inválido. Usando URL da requisição como fallback.');
            backendUrl = `${req.protocol}://${req.get('host')}`;
        }
        
        // Garantir que não há duplicação de barras
        backendUrl = backendUrl.replace(/\/+$/, ''); // Remove barras finais
        
        // Frontend URL para redirecionamentos
        let frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';
        frontendUrl = frontendUrl.replace(/\/+$/, ''); // Remove barras finais
        
        // Validação adicional das URLs
        if (!backendUrl.startsWith('http')) {
            console.error('ERRO: BACKEND_URL inválida:', backendUrl);
            return res.status(500).json({
                success: false,
                error: 'Configuração inválida do servidor'
            });
        }
        
        if (!frontendUrl.startsWith('http')) {
            console.error('ERRO: FRONTEND_URL inválida:', frontendUrl);
            return res.status(500).json({
                success: false,
                error: 'Configuração inválida do servidor'
            });
        }
        
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
        };        // Atualizar o objeto preferenceData
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
            },            back_urls: {
                success: `${backendUrl}/success`,
                failure: `${backendUrl}/failure`,
                pending: `${backendUrl}/pending`
            },
            external_reference: `${cardId}|${email}|${plano}`,
            notification_url: `${backendUrl}/webhook/mercadopago`,            auto_return: 'approved',
            binary_mode: false, // Configurado como false para garantir que o webhook seja chamado
            payment_methods: {
                excluded_payment_types: [],
                excluded_payment_methods: [],
                installments: 12
            }
        };        console.log('Criando preferência:', JSON.stringify(preferenceData, null, 2));
        console.log('Configurando back_urls:', {
            success: `${backendUrl}/success`,
            failure: `${backendUrl}/failure`,
            pending: `${backendUrl}/pending`
        });
        console.log('Variáveis de ambiente relevantes:', {
            BACKEND_URL: process.env.BACKEND_URL,
            FRONTEND_URL: process.env.FRONTEND_URL,
            backendUrl_computed: backendUrl,
            frontendUrl_computed: frontendUrl
        });

        // Criar a preferência
        const preference = new Preference(client);
        const response = await preference.create({ body: preferenceData });

        console.log('Resposta do Mercado Pago:', JSON.stringify(response, null, 2));        // Retornar resposta
        const responseData = {
            success: true,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point || response.init_point,
            preference_id: response.id,
            back_urls: preferenceData.back_urls
        };
        
        console.log('Retornando resposta:', JSON.stringify(responseData, null, 2));
        
        return res.json(responseData);

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