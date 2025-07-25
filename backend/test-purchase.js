/**
 * Teste manual do evento Purchase do TikTok
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Configurar dotenv ANTES de qualquer import
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🔧 Verificando variáveis de ambiente:');
console.log('- TIKTOK_ACCESS_TOKEN:', process.env.TIKTOK_ACCESS_TOKEN ? 'Presente' : 'Ausente');
console.log('- TIKTOK_PIXEL_CODE:', process.env.TIKTOK_PIXEL_CODE);
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Presente' : 'Ausente');

import tiktokEventsV3 from './services/tiktokEventsV3.js';

async function testPurchaseEvent() {
    console.log('🧪 TESTE MANUAL - EVENTO PURCHASE TIKTOK');
    console.log('=======================================');
    
    // Dados de teste
    const testData = {
        cardId: 'test_card_' + Date.now(),
        contentName: 'Plano Devotly para_sempre',
        value: 17.99,
        currency: 'BRL',
        category: 'digital_service',
        context: {
            ip: '177.47.83.142', // IP brasileiro de exemplo
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            url: 'https://devotly.shop/create',
            referrer: 'https://devotly.shop/',
            order_id: `order_test_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000)
        },
        userData: {
            email: 'teste@devotly.shop',
            phone: '+5511999999999',
            external_id: 'devotly_teste@devotly.shop_' + Date.now()
        }
    };
    
    console.log('📊 Dados de teste:', JSON.stringify(testData, null, 2));
    console.log('\n🚀 Enviando evento Purchase...\n');
    
    try {
        const result = await tiktokEventsV3.trackPurchase(
            testData.cardId,
            testData.contentName,
            testData.value,
            testData.currency,
            testData.category,
            testData.context,
            testData.userData
        );
        
        console.log('\n✅ RESULTADO DO TESTE:');
        console.log('======================');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n🎉 TESTE PASSOU! Evento Purchase enviado com sucesso!');
            console.log(`📊 EMQ Score: ${result.emq_score}/100 (${result.emq_grade})`);
        } else {
            console.log('\n❌ TESTE FALHOU!');
            console.error('Erro:', result.error);
        }
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n🏁 Teste finalizado');
}

// Executar teste
testPurchaseEvent().catch(console.error);
