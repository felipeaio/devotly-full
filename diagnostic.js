# Script para diagnosticar e corrigir problemas de CORS e conexão na Vercel
# Execute com: curl -o- https://devotly.shop/diagnostic.js | node

const https = require('https');
const http = require('http');

// Endpoints a serem testados
const endpoints = [
  {
    name: 'Verificação da API',
    url: 'https://devotly.shop/api/cards',
    method: 'OPTIONS',
    headers: { 'Origin': 'https://devotly.shop' }
  },
  {
    name: 'Upload de imagem',
    url: 'https://devotly.shop/api/upload-image',
    method: 'OPTIONS', 
    headers: { 'Origin': 'https://devotly.shop' }
  },
  {
    name: 'Checkout',
    url: 'https://devotly.shop/api/checkout/create-preference',
    method: 'OPTIONS',
    headers: { 'Origin': 'https://devotly.shop' }
  }
];

// Função para fazer requisição HTTP/HTTPS
async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: endpoint.method || 'GET',
      headers: endpoint.headers || {}
    };

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }
    
    req.end();
  });
}

// Função para executar os testes
async function runTests() {
  console.log('🔍 Iniciando diagnóstico de CORS e conexão para devotly.shop');
  console.log('===========================================================');

  for (const endpoint of endpoints) {
    console.log(`\n👉 Testando ${endpoint.name} (${endpoint.url})`);
    
    try {
      const response = await makeRequest(endpoint);
      
      console.log(`   Status: ${response.status}`);
      console.log('   Headers CORS:');
      console.log(`     Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'não definido ❌'}`);
      console.log(`     Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods'] || 'não definido ❌'}`);
      console.log(`     Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers'] || 'não definido ❌'}`);
      
      if (response.status >= 200 && response.status < 300 && 
          response.headers['access-control-allow-origin']) {
        console.log('   ✅ Endpoint OK');
      } else {
        console.log('   ❌ Possível problema');
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n===========================================================');
  console.log('🏁 Diagnóstico concluído');
}

runTests().catch(console.error);
