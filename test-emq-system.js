#!/usr/bin/env node

/**
 * 🎯 Script de Teste EMQ Ultra-Otimizado
 * Valida todo o sistema de otimização EMQ implementado
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TESTS = [];
let passedTests = 0;
let totalTests = 0;

// Função para logs coloridos
const log = {
    success: (msg) => console.log(chalk.green('✅'), msg),
    error: (msg) => console.log(chalk.red('❌'), msg),
    info: (msg) => console.log(chalk.blue('ℹ️'), msg),
    warn: (msg) => console.log(chalk.yellow('⚠️'), msg),
    title: (msg) => console.log(chalk.cyan.bold('\n🎯', msg))
};

// Função para adicionar teste
function addTest(name, testFn) {
    TESTS.push({ name, testFn });
}

// Função para executar teste
async function runTest(test) {
    totalTests++;
    try {
        await test.testFn();
        passedTests++;
        log.success(`${test.name}`);
        return true;
    } catch (error) {
        log.error(`${test.name}: ${error.message}`);
        return false;
    }
}

// Função para fazer requisição com timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ==============================================
// TESTES EMQ
// ==============================================

addTest('Status do Sistema EMQ', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/status`);
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
        throw new Error('Sistema EMQ não está funcionando');
    }
});

addTest('Cálculo de EMQ Score', async () => {
    const testData = {
        eventData: {
            content_id: 'test_card_12345',
            content_name: 'Teste EMQ Card',
            value: 17.99,
            currency: 'BRL'
        },
        userData: {
            email: 'teste@devotly.shop',
            phone: '+5511999999999'
        },
        contextData: {
            ip: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser'
        }
    };
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/calculate-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.data.score) {
        throw new Error('Falha no cálculo do EMQ Score');
    }
    
    if (data.data.score < 60) {
        throw new Error(`EMQ Score muito baixo: ${data.data.score}`);
    }
    
    log.info(`EMQ Score calculado: ${data.data.score}/100 (${data.data.grade})`);
});

addTest('Teste Purchase Ultra-Otimizado', async () => {
    const testData = {
        contentId: `test_card_${Date.now()}`,
        contentName: 'Devotly Ultra Test Card',
        value: 17.99,
        currency: 'BRL',
        email: 'ultra.test@devotly.shop',
        phone: '+5511987654321'
    };
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/test-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
        throw new Error('Falha no teste Purchase');
    }
    
    if (data.data.emqScore.score < 70) {
        throw new Error(`EMQ Score insuficiente: ${data.data.emqScore.score}`);
    }
    
    log.info(`Purchase EMQ Score: ${data.data.emqScore.score}/100`);
});

addTest('Otimização de Payload', async () => {
    const testData = {
        eventData: {
            content_id: 'test_optimization',
            value: 29.99
        },
        userData: {
            email: 'optimization@test.com'
        },
        contextData: {
            ip: '192.168.1.1'
        }
    };
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/optimize-payload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.data.optimizedPayload) {
        throw new Error('Falha na otimização do payload');
    }
    
    // Verificar se o payload otimizado tem estrutura correta
    const payload = data.data.optimizedPayload;
    if (!payload.user || !payload.properties) {
        throw new Error('Payload otimizado com estrutura incorreta');
    }
    
    log.info(`Payload otimizado com EMQ Score: ${data.data.emqScore.score}/100`);
});

addTest('Recomendações de Melhoria', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/recommendations`);
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !Array.isArray(data.data.recommendations)) {
        throw new Error('Falha ao obter recomendações');
    }
    
    if (data.data.recommendations.length === 0) {
        throw new Error('Nenhuma recomendação disponível');
    }
    
    log.info(`${data.data.recommendations.length} recomendações disponíveis`);
});

addTest('Histórico de EMQ Scores', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/history?limit=10`);
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
        throw new Error('Falha ao obter histórico');
    }
    
    // Se não há histórico ainda, isso é ok para um sistema novo
    log.info(`Histórico: ${data.data.analysis.totalEvents} eventos registrados`);
});

addTest('Simulação de Múltiplos Eventos', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/emq/simulate-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 })
    }, 15000); // Timeout maior para simulação
    
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.data.simulatedEvents) {
        throw new Error('Falha na simulação de eventos');
    }
    
    if (data.data.simulatedEvents.length !== 3) {
        throw new Error(`Esperado 3 eventos, recebido ${data.data.simulatedEvents.length}`);
    }
    
    const avgScore = data.data.summary.averageScore;
    if (avgScore < 60) {
        throw new Error(`Score médio muito baixo: ${avgScore}`);
    }
    
    log.info(`Simulação: ${data.data.simulatedEvents.length} eventos, Score médio: ${avgScore.toFixed(1)}`);
});

addTest('Verificação de Endpoints TikTok V3', async () => {
    // Teste básico do endpoint TikTok V3
    const response = await fetchWithTimeout(`${BASE_URL}/api/tiktok-v3/track-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventName: 'ViewContent',
            eventData: {
                content_id: 'test_verification',
                content_name: 'Teste de Verificação'
            },
            userData: {
                email: 'verification@test.com'
            }
        })
    });
    
    // Aceitar tanto 200 quanto erros de configuração (401, 403)
    // O importante é que o endpoint existe e responde
    if (response.status === 404) {
        throw new Error('Endpoint TikTok V3 não encontrado');
    }
    
    log.info(`Endpoint TikTok V3 respondeu com status: ${response.status}`);
});

// ==============================================
// EXECUÇÃO DOS TESTES
// ==============================================

async function runAllTests() {
    log.title('SISTEMA EMQ ULTRA-OTIMIZADO - TESTE COMPLETO');
    log.info(`Testando em: ${BASE_URL}`);
    log.info(`Total de testes: ${TESTS.length}\n`);
    
    const startTime = Date.now();
    
    for (const test of TESTS) {
        await runTest(test);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Relatório final
    console.log('\n' + '='.repeat(50));
    log.title('RELATÓRIO FINAL');
    console.log(`Testes executados: ${totalTests}`);
    console.log(`Testes aprovados: ${chalk.green(passedTests)}`);
    console.log(`Testes falharam: ${chalk.red(totalTests - passedTests)}`);
    console.log(`Taxa de sucesso: ${chalk.cyan(((passedTests / totalTests) * 100).toFixed(1))}%`);
    console.log(`Tempo total: ${chalk.yellow(duration)}s`);
    
    if (passedTests === totalTests) {
        log.success('\n🎉 TODOS OS TESTES PASSARAM! Sistema EMQ funcionando perfeitamente!');
        process.exit(0);
    } else {
        log.error(`\n❌ ${totalTests - passedTests} teste(s) falharam. Verifique os logs acima.`);
        process.exit(1);
    }
}

// Verificar se o servidor está rodando antes de iniciar
async function checkServer() {
    try {
        log.info('Verificando se o servidor está rodando...');
        const response = await fetchWithTimeout(`${BASE_URL}/debug/urls`, {}, 5000);
        if (response.ok) {
            log.success('Servidor está rodando!');
            return true;
        }
    } catch (error) {
        log.error(`Servidor não está rodando em ${BASE_URL}`);
        log.info('Para executar os testes:');
        log.info('1. cd backend');
        log.info('2. npm start');
        log.info('3. Em outro terminal: node test-emq-system.js');
        process.exit(1);
    }
}

// Execução principal
(async () => {
    try {
        await checkServer();
        await runAllTests();
    } catch (error) {
        log.error(`Erro fatal: ${error.message}`);
        process.exit(1);
    }
})();

export { runAllTests };
