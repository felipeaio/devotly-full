/**
 * Teste da integração da TikTok Events API v1.3
 * Execute este arquivo para testar o envio de eventos para o TikTok
 * 
 * Uso: node test-tiktok-events.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração correta para o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env ANTES de qualquer outro código
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importar o serviço
import tiktokEvents from '../services/tiktokEvents.js';

// Função de delay para assincronia
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função principal de teste
async function runTests() {
    console.log('\n=== TESTE DE INTEGRAÇÃO TIKTOK EVENTS API v1.3 ===\n');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Pixel Code: ${tiktokEvents.pixelCode}`);
    console.log(`Event Source: ${tiktokEvents.eventSource}`);
    console.log(`Event Source ID: ${tiktokEvents.eventSourceId}`);
    console.log(`API URL: ${tiktokEvents.apiUrl}`);
    console.log(`Token de Acesso: ${tiktokEvents.accessToken ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`Modo de teste: ${tiktokEvents.testMode ? 'ATIVADO' : 'DESATIVADO'}`);
    console.log('\n');

    try {
        // Gerar dados de teste
        const testEmail = 'teste@devotly.shop';
        const testCardId = `test_card_${Date.now()}`;
        const testValue = 97;
        
        console.log('1. Testando evento ViewContent...');
        await tiktokEvents.trackViewContent(
            testCardId,
            'product',
            'Cartão Cristão Digital',
            testEmail
        );
        console.log('✅ Evento ViewContent enviado com sucesso');
        await delay(1000);

        console.log('\n2. Testando evento AddToCart...');
        await tiktokEvents.trackAddToCart(
            testCardId,
            testEmail
        );
        console.log('✅ Evento AddToCart enviado com sucesso');
        await delay(1000);

        console.log('\n3. Testando evento InitiateCheckout...');
        await tiktokEvents.trackInitiateCheckout(
            testCardId,
            'para_sempre',
            testValue,
            testEmail
        );
        console.log('✅ Evento InitiateCheckout enviado com sucesso');
        await delay(1000);

        console.log('\n4. Testando evento Purchase...');
        await tiktokEvents.trackPurchase(
            testCardId,
            'para_sempre',
            testValue,
            testEmail,
            '11999887766'
        );
        console.log('✅ Evento Purchase enviado com sucesso');
        await delay(1000);

        console.log('\n5. Testando evento personalizado...');
        await tiktokEvents.trackCustomEvent(
            'CustomEvent',
            {
                content_name: 'Teste de Evento Personalizado',
                content_id: testCardId,
                value: testValue,
                currency: 'BRL'
            },
            { email: testEmail }
        );
        console.log('✅ Evento personalizado enviado com sucesso');

        console.log('\n=== TODOS OS TESTES CONCLUÍDOS COM SUCESSO ===');
        console.log('Verifique no painel do TikTok Ads > Events Manager se os eventos foram recebidos.');
        console.log('Obs: Pode haver um atraso de alguns minutos para os eventos aparecerem no painel.\n');

    } catch (error) {
        console.error('\n❌ ERRO DURANTE OS TESTES:', error);
        console.error('Verifique as variáveis de ambiente e a conexão com a API do TikTok.');
    }

    // Forçar encerramento após os testes
    setTimeout(() => process.exit(0), 3000);
}

// Executar testes
runTests();
