/**
 * Script para configurar/atualizar o webhook do MercadoPago
 * Este script utiliza a API do Mercado Pago para configurar ou atualizar 
 * a URL de notificação de webhooks
 */
const https = require('https');

// Configuração
const config = {
  // URL do webhook de produção
  webhookUrl: 'https://devotly.shop/api/webhook/mercadopago',
  
  // O token de acesso deve ser definido como variável de ambiente
  // Você pode executar: $env:MP_ACCESS_TOKEN="SEU_TOKEN" antes de rodar o script
  accessToken: process.env.MP_ACCESS_TOKEN
};

// Verificar se o token de acesso foi fornecido
if (!config.accessToken) {
  console.error('❌ Erro: Token de acesso não fornecido!');
  console.error('Por favor, defina a variável de ambiente MP_ACCESS_TOKEN.');
  console.error('No PowerShell: $env:MP_ACCESS_TOKEN="SEU_TOKEN"');
  process.exit(1);
}

// Função para configurar o webhook
async function configureWebhook() {
  // Dados para a requisição
  const data = JSON.stringify({
    url: config.webhookUrl,
    description: "Devotly - Webhook de Pagamentos",
    events: ["payment"],
    headers: [
      {
        name: "X-Source",
        value: "Devotly"
      }
    ]
  });

  // Opções da requisição
  const options = {
    hostname: 'api.mercadopago.com',
    port: 443,
    path: '/v1/webhooks',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            body: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            body: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Função para listar webhooks configurados
async function listWebhooks() {
  const options = {
    hostname: 'api.mercadopago.com',
    port: 443,
    path: '/v1/webhooks',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            body: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Executar configuração
(async function() {
  try {
    console.log('🔍 Verificando webhooks existentes...');
    const webhooks = await listWebhooks();
    
    if (webhooks.statusCode !== 200) {
      console.error('❌ Erro ao verificar webhooks:', webhooks);
      process.exit(1);
    }
    
    // Listar webhooks existentes
    console.log(`✅ Webhooks existentes: ${webhooks.body.length}`);
    webhooks.body.forEach((webhook, index) => {
      console.log(`\nWebhook #${index + 1}:`);
      console.log(`URL: ${webhook.url}`);
      console.log(`ID: ${webhook.id}`);
      console.log(`Eventos: ${webhook.events.join(', ')}`);
      console.log(`Status: ${webhook.status}`);
    });

    // Verificar se webhook já existe com nossa URL
    const existingWebhook = webhooks.body.find(hook => 
      hook.url === config.webhookUrl && 
      hook.status === "active"
    );
    
    if (existingWebhook) {
      console.log(`\n✅ Webhook já está configurado corretamente!`);
      console.log(`URL: ${existingWebhook.url}`);
      console.log(`ID: ${existingWebhook.id}`);
      process.exit(0);
    }

    // Se não existe, criar novo webhook
    console.log('\n🔧 Configurando novo webhook...');
    const response = await configureWebhook();
    
    if (response.statusCode === 201) {
      console.log('✅ Webhook configurado com sucesso!');
      console.log(`ID: ${response.body.id}`);
      console.log(`URL: ${response.body.url}`);
    } else {
      console.error('❌ Erro ao configurar webhook:', response);
    }
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
  }
})();
