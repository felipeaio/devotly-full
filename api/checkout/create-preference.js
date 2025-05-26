import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { supabaseClient } from '../lib/supabase';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async function handler(req) {
  // Tratamento CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  // Inicialize o Supabase
  const { supabase, error } = supabaseClient(req);
  if (error) {
    return error; // Retorna erro se houver problemas com o cliente Supabase
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { plano, email, cardId } = body;

      console.log('Dados recebidos:', { plano, email, cardId });

      // Validação inicial
      if (!plano || !email || !cardId) {
        return NextResponse.json({
          success: false,
          error: 'Dados incompletos: plano, email e cardId são obrigatórios'
        }, { status: 400 });
      }

      // Validar plano
      const validPlans = ['para_sempre', 'anual'];
      if (!validPlans.includes(plano)) {
        return NextResponse.json({
          success: false,
          error: 'Plano inválido'
        }, { status: 400 });
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({
          success: false,
          error: 'Email inválido'
        }, { status: 400 });
      }

      // Verificar access token
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
        return NextResponse.json({
          success: false,
          error: 'Configuração de pagamento incompleta'
        }, { status: 500 });
      }      // Usar URL de callback do ambiente ou frontend_url
      const frontendUrl = process.env.FRONTEND_URL || 'https://devotly.shop';

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

      // Criar dados da preferência
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
          success: `${frontendUrl}/success`,
          failure: `${frontendUrl}/failure`,
          pending: `${frontendUrl}/pending`
        },
        external_reference: `${cardId}|${email}|${plano}`,
        notification_url: `https://devotly.shop/api/webhook/mercadopago`,
        auto_return: 'approved'
      };

      console.log('Criando preferência:', JSON.stringify(preferenceData, null, 2));

      // Criar a preferência
      const preference = new Preference(client);
      const response = await preference.create({ body: preferenceData });

      console.log('Resposta do Mercado Pago:', JSON.stringify(response, null, 2));

      // Retornar resposta
      return NextResponse.json({
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
      
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar checkout',
        details: error.message,
        mpResponse: error.response?.data
      }, { status: 500 });
    }
  }

  // Resposta padrão para outros métodos
  return NextResponse.json({
    success: false,
    error: 'Método não suportado'
  }, { status: 405 });
}
