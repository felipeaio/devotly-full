/**
 * Mobile Scroll Prevention Testing Utilities
 * Test suite for verifying modal scroll prevention on mobile devices
 */

// Utility functions for mobile device detection
const MobileDetection = {
    // Check if device is mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // Check if device is iOS
    isiOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },

    // Check if device is Android
    isAndroid() {
        return /Android/i.test(navigator.userAgent);
    },

    // Get device info
    getDeviceInfo() {
        return {
            isMobile: this.isMobile(),
            isiOS: this.isiOS(),
            isAndroid: this.isAndroid(),
            userAgent: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }
};

// Test scroll prevention functionality
function testModalScrollPrevention() {
    console.log('🧪 Iniciando teste de prevenção de scroll no modal...');
    
    const modal = document.getElementById('previewModal');
    const previewButton = document.getElementById('previewButton');
    
    if (!modal || !previewButton) {
        console.error('❌ Elementos do modal não encontrados');
        return false;
    }
    
    // Get device info
    const deviceInfo = MobileDetection.getDeviceInfo();
    console.log('📱 Informações do dispositivo:', deviceInfo);
    
    // Test modal opening
    console.log('🔄 Abrindo modal...');
    previewButton.click();
    
    setTimeout(() => {
        // Check if classes were applied
        const bodyHasClass = document.body.classList.contains('modal-active');
        const htmlHasClass = document.documentElement.classList.contains('modal-active');
        const modalIsActive = modal.classList.contains('active');
        
        // Check body styles
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        
        console.log('📊 Resultados do teste:');
        console.log(`  - Body tem classe modal-active: ${bodyHasClass ? '✅' : '❌'}`);
        console.log(`  - HTML tem classe modal-active: ${htmlHasClass ? '✅' : '❌'}`);
        console.log(`  - Modal está ativo: ${modalIsActive ? '✅' : '❌'}`);
        console.log(`  - Body overflow: ${bodyStyles.overflow}`);
        console.log(`  - Body position: ${bodyStyles.position}`);
        console.log(`  - Body touch-action: ${bodyStyles.touchAction}`);
        console.log(`  - HTML overflow: ${htmlStyles.overflow}`);
        
        // Test scroll attempt
        const initialScrollY = window.scrollY;
        window.scrollTo(0, 100);
        
        setTimeout(() => {
            const newScrollY = window.scrollY;
            const scrollPrevented = newScrollY === initialScrollY;
            
            console.log(`  - Scroll foi prevenido: ${scrollPrevented ? '✅' : '❌'}`);
            console.log(`  - Posição inicial: ${initialScrollY}, Nova posição: ${newScrollY}`);
            
            // Close modal for next test
            const closeButton = document.getElementById('closePreviewButton');
            if (closeButton) {
                closeButton.click();
                
                setTimeout(() => {
                    const bodyStillHasClass = document.body.classList.contains('modal-active');
                    const modalStillActive = modal.classList.contains('active');
                    
                    console.log(`  - Modal fechado corretamente: ${!modalStillActive ? '✅' : '❌'}`);
                    console.log(`  - Classes removidas: ${!bodyStillHasClass ? '✅' : '❌'}`);
                }, 100);
            }
        }, 100);
    }, 100);
    
    return true;
}

