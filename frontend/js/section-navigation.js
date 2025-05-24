/**
 * Devotly Section Navigation
 * Aprimora a navegação entre seções no visualizador de cartões
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configuração inicial quando o DOM carrega
    setupPerformanceOptimizations();
    setupAdvancedKeyboardNavigation();
    preventDefaultScrolling();
});

/**
 * Otimiza o desempenho das transições e animações
 */
function setupPerformanceOptimizations() {
    // Forçar repaint em dispositivos móveis para suavizar as transições
    const sections = document.querySelectorAll('.preview-section');
    sections.forEach(section => {
        section.style.willChange = 'transform, opacity';
        
        // Aplicar pequena transformação para habilitar aceleração de hardware
        section.style.transform = 'translateZ(0)';
        
        // Adicionar eventos para melhorar a experiência de toque
        section.addEventListener('touchstart', () => {
            section.style.transition = 'transform 0.3s ease-out';
        }, { passive: true });
    });
    
    // Evitar efeitos indesejados de rebote no iOS
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
}

/**
 * Configuração avançada para navegação por teclado
 */
function setupAdvancedKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Tab para navegar entre seções
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const direction = e.shiftKey ? -1 : 1;
            const sections = document.querySelectorAll('.preview-section');
            const dots = document.querySelectorAll('.section-dot');
            
            // Encontrar a seção ativa atual
            const activeIndex = Array.from(dots).findIndex(dot => 
                dot.classList.contains('active')
            );
            
            // Calcular o próximo índice
            const nextIndex = Math.max(0, Math.min(sections.length - 1, activeIndex + direction));
            
            if (nextIndex !== activeIndex && sections[nextIndex]) {
                sections[nextIndex].scrollIntoView({ behavior: 'smooth' });
                
                // Atualizar indicação visual
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === nextIndex);
                });
            }
        }
    });
}

/**
 * Previne comportamentos indesejados de rolagem
 */
function preventDefaultScrolling() {
    const container = document.querySelector('.preview-sections');
    if (!container) return;
    
    // Impedir rolagem padrão em dispositivos móveis
    container.addEventListener('touchmove', (e) => {
        const isScrollingVertically = Math.abs(e.touches[0].clientY - e.touches[0].startClientY) > 
                                     Math.abs(e.touches[0].clientX - e.touches[0].startClientX);
        
        if (isScrollingVertically) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Também prevenir scroll com mousewheel
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
    }, { passive: false });
}
