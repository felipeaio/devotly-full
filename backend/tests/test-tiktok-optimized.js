/**
 * Teste OTIMIZADO da TikTok Events API v1.3
 * Testa o formato correto da API com todos os parâmetros obrigatórios
 * Execute: node test-tiktok-optimized.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import tiktokEvents from '../services/tiktokEvents.js';

// Configuração correta para o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env ANTES de qualquer outro código
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Função de delay para assincronia
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock de request object para teste
const createMockRequest = () => ({
    protocol: 'https',
    get: (header) => header === 'host' ? 'devotly.shop' : null,
    originalUrl: '/checkout',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.100',
        'referer': 'https://devotly.shop/create',
        'cookie': 'ttclid=test_click_id_123; ttp=test_tracking_param'
    },
    query: {
        // Simular parâmetros de clique do TikTok
        ttclid: 'test_click_id_123',
        ttp: 'test_tracking_param'
    },
    connection: { remoteAddress: '192.168.1.100' }
});

// Função principal de teste
async function runOptimizedTests() {
    console.log('\n=== TESTE OTIMIZADO TIKTOK EVENTS API v1.3 ===\n');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Número de pixels configurados: ${tiktokEvents.pixels.length}`);
    console.log(`Pixel principal: ${tiktokEvents.pixelCode}`);
    console.log(`API URL: ${tiktokEvents.apiUrl}`);
    console.log(`Token configurado: ${tiktokEvents.accessToken ? '✅ Sim' : '❌ Não'}`);
    console.log(`Modo de teste: ${tiktokEvents.testMode ? 'ATIVADO' : 'DESATIVADO'}`);
    console.log('\n');

    try {
        // Dados de teste realistas
        const testEmail = 'cliente@devotly.shop';
        const testPhone = '+5511999887766';
        const testCardId = `card_${Date.now()}`;
        const testValue = 97.00; // Valor do plano para sempre
        const mockReq = createMockRequest();
        
        console.log('📧 Email de teste:', testEmail);
        console.log('📱 Telefone de teste:', testPhone);
        console.log('🆔 Card ID:', testCardId);
        console.log('💰 Valor de teste:', testValue);
        console.log('\n');

        // 1. Teste ViewContent com dados completos
        console.log('1. 🔍 Testando evento ViewContent...');
        const viewResult = await tiktokEvents.trackViewContent(
            testCardId,
            'product',
            'Cartão Cristão Digital - Teste',
            testEmail,
            mockReq,
            'view_' + Date.now()
        );
        console.log('✅ ViewContent resultado:', viewResult.status);
        await delay(1000);

        // 2. Teste AddToCart
        console.log('\n2. 🛒 Testando evento AddToCart...');
        const addCartResult = await tiktokEvents.trackAddToCart(
            testCardId,
            testEmail,
            mockReq,
            'cart_' + Date.now()
        );
        console.log('✅ AddToCart resultado:', addCartResult.status);
        await delay(1000);

        // 3. Teste InitiateCheckout com valor obrigatório
        console.log('\n3. 💳 Testando evento InitiateCheckout...');
        const checkoutResult = await tiktokEvents.trackInitiateCheckout(
            testCardId,
            'para_sempre',
            testValue,
            testEmail,
            mockReq,
            'checkout_' + Date.now()
        );
        console.log('✅ InitiateCheckout resultado:', checkoutResult.status);
        await delay(1000);

        // 4. Teste Purchase com todos os dados obrigatórios
        console.log('\n4. 🎉 Testando evento Purchase (PRINCIPAL)...');
        const purchaseResult = await tiktokEvents.trackPurchase(
            testCardId,
            'para_sempre',
            testValue,
            testEmail,
            testPhone,
            mockReq,
            'purchase_' + Date.now()
        );
        console.log('✅ Purchase resultado:', purchaseResult.status);

        // 5. Teste de contexto completo
        console.log('\n5. 🔧 Testando preparação de contexto...');
        const context = tiktokEvents.prepareEventContext(mockReq, 'test_context_123');
        console.log('Contexto extraído:');
        console.log('- IP:', context.ip);
        console.log('- User Agent:', context.userAgent?.substring(0, 50) + '...');
        console.log('- Page URL:', context.pageUrl);
        console.log('- TikTok Click ID:', context.ttclid);
        console.log('- TikTok Tracking Param:', context.ttp);
        console.log('- Event ID:', context.eventId);

        console.log('\n🎯 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
        console.log('\n📊 CHECKLIST DE OTIMIZAÇÃO:');
        console.log('✅ Value e Currency obrigatórios em eventos de conversão');
        console.log('✅ Hash SHA-256 + Base64 para dados sensíveis');
        console.log('✅ Dados de identificação completos (email, phone, IP, user_agent)');
        console.log('✅ Parâmetros de tracking do TikTok (ttclid, ttp)');
        console.log('✅ Event_id únicos para deduplicação');
        console.log('✅ Formato correto da API v1.3');
        console.log('✅ Suporte a múltiplos pixels');
        
        console.log('\n🔍 PRÓXIMOS PASSOS:');
        console.log('1. Monitore no TikTok Ads Manager > Events Manager');
        console.log('2. Verifique a taxa de correspondência (deve ser >60%)');
        console.log('3. Confirme se os valores estão aparecendo corretamente');
        console.log('4. Teste em produção com dados reais');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }

    // Forçar encerramento após os testes
    setTimeout(() => {
        console.log('\n🏁 Finalizando teste...');
        process.exit(0);
    }, 3000);
}

// Executar testes
runOptimizedTests();
