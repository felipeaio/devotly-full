/**
 * Teste de simulação de webhook do Mercado Pago
 * Simula um pagamento aprovado para testar o evento Purchase
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

async function simulateWebhook() {
    console.log('🧪 SIMULANDO WEBHOOK MERCADO PAGO');
    console.log('=================================');
    
    // Dados de um pagamento fictício aprovado
    const webhookData = {
        action: 'payment.updated',
        api_version: 'v1',
        data: {
            id: '9999999999' // Payment ID fictício
        },
        date_created: new Date().toISOString(),
        id: Date.now(),
        live_mode: false,
        type: 'payment',
        user_id: '123456789'
    };
    
    console.log('📊 Dados do webhook:', JSON.stringify(webhookData, null, 2));
    console.log('\n🚀 Enviando webhook para /webhook/mercadopago...\n');
    
    try {
        const response = await fetch(`${API_BASE_URL}/webhook/mercadopago`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MercadoPago Webhook'
            },
            body: JSON.stringify(webhookData)
        });
        
        console.log('📡 Resposta do webhook:');
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ Webhook processado com sucesso!');
        } else {
            console.log('\n❌ Erro no processamento do webhook');
        }
        
    } catch (error) {
        console.error('\n❌ Erro ao enviar webhook:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n🏁 Simulação de webhook finalizada');
}

// Aguardar um pouco para o servidor estar pronto
setTimeout(() => {
    simulateWebhook().catch(console.error);
}, 2000);
