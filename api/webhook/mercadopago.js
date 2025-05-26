import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextResponse } from 'next/server';
import { supabaseClient } from '../lib/supabase';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

/**
 * Handler de webhook para processar notificações do Mercado Pago
 * Configurado para Edge Functions na Vercel
 */
export default async function handler(req) {
  console.log('\n=== INÍCIO DO PROCESSAMENTO DO WEBHOOK ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // Tratamento CORS para permitir requests do Mercado Pago
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Para o Mercado Pago, precisamos aceitar a notificação mesmo que haja erros
  // para evitar retentativas desnecessárias
  try {    // Inicialize o Supabase
    const { supabase, error } = supabaseClient(req);
    if (error) {
      console.error('Erro ao inicializar Supabase:', error);
      return new NextResponse('OK', { status: 200 });
    }
      // Log detalhado da requisição
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let body = {};
    
    try {
      if (req.body) {
        // Em Edge Functions, precisamos clonar a request antes de ler o body
        // para evitar o erro "Body already used"
        const clonedReq = req.clone();
        const text = await clonedReq.text();
        if (text && text.trim()) {
          body = JSON.parse(text);
        }
      }
    } catch (error) {
      console.error('Erro ao fazer parse do body:', error.message);
    }
      // Log detalhado da requisição (com mascaramento de dados sensíveis)
    console.log('\n1. Dados da Requisição:');
    // Mascara dados sensíveis nos headers antes de logar
    const safeHeaders = Object.fromEntries(req.headers.entries());
    if (safeHeaders.authorization) {
      safeHeaders.authorization = '****MASKED****';
    }
    console.log('Headers:', JSON.stringify(safeHeaders, null, 2));
    console.log('Query:', JSON.stringify(searchParams, null, 2));
    
    // Mascara possíveis dados sensíveis no body
    const safeBody = {...body};
    if (safeBody.card) {
      if (safeBody.card.card_number) safeBody.card.card_number = '****MASKED****';
      if (safeBody.card.security_code) safeBody.card.security_code = '****MASKED****';
    }
    console.log('Body:', JSON.stringify(safeBody, null, 2));
    console.log('Topic:', searchParams.topic || body.type);
    console.log('Action:', body.action);

    // Verificar o tipo de notificação
    const topic = searchParams.topic || body.type;
    if (topic === 'merchant_order') {
      console.log('Notificação de merchant_order ignorada');
      return new NextResponse('OK', { status: 200 });
    }
    if (topic !== 'payment') {
      console.log(`Notificação ignorada: topic ${topic} não é 'payment'`);
      return new NextResponse('OK', { status: 200 });
    }

    // Get payment ID
    let paymentId = body.data?.id || searchParams['data.id'] || body.id || searchParams.id;
    console.log('\n3. Identificação do Payment ID:');
    console.log('Payment ID encontrado:', paymentId);
    console.log('Fontes possíveis:', {
      bodyDataId: body.data?.id,
      queryDataId: searchParams['data.id'],
      bodyId: body.id,
      queryId: searchParams.id
    });

    if (!paymentId) {
      console.log('❌ Nenhum payment_id encontrado');
      return new NextResponse('OK', { status: 200 });
    }

    // Configure Mercado Pago client
    console.log('\n4. Configurando cliente Mercado Pago...');
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return new NextResponse('OK', { status: 200 });
    }
    
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
    console.log('Cliente MP configurado');

    const payment = new Payment(client);    // Get payment info with retry mechanism - otimizado para Edge Functions
    console.log('\n5. Buscando informações do pagamento...');
    let paymentInfo = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries && !paymentInfo) {
      try {
        const result = await payment.get({ id: paymentId });
        paymentInfo = result;
        console.log(`✓ Informações do pagamento obtidas na tentativa ${retryCount + 1}`);
      } catch (error) {
        retryCount++;
        console.error(`Erro ao obter informações do pagamento (tentativa ${retryCount}/${maxRetries}):`, error.message);
          if (retryCount < maxRetries) {
          // Espera exponencial entre tentativas (200ms, 400ms, 800ms) - melhor para Edge Functions
          await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retryCount - 1)));
        }
      }
    }

    if (!paymentInfo) {
      console.error(`❌ Falha ao obter informações do pagamento após ${maxRetries} tentativas`);
      return new NextResponse('OK', { status: 200 });
    }

    console.log('\n6. Status do pagamento:', paymentInfo.status);

    // Process payment
    if (paymentInfo.status === 'approved') {
      // Extract card information from external_reference
      const externalRef = paymentInfo.external_reference;
      const [cardId, email, plano] = externalRef.split('|');
      
      console.log('\n7. Dados extraídos:', { cardId, email, plano });
      
      if (!cardId || !email || !plano) {
        console.error('❌ Dados insuficientes na external_reference');
        return new NextResponse('OK', { status: 200 });
      }
        // Update card status - com tratamento de erros melhorado
      try {
        const { error } = await supabase
          .from('cards')
          .update({
            pagamento_status: 'approved',
            pagamento_data: new Date().toISOString(),
            pagamento_id: paymentId,
            ativo: true
          })
          .eq('id', cardId);
        
        if (error) {
          console.error('❌ Erro ao atualizar status do cartão:', error.message);
        } else {
          console.log('✓ Status do cartão atualizado com sucesso');
        }
      } catch (dbError) {
        console.error('❌ Exceção ao atualizar o banco de dados:', dbError.message);
      }
    } else {
      console.log(`Pagamento não aprovado. Status: ${paymentInfo.status}`);
    }

  console.log('\n=== FIM DO PROCESSAMENTO DO WEBHOOK ===');
    // Adiciona headers específicos para garantir melhor compatibilidade com o Mercado Pago
    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('\n❌ Erro geral no webhook:', {
      message: error.message,
      stack: error.stack
    });
    
    // Sempre retornar 200 para evitar retentativas do Mercado Pago
    // Com os headers adequados
    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
