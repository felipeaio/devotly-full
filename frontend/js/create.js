/**
 * Devotly - Create (Versão Aprimorada)
 * 
 * Controle completo do fluxo de criação de cartões com pré-visualização em tempo real
 */

if (!HTMLCanvasElement.prototype.toBlob) {
    // Polyfill para navegadores antigos
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        const dataURL = this.toDataURL(type, quality);
        const binStr = atob(dataURL.split(',')[1]);
        const arr = new Uint8Array(binStr.length);

        for (let i = 0; i < binStr.length; i++) {
            arr[i] = binStr.charCodeAt(i);
        }

        callback(new Blob([arr], { type: type || 'image/png' }));
    };
}

// preview.js
class CardPreview {
    constructor(container, state) {
        this.container = container;
        this.state = state;
    }

    update() {
        // Lógica de atualização de preview
    }
}

// form-manager.js
class FormManager {
    constructor(form, state) {
        this.form = form;
        this.state = state;
    }

    setupValidation() {
        // Lógica de validação
    }
}

// main.js
class DevotlyApp {
    constructor() {
        this.state = {/* ... */ };
        this.preview = new CardPreview(document.querySelector('.card-preview-container'), this.state);
        this.formManager = new FormManager(document.getElementById('cardForm'), this.state);
    }
}