// Test touch events specifically
function testTouchEvents() {
    console.log('👆 Testando eventos de toque...');
    
    const modal = document.getElementById('previewModal');
    if (!modal) {
        console.error('❌ Modal não encontrado para teste de touch');
        return false;
    }
    
    // Open modal first
    const previewButton = document.getElementById('previewButton');
    if (previewButton) {
        previewButton.click();
        
        setTimeout(() => {
            // Simulate touch events
            const touchStartEvent = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                touches: [new Touch({
                    identifier: 1,
                    target: modal,
                    clientX: 150,
                    clientY: 150
                })]
            });
            
            const touchMoveEvent = new TouchEvent('touchmove', {
                bubbles: true,
                cancelable: true,
                touches: [new Touch({
                    identifier: 1,
                    target: modal,
                    clientX: 150,
                    clientY: 100 // Move up
                })]
            });
            
            let touchStartPrevented = false;
            let touchMovePrevented = false;
            
            // Add event listeners to check if events are prevented
            modal.addEventListener('touchstart', (e) => {
                if (e.defaultPrevented) touchStartPrevented = true;
            });
            
            modal.addEventListener('touchmove', (e) => {
                if (e.defaultPrevented) touchMovePrevented = true;
            });
            
            // Dispatch events
            modal.dispatchEvent(touchStartEvent);
            modal.dispatchEvent(touchMoveEvent);
            
            console.log('📊 Resultados do teste de touch:');
            console.log(`  - TouchStart: ${touchStartPrevented ? '✅' : '❌'}`);
            console.log(`  - TouchMove: ${touchMovePrevented ? '✅' : '❌'}`);
            
            // Close modal
            const closeButton = document.getElementById('closePreviewButton');
            if (closeButton) closeButton.click();
        }, 100);
    }
    
    return true;
}

// Test wheel events
function testWheelEvents() {
    console.log('🖱️ Testando eventos de wheel/scroll...');
    
    const modal = document.getElementById('previewModal');
    const previewButton = document.getElementById('previewButton');
    
    if (!modal || !previewButton) {
        console.error('❌ Elementos necessários não encontrados');
        return false;
    }
    
    previewButton.click();
    
    setTimeout(() => {
        let wheelPrevented = false;
        
        modal.addEventListener('wheel', (e) => {
            if (e.defaultPrevented) wheelPrevented = true;
        });
        
        const wheelEvent = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: 100
        });
        
        modal.dispatchEvent(wheelEvent);
        
        console.log('📊 Resultado do teste de wheel:');
        console.log(`  - Wheel event prevenido: ${wheelPrevented ? '✅' : '❌'}`);
        
        // Close modal
        const closeButton = document.getElementById('closePreviewButton');
        if (closeButton) closeButton.click();
    }, 100);
    
    return true;
}

// Main test runner
function runModalTests() {
    console.log('🚀 Executando testes de prevenção de scroll do modal...');
    console.log('=====================================');
    
    // Check if we're on mobile
    const deviceInfo = MobileDetection.getDeviceInfo();
    if (deviceInfo.isMobile) {
        console.log('📱 Dispositivo móvel detectado - executando testes móveis');
    } else {
        console.log('🖥️ Dispositivo desktop detectado - executando testes desktop');
    }
    
    // Run tests sequentially
    setTimeout(() => {
        testModalScrollPrevention();
        
        setTimeout(() => {
            testTouchEvents();
            
            setTimeout(() => {
                testWheelEvents();
                
                setTimeout(() => {
                    console.log('=====================================');
                    console.log('✅ Todos os testes concluídos!');
                    console.log('📝 Para executar testes individuais:');
                    console.log('  - window.modalTests.testScrollPrevention()');
                    console.log('  - window.modalTests.testTouchEvents()');
                    console.log('  - window.modalTests.testWheelEvents()');
                    console.log('  - window.modalTests.runAll()');
                }, 1000);
            }, 2000);
        }, 2000);
    }, 1000);
}

// Export functions for manual use
window.modalTests = {
    testScrollPrevention: testModalScrollPrevention,
    testTouchEvents: testTouchEvents,
    testWheelEvents: testWheelEvents,
    runAll: runModalTests,
    deviceInfo: MobileDetection.getDeviceInfo,
    MobileDetection: MobileDetection
};

// Auto-run tests when loaded (optional - can be disabled)
if (window.location.search.includes('autotest=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runModalTests, 2000); // Wait for other scripts to load
    });
}

console.log('📝 Mobile Scroll Test carregado!');
console.log('📝 Para executar testes manualmente, use:');
console.log('  - window.modalTests.testScrollPrevention()');
console.log('  - window.modalTests.testTouchEvents()');
console.log('  - window.modalTests.runAll()');
console.log('📝 Para auto-executar, adicione ?autotest=true na URL');
