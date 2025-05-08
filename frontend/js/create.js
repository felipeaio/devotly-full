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
            previewTheme: document.getElementById('previewTheme')
        };

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

        this.init();

        setTimeout(() => this.updateProgress(), 0);
    }

    init() {
        // Estado inicial
        this.state.currentStep = 0; // Começar na primeira etapa (índice 0)
        
        // Mostrar apenas a primeira etapa
        this.showStep(this.state.currentStep);
        
        // Resto do código de inicialização...

        this.setupEventListeners();
        this.showStep(this.state.currentStep);
        this.updateProgress();

        // Inicializar contadores
        document.getElementById('titleCounter').textContent = '0';
        document.getElementById('messageCounter').textContent = '0';
        document.getElementById('finalMessageCounter').textContent = '0';

        this.updatePreview();
        this.loadBibleBooks();
        this.setupSectionObserver();

        // Indicador de rolagem
        const previewSections = document.querySelector('.preview-sections');
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        document.querySelector('.preview-theme').appendChild(scrollIndicator);

        // Ocultar indicador após rolagem
        previewSections.addEventListener('scroll', () => {
            if (previewSections.scrollTop > 50) {
                previewSections.classList.add('scrolled');
            } else {
                previewSections.classList.remove('scrolled');
            }
        });

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
    }

    setupSectionObserver() {
        const previewSections = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSections || !sections.length) return;

        // Configurar IntersectionObserver para detectar seções visíveis
        const observerOptions = {
            root: previewSections,
            threshold: 0.3, // Reduzido de 0.5 para 0.3 para maior sensibilidade
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
        this.elements.nextButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextStep();
            });
        });

        this.elements.prevButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.prevStep();
            });
        });

        document.getElementById('cardName').addEventListener('input', (e) => {
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

        document.getElementById('cardTitle').addEventListener('input', (e) => {
            this.state.formData.cardTitle = e.target.value;
            document.getElementById('titleCounter').textContent = e.target.value.length;
            this.updatePreview();
        });

        document.getElementById('cardMessage').addEventListener('input', (e) => {
            this.state.formData.cardMessage = e.target.value;
            document.getElementById('messageCounter').textContent = e.target.value.length;
            this.updatePreview();
        });

        document.getElementById('musicLink').addEventListener('input', (e) => {
            this.state.formData.musicLink = e.target.value;
            this.updatePreview();
        });

        document.getElementById('bibleBook').addEventListener('change', () => this.updatePreview());
        document.getElementById('bibleChapter').addEventListener('input', () => this.updatePreview());
        document.getElementById('bibleVerse').addEventListener('input', () => this.updatePreview());

        const uploadArea = document.getElementById('uploadArea');
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

        this.elements.imageUpload.addEventListener('change', () => this.handleImageUpload());

        document.getElementById('fetchVerse').addEventListener('click', (e) => {
            e.preventDefault();
            this.fetchBibleVerse();
        });

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

        document.querySelector('.carousel-prev').addEventListener('click', () => {
            this.navigateCarousel(-1);
        });

        document.querySelector('.carousel-next').addEventListener('click', () => {
            this.navigateCarousel(1);
        });

        document.querySelector('.media-toggle').addEventListener('click', () => {
            this.toggleMedia();
        });

        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });

        this.elements.viewCardBtn.addEventListener('click', () => {
            window.location.href = `view.html?id=${this.state.formData.cardName}`;
        });

        this.elements.copyCardLinkBtn.addEventListener('click', () => {
            this.copyToClipboard(window.location.origin + '/view.html?id=' +
                this.state.formData.cardName);

            const originalText = this.elements.copyCardLinkBtn.innerHTML;
            this.elements.copyCardLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';

            setTimeout(() => {
                this.elements.copyCardLinkBtn.innerHTML = originalText;
            }, 2000);
        });

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

        document.getElementById('userPhone').addEventListener('input', (e) => {
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

        document.getElementById('cardFinalMessage').addEventListener('input', (e) => {
            this.state.formData.finalMessage = e.target.value;
            document.getElementById('finalMessageCounter').textContent = e.target.value.length;
            
            // Atualização direta para garantir que o preview seja atualizado imediatamente
            const finalMessageElement = document.querySelector('.final-message p');
            if (finalMessageElement) {
                finalMessageElement.textContent = e.target.value || "Que esta mensagem toque seu coração";
            }
            
            this.updatePreview();
        });

        // Verificar se o evento para cardFinalMessage está correto
        document.getElementById('cardFinalMessage').addEventListener('input', (e) => {
            // Atualizar o estado
            this.state.formData.finalMessage = e.target.value;
            
            // Atualizar o contador
            document.getElementById('finalMessageCounter').textContent = e.target.value.length;
            
            // Atualização forçada da mensagem final
            const finalMessageElement = document.querySelector('.final-message p');
            if (finalMessageElement) {
                finalMessageElement.textContent = e.target.value || "Que esta mensagem toque seu coração";
            }
            
            // Atualizar preview completo
            this.updatePreview();
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

    async convertToWebP(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
            };

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1200;

                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = (height / width) * MAX_SIZE;
                        width = MAX_SIZE;
                    } else {
                        width = (width / height) * MAX_SIZE;
                        height = MAX_SIZE;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                            type: 'image/webp'
                        });
                        resolve(webpFile);
                    } else {
                        reject(new Error('Failed to convert to WebP'));
                    }
                }, 'image/webp', 0.8);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.readAsDataURL(file);
        });
    }

    async handleImageUpload() {
        const files = Array.from(this.elements.imageUpload.files);
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');

        if (!files.length) return;

        if (this.state.formData.images.length + files.length > 7) {
            this.showError(document.getElementById('uploadArea'), 'Você pode enviar no máximo 7 imagens');
            this.elements.imageUpload.value = '';
            return;
        }

        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.add('loading');

        try {
            for (const file of files) {
                if (file.size > 2 * 1024 * 1024) {
                    this.showError(uploadArea, `A imagem "${file.name}" é muito grande (máx. 2MB)`);
                    continue;
                }

                const reader = new FileReader();

                reader.onload = (e) => {
                    const imageIndex = this.state.formData.images.length;
                    this.state.formData.images.push(e.target.result);

                    const previewElement = document.createElement('div');
                    previewElement.className = 'image-preview';
                    previewElement.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-image" data-index="${imageIndex}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;

                    imagePreviewContainer.appendChild(previewElement);

                    // Usar uma função anônima para capturar o índice corretamente
                    previewElement.querySelector('.remove-image').addEventListener('click', (event) => {
                        const removeIndex = parseInt(event.currentTarget.getAttribute('data-index'));
                        this.removeImage(removeIndex);
                    });

                    // Atualizar preview após cada imagem ser carregada
                    this.updatePreview();
                };

                reader.readAsDataURL(file);
            }
        } finally {
            uploadArea.classList.remove('loading');
            // Limpar o input para permitir selecionar os mesmos arquivos novamente
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

    selectPlan(plan) {
        this.state.formData.selectedPlan = plan;
        document.querySelectorAll('.plan-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`.plan-card[data-plan="${plan}"]`).classList.add('selected');
        this.updatePreview();
    }

    navigateCarousel(direction) {
        const images = document.querySelectorAll('#gallerySection img');
        const indicators = document.querySelectorAll('.carousel-indicator');
        const removeButtons = document.querySelectorAll('#gallerySection .remove-image');

        if (images.length <= 1) return;

        // Esconder imagem e botão atuais
        images[this.state.currentImageIndex].classList.remove('active');
        images[this.state.currentImageIndex].style.display = 'none';
        if (indicators.length) indicators[this.state.currentImageIndex].classList.remove('active');

        // Esconder todos os botões de remoção
        removeButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Atualizar o índice atual
        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;

        // Mostrar nova imagem e botão
        images[this.state.currentImageIndex].classList.add('active');
        images[this.state.currentImageIndex].style.display = 'block';
        if (indicators.length) indicators[this.state.currentImageIndex].classList.add('active');

        // Mostrar apenas o botão de remoção da imagem atual
        if (removeButtons[this.state.currentImageIndex]) {
            removeButtons[this.state.currentImageIndex].style.display = 'flex';
        }
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
        this.state.formData.images.forEach((imageUrl, index) => {
            const img = document.createElement('img');
            img.src = imageUrl;
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

        // Adicionar botões de remoção para cada imagem
        const imageActions = document.createElement('div');
        imageActions.className = 'image-actions';

        this.state.formData.images.forEach((_, index) => {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.setAttribute('data-index', index);
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage(parseInt(e.currentTarget.getAttribute('data-index')));
            });
            imageActions.appendChild(removeBtn);
        });

        galleryContainer.appendChild(imageActions);
    }

    // Substituir o método removeImage existente por esta versão
    removeImage(index) {
        // Guardar o número total de imagens antes da remoção
        const totalImages = this.state.formData.images.length;

        // Remover a imagem do array
        this.state.formData.images.splice(index, 1);

        // Ajustar o índice atual de imagem se necessário
        if (this.state.currentImageIndex >= this.state.formData.images.length) {
            this.state.currentImageIndex = Math.max(0, this.state.formData.images.length - 1);
        }

        // Também remover do container de preview no formulário
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreviews = imagePreviewContainer.querySelectorAll('.image-preview');

        // Se encontramos o elemento, removê-lo
        if (index < imagePreviews.length) {
            imagePreviews[index].remove();
        }

        // Atualizar os índices dos botões de remoção no formulário
        this.reindexFormImages();

        // Verificar se ainda temos imagens
        if (totalImages > 0 && this.state.formData.images.length === 0) {
            // Se removemos a última imagem, mostrar a mensagem "Nenhuma imagem"
            this.updateGalleryPreview();
        } else {
            // Se ainda temos imagens, atualizar o preview
            this.updatePreview();
        }

        console.log(`Imagem ${index} removida. Restam ${this.state.formData.images.length} imagens.`);
    }

    // Substituir o método reindexImages por este
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

    async submitForm() {
        if (!this.validateStep(this.state.currentStep)) return;

        this.elements.loadingModal.style.display = 'flex';
        setTimeout(() => {
            this.elements.loadingModal.classList.add('visible');
        }, 10);

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.elements.loadingModal.classList.remove('visible');
            setTimeout(() => {
                this.elements.loadingModal.style.display = 'none';
                this.elements.successModal.style.display = 'flex';
                setTimeout(() => {
                    this.elements.successModal.classList.add('visible');
                }, 10);
            }, 300);
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            this.elements.loadingModal.classList.remove('visible');
            setTimeout(() => {
                this.elements.loadingModal.style.display = 'none';
                this.showError(this.elements.form, 'Erro ao processar pagamento. Tente novamente.');
            }, 300);
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
}

document.addEventListener('DOMContentLoaded', () => {
    new DevotlyCreator();
});