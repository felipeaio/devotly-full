import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextResponse } from 'next/server';
import { supabaseMiddleware } from '../../_middleware';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async function handler(req) {
  console.log('\n=== INÍCIO DO PROCESSAMENTO DO WEBHOOK ===');
  console.log('Timestamp:', new Date().toISOString());

  // Para o Mercado Pago, precisamos aceitar a notificação mesmo que haja erros
  // para evitar retentativas desnecessárias
  try {
    // Inicialize o Supabase
    const middlewareResponse = await supabaseMiddleware(req);
    if (middlewareResponse instanceof NextResponse) {
      console.error('Erro no middleware do Supabase:', middlewareResponse.status);
      return new NextResponse('OK', { status: 200 });
    }

    const { supabase } = req;
    
    // Log detalhado da requisição
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let body = {};
    
    try {
      if (req.body) {
        const text = await req.text();
        body = JSON.parse(text);
      }
    } catch (error) {
      console.error('Erro ao fazer parse do body:', error.message);
    }
    
    // Log detalhado da requisição
    console.log('\n1. Dados da Requisição:');
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    console.log('Query:', JSON.stringify(searchParams, null, 2));
    console.log('Body:', JSON.stringify(body, null, 2));
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

    const payment = new Payment(client);

    // Get payment info with retry mechanism
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
          // Aguarde um pouco antes de tentar novamente (500ms, 1000ms, 1500ms)
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
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
      
      // Update card status
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
    } else {
      console.log(`Pagamento não aprovado. Status: ${paymentInfo.status}`);
    }

    console.log('\n=== FIM DO PROCESSAMENTO DO WEBHOOK ===');
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('\n❌ Erro geral no webhook:', {
      message: error.message,
      stack: error.stack
    });
    
    // Sempre retornar 200 para evitar retentativas do Mercado Pago
    return new NextResponse('OK', { status: 200 });
  }
}
