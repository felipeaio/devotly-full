/**
 * Enhanced ViewContent Tracking para Página Create
 * Sistema automatizado de tracking de visualizações com alta qualidade EMQ
 */

class CreateViewContentTracker {
    constructor() {
        this.tracked = new Set(); // Evitar tracking duplicado
        this.observer = null;
        this.isActive = false;
        
        this.init();
    }
    
    init() {
        // Aguardar o TikTok Events estar disponível
        if (typeof TikTokEvents !== 'undefined') {
            this.setupTracking();
        } else {
            // Tentar novamente em 1 segundo
            setTimeout(() => this.init(), 1000);
        }
    }
    
    setupTracking() {
        console.log('🎯 Iniciando Enhanced ViewContent Tracking para página Create');
        
        // 1. Tracking automático de seções visíveis
        this.setupIntersectionObserver();
        
        // 2. Tracking de interações específicas
        this.setupInteractionTracking();
        
        // 3. Tracking de elementos específicos da criação
        this.setupCreationElementsTracking();
        
        this.isActive = true;
    }
    
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5 // 50% do elemento visível
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.tracked.has(entry.target)) {
                    this.trackElementView(entry.target);
                    this.tracked.add(entry.target);
                }
            });
        }, options);
        
        // Observar elementos principais
        this.observeElements();
    }
    
    observeElements() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.observeElements());
            return;
        }
        
        // Elementos para observar
        const selectors = [
            '.form-step',
            '.preview-section',
            '.plan-selection',
            '.verse-selector',
            '.image-upload-area',
            '.music-selector',
            '.color-picker',
            '.template-selector'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !this.tracked.has(element)) {
                    this.observer.observe(element);
                }
            });
        });
    }
    
    trackElementView(element) {
        const elementData = this.analyzeElement(element);
        
        if (elementData.shouldTrack) {
            console.log(`📊 Auto-tracking ViewContent: ${elementData.name}`);
            
            if (typeof TikTokEvents !== 'undefined') {
                TikTokEvents.viewCreateContent(
                    elementData.type,
                    elementData.name
                );
            }
        }
    }
    
    analyzeElement(element) {
        const className = element.className || '';
        const id = element.id || '';
        const textContent = element.textContent?.trim().substring(0, 50) || '';
        
        // Determinar tipo e nome baseado no elemento
        if (className.includes('form-step')) {
            const stepNumber = this.extractStepNumber(element);
            return {
                type: 'step_view',
                name: `Etapa ${stepNumber} Visualizada`,
                shouldTrack: true
            };
        }
        
        if (className.includes('preview-section')) {
            return {
                type: 'preview_view',
                name: 'Preview do Cartão Visualizado',
                shouldTrack: true
            };
        }
        
        if (className.includes('verse-selector')) {
            return {
                type: 'verse_interface',
                name: 'Interface de Seleção de Versículos',
                shouldTrack: true
            };
        }
        
        if (className.includes('image-upload')) {
            return {
                type: 'upload_interface',
                name: 'Interface de Upload de Imagens',
                shouldTrack: true
            };
        }
        
        if (className.includes('music-selector')) {
            return {
                type: 'music_interface',
                name: 'Interface de Seleção de Música',
                shouldTrack: true
            };
        }
        
        if (className.includes('plan-selection')) {
            return {
                type: 'plan_view',
                name: 'Visualização de Planos',
                shouldTrack: true
            };
        }
        
        return {
            type: 'generic_element',
            name: textContent || 'Elemento da Página',
            shouldTrack: false
        };
    }
    
    extractStepNumber(element) {
        // Tentar extrair número da etapa
        const text = element.textContent || '';
        const match = text.match(/etapa\s+(\d+)/i) || text.match(/step\s+(\d+)/i);
        return match ? match[1] : '1';
    }
    
    setupInteractionTracking() {
        // Tracking quando usuário interage com elementos específicos
        document.addEventListener('click', (event) => {
            this.handleClick(event);
        });
        
        document.addEventListener('change', (event) => {
            this.handleChange(event);
        });
        
        document.addEventListener('input', (event) => {
            this.handleInput(event);
        });
    }
    
    handleClick(event) {
        const target = event.target;
        const clickData = this.analyzeClick(target);
        
        if (clickData.shouldTrack && typeof TikTokEvents !== 'undefined') {
            console.log(`🖱️ Click ViewContent: ${clickData.name}`);
            TikTokEvents.viewCreateContent(clickData.type, clickData.name);
        }
    }
    
    analyzeClick(element) {
        const className = element.className || '';
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim() || '';
        
        if (className.includes('verse-item') || className.includes('verse-select')) {
            return {
                type: 'verse_selection',
                name: `Versículo Selecionado: ${text.substring(0, 30)}`,
                shouldTrack: true
            };
        }
        
        if (className.includes('template') && (className.includes('select') || tagName === 'button')) {
            return {
                type: 'template_selection',
                name: `Template Selecionado: ${text}`,
                shouldTrack: true
            };
        }
        
        if (className.includes('music') && (className.includes('select') || className.includes('choose'))) {
            return {
                type: 'music_selection',
                name: `Música Selecionada: ${text}`,
                shouldTrack: true
            };
        }
        
        if (className.includes('color') && (className.includes('picker') || className.includes('select'))) {
            return {
                type: 'color_customization',
                name: 'Cor Personalizada Selecionada',
                shouldTrack: true
            };
        }
        
        return { shouldTrack: false };
    }
    
    handleChange(event) {
        // Tracking de mudanças em formulários
        const target = event.target;
        
        if (target.type === 'file' && target.files && target.files.length > 0) {
            if (typeof TikTokEvents !== 'undefined') {
                console.log('📁 File Upload ViewContent');
                TikTokEvents.viewCreateContent('image_upload', 'Imagem Carregada');
            }
        }
    }
    
    handleInput(event) {
        // Tracking de edição de texto (com debounce)
        const target = event.target;
        
        if (target.tagName.toLowerCase() === 'textarea' || target.type === 'text') {
            clearTimeout(this.inputTimeout);
            this.inputTimeout = setTimeout(() => {
                if (target.value.length > 10 && typeof TikTokEvents !== 'undefined') {
                    console.log('✏️ Text Editing ViewContent');
                    TikTokEvents.viewCreateContent('text_editing', 'Texto Personalizado');
                }
            }, 2000); // 2 segundos de debounce
        }
    }
    
    setupCreationElementsTracking() {
        // Tracking específico quando elementos de criação são renderizados
        const checkForNewElements = () => {
            if (this.isActive) {
                this.observeElements(); // Re-observar novos elementos
                setTimeout(checkForNewElements, 3000); // Verificar a cada 3 segundos
            }
        };
        
        checkForNewElements();
    }
    
    destroy() {
        this.isActive = false;
        if (this.observer) {
            this.observer.disconnect();
        }
        clearTimeout(this.inputTimeout);
    }
}

// Inicializar automaticamente quando estiver na página create
if (window.location.pathname.includes('/create')) {
    window.createViewTracker = new CreateViewContentTracker();
    
    // Cleanup quando sair da página
    window.addEventListener('beforeunload', () => {
        if (window.createViewTracker) {
            window.createViewTracker.destroy();
        }
    });
}

// Export para uso global
window.CreateViewContentTracker = CreateViewContentTracker;
