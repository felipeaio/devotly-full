import { TikTokEventsService } from '../services/tiktokEvents.js';

/**
 * Script de teste para validar a integração dos eventos do TikTok
 */
async function runTests() {
    console.log('=== TESTE DE INTEGRAÇÃO DO TIKTOK API EVENTS ===');
    
    try {
        // Instanciar o serviço
        const tikTokService = new TikTokEventsService();
        console.log('✅ Serviço TikTok instanciado com sucesso');
        
        // Teste de hash de dados
        const testEmail = 'test@example.com';
        const hashedEmail = tikTokService.hashData(testEmail);
        console.log('✅ Função de hash funcionando:', hashedEmail);
        
        // Teste de evento ViewContent
        console.log('\n🔍 Teste 1: Envio de evento ViewContent');
        const viewContentResult = await tikTokService.sendEvent(
            'ViewContent',
            {
                content_id: 'test-card-001',
                content_name: 'Cartão de Teste',
                content_type: 'product',
                currency: 'BRL',
                value: 0
            },
            {
                email: 'test@example.com'
            }
        );
        logEventResult('ViewContent', viewContentResult);
        
        // Teste de evento AddToCart
        console.log('\n🔍 Teste 2: Envio de evento AddToCart');
        const addToCartResult = await tikTokService.sendEvent(
            'AddToCart',
            {
                content_id: 'test-card-001',
                content_name: 'Cartão de Teste',
                content_type: 'product',
                currency: 'BRL',
                value: 29.90
            },
            {
                email: 'test@example.com'
            }
        );
        logEventResult('AddToCart', addToCartResult);
        
        // Teste de evento Purchase
        console.log('\n🔍 Teste 3: Envio de evento Purchase');
        const purchaseResult = await tikTokService.sendEvent(
            'Purchase',
            {
                content_id: 'test-card-001',
                content_name: 'Cartão de Teste',
                content_type: 'product',
                currency: 'BRL',
                value: 29.90
            },
            {
                email: 'test@example.com',
                phone: '5511999999999',
                externalId: 'test-user-001'
            }
        );
        logEventResult('Purchase', purchaseResult);
        
        // Teste de evento com falha
        console.log('\n🔍 Teste 4: Teste de resiliência - evento com dados inválidos');
        const invalidResult = await tikTokService.sendEvent(
            'Invalid_Event_Type',
            {
                content_id: 'test-card-001'
            }
        );
        logEventResult('Invalid_Event_Type', invalidResult);
        
        // Resumo do teste
        console.log('\n=== RESUMO DOS TESTES ===');
        console.log('Total de eventos testados: 4');
        console.log('Lembre-se de verificar o TikTok Events Manager para confirmar os eventos recebidos.');
        console.log('URL do Events Manager: https://ads.tiktok.com/i18n/events_manager');
        
    } catch (error) {
        console.error('❌ Erro ao executar testes:', error);
    }
}

// Helper para log de resultados
function logEventResult(eventName, result) {
    if (result.error) {
        console.log(`❌ Erro ao enviar evento ${eventName}:`);
        console.log(result);
    } else if (result.status === 'queued') {
        console.log(`⏳ Evento ${eventName} adicionado à fila para tentativa posterior`);
    } else {
        console.log(`✅ Evento ${eventName} enviado com sucesso:`);
        console.log(JSON.stringify(result, null, 2));
    }
}

// Executar os testes
runTests()
    .then(() => console.log('Testes concluídos!'))
    .catch(err => console.error('Falha nos testes:', err));
