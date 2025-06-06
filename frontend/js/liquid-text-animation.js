/**
 * Liquid Text Animation - Sistema Completamente Novo
 * Animação fluida e natural com transições líquidas
 */

class LiquidTextAnimation {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container "${containerId}" não encontrado`);
            return;
        }

        this.options = {
            words: ['Inspiradores', 'Transformadores', 'Edificantes', 'Motivacionais', 'Espirituais', 'Abençoados'],
            interval: 4500,
            transitionDuration: 500,
            pauseOnHover: true,
            enableCursor: true,
            enableBackgroundEffects: true,
            ...options
        };

        this.currentIndex = 0;
        this.isTransitioning = false;
        this.animationTimer = null;
        this.isHovered = false;
        this.isPaused = false;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupAccessibility();
        this.startAnimation();
        
        console.log('LiquidTextAnimation inicializada:', this.options.words);
    }

    setupElements() {
        this.stage = this.container.querySelector('.liquid-stage');
        this.textElement = this.container.querySelector('.liquid-text');
        this.cursor = this.container.querySelector('.liquid-cursor');
        this.bgEffects = this.container.querySelector('.liquid-bg-effects');

        if (!this.textElement) {
            console.error('Elemento .liquid-text não encontrado');
            return;
        }

        // Definir texto inicial
        this.updateText(this.options.words[0], false);
    }

    setupEventListeners() {
        // Hover events
        if (this.options.pauseOnHover) {
            this.container.addEventListener('mouseenter', () => {
                this.isHovered = true;
                this.pauseAnimation();
            });

            this.container.addEventListener('mouseleave', () => {
                this.isHovered = false;
                if (!this.isPaused) {
                    this.resumeAnimation();
                }
            });
        }

        // Focus events para acessibilidade
        this.container.addEventListener('focus', () => {
            this.pauseAnimation();
        });

        this.container.addEventListener('blur', () => {
            if (!this.isHovered && !this.isPaused) {
                this.resumeAnimation();
            }
        });

        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimation();
            } else if (!this.isHovered && !this.isPaused) {
                this.resumeAnimation();
            }
        });
    }

    setupAccessibility() {
        // Configurar aria-live
        this.container.setAttribute('role', 'text');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('tabindex', '0');
        
        // Respeitar preferências de movimento reduzido
        if (this.prefersReducedMotion()) {
            this.options.transitionDuration = 500;
            this.options.interval = 8000;
            this.disableBackgroundEffects();
        }
    }

    prefersReducedMotion() {
        return window.matchMedia && 
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    disableBackgroundEffects() {
        if (this.bgEffects) {
            this.bgEffects.style.display = 'none';
        }
    }

    updateText(newText, animate = true) {
        if (!this.textElement) return;

        if (animate) {
            this.performTransition(newText);
        } else {
            this.textElement.textContent = newText;
            this.updateAriaLabel(newText);
        }
    }

    async performTransition(newText) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        this.container.classList.add('transitioning');

        try {
            // Fase 1: Fade out do texto atual
            await this.fadeOutText();
            
            // Fase 2: Trocar o texto
            this.textElement.textContent = newText;
            this.updateAriaLabel(newText);
            
            // Fase 3: Fade in do novo texto
            await this.fadeInText();
            
        } catch (error) {
            console.error('Erro na transição:', error);
        } finally {
            this.isTransitioning = false;
            this.container.classList.remove('transitioning');
        }
    }

    fadeOutText() {
        return new Promise(resolve => {
            this.textElement.classList.add('transitioning-out');
            
            setTimeout(() => {
                resolve();
            }, this.options.transitionDuration * 0.6);
        });
    }

    fadeInText() {
        return new Promise(resolve => {
            // Remover classe de saída
            this.textElement.classList.remove('transitioning-out');
            
            // Aguardar um frame
            requestAnimationFrame(() => {
                this.textElement.classList.add('transitioning-in');
                
                setTimeout(() => {
                    this.textElement.classList.remove('transitioning-in');
                    resolve();
                }, this.options.transitionDuration * 0.8);
            });
        });
    }

    updateAriaLabel(text) {
        this.container.setAttribute('aria-label', `Texto animado mostrando: ${text}`);
    }

    startAnimation() {
        if (this.animationTimer) return;
        
        this.scheduleNextTransition();
    }

    scheduleNextTransition() {
        this.animationTimer = setTimeout(() => {
            if (!this.isHovered && !this.isPaused) {
                this.nextWord();
            }
            this.scheduleNextTransition();
        }, this.options.interval);
    }

    nextWord() {
        this.currentIndex = (this.currentIndex + 1) % this.options.words.length;
        const nextWord = this.options.words[this.currentIndex];
        this.updateText(nextWord, true);
    }

    pauseAnimation() {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }

    resumeAnimation() {
        if (!this.animationTimer && !this.isTransitioning) {
            this.scheduleNextTransition();
        }
    }

    // Métodos públicos
    pause() {
        this.isPaused = true;
        this.pauseAnimation();
    }

    resume() {
        this.isPaused = false;
        if (!this.isHovered) {
            this.resumeAnimation();
        }
    }

    setWords(newWords) {
        if (Array.isArray(newWords) && newWords.length > 0) {
            this.options.words = newWords;
            this.currentIndex = 0;
            this.updateText(newWords[0], false);
        }
    }

    destroy() {
        this.pauseAnimation();
        this.container.classList.remove('transitioning');
        
        // Remover event listeners
        this.container.removeEventListener('mouseenter', this.pauseAnimation);
        this.container.removeEventListener('mouseleave', this.resumeAnimation);
        this.container.removeEventListener('focus', this.pauseAnimation);
        this.container.removeEventListener('blur', this.resumeAnimation);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

// Sistema de Cursor Líquido
class LiquidCursor {
    constructor(cursorElement) {
        this.cursor = cursorElement;
        if (!this.cursor) return;

        this.initializeVariations();
        this.setupResponsiveEffects();
    }

    initializeVariations() {
        // Adicionar variações sutis na animação
        const baseAnimation = 'liquidCursorFlow';
        const durations = ['2.5s', '2.8s', '2.3s', '2.6s'];
        const delays = ['0s', '0.3s', '0.6s', '0.9s'];

        setInterval(() => {
            const duration = durations[Math.floor(Math.random() * durations.length)];
            const delay = delays[Math.floor(Math.random() * delays.length)];
            
            this.cursor.style.animationDuration = duration;
            this.cursor.style.animationDelay = delay;
        }, 10000);
    }

    setupResponsiveEffects() {
        const container = this.cursor.closest('.liquid-text-container');
        
        if (container) {
            container.addEventListener('mouseenter', () => {
                this.cursor.style.filter = 'brightness(1.3) saturate(1.2)';
                this.cursor.style.transform = 'scaleY(1.05)';
            });

            container.addEventListener('mouseleave', () => {
                this.cursor.style.filter = 'brightness(1)';
                this.cursor.style.transform = 'scaleY(1)';
            });
        }
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o elemento existe
    const container = document.getElementById('liquid-text-element');
    if (!container) {
        console.log('Container liquid-text-element não encontrado');
        return;
    }    // Inicializar animação principal
    const liquidAnimation = new LiquidTextAnimation('liquid-text-element', {
        words: ['Inspiradores', 'Transformadores', 'Edificantes', 'Motivacionais', 'Espirituais', 'Abençoados'],
        interval: 3000,
        transitionDuration: 1200,
        pauseOnHover: true
    });

    // Inicializar cursor
    const cursorElement = container.querySelector('.liquid-cursor');
    if (cursorElement) {
        new LiquidCursor(cursorElement);
    }

    // Disponibilizar globalmente
    window.liquidTextAnimation = liquidAnimation;

    console.log('Sistema Liquid Text Animation carregado com sucesso!');
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LiquidTextAnimation, LiquidCursor };
}
