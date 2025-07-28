import { Resend } from 'resend';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verificar se a chave da API Resend está configurada
let resend = null;
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY não configurada nas variáveis de ambiente!');
  console.error('O sistema de email não funcionará corretamente sem esta configuração.');
} else {
  // Inicializar o cliente Resend apenas se a chave estiver disponível
  resend = new Resend(process.env.RESEND_API_KEY);
}

/**
 * Gera um QR code como data URI a partir de uma URL
 * @param {string} url - URL para gerar o QR code
 * @returns {Promise<string>} - Data URI do QR code
 */
async function generateQRCodeDataURI(url) {
  try {
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#d4af37', // Cor dourada para combinar com o tema
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    throw new Error('Falha ao gerar QR code');
  }
}

/**
 * Envia email de confirmação com link e QR code após pagamento aprovado
 * @param {Object} params - Parâmetros para o email
 * @param {string} params.email - Email do destinatário
 * @param {string} params.cardId - ID do cartão
 * @param {string} params.name - Nome do destinatário
 * @param {string} params.title - Título do cartão
 * @param {string} params.cardUrl - URL do cartão para visualização
 * @param {string} params.planType - Tipo do plano adquirido
 * @param {number} params.planValue - Valor pago pelo plano
 * @param {string} params.paymentId - ID do pagamento
 * @param {string} params.transactionDate - Data da transação
 * @returns {Promise<Object>} - Resposta do serviço de email
 */
export async function sendPaymentConfirmationEmail({ 
  email, 
  cardId, 
  name, 
  title, 
  cardUrl, 
  planType = 'para_sempre',
  planValue = 17.99,
  paymentId = '',
  transactionDate = new Date().toLocaleDateString('pt-BR')
}) {
  try {
    // Verificar se o serviço de email está disponível
    if (!resend) {
      console.warn('[EMAIL SERVICE] Serviço de email não configurado. Pulando envio de email para:', email);
      return { success: false, message: 'Serviço de email não configurado' };
    }
    
    console.log('\n[EMAIL SERVICE] Gerando QR Code para email...');
    const qrCodeDataURI = await generateQRCodeDataURI(cardUrl);
    
    console.log('[EMAIL SERVICE] Enviando email para:', email);
    
    // Formatando o título para usar no assunto do email
    const emailSubject = title ? `Seu cartão "${title}" está pronto! - Devotly` : "Seu cartão Devotly está pronto!";
    
    // Determinar nome do plano para exibição
    const planDisplayName = planType === 'para_sempre' ? 'Devotly Lifetime' : 'Devotly Anual';
    
    // Enviar o email usando Resend
    const emailResponse = await resend.emails.send({
      from: 'Devotly <contato@devotly.shop>',
      to: email,
      subject: emailSubject,
      html: getEmailTemplate({
        name: name || 'Cliente Devotly',
        title: title || 'Seu Cartão Cristão',
        cardUrl,
        cardId,
        planType,
        planDisplayName,
        planValue,
        paymentId,
        transactionDate
      }),
      attachments: [
        {
          filename: 'qrcode-devotly.png',
          content: qrCodeDataURI.split('base64,')[1], // Remover o prefixo 'data:image/png;base64,'
          encoding: 'base64',
        },
      ],
    });
    
    console.log('[EMAIL SERVICE] Email enviado com sucesso:', emailResponse);
    return emailResponse;
    
  } catch (error) {
    console.error('[EMAIL SERVICE] Erro ao enviar email:', error);
    throw new Error(`Falha ao enviar email: ${error.message}`);
  }
}

/**
 * Gera o template HTML do email - VERSÃO SIMPLES
 * @param {Object} params
 * @returns {string} Template HTML do email
 */
function getEmailTemplate({ 
  name, 
  title, 
  cardUrl, 
  cardId, 
  planDisplayName,
  planValue,
  paymentId,
  transactionDate
}) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seu cartão está pronto!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
          background-color: #1a1a1a;
          color: white;
          text-align: center;
          padding: 20px;
        }
        
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #d4af37;
        }
        
        .content {
          padding: 30px;
        }
        
        h1 {
          color: #1a1a1a;
          margin-bottom: 20px;
        }
        
        .card-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid #d4af37;
        }
        
        .card-title {
          font-size: 20px;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        
        .info-label {
          font-weight: bold;
          color: #666;
        }
        
        .info-value {
          color: #333;
        }
        
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        
        .main-button {
          display: inline-block;
          background-color: #d4af37;
          color: #1a1a1a !important;
          text-decoration: none !important;
          padding: 15px 30px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
        }
        
        .main-button:hover {
          background-color: #c19d2e;
        }
        
        .qr-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 6px;
        }
        
        .qr-image {
          max-width: 150px;
          margin: 15px 0;
        }
        
        .footer {
          background-color: #1a1a1a;
          color: white;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }
        
        .footer a {
          color: #d4af37;
          text-decoration: none;
          margin: 0 10px;
        }
        
        /* Mobile */
        @media only screen and (max-width: 600px) {
          .info-row {
            flex-direction: column;
          }
          
          .main-button {
            display: block;
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <div class="logo">✝️ Devotly</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <h1>Olá, ${name}!</h1>
          <p>Seu pagamento foi aprovado e seu cartão cristão está pronto! ✅</p>
          
          <!-- Card Info -->
          <div class="card-info">
            <div class="card-title">${title}</div>
            
            <div class="info-row">
              <span class="info-label">ID do Cartão:</span>
              <span class="info-value">${cardId}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Plano:</span>
              <span class="info-value">${planDisplayName}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Valor:</span>
              <span class="info-value">R$ ${planValue.toFixed(2).replace('.', ',')}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${transactionDate}</span>
            </div>
            
            ${paymentId ? `
            <div class="info-row">
              <span class="info-label">ID Pagamento:</span>
              <span class="info-value">${paymentId}</span>
            </div>
            ` : ''}
          </div>
          
          <!-- Button -->
          <div class="button-container">
            <p><strong>Acesse seu cartão:</strong></p>
            <a href="${cardUrl}" class="main-button" target="_blank">Ver Meu Cartão</a>
            <p style="margin-top: 15px; font-size: 14px; color: #666;">
              Link direto: <a href="${cardUrl}" style="color: #d4af37;">${cardUrl}</a>
            </p>
          </div>
          
          <!-- QR Code -->
          <div class="qr-section">
            <h3>QR Code do seu cartão:</h3>
            <p>Escaneie para acessar rapidamente</p>
            <img src="cid:qrcode-devotly.png" alt="QR Code" class="qr-image">
          </div>
          
          <p style="text-align: center; font-style: italic; color: #666; margin-top: 30px;">
            "Que a vossa luz brilhe diante dos homens" - Mateus 5:16
          </p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px; text-align: center;">
            <p><strong>Precisa de ajuda?</strong></p>
            <p>Entre em contato: <a href="mailto:contato@devotly.shop" style="color: #d4af37;">contato@devotly.shop</a></p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Devotly. Todos os direitos reservados.</p>
          <p>
            <a href="https://devotly.shop/termos">Termos</a> |
            <a href="https://devotly.shop/privacidade">Privacidade</a> |
            <a href="https://devotly.shop">Site</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  sendPaymentConfirmationEmail
};
