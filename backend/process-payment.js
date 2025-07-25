/**
 * Processamento manual de pagamento para testar evento Purchase
 * Use este script com um Payment ID real do Mercado Pago
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

async function processPaymentManually(paymentId) {
    console.log('🔧 PROCESSAMENTO MANUAL DE PAGAMENTO');
    console.log('=====================================');
    console.log(`💳 Payment ID: ${paymentId}`);
    console.log(`🌐 Endpoint: ${API_BASE_URL}/webhook/manual-process/${paymentId}`);
    console.log('\n🚀 Enviando requisição...\n');
    
    try {
        const response = await fetch(`${API_BASE_URL}/webhook/manual-process/${paymentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Manual Processing Script'
            }
        });
        
        console.log('📡 Resposta do servidor:');
        console.log('Status:', response.status, response.statusText);
        
        const responseData = await response.json();
        console.log('Dados:', JSON.stringify(responseData, null, 2));
        
        if (response.ok && responseData.success) {
            console.log('\n✅ PAGAMENTO PROCESSADO COM SUCESSO!');
            console.log('🎯 Evento Purchase TikTok deve ter sido enviado!');
            
            if (responseData.redirectUrl) {
                console.log(`🔗 URL de sucesso: ${responseData.redirectUrl}`);
            }
        } else {
            console.log('\n❌ ERRO NO PROCESSAMENTO:');
            console.log('Mensagem:', responseData.message || 'Erro desconhecido');
        }
        
    } catch (error) {
        console.error('\n❌ Erro na requisição:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n🏁 Processamento manual finalizado');
}

// Verificar se foi fornecido um Payment ID
const paymentId = process.argv[2];

if (!paymentId) {
    console.log('❌ ERRO: Payment ID é obrigatório');
    console.log('\n📋 Como usar:');
    console.log('node process-payment.js <PAYMENT_ID>');
    console.log('\nExemplo:');
    console.log('node process-payment.js 1234567890');
    console.log('\n💡 Dica: Use um Payment ID real de um pagamento aprovado no Mercado Pago');
    process.exit(1);
}

// Aguardar um pouco para o servidor estar pronto
setTimeout(() => {
    processPaymentManually(paymentId).catch(console.error);
}, 1000);
