/**
 * Simple, Reliable Typed Text Animation
 * A clean implementation without race conditions or timing issues
 */

// Polyfill for older browsers
(function() {
    // requestAnimationFrame polyfill
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    }
    
    // Element.remove() polyfill
    if (!('remove' in Element.prototype)) {
        Element.prototype.remove = function() {
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        };
    }
})();

class TypingAnimation {
  constructor(element, words, options = {}) {
    this.element = element;
    this.words = words;
    this.typeSpeed = options.typeSpeed || 100;
    this.deleteSpeed = options.deleteSpeed || 50;
    this.pauseDelay = options.pauseDelay || 1500;
    
    this.wordIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.timer = null;
    
    // Iniciar animação
    this.type();
  }
  
  type() {
    // Limpar qualquer timer existente
    if (this.timer) clearTimeout(this.timer);
    
    const currentWord = this.words[this.wordIndex];
    
    if (this.isDeleting) {
      this.charIndex--;
      if (this.charIndex < 0) {
        this.isDeleting = false;
        this.wordIndex = (this.wordIndex + 1) % this.words.length;
        this.timer = setTimeout(() => this.type(), 500);
        return;
      }
    } else {
      this.charIndex++;
      if (this.charIndex > currentWord.length) {
        this.isDeleting = true;
        this.timer = setTimeout(() => this.type(), this.pauseDelay);
        return;
      }
    }
    
    this.element.textContent = currentWord.substring(0, this.charIndex);
    this.timer = setTimeout(() => this.type(), 
      this.isDeleting ? this.deleteSpeed : this.typeSpeed);
  }
  
  // Limpar recursos quando não for mais necessário
  destroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const element = document.querySelector('.typed-text');
  const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos'];
  
  if (element) {
    new TypingAnimation(element, words);
  }
});
