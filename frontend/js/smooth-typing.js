/**
 * Smooth Typing Animation for Devotly Hero Section
 * Implementação suave e estável do efeito de digitação
 */

class SmoothTypingAnimation {
    constructor(container, options = {}) {
        this.container = container;
        this.textElement = container.querySelector('.typed-text');
        this.cursorElement = container.querySelector('.cursor');
        
        // Configurações padrão
        this.config = {
            words: options.words || ['Inspiradores', 'de Fé', 'Cristãos', 'Eternos', 'de Esperança'],
            typingSpeed: options.typingSpeed || 150,
            deletingSpeed: options.deletingSpeed || 100,
            pauseTime: options.pauseTime || 3000,
            startDelay: options.startDelay || 1000,
            ...options
        };
        
        // Estado da animação
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.isAnimating = false;
        this.timeoutId = null;
        this.isVisible = true;
        
        this.init();
    }
    
    init() {
        if (!this.textElement || !this.cursorElement) {
            console.warn('Elementos necessários não encontrados para a animação de digitação');
            return;
        }
        
        // Estado inicial
        this.textElement.textContent = '';
        this.cursorElement.style.opacity = '1';
        
        // Setup de acessibilidade
        this.setupAccessibility();
        
        // Setup de visibilidade para performance
        this.setupVisibilityObserver();
        
        // Inicia a animação
        this.start();
    }
    
    setupAccessibility() {
        this.textElement.setAttribute('aria-live', 'polite');
        this.textElement.setAttribute('aria-label', 'Texto animado com palavras inspiradoras');
        this.cursorElement.setAttribute('aria-hidden', 'true');
    }
    
    setupVisibilityObserver() {
        // Pausa a animação quando não está visível para melhor performance
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
                if (this.isVisible && !this.isAnimating) {
                    this.resume();
                } else if (!this.isVisible) {
                    this.pause();
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(this.container);
    }
    
    start() {
        if (this.isAnimating) return;
        
        // Delay inicial antes de começar
        setTimeout(() => {
            this.isAnimating = true;
            this.type();
        }, this.config.startDelay);
    }
    
    type() {
        if (!this.isAnimating || !this.isVisible) return;
        
        const currentWord = this.config.words[this.currentWordIndex];
        
        if (this.isDeleting) {
            // Modo de deletar
            this.currentCharIndex--;
            this.textElement.textContent = currentWord.substring(0, this.currentCharIndex);
            
            if (this.currentCharIndex === 0) {
                // Terminou de deletar, vai para a próxima palavra
                this.isDeleting = false;
                this.currentWordIndex = (this.currentWordIndex + 1) % this.config.words.length;
                
                // Pequena pausa antes de começar a próxima palavra
                this.scheduleNext(300);
                return;
            }
            
            this.scheduleNext(this.config.deletingSpeed);
        } else {
            // Modo de digitação
            this.currentCharIndex++;
            this.textElement.textContent = currentWord.substring(0, this.currentCharIndex);
            
            // Adiciona efeito visual durante a digitação
            this.addTypingEffect();
            
            if (this.currentCharIndex === currentWord.length) {
                // Terminou de digitar, pausa e depois começa a deletar
                this.removeTypingEffect();
                this.addCompletionEffect();
                
                setTimeout(() => {
                    this.isDeleting = true;
                    this.scheduleNext(this.config.deletingSpeed);
                }, this.config.pauseTime);
                return;
            }
            
            this.scheduleNext(this.config.typingSpeed);
        }
    }
    
    scheduleNext(delay) {
        // Adiciona variação natural no timing
        const variance = delay * 0.2;
        const randomDelay = delay + (Math.random() - 0.5) * variance;
        
        this.timeoutId = setTimeout(() => this.type(), Math.max(50, randomDelay));
    }
    
    addTypingEffect() {
        this.textElement.classList.add('typing');
        this.cursorElement.classList.remove('blink');
    }
    
    removeTypingEffect() {
        this.textElement.classList.remove('typing');
        this.cursorElement.classList.add('blink');
    }
    
    addCompletionEffect() {
        // Efeito visual quando a palavra é completada
        this.container.classList.add('word-complete');
        setTimeout(() => {
            this.container.classList.remove('word-complete');
        }, 500);
    }
    
    pause() {
        this.isAnimating = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    resume() {
        if (!this.isAnimating && this.isVisible) {
            this.isAnimating = true;
            this.type();
        }
    }
    
    stop() {
        this.pause();
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.textElement.textContent = '';
        this.removeTypingEffect();
    }
    
    destroy() {
        this.stop();
        this.container.classList.remove('word-complete');
        this.textElement.classList.remove('typing');
        this.cursorElement.classList.remove('blink');
    }
}

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#text-animation-container');
    
    if (container) {
        // Palavras específicas para o Devotly
        const words = [
            'Inspiradores',
            'de Fé', 
            'Cristãos',
            'Eternos',
            'de Esperança',
            'Amorosos',
            'Divinos',
            'de Luz'
        ];
        
        // Configurações otimizadas para suavidade
        const config = {
            words: words,
            typingSpeed: 120,
            deletingSpeed: 80,
            pauseTime: 2500,
            startDelay: 800
        };
        
        // Cria a instância da animação
        window.devotlyTyping = new SmoothTypingAnimation(container, config);
        
        // Suporte para movimento reduzido (acessibilidade)
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.devotlyTyping.stop();
            container.querySelector('.typed-text').textContent = 'Inspiradores';
            container.querySelector('.cursor').style.display = 'none';
        }
        
        console.log('✅ Animação de digitação inicializada com sucesso');
    } else {
        console.warn('⚠️ Container de animação não encontrado');
    }
});