class DevotlyCreator {
    constructor() {
        // Detectar dispositivos de baixo desempenho
        this.isLowEndDevice = this.detectLowEndDevice();
        
        // Garantir que o DOM está carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // Método para detectar dispositivos de baixo desempenho
    detectLowEndDevice() {
        // Verificar hardware
        const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
        const lowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        
        // Verificar se é um dispositivo Android antigo
        const isOldAndroid = /Android/.test(navigator.userAgent) && 
                             (/Android 4\./.test(navigator.userAgent) || 
                              /Android 5\./.test(navigator.userAgent));
        
        return lowMemory || lowCPU || isOldAndroid;
    }

    initialize() {
        // Inicializar elementos
        this.initializeElements();
        
        // Inicializar estado
        this.initializeState();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Outras inicializações
        this.init();
    }

    initializeElements() {
        this.elements = {
            form: document.getElementById('cardForm'),
            formSteps: document.querySelectorAll('.form-step'),
            nextButtons: document.querySelectorAll('.btn-next'),
            prevButtons: document.querySelectorAll('.btn-prev'),
            progressBar: document.querySelector('.progress'),
            stepIndicators: document.querySelectorAll('.step'),
            cardPreview: document.querySelector('.card-preview-container'),
            loadingModal: document.getElementById('loadingModal'),
            successModal: document.getElementById('successModal'),
            viewCardBtn: document.getElementById('viewCardBtn'),
            copyCardLinkBtn: document.getElementById('copyCardLinkBtn'),
            previewImages: document.getElementById('previewImages'),
            previewMedia: document.getElementById('previewMedia'),
            imageUpload: document.getElementById('imageUpload'),
            previewTheme: document.getElementById('previewTheme'),
            finalMessageInput: document.getElementById('cardFinalMessage'),
            finalMessageCounter: document.getElementById('finalMessageCounter'),
            finalMessagePreview: document.querySelector('.final-message p')
        };

        // Verificar se elementos críticos existem
        if (!this.elements.form) {
            console.error('Elementos críticos não encontrados');
            return;
        }
    }

    initializeState() {
        // Garantir que o estado comece corretamente
        this.state = {
            currentStep: 0,
            totalSteps: 8,
            formData: {
                cardName: '',
                cardTitle: '',
                cardMessage: '',
                finalMessage: '', // Propriedade para a mensagem final
                bibleVerse: {
                    book: '',
                    chapter: '',
                    verse: '',
                    text: '',
                    reference: ''
                },
                images: [],
                musicLink: '',
                theme: 'stars',
                selectedPlan: null
            },
            currentImageIndex: 0,
            isMediaPlaying: false
        };

        this.sectionObserver = null;

        // Remover inicialização duplicada
        this.state.formData.finalMessage = '';

        // Inicializar elementos uma única vez
        this.finalMessageInput = document.getElementById('cardFinalMessage');
        this.finalMessageCounter = document.getElementById('finalMessageCounter');
        this.finalMessagePreview = document.querySelector('.final-message p');

        this.init();
        this.setupMessageHandlers();
    }

    setupMessageHandlers() {
        // Manipulador da mensagem final
        const finalMessageInput = document.getElementById('cardFinalMessage');
        const finalMessageCounter = document.getElementById('finalMessageCounter');
        const finalMessagePreview = document.querySelector('.final-message p');

        if (finalMessageInput && finalMessageCounter && finalMessagePreview) {
            // Remover listeners existentes
            const newInput = finalMessageInput.cloneNode(true);
            finalMessageInput.parentNode.replaceChild(newInput, finalMessageInput);

            // Inicializar estado
            finalMessageCounter.textContent = '0';
            finalMessagePreview.textContent = 'Que esta mensagem toque seu coração';

            // Adicionar o novo listener
            newInput.addEventListener('input', (e) => {
                const text = e.target.value;
                
                // 1. Atualizar contador
                finalMessageCounter.textContent = text.length;
                
                // 2. Atualizar preview
                finalMessagePreview.textContent = text || "Que esta mensagem toque seu coração";
            });

            // Atualizar manualmente na primeira vez
            this.updateInitialState(newInput, finalMessageCounter, finalMessagePreview);
        }
    }

    updateInitialState(input, counter, preview) {
        const initialText = input.value;
        counter.textContent = initialText.length;
        preview.textContent = initialText || "Que esta mensagem toque seu coração";
    }

    init() {
        // Estado inicial
        // Mostrar apenas a primeira etapa
        this.showStep(this.state.currentStep);
        
        // Resto do código de inicialização...

        this.setupEventListeners();
        this.showStep(this.state.currentStep);
        this.updateProgress();

        // Inicializar contadores
        document.getElementById('titleCounter').textContent = '0';
        document.getElementById('messageCounter').textContent = '0';
        
        // Garantir que o contador da mensagem final seja inicializado
        const finalMessage = document.getElementById('cardFinalMessage').value;
        document.getElementById('finalMessageCounter').textContent = finalMessage ? finalMessage.length : '0';

        this.updatePreview();
        this.loadBibleBooks();
        this.setupSectionObserver();

        // Adicionar indicadores de seção ao preview
        const previewTheme = document.querySelector('.preview-theme');
        const sectionIndicators = document.createElement('div');
        sectionIndicators.className = 'section-indicators';
        sectionIndicators.innerHTML = `
            <div class="section-dot active" data-section="titleSection" data-label="Título"></div>
            <div class="section-dot" data-section="messageSection" data-label="Mensagem"></div>
            <div class="section-dot" data-section="verseSection" data-label="Versículo"></div>
            <div class="section-dot" data-section="gallerySection" data-label="Galeria"></div>
            <div class="section-dot" data-section="mediaSection" data-label="Mídia"></div>
            <div class="section-dot" data-section="finalSection" data-label="Final"></div>
        `;
        previewTheme.appendChild(sectionIndicators);

        // IMPORTANTE: Usar uma função única para adicionar evento de clique em todos os indicadores
        this.setupSectionDotListeners();

        // Adicionar eventos de clique nos indicadores
        document.querySelectorAll('.section-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const targetSection = document.getElementById(dot.dataset.section);
                const previewSections = document.querySelector('.preview-sections');
                if (targetSection) {
                    // Remover comportamento smooth
                    previewSections.scrollTo({
                        top: targetSection.offsetTop,
                        behavior: 'auto' // Alterado de 'smooth' para 'auto'
                    });
                }
            });
        });

        // Adicione este código ao método init() da classe DevotlyCreator, logo após criar os indicadores de seção

        // Garantir que a observação das seções começa imediatamente
        setTimeout(() => {
            this.cleanupSectionObserver();
            this.setupSectionObserver();
            
            // Trigger um evento de scroll para ativar o observer
            const previewSections = document.querySelector('.preview-sections');
            if (previewSections) {
                // Pequeno scroll para ativar o observer
                previewSections.scrollBy(0, 1);
                previewSections.scrollBy(0, -1);
            }
        }, 500);

        // Adicione esta linha ao final do método init()

        // Definir manualmente a seção ativa no carregamento da página
        document.querySelector('.section-dot[data-section="titleSection"]').classList.add('active');
        document.querySelector('.preview-section#titleSection').classList.add('active');

        // Garantir a atualização da barra de progresso
        this.updateProgress();
        
        // Rolar para o topo da página para garantir visualização correta
        window.scrollTo(0, 0);

        // Inicializar o campo de mensagem final com um valor padrão se necessário
        if (!this.state.formData.finalMessage) {
            this.state.formData.finalMessage = "";
            document.getElementById('finalMessageCounter').textContent = '0';
        }

        // Inicializar o contador da mensagem final
        const finalMessageInput = document.getElementById('cardFinalMessage');
        if (finalMessageInput) {
            finalMessageInput.value = '';
            document.getElementById('finalMessageCounter').textContent = '0';
        }

        // Inicializar elementos da mensagem final
        if (this.elements.finalMessageInput) {
            this.elements.finalMessageInput.value = '';
            this.elements.finalMessageCounter.textContent = '0';
            this.updateFinalMessagePreview();
        }
    }

    setupSectionObserver() {
        const previewSections = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSections || !sections.length) return;

        // Configurar IntersectionObserver para detectar seções visíveis
        const observerOptions = {
            root: previewSections,
            threshold: 0.3, // Reduzido de 0.5 para maior sensibilidade
            rootMargin: '0px' // Adicionar rootMargin explícito
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Seção visível:', entry.target.id); // Logging para debug
                    
                    document.querySelectorAll('.section-dot').forEach(dot => {
                        dot.classList.toggle('active', dot.dataset.section === entry.target.id);
                    });

                    this.applyBackgroundEffect(entry.target.id);
                }
            });
        }, observerOptions);

        // Observar todas as seções
        sections.forEach(section => {
            observer.observe(section);
            console.log('Observando seção:', section.id); // Logging para debug
        });

        // Salvar o observador para limpeza futura
        this.sectionObserver = observer;

        // Forçar um scroll mínimo para ativar o observer imediatamente
        setTimeout(() => {
            previewSections.scrollBy(0, 1);
            previewSections.scrollBy(0, -1);
        }, 100);
    }

    applyBackgroundEffect(sectionId) {
        const previewTheme = document.getElementById('previewTheme');

        // Remover classes existentes
        previewTheme.classList.remove('bg-title', 'bg-message', 'bg-verse', 'bg-gallery', 'bg-media', 'bg-final');

        // Adicionar classe específica
        previewTheme.classList.add(`bg-${sectionId.replace('Section', '')}`);

        // Animar transição de fundo
        previewTheme.style.transition = 'background-color 0.8s ease';

        switch (sectionId) {
            case 'titleSection':
                // Efeito de destaque para título
                break;
            case 'verseSection':
                // Efeito de foco para versículo
                break;
            case 'gallerySection':
                // Efeito de destaque para imagens
                break;
        }
    }

    cleanupSectionObserver() {
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
            this.sectionObserver = null;
        }
    }

    setupEventListeners() {
        // Verificar se os elementos existem antes de adicionar listeners
        if (this.elements.nextButtons?.length) {
            this.elements.nextButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.nextStep();
                });
            });
        }

        if (this.elements.prevButtons?.length) {
            this.elements.prevButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.prevStep();
                });
            });
        }

        // Verificar outros elementos antes de adicionar listeners
        const cardName = document.getElementById('cardName');
        if (cardName) {
            cardName.addEventListener('input', (e) => {
                // Salvar a posição do cursor
                const cursorPosition = e.target.selectionStart;
                
                // Armazenar o valor original com espaços mantidos
                const originalValue = e.target.value;
                
                // Converter espaços em hífens em tempo real, mas manter letras maiúsculas para melhor usabilidade
                // (a conversão para minúsculas acontecerá somente no valor armazenado)
                let friendlyValue = originalValue.replace(/\s+/g, '-');
                
                // Apenas para mostrar ao usuário - manter maiúsculas/minúsculas como digitado
                e.target.value = friendlyValue;
                
                // Restaurar a posição do cursor, ajustando para possíveis alterações de comprimento
                const lengthDifference = friendlyValue.length - originalValue.length;
                e.target.setSelectionRange(cursorPosition + lengthDifference, cursorPosition + lengthDifference);
                
                // Converter para minúsculas e limpar para armazenamento e exibição de URL
                let urlFriendlyValue = friendlyValue
                    .toLowerCase()
                    .replace(/[^\w\-]+/g, '')     // Remover caracteres não alfanuméricos
                    .replace(/\-\-+/g, '-')       // Substituir múltiplas hífens por uma única
                    .replace(/^-+|-+$/g, '');     // Remover hífens no início e fim
                
                // Atualizar estado e preview
                this.state.formData.cardName = urlFriendlyValue;
                document.getElementById('urlPreview').textContent = urlFriendlyValue || 'seunome';
                document.getElementById('previewUrl').textContent = urlFriendlyValue || 'seunome';
                this.updatePreview();
            });
        }

        // Fazer o mesmo para outros elementos
        // Adicionar verificações de null antes de cada addEventListener
        
        // Exemplo:
        const musicLink = document.getElementById('musicLink');
        if (musicLink) {
            musicLink.addEventListener('input', (e) => {
                this.state.formData.musicLink = e.target.value;
                this.updatePreview();
            });
        }

        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => this.elements.imageUpload.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    this.elements.imageUpload.files = e.dataTransfer.files;
                    this.handleImageUpload();
                }
            });
        }

        if (this.elements.imageUpload) {
            this.elements.imageUpload.addEventListener('change', () => this.handleImageUpload());
        }

        const fetchVerse = document.getElementById('fetchVerse');
        if (fetchVerse) {
            fetchVerse.addEventListener('click', (e) => {
                e.preventDefault();
                this.fetchBibleVerse();
            });
        }

        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectTheme(option.dataset.theme);
            });
        });

        document.querySelectorAll('.btn-select-plan').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectPlan(e.target.dataset.plan);
            });
        });

        const carouselPrev = document.querySelector('.carousel-prev');
        if (carouselPrev) {
            carouselPrev.addEventListener('click', () => {
                this.navigateCarousel(-1);
            });
        }

        const carouselNext = document.querySelector('.carousel-next');
        if (carouselNext) {
            carouselNext.addEventListener('click', () => {
                this.navigateCarousel(1);
            });
        }

        const mediaToggle = document.querySelector('.media-toggle');
        if (mediaToggle) {
            mediaToggle.addEventListener('click', () => {
                this.toggleMedia();
            });
        }

        if (this.elements.form) {
            this.elements.form.removeEventListener('submit', this.handleFormSubmit);
            // Prevenir submissão natural do formulário
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                // Não fazer nada aqui - o envio só acontece na seleção do plano
            });
        }

        if (this.elements.viewCardBtn) {
            this.elements.viewCardBtn.addEventListener('click', () => {
                window.location.href = `view.html?id=${this.state.formData.cardName}`;
            });
        }

        if (this.elements.copyCardLinkBtn) {
            this.elements.copyCardLinkBtn.addEventListener('click', () => {
                this.copyToClipboard(window.location.origin + '/view.html?id=' +
                    this.state.formData.cardName);

                const originalText = this.elements.copyCardLinkBtn.innerHTML;
                this.elements.copyCardLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';

                setTimeout(() => {
                    this.elements.copyCardLinkBtn.innerHTML = originalText;
                }, 2000);
            });
        }

        // Adicionar sugestões de música
        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', () => {
                const musicUrl = button.dataset.url;
                document.getElementById('musicLink').value = musicUrl;
                this.state.formData.musicLink = musicUrl;
                this.updatePreview();
            });
        });

        // Adicionar sugestões de versículos bíblicos
        document.querySelectorAll('.verse-item').forEach(button => {
            button.addEventListener('click', () => {
                const book = button.dataset.book;
                const chapter = button.dataset.chapter;
                const verse = button.dataset.verse;

                document.getElementById('bibleBook').value = book;
                document.getElementById('bibleChapter').value = chapter;
                document.getElementById('bibleVerse').value = verse;

                this.fetchBibleVerse();
            });
        });

        // Botão de modo tela cheia
        const previewContainer = document.querySelector('.card-preview-container');
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'preview-fullscreen-btn';
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.setAttribute('title', 'Visualizar em tela cheia');
        previewContainer.appendChild(fullscreenBtn);

        fullscreenBtn.addEventListener('click', () => {
            const previewSections = document.querySelector('.preview-sections');

            if (!document.fullscreenElement) {
                if (previewSections.requestFullscreen) {
                    previewSections.requestFullscreen();
                    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                }
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const previewSections = document.querySelector('.preview-sections');
            if (document.fullscreenElement === previewSections) {
                previewSections.classList.add('fullscreen-mode');
            } else {
                previewSections.classList.remove('fullscreen-mode');
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });

        const userPhone = document.getElementById('userPhone');
        if (userPhone) {
            userPhone.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.slice(0, 11);
                
                if (value.length > 2 && value.length <= 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                } else if (value.length > 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                }
                
                e.target.value = value;
                this.state.formData.userPhone = value;
            });
        }

        const cardFinalMessage = document.getElementById('cardFinalMessage');
        if (cardFinalMessage) {
            cardFinalMessage.addEventListener('input', (e) => {
                const text = e.target.value;
                
                // Atualizar o contador
                document.getElementById('finalMessageCounter').textContent = text.length;
                
                // Atualizar o state
                this.state.formData.finalMessage = text;
                
                // Atualizar o preview da mensagem final imediatamente
                const finalMessageElement = document.querySelector('.final-message p');
                if (finalMessageElement) {
                    finalMessageElement.textContent = text || "Que esta mensagem toque seu coração";
                }
            });
        }

        // Remover qualquer listener existente primeiro
        const finalMessageInput = document.getElementById('cardFinalMessage');
        finalMessageInput?.removeEventListener('input', this.handleFinalMessageInput);

        // Adicionar novo listener para a mensagem final
        finalMessageInput?.addEventListener('input', (e) => {
            const text = e.target.value;
            
            // 1. Atualizar o contador de caracteres
            const counter = document.getElementById('finalMessageCounter');
            if (counter) {
                counter.textContent = text.length;
            }
            
            // 2. Atualizar o state
            this.state.formData.finalMessage = text;
            
            // 3. Atualizar o preview
            const finalMessagePreview = document.querySelector('.final-message p');
            if (finalMessagePreview) {
                finalMessagePreview.textContent = text || "Que esta mensagem toque seu coração";
            }
        });

        // Input handlers - Centralize todos em um local
        const inputHandlers = {
            'cardName': (e) => {
                // Salvar a posição do cursor
                const cursorPosition = e.target.selectionStart;
                const originalValue = e.target.value;
                let friendlyValue = originalValue.replace(/\s+/g, '-');
                
                e.target.value = friendlyValue;
                e.target.setSelectionRange(cursorPosition + (friendlyValue.length - originalValue.length), 
                    cursorPosition + (friendlyValue.length - originalValue.length));
                
                let urlFriendlyValue = friendlyValue.toLowerCase()
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')
                    .replace(/^-+|-+$/g, '');
                
                this.state.formData.cardName = urlFriendlyValue;
                document.getElementById('urlPreview').textContent = urlFriendlyValue || 'seunome';
                document.getElementById('previewUrl').textContent = urlFriendlyValue || 'seunome';
            },
            
            'cardTitle': (e) => {
                const text = e.target.value;
                document.getElementById('titleCounter').textContent = text.length;
                document.getElementById('previewCardTitle').textContent = text || "Mensagem de Fé para Você";
                this.state.formData.cardTitle = text;
            },
            
            'cardMessage': (e) => {
                const text = e.target.value;
                document.getElementById('messageCounter').textContent = text.length;
                document.getElementById('previewCardMessage').textContent = text || "Sua mensagem aparecerá aqui...";
                this.state.formData.cardMessage = text;
            },
            
            'cardFinalMessage': (e) => {
                const text = e.target.value;
                document.getElementById('finalMessageCounter').textContent = text.length;
                const finalMessageElement = document.querySelector('.final-message p');
                if (finalMessageElement) {
                    finalMessageElement.textContent = text || "Que esta mensagem toque seu coração";
                }
                this.state.formData.finalMessage = text;
            }
        };

        // Adicionar listeners para cada input
        Object.keys(inputHandlers).forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                // Remove listeners existentes
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                
                // Adiciona novo listener
                newElement.addEventListener('input', inputHandlers[inputId]);
            }
        });
    }

    setupSectionDotListeners() {
        document.querySelectorAll('.section-dot').forEach(indicator => {
            indicator.addEventListener('click', () => {
                const targetSection = document.getElementById(indicator.dataset.section);
                const previewSections = document.querySelector('.preview-sections');
                
                if (targetSection) {
                    // Usar scrollTo para navegação suave
                    previewSections.scrollTo({
                        top: targetSection.offsetTop,
                        behavior: 'auto' // Alterado de 'smooth' para 'auto'
                    });
                    
                    // Atualizar a classe ativa manualmente (para feedback imediato)
                    if (indicator.classList.contains('section-dot')) {
                        document.querySelectorAll('.section-dot').forEach(dot => {
                            dot.classList.remove('active');
                        });
                        indicator.classList.add('active');
                    }
                }
            });
        });
    }

    nextStep() {
        if (this.validateStep(this.state.currentStep)) {
            this.state.currentStep++;
            this.showStep(this.state.currentStep);
            this.updateProgress();
            this.updatePreview();
        }
    }

    prevStep() {
        this.state.currentStep--;
        this.showStep(this.state.currentStep);
        this.updateProgress();
        this.updatePreview();
    }

    showStep(step) {
        this.elements.formSteps.forEach((stepElement, index) => {
            // Garantir que cada etapa tenha a classe "active" apenas se for a etapa atual
            if (index === step) {
                stepElement.classList.add('active');
            } else {
                stepElement.classList.remove('active');
            }
        });

        // Atualize a barra de progresso e os indicadores
        this.updateProgress();
        
        // Opcional: rolar para o topo do formulário
        this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    validateStep(step) {
        let isValid = true;
        const currentStepElement = this.elements.formSteps[step];

        switch (step) {
            case 0:
                const cardNameInput = currentStepElement.querySelector('#cardName');
                if (!cardNameInput.value.trim()) {
                    this.showError(cardNameInput, 'Por favor, insira um nome para o cartão');
                    isValid = false;
                } else if (!/^[a-z0-9-]+$/.test(cardNameInput.value)) {
                    this.showError(cardNameInput, 'Use apenas letras minúsculas, números e hífens');
                    isValid = false;
                }
                break;

            case 1:
                const titleInput = currentStepElement.querySelector('#cardTitle');
                if (!titleInput.value.trim()) {
                    this.showError(titleInput, 'Por favor, insira um título para o cartão');
                    isValid = false;
                } else if (titleInput.value.trim().length < 3) {
                    this.showError(titleInput, 'O título deve ter pelo menos 3 caracteres');
                    isValid = false;
                }
                break;

            case 2:
                const messageInput = currentStepElement.querySelector('#cardMessage');
                if (!messageInput.value.trim()) {
                    this.showError(messageInput, 'Por favor, insira uma mensagem para o cartão');
                    isValid = false;
                } else if (messageInput.value.trim().length < 10) {
                    this.showError(messageInput, 'A mensagem deve ter pelo menos 10 caracteres');
                    isValid = false;
                }
                
                // Adicionar validação para a mensagem final
                const finalMessageInput = currentStepElement.querySelector('#cardFinalMessage');
                if (!finalMessageInput.value.trim()) {
                    this.showError(finalMessageInput, 'Por favor, insira uma mensagem final');
                    isValid = false;
                } else if (finalMessageInput.value.trim().length < 5) {
                    this.showError(finalMessageInput, 'A mensagem final deve ter pelo menos 5 caracteres');
                    isValid = false;
                }
                break;

            case 3:
                break;

            case 4:
                if (this.state.formData.images.length === 0) {
                    this.showError(document.getElementById('uploadArea'), 'Por favor, adicione pelo menos uma imagem');
                    isValid = false;
                }
                break;

            case 6:
                const emailInput = currentStepElement.querySelector('#userEmail');
                if (!emailInput.value.trim()) {
                    this.showError(emailInput, 'Por favor, insira seu email');
                    isValid = false;
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
                    this.showError(emailInput, 'Por favor, insira um email válido');
                    isValid = false;
                }

                const phoneInput = currentStepElement.querySelector('#userPhone');
                if (!phoneInput.value.trim()) {
                    this.showError(phoneInput, 'Por favor, insira seu telefone');
                    isValid = false;
                } else if (phoneInput.value.replace(/\D/g, '').length < 10) {
                    this.showError(phoneInput, 'Por favor, insira um telefone válido');
                    isValid = false;
                }
                break;

            case 7:
                if (!this.state.formData.selectedPlan) {
                    this.showError(currentStepElement.querySelector('.plan-cards'),
                        'Por favor, selecione um plano');
                    isValid = false;
                }
                break;
        }

        return isValid;
    }

    showError(input, message) {
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorElement.style.color = 'var(--color-error)';
        errorElement.style.marginTop = '0.4rem';
        errorElement.style.fontSize = '0.85rem';
        errorElement.style.display = 'flex';
        errorElement.style.alignItems = 'center';
        errorElement.style.gap = '0.4rem';
        errorElement.style.opacity = '0';
        errorElement.style.transition = 'opacity 0.3s ease';

        input.parentNode.appendChild(errorElement);
        input.focus();

        setTimeout(() => {
            errorElement.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            errorElement.style.opacity = '0';
            setTimeout(() => errorElement.remove(), 300);
        }, 5000);
    }

    updateProgress() {
        // Garantir que a barra começa corretamente na etapa 1
        const progress = ((this.state.currentStep + 1) / this.state.totalSteps) * 100;
        
        // Garantir que o elemento progressBar é acessado corretamente
        const progressBar = document.getElementById('progressBar') || this.elements.progressBar;
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Atualizar classes dos indicadores - código único e melhorado:
        this.elements.stepIndicators.forEach((indicator, index) => {
            // Remover todas as classes de estado primeiro
            indicator.classList.remove('active', 'completed');
            
            if (index === this.state.currentStep) {
                // Passo atual recebe classe 'active'
                indicator.classList.add('active');
            } else if (index < this.state.currentStep) {
                // Passos anteriores recebem classe 'completed'
                indicator.classList.add('completed');
            }
            // Passos futuros não têm classes especiais
        });
    }

    // Modificar o método convertToWebP para dispositivos lentos
    async convertToWebP(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Detectar dispositivos de baixo desempenho
                    const isLowEnd = this.isLowEndDevice;
                    
                    // Definir tamanhos máximos baseados no dispositivo
                    const MAX_WIDTH = isLowEnd ? 800 : 1600;
                    const MAX_HEIGHT = isLowEnd ? 600 : 1200;
                    
                    // Calcular dimensões mantendo proporção
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height = Math.round(height * (MAX_WIDTH / width));
                        width = MAX_WIDTH;
                    }
                    
                    if (height > MAX_HEIGHT) {
                        width = Math.round(width * (MAX_HEIGHT / height));
                        height = MAX_HEIGHT;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Desenhar a imagem no canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Usar qualidade menor para dispositivos de baixo desempenho
                    const quality = isLowEnd ? 0.65 : 0.75;
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Falha ao converter para WebP'));
                        }
                    }, 'image/webp', quality);
                };
                
                img.onerror = () => reject(new Error('Falha ao carregar imagem'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
            reader.readAsDataURL(file);
        });
    }

    async handleImageUpload() {
        const files = Array.from(this.elements.imageUpload.files);
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');

        if (!files.length) return;

        // Verificar se excede o limite de 7 imagens
        if (this.state.formData.images.length + files.length > 7) {
            alert('Você pode adicionar no máximo 7 imagens. Por favor, remova algumas antes de adicionar mais.');
            return;
        }

        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.add('loading');

        try {
            // Array para armazenar as imagens temporárias
            const tempImages = [];

            // Processar cada arquivo
            for (const file of files) {
                // Verificar tamanho (2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert(`A imagem ${file.name} excede o limite de 2MB. Por favor, escolha uma imagem menor.`);
                    continue;
                }

                // Converter para WebP para visualização local
                const webpBlob = await this.convertToWebP(file);
                
                // Criar URL temporária para a imagem
                const tempUrl = URL.createObjectURL(webpBlob);
                
                // Adicionar a imagem processada e o blob ao array temporário
                tempImages.push({
                    tempUrl: tempUrl,
                    blob: webpBlob,
                    fileName: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`
                });
                
                // Criar preview local
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview';
                previewDiv.innerHTML = `
                    <img src="${tempUrl}" alt="Imagem ${this.state.formData.images.length + tempImages.length}">
                    <button class="remove-image" data-index="${this.state.formData.images.length + tempImages.length - 1}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                imagePreviewContainer.appendChild(previewDiv);

                // Adicionar evento para remover imagem
                const removeButton = previewDiv.querySelector('.remove-image');
                removeButton.addEventListener('click', () => {
                    const index = parseInt(removeButton.dataset.index);
                    this.removeImage(index);
                });
            }

            // Adicionar as imagens temporárias ao estado
            this.state.formData.images = [
                ...this.state.formData.images, 
                ...tempImages.map(img => ({ 
                    tempUrl: img.tempUrl, 
                    blob: img.blob,
                    fileName: img.fileName,
                    isTemp: true  // Marcador para indicar que é uma imagem temporária
                }))
            ];
            
            // Reindexar botões de remoção
            this.reindexImages();
            
            // Atualizar preview
            this.updatePreview();
            
        } catch (error) {
            console.error('Erro ao processar as imagens:', error);
            alert('Ocorreu um erro ao processar as imagens. Por favor, tente novamente.');
        } finally {
            uploadArea.classList.remove('loading');
            // Limpar input de upload para permitir selecionar os mesmos arquivos novamente
            this.elements.imageUpload.value = '';
        }
    }

    reindexImages() {
        const previews = document.querySelectorAll('.image-preview .remove-image');
        previews.forEach((button, index) => {
            button.dataset.index = index;
        });
    }

    updateCarouselControls() {
        const galleryContainer = document.getElementById('previewImages');

        if (this.state.formData.images.length > 1) {
            if (!galleryContainer.querySelector('.carousel-controls')) {
                galleryContainer.innerHTML += `
                    <div class="carousel-controls">
                        <button class="carousel-prev"><i class="fas fa-chevron-left"></i></button>
                        <button class="carousel-next"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="carousel-indicators">
                        ${Array(this.state.formData.images.length).fill(0).map((_, i) =>
                    `<div class="carousel-indicator${i === 0 ? ' active' : ''}"></div>`
                ).join('')}
                    </div>
                `;
            }
        }
    }

    loadBibleBooks() {
        const books = [
            { value: 'genesis', text: 'Gênesis' },
            { value: 'exodus', text: 'Êxodo' },
            { value: 'psalms', text: 'Salmos' },
            { value: 'proverbs', text: 'Provérbios' },
            { value: 'isaiah', text: 'Isaías' },
            { value: 'matthew', text: 'Mateus' },
            { value: 'john', text: 'João' },
            { value: 'romans', text: 'Romanos' }
        ];

        const bookSelect = document.getElementById('bibleBook');
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.value;
            option.textContent = book.text;
            bookSelect.appendChild(option);
        });
    }

    async fetchBibleVerse() {
        const bookSelect = document.getElementById('bibleBook');
        const chapterInput = document.getElementById('bibleChapter');
        const verseInput = document.getElementById('bibleVerse');

        if (!bookSelect.value || !chapterInput.value || !verseInput.value) {
            this.showError(bookSelect, 'Por favor, selecione um livro, capítulo e versículo');
            return;
        }

        try {
            const response = await this.simulateBibleApiCall(
                bookSelect.value,
                chapterInput.value,
                verseInput.value
            );

            if (response) {
                this.state.formData.bibleVerse = {
                    book: bookSelect.options[bookSelect.selectedIndex].text,
                    chapter: chapterInput.value,
                    verse: verseInput.value,
                    text: response.text,
                    reference: `${bookSelect.options[bookSelect.selectedIndex].text} ${chapterInput.value}:${verseInput.value}`
                };

                document.querySelector('.verse-text').textContent = `"${response.text}"`;
                document.querySelector('.verse-reference').textContent = this.state.formData.bibleVerse.reference;
                this.updatePreview();
            }
        } catch (error) {
            console.error('Erro ao buscar versículo:', error);
            this.showError(bookSelect, 'Não foi possível carregar o versículo. Tente novamente.');
        }
    }

    simulateBibleApiCall(book, chapter, verse) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const verses = {
                    genesis: {
                        1: {
                            1: "No princípio, criou Deus os céus e a terra.",
                            2: "A terra era sem forma e vazia; e havia trevas sobre a face do abismo.",
                            3: "Disse Deus: Haja luz. E houve luz."
                        },
                        2: {
                            7: "Então, formou o SENHOR Deus ao homem do pó da terra e lhe soprou nas narinas o fôlego de vida, e o homem passou a ser alma vivente."
                        }
                    },
                    exodus: {
                        14: {
                            14: "O SENHOR pelejará por vós, e vós vos calareis."
                        },
                        20: {
                            12: "Honra teu pai e tua mãe, para que se prolonguem os teus dias na terra que o SENHOR, teu Deus, te dá."
                        }
                    },
                    psalms: {
                        23: {
                            1: "O SENHOR é o meu pastor; nada me faltará.",
                            2: "Ele me faz repousar em pastos verdejantes. Leva-me para junto das águas de descanso",
                            3: "Refrigera-me a alma. Guia-me pelas veredas da justiça por amor do seu nome."
                        },
                        91: {
                            1: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.",
                            2: "Direi do SENHOR: Ele é o meu Deus, o meu refúgio, a minha fortaleza, e nele confiarei."
                        }
                    },
                    proverbs: {
                        3: {
                            5: "Confia no SENHOR de todo o teu coração e não te estribes no teu próprio entendimento.",
                            6: "Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas."
                        }
                    },
                    isaiah: {
                        41: {
                            10: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel."
                        }
                    },
                    matthew: {
                        6: {
                            33: "Buscai, pois, em primeiro lugar, o seu reino e a sua justiça, e todas estas coisas vos serão acrescentadas."
                        },
                        28: {
                            20: "Ensinando-os a guardar todas as coisas que eu vos tenho ordenado. E eis que eu estou convosco todos os dias até à consumação do século."
                        }
                    },
                    john: {
                        3: {
                            16: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."
                        },
                        14: {
                            6: "Respondeu Jesus: Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai, a não ser por mim.",
                            27: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração, nem se atemorize."
                        }
                    },
                    romans: {
                        8: {
                            28: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.",
                            31: "Que diremos, pois, à vista destas coisas? Se Deus é por nós, quem será contra nós?"
                        },
                        12: {
                            12: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração."
                        }
                    }
                };

                const verseText = verses[book]?.[chapter]?.[verse];
                resolve({ text: verseText || "Versículo não encontrado" });
            }, 800);
        });
    }

    selectTheme(theme) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
        });

        document.querySelector(`.theme-option[data-theme="${theme}"]`).classList.add('selected');

        this.state.formData.theme = theme;
        window.applyPreviewTheme(theme);
        this.updatePreview();
    }

    async selectPlan(plan) {
        try {
            // Mostrar loading
            document.getElementById('loadingModal').style.display = 'flex';

            // Converter os valores dos planos
            const planMapping = {
                'forever': 'para_sempre',
                'annual': 'anual'
            };

            const planoPtBr = planMapping[plan] || plan;
            
            // Atualizar o plano selecionado no state
            this.state.formData.selectedPlan = planoPtBr;

            // Criar o cartão
            const response = await this.submitFormData();

            if (!response.success) {
                throw new Error(response.message || 'Erro ao criar cartão');
            }

            console.log('Cartão criado:', response.data);

            // Criar preferência de pagamento
            const checkoutResponse = await fetch('http://localhost:3000/api/checkout/create-preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plano: planoPtBr,
                    email: document.getElementById('userEmail').value,
                    cardId: response.data.id
                })
            });

            console.log('Enviando dados para checkout:', {
                plano: planoPtBr,
                email: document.getElementById('userEmail').value,
                cardId: response.data.id
            });

            const checkoutData = await checkoutResponse.json();

            if (!checkoutData.success) {
                throw new Error(checkoutData.error || 'Erro ao criar checkout');
            }

            console.log('Checkout criado:', checkoutData);

            // Redirecionar para o Checkout do Mercado Pago
            window.location.href = checkoutData.init_point;

        } catch (error) {
            console.error('Erro:', error);
            document.getElementById('loadingModal').style.display = 'none';
            alert(error.message || 'Erro ao processar pagamento. Tente novamente.');
        }
    }

    navigateCarousel(direction) {
        const images = document.querySelectorAll('#gallerySection img');
        const indicators = document.querySelectorAll('.carousel-indicator');
        
        if (images.length <= 1) return;

        // Esconder imagem atual
        images[this.state.currentImageIndex].classList.remove('active');
        images[this.state.currentImageIndex].style.display = 'none';
        if (indicators.length) indicators[this.state.currentImageIndex].classList.remove('active');

        // Atualizar o índice atual
        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;

        // Mostrar nova imagem
        images[this.state.currentImageIndex].classList.add('active');
        images[this.state.currentImageIndex].style.display = 'block';
        if (indicators.length) indicators[this.state.currentImageIndex].classList.add('active');
    }

    startImageCarousel() {
        if (this.state.formData.images.length > 1) {
            clearInterval(this.imageInterval);
            this.imageInterval = setInterval(() => {
                this.navigateCarousel(1);
            }, 3000);
        }
    }

    toggleMedia() {
        const iframe = this.elements.previewMedia.querySelector('iframe');
        if (!iframe) return;

        this.state.isMediaPlaying = !this.state.isMediaPlaying;
        const toggleBtn = document.querySelector('.media-toggle i');
        toggleBtn.classList.toggle('fa-play', !this.state.isMediaPlaying);
        toggleBtn.classList.toggle('fa-pause', this.state.isMediaPlaying);

        if (iframe.src.includes('youtube')) {
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    event: 'command',
                    func: this.state.isMediaPlaying ? 'playVideo' : 'pauseVideo'
                }),
                '*'
            );
        } else if (iframe.src.includes('spotify')) {
            iframe.style.opacity = this.state.isMediaPlaying ? '1' : '0.5';
        }
    }

    getEmbedUrl(url) {
        if (!url) return null;

        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1`;
        }

        const spotifyMatch = url.match(/spotify\.com\/(?:track|album|playlist)\/([\w]+)/);
        if (spotifyMatch) {
            return `https://open.spotify.com/embed/track/${spotifyMatch[1]}`;
        }

        return null;
    }

    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    }

    updatePreview() {
        document.getElementById('previewCardTitle').textContent =
            this.state.formData.cardTitle || "Mensagem de Fé para Você";

        const messageElement = document.getElementById('previewCardMessage');
        let formattedMessage = this.state.formData.cardMessage || "Sua mensagem aparecerá aqui...";
        formattedMessage = formattedMessage
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
        messageElement.innerHTML = this.sanitizeHTML(formattedMessage);

        document.getElementById('previewVerseText').textContent =
            this.state.formData.bibleVerse.text
                ? `"${this.state.formData.bibleVerse.text}"`
                : '"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito..."';
        document.getElementById('previewVerseRef').textContent =
            this.state.formData.bibleVerse.reference || 'João 3:16';

        // Código completamente refeito para a gestão da galeria
        this.updateGalleryPreview();

        const previewMedia = document.getElementById('previewMedia');
        const embedUrl = this.getEmbedUrl(this.state.formData.musicLink);

        if (embedUrl) {
            previewMedia.innerHTML = `
                <iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media"></iframe>
            `;
        } else {
            previewMedia.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-music"></i>
                    <span>Nenhuma mídia selecionada</span>
                </div>
            `;
        }

        document.getElementById('previewUrl').textContent =
            this.state.formData.cardName || 'seunome';

        this.cleanupSectionObserver();
        this.setupSectionObserver();

        // Atualizar a mensagem final - implementação corrigida
        const finalMessage = this.state.formData.finalMessage;
        const finalMessageElement = document.querySelector('.final-message p');
        
        if (finalMessageElement) {
            if (finalMessage && finalMessage.trim()) {
                finalMessageElement.textContent = finalMessage;
            } else {
                finalMessageElement.textContent = "Que esta mensagem toque seu coração";
            }
        }

        this.saveToLocalStorage();
    }

    // Adicionar este novo método para lidar exclusivamente com a galeria
    updateGalleryPreview() {
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        galleryContainer.innerHTML = '';

        if (this.state.formData.images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-image"></i>
                    <span>Nenhuma imagem selecionada</span>
                </div>
            `;
            return;
        }

        // Criar elementos de imagem
        this.state.formData.images.forEach((image, index) => {
            const img = document.createElement('img');
            // Usar a URL temporária para visualização
            img.src = image.isTemp ? image.tempUrl : image;
            img.alt = `Imagem ${index + 1}`;
            img.classList.toggle('active', index === this.state.currentImageIndex);
            img.style.display = index === this.state.currentImageIndex ? 'block' : 'none';
            galleryContainer.appendChild(img);
        });

        // Adicionar controles de carrossel se houver mais de uma imagem
        if (this.state.formData.images.length > 1) {
            const carouselControls = document.createElement('div');
            carouselControls.className = 'carousel-controls';
            carouselControls.innerHTML = `
                <button class="carousel-prev"><i class="fas fa-chevron-left"></i></button>
                <button class="carousel-next"><i class="fas fa-chevron-right"></i></button>
            `;
            galleryContainer.appendChild(carouselControls);

            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';
            indicators.innerHTML = this.state.formData.images.map((_, idx) =>
                `<div class="carousel-indicator${idx === this.state.currentImageIndex ? ' active' : ''}"></div>`
            ).join('');
            galleryContainer.appendChild(indicators);

            // Adicionar eventos de clique para os controles
            carouselControls.querySelector('.carousel-prev').addEventListener('click', () => this.navigateCarousel(-1));
            carouselControls.querySelector('.carousel-next').addEventListener('click', () => this.navigateCarousel(1));
        }
    }

    // Substituir o método removeImage existente por esta versão
    async removeImage(index) {
        // Guardar referência da imagem que será removida
        const image = this.state.formData.images[index];
        
        // Se for uma imagem temporária, revogar a URL do objeto
        if (image.isTemp && image.tempUrl) {
            URL.revokeObjectURL(image.tempUrl);
        }
        
        // Remover a imagem do array de imagens
        this.state.formData.images.splice(index, 1);
        
        // Ajustar o índice atual se necessário
        if (this.state.currentImageIndex >= this.state.formData.images.length) {
            this.state.currentImageIndex = Math.max(0, this.state.formData.images.length - 1);
        }
        
        // Remover do container de preview no formulário
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreviews = imagePreviewContainer.querySelectorAll('.image-preview');
        
        if (index < imagePreviews.length) {
            imagePreviews[index].remove();
        }
        
        // Reindexar botões de remoção
        this.reindexImages();
        
        // Atualizar preview
        this.updatePreview();
    }

    reindexFormImages() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewElements = previewContainer.querySelectorAll('.image-preview');

        previewElements.forEach((preview, index) => {
            const removeButton = preview.querySelector('.remove-image');
            if (removeButton) {
                removeButton.setAttribute('data-index', index);
            }
        });
    }

    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    async submitFormData() {
        try {
            // 1. Validar email
            const email = document.getElementById('userEmail').value.trim();
            if (!email) {
                throw new Error('Email é obrigatório');
            }

            // 2. Upload das imagens primeiro
            const uploadPromises = this.state.formData.images.map(async (image) => {
                // Se já for uma URL, retornar diretamente
                if (typeof image === 'string' && image.startsWith('http')) {
                    return image;
                }

                // Se for um objeto com tempUrl ou blob, fazer upload
                if (typeof image === 'object') {
                    const formData = new FormData();
                    formData.append('image', image.blob || image);

                    const uploadResponse = await fetch('http://localhost:3000/api/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        throw new Error('Erro no upload da imagem');
                    }

                    const uploadData = await uploadResponse.json();
                    return uploadData.url;
                }

                throw new Error('Formato de imagem inválido');
            });

            // 3. Aguardar todos os uploads
            const processedImages = await Promise.all(uploadPromises);

            // 4. Construir objeto de dados
            const formData = {
                email: email,
                plano: this.state.formData.selectedPlan,
                conteudo: {
                    cardName: this.state.formData.cardName,
                    cardTitle: this.state.formData.cardTitle,
                    cardMessage: this.state.formData.cardMessage,
                    finalMessage: this.state.formData.finalMessage || '',
                    bibleVerse: this.state.formData.bibleVerse,
                    images: processedImages, // Agora são todas URLs
                    musicLink: this.state.formData.musicLink || '',
                    userName: document.getElementById('userName').value || '',
                    userPhone: document.getElementById('userPhone').value || ''
                }
            };

            // 5. Enviar dados para o servidor
            const response = await fetch('http://localhost:3000/api/cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao criar cartão');
            }

            return {
                success: true,
                data: data.data
            };

        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    updateImages(action, data) {
        switch (action) {
            case 'add':
                if (this.state.formData.images.length >= 7) return false;
                this.state.formData.images.push(data);
                break;
            case 'remove':
                this.state.formData.images.splice(data, 1);
                break;
            case 'clear':
                this.state.formData.images = [];
                break;
        }

        this.updatePreview();
        this.reindexImages();
        return true;
    }

    getCorrespondingFormSection(sectionId) {
        const mapping = {
            'titleSection': 'cardTitle',
            'messageSection': 'cardMessage',
            'verseSection': 'bibleBook',
            'gallerySection': 'imageUpload',
            'mediaSection': 'musicLink'
        };

        return document.getElementById(mapping[sectionId]);
    }

    highlightFormSection(element) {
        // Remover destaque existente
        document.querySelectorAll('.highlight-pulse').forEach(el => {
            el.classList.remove('highlight-pulse');
        });

        if (element) {
            // Destacar elemento correspondente
            element.classList.add('highlight-pulse');

            // Opcional: scroll para o elemento
            if (!this.isElementInViewport(element)) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    saveToLocalStorage() {
        // Salvar no localStorage sem mostrar a notificação
        localStorage.setItem('devotlyDraft', JSON.stringify(this.state.formData));
        
        // Remover a linha abaixo para não mostrar a notificação
        // this.showSaveNotification();
    }

    validateAllSteps() {
        // Verificar campos obrigatórios
        
        // Nome do cartão
        const cardName = this.state.formData.cardName;
        if (!cardName || cardName.length < 3) {
            return false;
        }
        
        // Título
        const cardTitle = this.state.formData.cardTitle;
        if (!cardTitle || cardTitle.length < 3) {
            return false;
        }
        
        // Mensagem principal
        const cardMessage = this.state.formData.cardMessage;
        if (!cardMessage || cardMessage.length < 10) {
            return false;
        }
        
        // Mensagem final
        const finalMessage = this.state.formData.finalMessage;
        if (!finalMessage || finalMessage.length < 5) {
            return false;
        }
        
        // Versículo (opcional, mas se especificado precisa estar completo)
        const verse = this.state.formData.bibleVerse;
        if (verse.book || verse.chapter || verse.verse) {
            if (!verse.text || !verse.reference) {
                return false;
            }
        }
        
        // Imagens (pelo menos uma é obrigatória)
        if (!this.state.formData.images.length) {
            return false;
        }
        
        // Dados de contato
        const userEmail = document.getElementById('userEmail')?.value;
        if (!userEmail || !this.validateEmail(userEmail)) {
            return false;
        }
        
        const userPhone = document.getElementById('userPhone')?.value;
        if (!userPhone || userPhone.length < 10) {
            return false;
        }
        
        // Plano selecionado
        if (!this.state.formData.selectedPlan) {
            return false;
        }
        
        return true;
    }

    // Método auxiliar para validar email
    validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    async uploadAllImages() {
        // Filtrar apenas as imagens temporárias que precisam ser enviadas
        const tempImages = this.state.formData.images.filter(img => img.isTemp);
        
        if (tempImages.length === 0) {
            // Se não houver imagens temporárias, retornar uma matriz vazia
            return [];
        }
        
        try {
            const uploadedUrls = [];
            
            for (const image of tempImages) {
                // Criar FormData para upload
                const formData = new FormData();
                formData.append('file', image.blob, image.fileName);

                // Upload para o servidor
                const response = await fetch('http://localhost:3000/api/upload-image', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Erro no upload: ${response.statusText}`);
                }

                const data = await response.json();
                uploadedUrls.push(data.imageUrl);
            }
            
            return uploadedUrls;
        } catch (error) {
            console.error('Erro ao fazer upload das imagens:', error);
            throw error;
        }
    }
}

window.addEventListener('load', () => {
    new DevotlyCreator();
});