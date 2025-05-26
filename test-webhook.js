/**
 * Script para testar o webhook do MercadoPago localmente
 */
const https = require('https');
const http = require('http');

// Configuração
const config = {
  // Use 'local' para testar localmente ou 'production' para testar em produção
  environment: 'production',
  
  // URLs para teste
  urls: {
    local: 'http://localhost:3000/api/webhook/mercadopago',
    production: 'https://devotly.shop/api/webhook/mercadopago'
  },
  
  // ID de um pagamento de teste
  paymentId: '12345678', // Substitua por um ID real para testar
};

// Escolher URL baseada no ambiente
const webhookUrl = config.urls[config.environment];
const url = new URL(webhookUrl);

console.log(`\n🚀 Testando webhook do MercadoPago (${config.environment}):`);
console.log(`URL: ${webhookUrl}`);

// Preparar dados do pagamento (simulação)
const testData = {
  action: 'payment.updated',
  type: 'payment',
  data: {
    id: config.paymentId
  }
};

// Preparar a requisição
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MercadoPago Webhook Test',
    'X-Test-Source': 'Devotly Debug Tool'
  }
};

// Função para fazer a requisição
function makeRequest() {
  return new Promise((resolve, reject) => {
    // Escolher http ou https baseado na URL
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Enviar dados
    req.write(JSON.stringify(testData));
    req.end();
  });
}

// Executar o teste
(async function() {
  try {
    console.log(`📤 Enviando dados: ${JSON.stringify(testData)}`);
    const response = await makeRequest();
    
    console.log(`\n📩 Resposta recebida:`);
    console.log(`Status: ${response.statusCode} ${response.statusCode === 200 ? '✅' : '❌'}`);
    console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log(`Body: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log(`\n✅ Teste concluído com sucesso!`);
    } else {
      console.log(`\n❌ Teste falhou: Status code ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`\n❌ Erro durante o teste:`, error.message);
  }
})();
