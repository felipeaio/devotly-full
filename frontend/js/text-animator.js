/**
 * Animação de Digitação Robusta
 * Uma implementação simples e estável para animações de texto digitado
 */

class TextTypingEffect {
    constructor(options) {
        // Elementos DOM
        this.container = options.container || document.getElementById('text-animation-container');
        this.textElement = options.textElement || document.querySelector('.typed-text');
        
        // Opções de configuração
        this.words = options.words || ['Cristãos', 'Inspiradores', 'de Fé', 'Eternos', 'de Esperança'];
        this.typeSpeed = options.typeSpeed || 80;       // Velocidade de digitação (ms)
        this.deleteSpeed = options.deleteSpeed || 50;   // Velocidade de apagar (ms)
        this.delayAfterWord = options.delayAfterWord || 1500; // Pausa após completar palavra (ms)
        this.delayBeforeStart = options.delayBeforeStart || 800; // Atraso inicial antes de começar
        this.loop = options.loop !== false;            // Loop infinito
        
        // Estado interno
        this.wordIndex = 0;
        this.charIndex = 0;
        this.currentTimeout = null;
        this.isDeleting = false;
        this.cursorElement = null;
        this.isRunning = false;
        this.isVisible = true;
        
        // Inicializar
        this.init();
    }
    
    init() {
        // Limpar conteúdo prévio
        if (this.textElement) {
            this.textElement.textContent = '';
            this.textElement.style.visibility = 'visible';
        }
        
        // Criar o cursor
        this.createCursor();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Começar a animação
        setTimeout(() => this.startAnimation(), this.delayBeforeStart);
    }
    
    createCursor() {
        if (!this.container) return;
        
        // Verificar se já existe um cursor e remover
        const existingCursor = this.container.querySelector('.text-cursor');
        if (existingCursor) existingCursor.remove();
        
        // Criar novo cursor
        this.cursorElement = document.createElement('span');
        this.cursorElement.className = 'text-cursor';
        this.container.appendChild(this.cursorElement);
    }
    
    setupEventListeners() {
        // Detectar quando a página fica visível/invisível
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
            
            // Se a página ficou visível e a animação não está rodando, reinicia
            if (this.isVisible && !this.isRunning) {
                this.resetAnimation();
            }
        });
        
        // Responder a redimensionamento
        window.addEventListener('resize', () => {
            if (this.currentTimeout) {
                clearTimeout(this.currentTimeout);
            }
            
            // Reposicionar o cursor em caso de mudanças de layout
            this.updateCursorPosition();
        });
    }
    
    updateCursorPosition() {
        if (!this.cursorElement || !this.textElement) return;
        
        // Ajustar a posição do cursor com base no texto atual
        const textWidth = this.textElement.offsetWidth;
        this.cursorElement.style.left = `${textWidth}px`;
        this.cursorElement.style.right = 'auto';
    }
    
    startAnimation() {
        this.isRunning = true;
        this.animate();
    }
    
    resetAnimation() {
        // Limpar qualquer timeout pendente
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }
        
        // Reiniciar índices
        this.wordIndex = 0;
        this.charIndex = 0;
        this.isDeleting = false;
        
        // Limpar texto
        if (this.textElement) {
            this.textElement.textContent = '';
        }
        
        // Reiniciar animação
        this.startAnimation();
    }
    
    animate() {
        // Se a página não estiver visível, pausar
        if (!this.isVisible) {
            this.isRunning = false;
            return;
        }
        
        // Limpar qualquer timeout pendente
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        
        // Garantir que temos elementos DOM válidos
        if (!this.textElement || !this.words || this.words.length === 0) {
            this.textElement.textContent = 'Cristãos'; // Fallback
            return;
        }
        
        const currentWord = this.words[this.wordIndex];
        
        // Determinar próxima ação: apagar ou digitar
        if (this.isDeleting) {
            // Apagar caracteres
            this.charIndex--;
            
            // Quando terminado de apagar
            if (this.charIndex < 0) {
                this.isDeleting = false;
                this.wordIndex = (this.wordIndex + 1) % this.words.length;
                
                // Se atingiu o fim e não estiver em loop, para
                if (this.wordIndex === 0 && !this.loop) {
                    return;
                }
                
                // Pequena pausa antes da próxima palavra
                this.currentTimeout = setTimeout(() => this.animate(), 300);
                return;
            }
        } else {
            // Digitar caracteres
            this.charIndex++;
            
            // Quando terminar de digitar uma palavra
            if (this.charIndex > currentWord.length) {
                // Pausa antes de começar a apagar
                this.currentTimeout = setTimeout(() => {
                    this.isDeleting = true;
                    this.animate();
                }, this.delayAfterWord);
                return;
            }
        }
        
        // Atualizar o texto
        this.textElement.textContent = currentWord.substring(0, this.charIndex);
        
        // Atualizar posição do cursor
        this.updateCursorPosition();
        
        // Calcular velocidade
        const typingSpeed = this.isDeleting ? this.deleteSpeed : this.typeSpeed;
        
        // Próxima iteração
        this.currentTimeout = setTimeout(() => this.animate(), typingSpeed);
    }
    
    // Limpar e remover
    destroy() {
        // Limpar timeouts
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }
        
        // Remover event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('resize', this.updateCursorPosition);
        
        // Remover cursor
        if (this.cursorElement) {
            this.cursorElement.remove();
        }
        
        // Texto final
        if (this.textElement) {
            this.textElement.textContent = this.words[0] || 'Cristãos';
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('text-animation-container');
    const textElement = container ? container.querySelector('.typed-text') : null;
    
    if (container && textElement) {
        // Palavras para animar
        const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos', 'de Esperança'];
        
        // Inicializar com opções
        const typingEffect = new TextTypingEffect({
            container: container,
            textElement: textElement,
            words: words,
            typeSpeed: 80,
            deleteSpeed: 50,
            delayAfterWord: 1500
        });
        
        // Disponibilizar globalmente para debug
        window.typingEffect = typingEffect;
        
        // Fallback - se nada aparecer após 3 segundos
        setTimeout(() => {
            if (!textElement.textContent || textElement.textContent.trim() === '') {
                console.log('Aplicando fallback - texto não inicializado');
                textElement.textContent = 'Cristãos';
            }
        }, 3000);
    } else {
        console.error('Elementos necessários para animação não encontrados');
    }
});
