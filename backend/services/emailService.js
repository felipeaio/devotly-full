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
 * @returns {Promise<Object>} - Resposta do serviço de email
 */
export async function sendPaymentConfirmationEmail({ email, cardId, name, title, cardUrl }) {
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
    
    // Enviar o email usando Resend
    const emailResponse = await resend.emails.send({
      from: 'Devotly <contato@devotly.shop>',
      to: email,
      subject: emailSubject,
      html: getEmailTemplate({
        name: name || 'Cliente Devotly',
        title: title || 'Seu Cartão Cristão',
        cardUrl,
        cardId
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
 * Gera o template HTML do email
 * @param {Object} params
 * @returns {string} Template HTML do email
 */
function getEmailTemplate({ name, title, cardUrl, cardId }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seu cartão está pronto!</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #1a1a1a;
        }
        .logo {
          color: #d4af37;
          font-size: 28px;
          font-weight: bold;
          text-decoration: none;
        }
        .content {
          padding: 20px;
        }
        .card-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #f7f7f7;
          border-radius: 5px;
          border-left: 4px solid #d4af37;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #d4af37, #ffd700);
          color: #1a1a1a;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
        .button:hover {
          background: linear-gradient(135deg, #ffd700, #d4af37);
        }
        .qrcode-container {
          text-align: center;
          margin: 30px 0;
        }
        .qrcode-image {
          max-width: 200px;
          margin: 0 auto;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #777777;
          font-size: 14px;
          border-top: 1px solid #eeeeee;
        }
        .verse {
          font-style: italic;
          font-weight: 300;
          color: #777;
          text-align: center;
          margin: 20px 0;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
          .content {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✝️ Devotly</div>
        </div>
        <div class="content">
          <h2>Olá, ${name}!</h2>
          
          <p>Seu pagamento foi <strong>aprovado com sucesso</strong> e seu cartão cristão já está disponível para acesso e compartilhamento.</p>
          
          <div class="card-info">
            <h3>${title}</h3>
            <p>ID do cartão: <strong>${cardId}</strong></p>
          </div>
          
          <p>Você pode acessar seu cartão a qualquer momento através do link abaixo:</p>
          
          <div style="text-align: center;">
            <a href="${cardUrl}" class="button">Ver Meu Cartão</a>
          </div>
          
          <div class="qrcode-container">
            <h3>QR Code do seu cartão</h3>
            <p>Escaneie o QR Code para acessar diretamente ou compartilhe com quem quiser!</p>
            <img src="cid:qrcode-devotly.png" alt="QR Code do seu cartão" class="qrcode-image">
          </div>
          
          <p class="verse">"Que a vossa luz brilhe diante dos homens." – Mateus 5:16</p>
          
          <p>Dúvidas ou problemas? Responda a este email para entrar em contato com nosso suporte.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Devotly. Todos os direitos reservados.</p>
          <p>
            <a href="https://devotly.shop/termos">Termos de Serviço</a> | 
            <a href="https://devotly.shop/privacidade">Política de Privacidade</a>
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
