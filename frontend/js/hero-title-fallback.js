/**
 * Fallback para o título animado
 * Este script monitora o estado da animação de digitação e fornece um fallback
 * caso ela não funcione corretamente.
 */
document.addEventListener('DOMContentLoaded', () => {
    const typedText = document.querySelector('.typed-text');
    const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos', 'de Esperança'];
    let hasContent = false;
    
    // Verificar se o elemento existe
    if (typedText) {
        // Definir um texto padrão se não for carregado depois de um tempo
        setTimeout(() => {
            if (typedText.textContent.trim() === '' || typedText.textContent.length < 2) {
                console.log('Aplicando fallback para o título animado');
                typedText.textContent = words[2]; // "Cristãos" como fallback padrão
                typedText.style.visibility = 'visible';
                hasContent = true;
            }
        }, 3000);
        
        // Monitorar mudanças no conteúdo
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    if (typedText.textContent.trim().length > 0) {
                        hasContent = true;
                    }
                }
            });
        });
        
        // Iniciar observação
        observer.observe(typedText, { 
            characterData: true, 
            childList: true, 
            subtree: true 
        });
    }
    
    // Fallback para navegadores sem suporte a CSS moderno
    const titleContainer = document.querySelector('.hero__title');
    if (titleContainer) {
        const computedStyle = window.getComputedStyle(titleContainer);
        if (computedStyle.display === 'block' || computedStyle.position === 'static') {
            // Aplicar estilos de fallback
            titleContainer.style.display = 'flex';
            titleContainer.style.flexWrap = 'wrap';
            titleContainer.style.justifyContent = 'center';
            titleContainer.style.gap = '0.5rem';
        }
    }
});
