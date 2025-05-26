// Mercado Pago Webhook API endpoint
import { getSupabaseClient, setCorsHeaders, handleCorsOptions } from '../../utils/supabaseClient';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleCorsOptions(req, res)) return;
  
  // Set CORS headers
  setCorsHeaders(res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }
  
  console.log('\n=== INÍCIO DO PROCESSAMENTO DO WEBHOOK ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Log detalhado da requisição
    console.log('\n1. Dados da Requisição:');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Topic:', req.query.topic || req.body.type);
    console.log('Action:', req.body.action);
    
    // Verificar o tipo de notificação
    const topic = req.query.topic || req.body.type;
    if (topic === 'merchant_order') {
      console.log('Notificação de merchant_order ignorada');
      return res.status(200).send('OK');
    }
    if (topic !== 'payment') {
      console.log(`Notificação ignorada: topic ${topic} não é 'payment'`);
      return res.status(200).send('OK');
    }
    
    // Initialize Supabase
    console.log('\n2. Inicializando Supabase...');
    const supabase = getSupabaseClient();
    console.log('Supabase inicializado');
    
    // Get payment ID
    let paymentId = req.body.data?.id || req.query['data.id'] || req.body.id || req.query.id;
    console.log('\n3. Identificação do Payment ID:');
    console.log('Payment ID encontrado:', paymentId);
    console.log('Fontes possíveis:', {
      bodyDataId: req.body.data?.id,
      queryDataId: req.query['data.id'],
      bodyId: req.body.id,
      queryId: req.query.id
    });
    
    if (!paymentId) {
      console.log('❌ Nenhum payment_id encontrado');
      return res.status(200).send('OK');
    }
    
    // Configure Mercado Pago client
    console.log('\n4. Configurando cliente Mercado Pago...');
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
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
        console.log(`Tentativa ${retryCount + 1} de buscar pagamento ${paymentId}...`);
        const response = await payment.get({ id: paymentId });
        paymentInfo = response;
        console.log('Resposta do Mercado Pago:', JSON.stringify(paymentInfo, null, 2));
        break;
      } catch (error) {
        console.error(`Erro na tentativa ${retryCount + 1}:`, {
          message: error.message,
          status: error.status,
          cause: error.cause
        });
        retryCount++;
        if (retryCount < maxRetries) {
          console.log('Aguardando 1 segundo antes de tentar novamente...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!paymentInfo) {
      throw new Error(`Não foi possível obter informações do pagamento ${paymentId} após ${maxRetries} tentativas`);
    }
    
    console.log('\n6. Status do pagamento:', paymentInfo.status);
    
    if (paymentInfo.status === 'approved') {
      const externalReference = paymentInfo.external_reference;
      if (!externalReference) {
        throw new Error('external_reference não encontrado no pagamento');
      }
      
      const [cardId, email, plano] = externalReference.split('|');
      if (!cardId) {
        throw new Error('cardId inválido em external_reference');
      }
      console.log('\n7. Dados extraídos:', { cardId, email, plano });
      
      // Verificar se o cartão existe
      console.log('\n8. Verificando cartão no Supabase...');
      const { data: card, error: fetchError } = await supabase
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
      console.log('\n9. Atualizando cartão no Supabase:', {
        cardId,
        paymentId,
        status: 'aprovado'
      });
      const { data, error } = await supabase
        .from('cards')
        .update({
          status_pagamento: 'aprovado',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId)
        .select();
      
      if (error) {
        console.error('❌ Erro ao atualizar no Supabase:', JSON.stringify(error, null, 2));
        throw new Error(`Erro ao atualizar Supabase: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.error('❌ Nenhum registro atualizado no Supabase');
        console.log('Dados da query:', { table: 'cards', cardId, condition: `id = ${cardId}` });
        throw new Error(`Nenhum registro atualizado para cardId: ${cardId}`);
      }
      
      console.log('\n✅ Status atualizado com sucesso:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Status do pagamento não aprovado: ${paymentInfo.status}`);
    }
    
    console.log('\n=== FIM DO PROCESSAMENTO DO WEBHOOK ===');
    return res.status(200).send('OK');
  } catch (error) {
    console.error('\n❌ Erro geral no webhook:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      query: req.query
    });
    return res.status(200).send('OK');
  }
}
