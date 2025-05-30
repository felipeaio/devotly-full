/**
 * Teste para verificar a prevenção de scroll no modal de preview
 */

// Função para testar se o modal previne scroll do body
function testModalScrollPrevention() {
    console.log('🧪 Iniciando teste de prevenção de scroll no modal...');
    
    const modal = document.getElementById('previewModal');
    const previewButton = document.getElementById('previewButton');
    
    if (!modal || !previewButton) {
        console.error('❌ Elementos do modal não encontrados');
        return false;
    }
    
    // Simular abertura do modal
    previewButton.click();
    
    setTimeout(() => {
        // Verificar se as classes foram aplicadas
        const bodyHasClass = document.body.classList.contains('modal-active');
        const htmlHasClass = document.documentElement.classList.contains('modal-active');
        const modalIsActive = modal.classList.contains('active');
        
        console.log('📊 Resultados do teste:');
        console.log(`  - Body tem classe modal-active: ${bodyHasClass ? '✅' : '❌'}`);
        console.log(`  - HTML tem classe modal-active: ${htmlHasClass ? '✅' : '❌'}`);
        console.log(`  - Modal está ativo: ${modalIsActive ? '✅' : '❌'}`);
        console.log(`  - Body overflow: ${getComputedStyle(document.body).overflow}`);
        
        // Testar scroll do body
        const initialScrollY = window.scrollY;
        window.scrollTo(0, 100);
        const finalScrollY = window.scrollY;
        
        console.log(`  - Scroll foi bloqueado: ${initialScrollY === finalScrollY ? '✅' : '❌'}`);
        
        // Fechar modal para limpar
        const closeButton = document.getElementById('closePreviewButton');
        if (closeButton) {
            closeButton.click();
        }
        
        return bodyHasClass && htmlHasClass && modalIsActive;
    }, 500);
}

// Função para testar eventos de toque
function testTouchEvents() {
    console.log('📱 Testando eventos de toque...');
    
    const modal = document.getElementById('previewModal');
    const modalBody = modal?.querySelector('.preview-modal-body');
    
    if (!modal || !modalBody) {
        console.error('❌ Elementos do modal não encontrados para teste de toque');
        return false;
    }
    
    // Verificar se os event listeners foram adicionados
    const hasListeners = modal._listeners || false;
    console.log(`  - Event listeners configurados: ${hasListeners ? '✅' : '⚠️  (não verificável)'}`);
    
    return true;
}

// Função principal de teste
function runModalTests() {
    console.clear();
    console.log('🚀 Executando testes do modal de preview...\n');
    
    // Aguardar carregamento completo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                testModalScrollPrevention();
                testTouchEvents();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            testModalScrollPrevention();
            testTouchEvents();
        }, 1000);
    }
}

// Executar testes automaticamente
runModalTests();

// Exportar funções para uso manual
window.modalTests = {
    testScrollPrevention: testModalScrollPrevention,
    testTouchEvents: testTouchEvents,
    runAll: runModalTests
};

console.log('📝 Para executar testes manualmente, use:');
console.log('  - window.modalTests.testScrollPrevention()');
console.log('  - window.modalTests.testTouchEvents()');
console.log('  - window.modalTests.runAll()');
