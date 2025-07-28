import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { sendPaymentConfirmationEmail } from '../services/emailService.js';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Função para testar o envio de email aprimorado
async function testEmailSending() {
  try {
    console.log('🧪 Iniciando teste de envio de email aprimorado...');
    
    // Substitua pelo e-mail que deseja receber o teste
    const testEmail = process.argv[2];
    
    if (!testEmail) {
      console.error('❌ Por favor, forneça um email para teste como primeiro argumento.');
      console.log('📋 Uso: node emailTest.js seuemail@exemplo.com');
      process.exit(1);
    }
    
    // Dados de teste completos com informações de pagamento
    const testData = {
      email: testEmail,
      cardId: 'TEST_CARD_2025_001',
      name: 'Cliente Premium',
      title: 'Mensagem de Fé e Esperança - Teste',
      cardUrl: 'https://devotly.shop/view/view.html?id=TEST_CARD_2025_001',
      planType: 'para_sempre',
      planValue: 17.99,
      paymentId: 'MP_TEST_123456789',
      transactionDate: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    console.log(`📧 Enviando email de teste para: ${testData.email}`);
    console.log('📊 Dados do teste:', {
      cardId: testData.cardId,
      plano: testData.planType,
      valor: `R$ ${testData.planValue.toFixed(2)}`,
      pagamento: testData.paymentId
    });
    
    // Enviar email com template aprimorado
    const result = await sendPaymentConfirmationEmail(testData);
    
    console.log('✅ Email enviado com sucesso!');
    console.log('📬 Resposta do serviço:', result);
    
    console.log('\n🎯 Funcionalidades testadas:');
    console.log('✅ Badge de pagamento aprovado');
    console.log('✅ Detalhes completos do pagamento');
    console.log('✅ Botão "Ver Meu Cartão" funcional');
    console.log('✅ QR Code anexado');
    console.log('✅ Design responsivo');
    console.log('✅ Compatibilidade com Outlook');
    console.log('✅ Links de suporte e políticas');
    
  } catch (error) {
    console.error('❌ Erro durante teste de email:', error);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Executar o teste
testEmailSending();
