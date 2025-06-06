/**
 * Enhanced Text Typing Animation for Hero Section
 * Modern typewriter effect with improved UX and accessibility
 */

class TypingAnimation {
    constructor(textElement, cursorElement, options = {}) {
        this.textElement = textElement;
        this.cursorElement = cursorElement;
        
        // Configuration options
        this.config = {
            words: options.words || ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos', 'de Esperança', 'Amorosos'],
            typingSpeed: options.typingSpeed || 120,
            erasingSpeed: options.erasingSpeed || 80,
            pauseDelay: options.pauseDelay || 2500,
            startDelay: options.startDelay || 1000,
            loop: options.loop !== false,
            shuffle: options.shuffle || false,
            showCursor: options.showCursor !== false
        };
        
        // Animation state
        this.state = {
            wordIndex: 0,
            charIndex: 0,
            isDeleting: false,
            isWaiting: false,
            isPaused: false
        };
        
        // Performance optimization
        this.animationFrame = null;
        this.lastUpdate = 0;
        
        this.init();
    }
    
    init() {
        if (!this.textElement || !this.cursorElement) {
            console.warn('Typing animation: Required elements not found');
            return;
        }
        
        // Setup initial state
        this.textElement.textContent = '';
        this.cursorElement.style.display = this.config.showCursor ? 'inline-block' : 'none';
        
        // Shuffle words if enabled
        if (this.config.shuffle) {
            this.shuffleWords();
        }
        
        // Add accessibility attributes
        this.textElement.setAttribute('aria-live', 'polite');
        this.textElement.setAttribute('aria-label', 'Texto animado');
        
        // Start animation after delay
        setTimeout(() => this.startAnimation(), this.config.startDelay);
        
        // Handle visibility changes for performance
        this.setupVisibilityHandler();
    }
    
    shuffleWords() {
        for (let i = this.config.words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.config.words[i], this.config.words[j]] = [this.config.words[j], this.config.words[i]];
        }
    }
    
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    
    startAnimation() {
        this.animate();
    }
    
    animate() {
        if (this.state.isPaused) return;
        
        const currentWord = this.config.words[this.state.wordIndex];
        const shouldContinue = this.updateText(currentWord);
        
        if (shouldContinue) {
            const delay = this.getAnimationDelay();
            setTimeout(() => this.animate(), delay);
        }
    }
    
    updateText(currentWord) {
        // Handle typing completion
        if (!this.state.isDeleting && this.state.charIndex === currentWord.length) {
            this.state.isWaiting = true;
            this.cursorElement.classList.add('blink');
            this.cursorElement.classList.remove('smart-blink');
            this.textElement.classList.remove('typing');
            
            // Add completion effect
            this.addCompletionEffect();
            
            setTimeout(() => {
                this.state.isDeleting = true;
                this.state.isWaiting = false;
                this.cursorElement.classList.remove('blink');
                this.cursorElement.classList.add('smart-blink');
                this.animate();
            }, this.config.pauseDelay);
            
            return false;
        }
        
        // Handle deletion completion
        if (this.state.isDeleting && this.state.charIndex === 0) {
            this.state.isDeleting = false;
            this.state.wordIndex = (this.state.wordIndex + 1) % this.config.words.length;
            
            // Stop if not looping and we've completed all words
            if (!this.config.loop && this.state.wordIndex === 0) {
                this.cursorElement.classList.add('blink');
                return false;
            }
            
            // Add word transition effect
            this.addTransitionEffect();
            
            setTimeout(() => this.animate(), 500);
            return false;
        }
        
        // Update character index and text content
        this.state.charIndex += this.state.isDeleting ? -1 : 1;
        this.textElement.textContent = currentWord.substring(0, this.state.charIndex);
        
        // Add typing effect class
        if (!this.state.isDeleting) {
            this.textElement.classList.add('typing');
            this.cursorElement.classList.remove('blink', 'smart-blink');
        } else {
            this.textElement.classList.remove('typing');
        }
        
        return true;
    }
    
    addCompletionEffect() {
        // Add visual feedback when word is complete
        const container = this.textElement.closest('.typing-container');
        if (container) {
            container.classList.add('word-complete');
            setTimeout(() => {
                container.classList.remove('word-complete');
            }, 300);
        }
    }
    
    addTransitionEffect() {
        // Add smooth transition between words
        const container = this.textElement.closest('.typing-container');
        if (container) {
            container.classList.add('word-transition');
            setTimeout(() => {
                container.classList.remove('word-transition');
            }, 400);
        }
    }
    
    getAnimationDelay() {
        const baseDelay = this.state.isDeleting ? this.config.erasingSpeed : this.config.typingSpeed;
        
        // Add some randomness for more natural feel
        const variance = baseDelay * 0.3;
        const randomDelay = baseDelay + (Math.random() - 0.5) * variance;
        
        return Math.max(50, Math.round(randomDelay));
    }
    
    pause() {
        this.state.isPaused = true;
    }
    
    resume() {
        if (this.state.isPaused) {
            this.state.isPaused = false;
            this.animate();
        }
    }
    
    stop() {
        this.state.isPaused = true;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    reset() {
        this.stop();
        this.state = {
            wordIndex: 0,
            charIndex: 0,
            isDeleting: false,
            isWaiting: false,
            isPaused: false
        };
        this.textElement.textContent = '';
        this.textElement.classList.remove('typing');
        this.cursorElement.classList.remove('blink');
    }
    
    updateWords(newWords) {
        this.config.words = newWords;
        if (this.config.shuffle) {
            this.shuffleWords();
        }
    }
}

// Enhanced initialization with better error handling and options
document.addEventListener('DOMContentLoaded', () => {
    const typedTextElement = document.querySelector('.typed-text');
    const cursorElement = document.querySelector('.cursor');
    
    if (typedTextElement && cursorElement) {
        // Initialize with enhanced options
        const typingAnimation = new TypingAnimation(typedTextElement, cursorElement, {
            words: [
                'Inspiradores', 
                'de Fé', 
                'Cristãos', 
                'Eternos', 
                'de Esperança', 
                'Amorosos', 
                'Divinos',
                'de Luz',
                'Abençoados'
            ],
            typingSpeed: 100,
            erasingSpeed: 60,
            pauseDelay: 2800,
            startDelay: 1200,
            shuffle: false,
            loop: true
        });
        
        // Expose to global scope for potential external control
        window.devotlyTypingAnimation = typingAnimation;
        
        // Handle reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            typingAnimation.stop();
            typedTextElement.textContent = 'Inspiradores';
            cursorElement.style.display = 'none';
        }
        
        // Handle visibility changes for better performance
        let isVisible = true;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isVisible) {
                    typingAnimation.resume();
                    isVisible = true;
                } else if (!entry.isIntersecting && isVisible) {
                    typingAnimation.pause();
                    isVisible = false;
                }
            });
        }, { threshold: 0.1 });
        
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            observer.observe(heroSection);
        }
        
        // Add keyboard controls for accessibility
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                if (typingAnimation.state.isPaused) {
                    typingAnimation.resume();
                } else {
                    typingAnimation.pause();
                }
            }
        });
        
    } else {
        console.warn('Typing animation elements not found');
        
        // Fallback: Show static text if elements are missing
        const heroTitle = document.querySelector('.hero__title');
        if (heroTitle && !typedTextElement) {
            const fallbackSpan = document.createElement('span');
            fallbackSpan.textContent = 'Inspiradores';
            fallbackSpan.className = 'typed-text static';
            heroTitle.appendChild(fallbackSpan);
        }
    }
});
