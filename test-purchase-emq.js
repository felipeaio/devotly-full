/**
 * Script de Teste para EMQ Score do Evento Purchase
 * 
 * Este script testa as melhorias implementadas no evento Purchase
 * para verificar se o EMQ Score está sendo otimizado corretamente.
 */

import tiktokEventsV3 from './backend/services/tiktokEventsV3.js';

async function testPurchaseEMQ() {
    console.log('🧪 TESTE DE EMQ SCORE - EVENTO PURCHASE ULTRA-OTIMIZADO v4.0');
    console.log('==============================================================\n');
    
    // Dados de teste com diferentes cenários de completude
    const testScenarios = [
        {
            name: 'Cenário 1: Dados Mínimos (Baseline)',
            userData: {
                email: '',
                phone: ''
            },
            context: {
                ip: '127.0.0.1',
                user_agent: 'Test-Agent/1.0'
            }
        },
        {
            name: 'Cenário 2: Email Presente',
            userData: {
                email: 'teste@devotly.shop',
                phone: ''
            },
            context: {
                ip: '200.123.45.67',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        },
        {
            name: 'Cenário 3: Email + Telefone',
            userData: {
                email: 'teste@devotly.shop',
                phone: '11987654321'
            },
            context: {
                ip: '200.123.45.67',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                url: 'https://devotly.shop/create',
                referrer: 'https://devotly.shop'
            }
        },
        {
            name: 'Cenário 4: Dados Completos Ultra-Otimizados',
            userData: {
                email: 'usuario.premium@devotly.shop',
                phone: '5511987654321'
            },
            context: {
                ip: '200.123.45.67',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                url: 'https://devotly.shop/create',
                referrer: 'https://devotly.shop',
                ttp: 'ttp_test_parameter',
                ttclid: 'ttclid_test_click_id',
                timezone: 'America/Sao_Paulo',
                browser_language: 'pt-BR,pt;q=0.9,en;q=0.8',
                fingerprint: 'device_fingerprint_abc123'
            }
        },
        {
            name: 'Cenário 5: Máximo EMQ Possível',
            userData: {
                email: 'vip.customer@devotly.shop',
                phone: '5511999887766'
            },
            context: {
                ip: '201.234.56.78',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                url: 'https://devotly.shop/checkout/success',
                referrer: 'https://devotly.shop/create',
                ttp: 'ttp_premium_campaign_2024',
                ttclid: 'ttclid_premium_click_analytics_xyz789',
                timezone: 'America/Sao_Paulo',
                browser_language: 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.7',
                fingerprint: 'ultra_secure_device_fingerprint_xyz789',
                session_id: 'premium_session_abc123def456',
                order_id: 'DVT_PREMIUM_CARD123_17.99_1704067200_xyz789'
            }
        }
    ];
    
    console.log(`🎯 Testando ${testScenarios.length} cenários diferentes...\n`);
    
    for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        
        console.log(`\n📋 ${scenario.name}`);
        console.log('─'.repeat(50));
        
        try {
            // Testar evento Purchase
            const result = await tiktokEventsV3.trackPurchase(
                'TEST_CARD_' + (i + 1),
                `Devotly Lifetime Plan (Test ${i + 1})`,
                17.99,
                'BRL',
                'para_sempre',
                scenario.context,
                scenario.userData
            );
            
            console.log(`📊 Resultado do teste:`, {
                success: result.success ? '✅ Sucesso' : '❌ Falha',
                emq_score: result.emq_score || 'N/A',
                error: result.error || 'Nenhum'
            });
            
            if (result.emq_details) {
                console.log(`🔍 Detalhes EMQ:`, result.emq_details);
            }
            
        } catch (error) {
            console.error(`❌ Erro no teste: ${error.message}`);
        }
        
        // Aguardar entre testes para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 TESTES CONCLUÍDOS');
    console.log('====================');
    console.log('✅ Verifique os logs acima para ver os EMQ Scores');
    console.log('🎯 Target: 70+ pontos para melhor performance');
    console.log('📈 Cenários com email + telefone devem ter scores mais altos');
    console.log('🔥 Cenário 5 deve ter o maior EMQ Score possível');
}

// Executar testes
if (process.argv[2] === 'run') {
    testPurchaseEMQ().catch(console.error);
} else {
    console.log('📝 Para executar os testes, use:');
    console.log('node test-purchase-emq.js run');
}

export default testPurchaseEMQ;
