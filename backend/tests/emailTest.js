import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { sendPaymentConfirmationEmail } from '../services/emailService.js';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Função para testar o envio de email
async function testEmailSending() {
  try {
    console.log('Iniciando teste de envio de email...');
    
    // Substitua pelo e-mail que deseja receber o teste
    const testEmail = process.argv[2];
    
    if (!testEmail) {
      console.error('Por favor, forneça um email para teste como primeiro argumento.');
      process.exit(1);
    }
    
    // Dados de teste
    const testData = {
      email: testEmail,
      cardId: 'test-card-123',
      name: 'Cliente de Teste',
      title: 'Cartão de Teste',
      cardUrl: 'https://devotly.shop/view/?id=test-card-123'
    };
    
    console.log(`Enviando email de teste para: ${testData.email}`);
    
    // Enviar email
    const result = await sendPaymentConfirmationEmail(testData);
    
    console.log('Email enviado com sucesso!');
    console.log('Resposta:', result);
    
  } catch (error) {
    console.error('Erro durante teste de email:', error);
  }
}

// Executar o teste
testEmailSending();
