/**
 * Teste simplificado da integração TikTok Events API v1.3
 * Testa sem o event_source_id para identificar se esse é o problema
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuração correta para o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregue o .env ANTES de qualquer outro código
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Função para hash de dados
function hashData(data) {
    if (!data) return null;
    const normalizedData = String(data).trim().toLowerCase();
    const hash = crypto.createHash('sha256').update(normalizedData).digest();
    return hash.toString('base64');
}

// Teste simplificado sem event_source_id
async function testSimpleEvent() {
    console.log('\n=== TESTE SIMPLIFICADO TIKTOK EVENTS API v1.3 ===\n');
    
    const pixelCode = process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG';
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN || '08538eef624276105c15fff5c1dfefe76b9726f2';
    const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
    
    console.log(`Pixel Code: ${pixelCode}`);
    console.log(`API URL: ${apiUrl}`);
    console.log(`Token configurado: ${accessToken ? 'Sim' : 'Não'}`);
    
    // Payload mínimo sem event_source_id
    const payload = {
        pixel_code: pixelCode,
        event: 'ViewContent',
        event_id: `test_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        event_source: 'web',
        properties: {
            content_id: 'test_content',
            content_type: 'product',
            content_name: 'Teste Básico',
            currency: 'BRL',
            value: 0
        },
        user: {
            email: hashData('teste@devotly.shop')
        }
    };
    
    console.log('\nPayload enviado:');
    console.log(JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': accessToken
            },
            body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
            console.log('\n✅ SUCESSO! Evento enviado sem event_source_id');
            console.log('Resposta:', responseData);
        } else {
            console.log('\n❌ ERRO com payload simplificado:');
            console.log(`Status: ${response.status}`);
            console.log('Resposta:', responseData);
        }
        
    } catch (error) {
        console.error('\n❌ ERRO de conexão:', error.message);
    }
}

// Teste com event_source_id usando o código do pixel
async function testWithPixelCode() {
    console.log('\n=== TESTE COM EVENT_SOURCE_ID = PIXEL_CODE ===\n');
    
    const pixelCode = process.env.TIKTOK_PIXEL_CODE || 'D1QFD0RC77UF6MBM48MG';
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN || '08538eef624276105c15fff5c1dfefe76b9726f2';
    const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
    
    // Payload com event_source_id = pixel_code
    const payload = {
        pixel_code: pixelCode,
        event: 'ViewContent',
        event_id: `test_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        event_source: 'web',
        event_source_id: pixelCode, // Usando o código do pixel
        properties: {
            content_id: 'test_content',
            content_type: 'product',
            content_name: 'Teste com Pixel Code',
            currency: 'BRL',
            value: 0
        },
        user: {
            email: hashData('teste@devotly.shop')
        }
    };
    
    console.log('\nPayload enviado:');
    console.log(JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': accessToken
            },
            body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
            console.log('\n✅ SUCESSO! Evento enviado com event_source_id = pixel_code');
            console.log('Resposta:', responseData);
        } else {
            console.log('\n❌ ERRO com event_source_id = pixel_code:');
            console.log(`Status: ${response.status}`);
            console.log('Resposta:', responseData);
        }
        
    } catch (error) {
        console.error('\n❌ ERRO de conexão:', error.message);
    }
}

// Executar ambos os testes
async function runAllTests() {
    await testSimpleEvent();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testWithPixelCode();
    
    console.log('\n=== TESTES CONCLUÍDOS ===');
    console.log('Analise os resultados acima para determinar qual abordagem funciona.');
    
    setTimeout(() => process.exit(0), 3000);
}

runAllTests();
