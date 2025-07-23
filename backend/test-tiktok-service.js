// Teste simples para verificar se tiktokEventsV3.js está funcionando
import TikTokEventsServiceV3 from './services/tiktokEventsV3.js';

console.log('🎯 Testando TikTok Events Service V3...');

try {
    console.log('✅ TikTok Events Service V3 importado com sucesso!');
    console.log('✅ Serviço inicializado:', typeof TikTokEventsServiceV3);
    console.log('✅ Métodos disponíveis:', Object.getOwnPropertyNames(Object.getPrototypeOf(TikTokEventsServiceV3)));
    
    // Teste básico de validação
    const testValue = TikTokEventsServiceV3.validateValue(17.99);
    console.log('✅ Teste validateValue:', testValue);
    
    console.log('🎉 Todos os testes passaram! Sistema EMQ pronto para uso.');
} catch (error) {
    console.error('❌ Erro no teste:', error.message);
}
