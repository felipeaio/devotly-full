/**
 * Devotly - Create (Versão Aprimorada)
 * * Controle completo do fluxo de criação de cartões com pré-visualização em tempo real
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

// Esta função deve ser chamada para reorganizar o HTML existente
function restructurePreviewSections() {
    const previewSections = document.querySelector('.preview-sections');
    if (!previewSections) return;
    
    // Cria o container do carrossel
    const carousel = document.createElement('div');
    carousel.className = 'preview-carousel';
    
    // Move todas as seções para o carrossel
    const sections = Array.from(previewSections.querySelectorAll('.preview-section'));
    sections.forEach(section => {
        carousel.appendChild(section);
    });
    
    // Adiciona o carrossel ao container principal
    previewSections.innerHTML = '';
    previewSections.appendChild(carousel);
    
    // Cria indicadores horizontais
    const indicators = document.createElement('div');
    indicators.className = 'horizontal-section-indicators';
    
    sections.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'h-indicator' + (index === 0 ? ' active' : '');
        dot.dataset.index = index;
        indicators.appendChild(dot);
    });
    
    // Adicionar apenas os indicadores
    previewSections.appendChild(indicators);
    
    // Ativar a primeira seção
    if (sections.length > 0) {
        sections[0].classList.add('active');
    }
}

// main.js
class DevotlyCreator {
    constructor() {
        // Initialize API config
        this.loadApiConfig();

        // Detectar dispositivos de baixo desempenho
        this.isLowEndDevice = this.detectLowEndDevice();

        // Garantir que o DOM está carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        // Add preview modal instance
        this.previewModal = new PreviewModal(); // PreviewModal class is defined later
    }

    // Load API configuration
    async loadApiConfig() {
        try {
            const { API_CONFIG } = await import('./core/api-config.js');
            this.apiConfig = API_CONFIG;
        } catch (error) {
            console.error('Erro ao carregar configuração da API:', error);
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
        // Rastrear visualização da página de criação
        if (typeof TikTokEvents !== 'undefined') {
            TikTokEvents.viewCreatePage();
            TikTokEvents.create.startCreation();
            console.log('TikTok: Página de criação rastreada');
        }

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
            progressBar: document.querySelector('.progress'), // Used by this.updateProgress()
            stepIndicators: document.querySelectorAll('.step'), // Used by this.updateProgress()
            cardPreview: document.querySelector('.card-preview-container'), // Used by PreviewModal
            loadingModal: document.getElementById('loadingModal'),
            successModal: document.getElementById('successModal'),
            viewCardBtn: document.getElementById('viewCardBtn'),
            copyCardLinkBtn: document.getElementById('copyCardLinkBtn'),
            previewImages: document.getElementById('previewImages'), // Refers to the old preview structure, might be unused
            cardMedia: document.getElementById('cardMedia'), // Updated to match view.html structure
            imageUpload: document.getElementById('imageUpload'),
            previewTheme: document.getElementById('previewTheme'), // Used by applyBackgroundEffect
            finalMessageInput: document.getElementById('cardFinalMessage'),
            finalMessageCounter: document.getElementById('finalMessageCounter'),            finalMessagePreview: document.querySelector('.final-message p') // Used in init and setupEventListeners
        };

        // Verificar se elementos críticos existem
        if (!this.elements.form) {
            console.error('Elementos críticos não encontrados');
            return;
        }
    }

    initializeState() {
        this.state = {
            currentStep: 0,
            totalSteps: 8, // Assuming 8 steps based on previous logic
            formData: {
                cardName: '',
                cardTitle: '',
                cardMessage: '',
                finalMessage: '',
                userName: '',
                email: '',
                bibleVerse: {
                    book: '',
                    chapter: '',
                    verse: '',
                    text: '',
                    reference: ''
                },
                images: [],
                musicLink: '',
                theme: 'stars', // Default theme
                selectedPlan: null
            },
            currentImageIndex: 0
            // this.isMediaPlaying was removed
        };

        this.sectionObserver = null; // Used by setupSectionObserver

        // Configurar salvamento automático
        this.autoSaveInterval = null;
        this.STORAGE_KEY = 'devotly_form_draft';
        this.STORAGE_TIMESTAMP_KEY = 'devotly_form_draft_timestamp';

        // Carregar dados salvos do localStorage
        this.loadFromLocalStorage();

        // Inicializar elementos uma única vez (alguns já em this.elements)
        this.finalMessageInput = document.getElementById('cardFinalMessage');
        this.finalMessageCounter = document.getElementById('finalMessageCounter');
        this.finalMessagePreview = document.querySelector('.final-message p');

        this.init(); // Called again, was also in initialize()
        this.setupMessageHandlers();
        
        // Iniciar salvamento automático
        this.startAutoSave();
    }

    setupMessageHandlers() {
        // Manipulador da mensagem final
        const finalMessageInput = document.getElementById('cardFinalMessage');
        const finalMessageCounter = document.getElementById('finalMessageCounter');
        const finalMessagePreview = document.querySelector('.final-message p');

        if (finalMessageInput && finalMessageCounter && finalMessagePreview) {
            // Remover listeners existentes para evitar duplicidade
            const newInput = finalMessageInput.cloneNode(true);
            finalMessageInput.parentNode.replaceChild(newInput, finalMessageInput);
            this.elements.finalMessageInput = newInput; // Update reference in elements

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
                // Also update state.formData.finalMessage if this is the primary handler
                this.state.formData.finalMessage = text;
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
        // Garantir que sempre comece do primeiro passo ao carregar a página
        this.state.currentStep = 0;
        
        // Estado inicial
        this.showStep(this.state.currentStep);

        // Resto do código de inicialização...
        this.setupEventListeners(); // Called again
        this.showStep(this.state.currentStep); // Called again
        this.updateProgress(); // Calls the method within this class

        // Inicializar contadores
        const titleCounter = document.getElementById('titleCounter');
        if (titleCounter) titleCounter.textContent = '0';

        const messageCounter = document.getElementById('messageCounter');
        if (messageCounter) messageCounter.textContent = '0';

        // Garantir que o contador da mensagem final seja inicializado
        const finalMessageValue = document.getElementById('cardFinalMessage')?.value || '';
        const finalMessageCounterElem = document.getElementById('finalMessageCounter');
        if (finalMessageCounterElem) {
            finalMessageCounterElem.textContent = finalMessageValue.length;
        }


        this.updatePreview();
        this.loadBibleBooks();
        this.setupSectionObserver(); // Kept as per instruction (cleanup was removed)

        // Adicionar indicadores de seção ao preview
        const previewTheme = document.querySelector('.preview-theme'); // or this.elements.previewTheme
        if (previewTheme) {
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
            // Check if indicators already exist to prevent duplication
            if (!previewTheme.querySelector('.section-indicators')) {
                previewTheme.appendChild(sectionIndicators);
            }
            this.setupSectionDotListeners();
        }


        // Garantir que a observação das seções começa imediatamente
        setTimeout(() => {
            // this.cleanupSectionObserver(); // Method removed
            this.setupSectionObserver(); // Called again

            const previewSectionsContainer = document.querySelector('.preview-sections');
            if (previewSectionsContainer) {
                previewSectionsContainer.scrollBy(0, 1);
                previewSectionsContainer.scrollBy(0, -1);
            }
        }, 500);        // Definir manualmente a seção ativa no carregamento da página
        setTimeout(() => {
            // Garantir que a primeira seção esteja ativa por padrão
            const firstSection = document.querySelector('.preview-section#titleSection');
            if (firstSection) {
                // Remover active de todas as seções primeiro
                document.querySelectorAll('.preview-section').forEach(section => {
                    section.classList.remove('active');
                });
                // Ativar a primeira seção
                firstSection.classList.add('active');
            }
            
            // Ativar também o indicador correspondente
            document.querySelectorAll('.section-dot').forEach(dot => {
                dot.classList.remove('active');
            });
            document.querySelector('.section-dot[data-section="titleSection"]')?.classList.add('active');
        }, 100);

        this.updateProgress(); // Calls the method within this class

        window.scrollTo(0, 0);

        if (!this.state.formData.finalMessage) {
            this.state.formData.finalMessage = "";
            const finalMsgCounter = document.getElementById('finalMessageCounter');
            if (finalMsgCounter) finalMsgCounter.textContent = '0';
        }

        const finalMessageInputElem = document.getElementById('cardFinalMessage');
        if (finalMessageInputElem) {
            finalMessageInputElem.value = this.state.formData.finalMessage; // Set from state
            const finalMsgCounter = document.getElementById('finalMessageCounter');
            if (finalMsgCounter) finalMsgCounter.textContent = this.state.formData.finalMessage.length;
        }

        if (this.elements.finalMessageInput) { //This block seems redundant with the one above
            this.elements.finalMessageInput.value = this.state.formData.finalMessage;
            if (this.elements.finalMessageCounter) this.elements.finalMessageCounter.textContent = this.state.formData.finalMessage.length;
            this.updateFinalMessagePreview(); // Ensure this method exists or is defined
        }

        this.initCharCounter();
    }

    initCharCounter() {
        const cardNameInput = document.getElementById('cardName');
        if (!cardNameInput) return;
        
        // Remover qualquer contador existente primeiro
        const existingCounters = cardNameInput.parentNode.querySelectorAll('.input-footer');
        existingCounters.forEach(counter => counter.remove());
        
        // Criar um único contador novo
        const charCounter = document.createElement('div');
        charCounter.className = 'input-footer';
        charCounter.textContent = '0/20 caracteres';
        
        cardNameInput.parentNode.appendChild(charCounter);
        
        // Atualizar o contador quando o usuário digitar
        cardNameInput.addEventListener('input', function() {
            const remaining = this.value.length;
            charCounter.textContent = `${remaining}/20 caracteres`;
        });
    }

    updateFinalMessagePreview() {
        if (this.elements.finalMessagePreview && this.state.formData.finalMessage !== undefined) {
            this.elements.finalMessagePreview.textContent = this.state.formData.finalMessage || "Que esta mensagem toque seu coração";
        } else if (this.elements.finalMessagePreview) {
            this.elements.finalMessagePreview.textContent = "Que esta mensagem toque seu coração";
        }
    }


    setupSectionObserver() {
        // Inicializa o navegador de preview vertical
        window.previewNavigator = new VerticalPreviewNavigator();
    }

    applyBackgroundEffect(sectionId) {
        const previewThemeContainer = document.getElementById('previewTheme'); // or this.elements.previewTheme
        if (!previewThemeContainer) return;

        previewThemeContainer.classList.remove('bg-title', 'bg-message', 'bg-verse', 'bg-gallery', 'bg-media', 'bg-final');

        const sectionClass = sectionId.replace('Section', '');
        if (['title', 'message', 'verse', 'gallery', 'media', 'final'].includes(sectionClass)) {
            previewThemeContainer.classList.add(`bg-${sectionClass}`);
        }

        previewThemeContainer.style.transition = 'background-color 0.8s ease'; // Ensure this transition is desired

        // Additional effects (optional)
        // switch (sectionId) {
        //     case 'titleSection': break;
        //     case 'verseSection': break;
        //     case 'gallerySection': break;
        // }
    }

    // cleanupSectionObserver() was removed

    setupEventListeners() {
        // Clear any existing listeners to prevent duplicates
        if (this.elements.nextButtons?.length) {
            this.elements.nextButtons.forEach(button => {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleNextStep();
                });
            });
            this.elements.nextButtons = document.querySelectorAll('.btn-next'); // Re-assign to new nodes
        }

        if (this.elements.prevButtons?.length) {
            this.elements.prevButtons.forEach(button => {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.prevStep();
                });
            });
            this.elements.prevButtons = document.querySelectorAll('.btn-prev'); // Re-assign
        }

        const cardNameInput = document.getElementById('cardName');
        if (cardNameInput) {
            const newCardNameInput = cardNameInput.cloneNode(true);
            cardNameInput.parentNode.replaceChild(newCardNameInput, cardNameInput);
            newCardNameInput.addEventListener('input', (e) => {
                const cursorPosition = e.target.selectionStart;
                const originalValue = e.target.value;
                let friendlyValue = originalValue.replace(/\s+/g, '-');

                e.target.value = friendlyValue;

                const lengthDifference = friendlyValue.length - originalValue.length;
                e.target.setSelectionRange(cursorPosition + lengthDifference, cursorPosition + lengthDifference);

                let urlFriendlyValue = friendlyValue
                    .toLowerCase()
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')
                    .replace(/^-+|-+$/g, '');

                this.state.formData.cardName = urlFriendlyValue;
                const urlPreviewElem = document.getElementById('urlPreview');
                if (urlPreviewElem) urlPreviewElem.textContent = urlFriendlyValue || 'seunome';
                const previewUrlElem = document.getElementById('previewUrl');
                if (previewUrlElem) previewUrlElem.textContent = urlFriendlyValue || 'seunome';
                this.updatePreview();
                this.saveToLocalStorage();
            });
        }

        const musicLinkInput = document.getElementById('musicLink');
        if (musicLinkInput) {
            const newMusicLinkInput = musicLinkInput.cloneNode(true);
            musicLinkInput.parentNode.replaceChild(newMusicLinkInput, musicLinkInput);
            newMusicLinkInput.addEventListener('input', (e) => {
                this.state.formData.musicLink = e.target.value;
                this.updatePreview();
            });
        }

        // Substituir o código de upload de imagens por este:
        const uploadArea = document.querySelector('.upload-area');
        const imageUpload = document.getElementById('imageUpload');

        if (uploadArea && imageUpload) {
            // Remover listeners existentes
            const newUploadArea = uploadArea.cloneNode(true);
            const newImageUpload = imageUpload.cloneNode(true);
            
            uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
            imageUpload.parentNode.replaceChild(newImageUpload, imageUpload);

            // Adicionar novo listener para click
            newUploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                newImageUpload.click();
            });

            // Novo listener para change
            newImageUpload.addEventListener('change', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const files = Array.from(e.target.files || []);
                if (!files.length) return;

                // Rastrear tentativa de upload
                if (typeof TikTokEvents !== 'undefined') {
                    TikTokEvents.create.uploadImage();
                }

                try {
                    const maxFiles = 5;
                    if (this.state.formData.images.length + files.length > maxFiles) {
                        alert(`Máximo de ${maxFiles} imagens permitidas`);
                        return;
                    }

                    for (const file of files) {
                        // Validar tipo
                        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
                            alert('Formato de imagem inválido. Use JPG, PNG ou WebP');
                            continue;
                        }

                        // Validar tamanho
                        if (file.size > 5 * 1024 * 1024) {
                            alert('Imagem muito grande. Máximo 5MB');
                            continue;
                        }                        try {
                            // Comprimir imagem para WebP antes de armazenar
                            const compressedFile = await this.convertToWebP(file);
                            
                            // Criar URL temporária para preview (usando arquivo original)
                            const tempUrl = URL.createObjectURL(file);
                            
                            // Adicionar à lista de imagens
                            const imageData = {
                                isTemp: true,
                                tempUrl: tempUrl,
                                blob: compressedFile, // Usar arquivo comprimido
                                fileName: compressedFile.name
                            };
                            
                            this.state.formData.images.push(imageData);
                            
                            // Adicionar preview
                            await this.addImagePreview(tempUrl, this.state.formData.images.length - 1);
                            
                            // Salvar ao localStorage após adicionar imagem
                            this.saveToLocalStorage();
                        } catch (imageError) {
                            console.error('Erro ao processar imagem individual:', imageError);
                            if (typeof tempUrl !== 'undefined') {
                                URL.revokeObjectURL(tempUrl); // Limpar URL se houver erro
                            }
                            continue; // Continuar para próxima imagem em caso de erro
                        }
                    }

                    // Atualizar preview apenas uma vez após processar todas as imagens
                    this.updatePreview();
                    
                    // Salvar ao localStorage após adicionar imagens
                    this.saveToLocalStorage();
                } catch (error) {
                    console.error('Erro ao processar imagens:', error);
                    alert('Ocorreu um erro ao processar as imagens. Por favor, tente novamente.');
                } finally {
                    // Limpar input
                    newImageUpload.value = '';
                }
            });

            // Drag and drop
            newUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                newUploadArea.classList.add('dragover');
            });

            newUploadArea.addEventListener('dragleave', () => {
                newUploadArea.classList.remove('dragover');
            });

            newUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                newUploadArea.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                if (files.length) {
                    const dataTransfer = new DataTransfer();
                    files.forEach(file => dataTransfer.items.add(file));
                    newImageUpload.files = dataTransfer.files;
                    
                    // Disparar evento change
                    const event = new Event('change', { bubbles: true });
                    newImageUpload.dispatchEvent(event);
                }
            });
        }

        const fetchVerseButton = document.getElementById('fetchVerse');
        if (fetchVerseButton) {
            const newFetchVerseButton = fetchVerseButton.cloneNode(true);
            fetchVerseButton.parentNode.replaceChild(newFetchVerseButton, fetchVerseButton);
            newFetchVerseButton.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Rastrear busca de versículo
                if (typeof TikTokEvents !== 'undefined') {
                    TikTokEvents.create.selectVerse();
                }
                
                this.fetchBibleVerse();
            });
        }

        document.querySelectorAll('.theme-option').forEach(option => {
            // Assuming selectTheme doesn't change or is correctly bound
            option.addEventListener('click', () => {
                this.selectTheme(option.dataset.theme);
            });
        });

        document.querySelectorAll('.btn-select-plan').forEach(button => {
            // Remover listeners antigos para evitar duplicidade
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Obter o plano do botão
                const planType = newButton.dataset.plan;
                if (!planType) return;
                
                // Desabilitar TODOS os botões de seleção de plano
                document.querySelectorAll('.btn-select-plan').forEach(btn => {
                    btn.disabled = true;
                });
                
                // Adicionar estado de loading apenas ao botão clicado
                newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';                // Exibir overlay de loading com animação aprimorada
                const loadingOverlay = document.getElementById('planLoadingOverlay');
                if (loadingOverlay) {
                    // Mostrar o overlay
                    loadingOverlay.style.display = 'flex';
                    
                    // Trigger reflow para garantir que a animação seja executada
                    void loadingOverlay.offsetWidth;
                    loadingOverlay.classList.add('active');
                    
                    // Iniciar animação da barra de progresso
                    const progressText = loadingOverlay.querySelector('.plan-loading-progress-text');
                    let progress = 0;
                    const progressInterval = setInterval(() => {
                        progress += Math.random() * 15;
                        if (progress > 95) progress = 95;
                        if (progressText) {
                            progressText.textContent = Math.round(progress) + '%';
                        }
                    }, 200);
                    
                    // Armazenar o interval para poder limpar depois
                    loadingOverlay.progressInterval = progressInterval;
                }
                
                try {
                    // Chamar selectPlan sem passar pelo método que está falhando
                    const planMapping = { 'forever': 'para_sempre', 'annual': 'anual' };
                    const planoPtBr = planMapping[planType] || planType;
                    this.state.formData.selectedPlan = planoPtBr;
                    
                    // Rastrear seleção de plano
                    if (typeof TikTokEvents !== 'undefined') {
                        const planValues = { 'para_sempre': 17.99, 'anual': 8.99 };
                        const planValue = planValues[planoPtBr] || 0;
                        TikTokEvents.create.completeCreation(this.state.cardId);
                        TikTokEvents.selectPlan(planoPtBr, planValue);
                    }
                    
                    // Rastrear evento de seleção de plano para TikTok Pixel (AddToCart e InitiateCheckout)
                    try {
                        const planValues = { 'para_sempre': 297, 'anual': 97 };
                        const planValue = planValues[planoPtBr] || 0;
                        
                        // Salvar dados para rastreamento posterior
                        localStorage.setItem('devotlyCardData', JSON.stringify({
                            cardId: 'new-card-' + Date.now(),
                            planName: planoPtBr === 'para_sempre' ? 'Plano Para Sempre' : 'Plano Anual',
                            price: planValue
                        }));
                        
                        // Salvar dados do usuário para eventos de identificação
                        const userEmail = document.getElementById('userEmail')?.value;
                        if (userEmail) {
                            localStorage.setItem('devotlyUserData', JSON.stringify({
                                email: userEmail,
                                name: document.getElementById('userName')?.value || ''
                            }));
                            
                            // Identificar usuário com email hash
                            if (typeof window.TikTokEvents !== 'undefined') {
                                window.TikTokEvents.identifyUser(userEmail, null, null);
                            }
                        }
                        
                        // Rastrear evento de adição ao carrinho 
                        if (typeof window.TikTokEvents !== 'undefined') {
                            window.TikTokEvents.startCardCreation();
                            window.TikTokEvents.selectPlan(planoPtBr, planValue);
                        }
                    } catch (pixelError) {
                        console.error('Erro ao rastrear evento TikTok:', pixelError);
                    }
                    
                    const cardCreationResponse = await this.submitFormData();
                    if (!cardCreationResponse.success) {
                        throw new Error(cardCreationResponse.message || 'Erro ao criar cartão');
                    }
                    console.log('Cartão criado:', cardCreationResponse.data);
                    
                    const checkoutData = {
                        plano: planoPtBr,
                        email: document.getElementById('userEmail')?.value,
                        cardId: cardCreationResponse.data.id
                    };
                    console.log('Enviando dados para checkout:', checkoutData);
                    
                    // Use API config
                    if (!this.apiConfig) {
                        const { API_CONFIG } = await import('./core/api-config.js');
                        this.apiConfig = API_CONFIG;
                    }
                    
                    const checkoutResponse = await fetch(this.apiConfig.checkout.createPreference, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(checkoutData)
                    });
                    
                    if (!checkoutResponse.ok) {
                        const errorData = await checkoutResponse.json().catch(() => ({ error: 'Erro desconhecido no checkout' }));
                        throw new Error(errorData.error || 'Erro ao criar preferência de checkout');
                    }
                    const mpData = await checkoutResponse.json();
                      if (!mpData.success || !mpData.init_point) {
                        throw new Error(mpData.error || 'Erro ao obter link de checkout do Mercado Pago');
                    }
                    console.log('Checkout criado, redirecionando:', mpData.init_point);
                    
                    // Rastrear evento de início de checkout (AddPaymentInfo)
                    try {
                        if (typeof window.TikTokEvents !== 'undefined') {
                            // Recuperar dados do plano do localStorage
                            const cardData = JSON.parse(localStorage.getItem('devotlyCardData')) || {};
                            const planValue = cardData.price || 0;
                            
                            // Rastrear evento de adição de informações de pagamento
                            window.TikTokEvents.addPaymentInfo(planoPtBr, planValue);
                            
                            // Armazenar dados do pagamento para uso na página de sucesso
                            localStorage.setItem('devotlyPaymentData', JSON.stringify({
                                value: planValue,
                                cardId: checkoutData.cardId,
                                planType: planoPtBr
                            }));
                        }
                    } catch (pixelError) {
                        console.error('Erro ao rastrear evento de checkout TikTok:', pixelError);
                    }
                      // Mostrar animação de sucesso antes de redirecionar
                    if (loadingOverlay) {
                        // Limpar interval da barra de progresso
                        if (loadingOverlay.progressInterval) {
                            clearInterval(loadingOverlay.progressInterval);
                        }
                        
                        // Alterar elementos para indicar sucesso
                        const loadingText = loadingOverlay.querySelector('.plan-loading-text');
                        const loadingSubtext = loadingOverlay.querySelector('.plan-loading-subtext');
                        const loadingSpinner = loadingOverlay.querySelector('.plan-loading-spinner');
                        const loadingContainer = loadingOverlay.querySelector('.plan-loading-container');
                        const loadingIcon = loadingOverlay.querySelector('.plan-loading-icon');
                        const progressText = loadingOverlay.querySelector('.plan-loading-progress-text');
                        
                        // Atualizar textos
                        if (loadingText) loadingText.textContent = 'Pagamento Inicializado';
                        if (loadingSubtext) loadingSubtext.textContent = 'Redirecionando para checkout...';
                        if (progressText) progressText.textContent = '100%';
                        
                        // Adicionar classes de sucesso
                        if (loadingSpinner) loadingSpinner.classList.add('success');
                        if (loadingContainer) loadingContainer.classList.add('success');
                        if (loadingIcon) {
                            loadingIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                        }
                        
                        // Redirecionar após delay para mostrar o sucesso
                        setTimeout(() => {
                            window.location.href = mpData.init_point;
                        }, 1500);
                    } else {
                        window.location.href = mpData.init_point;
                    }} catch (error) {
                    console.error('Erro no processo de seleção de plano:', error);
                    
                    // Limpar interval da barra de progresso
                    if (loadingOverlay && loadingOverlay.progressInterval) {
                        clearInterval(loadingOverlay.progressInterval);
                    }
                    
                    // Ocultar overlay de loading com animação
                    if (loadingOverlay) {
                        loadingOverlay.classList.remove('active');
                        // Aguardar a animação terminar antes de ocultar completamente
                        setTimeout(() => {
                            loadingOverlay.style.display = 'none';
                            // Reset do conteúdo para próxima vez
                            const progressText = loadingOverlay.querySelector('.plan-loading-progress-text');
                            if (progressText) progressText.textContent = '0%';
                        }, 400); // Tempo ajustado para a nova animação
                    }
                    
                    // Restaurar estado do botão
                    newButton.innerHTML = 'Selecionar plano';
                    
                    // Reativar todos os botões
                    document.querySelectorAll('.btn-select-plan').forEach(btn => {
                        btn.disabled = false;
                    });
                    
                    // Mostrar mensagem de erro
                    alert(error.message || 'Erro ao processar pagamento. Tente novamente.');
                }
            });
        });

        const carouselPrevBtn = document.querySelector('#gallerySection .carousel-prev'); // More specific selector
        if (carouselPrevBtn) {
            carouselPrevBtn.addEventListener('click', () => {
                this.navigateCarousel(-1);
            });
        }

        const carouselNextBtn = document.querySelector('#gallerySection .carousel-next'); // More specific selector
        if (carouselNextBtn) {
            carouselNextBtn.addEventListener('click', () => {
                this.navigateCarousel(1);
            });
        }

        const mediaToggleBtn = document.querySelector('.media-toggle'); // Assuming this is for the old preview
        if (mediaToggleBtn) {
            mediaToggleBtn.addEventListener('click', () => {
                this.toggleMedia();
            });
        }

        if (this.elements.form) {
            this.elements.form.removeEventListener('submit', this.handleFormSubmit); // handleFormSubmit needs to be defined or removed
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
            });
        }

        // Define handleFormSubmit if it's meant to be used, or remove the removeEventListener call
        // this.handleFormSubmit = (e) => { e.preventDefault(); /* ... */ };


        if (this.elements.viewCardBtn) {
            this.elements.viewCardBtn.addEventListener('click', () => {
                window.location.href = `view.html?id=${this.state.formData.cardName}`;
            });
        }

        if (this.elements.copyCardLinkBtn) {
            this.elements.copyCardLinkBtn.addEventListener('click', () => {
                this.copyToClipboard(window.location.origin + '/view.html?id=' + this.state.formData.cardName);
                const originalText = this.elements.copyCardLinkBtn.innerHTML;
                this.elements.copyCardLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    if (this.elements.copyCardLinkBtn) this.elements.copyCardLinkBtn.innerHTML = originalText;
                }, 2000);
            });
        }

        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', () => {
                const musicUrl = button.dataset.url;
                
                // Rastrear adição de música
                if (typeof TikTokEvents !== 'undefined') {
                    TikTokEvents.create.addMusic();
                    TikTokEvents.trackEngagement('music', 'Música Selecionada');
                }
                
                const musicLinkElem = document.getElementById('musicLink');
                if (musicLinkElem) musicLinkElem.value = musicUrl;
                this.state.formData.musicLink = musicUrl;
                this.updatePreview();
            });
        });

        document.querySelectorAll('.verse-item').forEach(button => {
            button.addEventListener('click', () => {
                const book = button.dataset.book;
                const chapter = button.dataset.chapter;
                const verse = button.dataset.verse;

                // Rastrear seleção de versículo
                if (typeof TikTokEvents !== 'undefined') {
                    TikTokEvents.create.selectVerse();
                    TikTokEvents.trackEngagement('verse', `${book} ${chapter}:${verse}`);
                }

                const bibleBookElem = document.getElementById('bibleBook');
                if (bibleBookElem) bibleBookElem.value = book;
                const bibleChapterElem = document.getElementById('bibleChapter');
                if (bibleChapterElem) bibleChapterElem.value = chapter;
                const bibleVerseElem = document.getElementById('bibleVerse');
                if (bibleVerseElem) bibleVerseElem.value = verse;

                this.fetchBibleVerse();
            });
        });

        const previewContainerForFullscreen = document.querySelector('.card-preview-container'); // This is the old preview
        if (previewContainerForFullscreen && !previewContainerForFullscreen.querySelector('.preview-fullscreen-btn')) { // Add only if not exists
            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.className = 'preview-fullscreen-btn';
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.setAttribute('title', 'Visualizar em tela cheia');
            previewContainerForFullscreen.appendChild(fullscreenBtn);

            fullscreenBtn.addEventListener('click', () => {
                const previewSectionsContainer = document.querySelector('.preview-sections'); // This is the new preview
                if (!previewSectionsContainer) return;

                if (!document.fullscreenElement) {
                    if (previewSectionsContainer.requestFullscreen) {
                        previewSectionsContainer.requestFullscreen().then(() => {
                            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                        }).catch(err => console.error("Error attempting to enable full-screen mode:", err));
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().then(() => {
                            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                        }).catch(err => console.error("Error attempting to disable full-screen mode:", err));
                    }
                }
            });
        }

        // Fullscreen change listener should target the new preview container
        document.addEventListener('fullscreenchange', () => {
            const previewSectionsContainer = document.querySelector('.preview-sections');
            const fullscreenBtn = previewContainerForFullscreen?.querySelector('.preview-fullscreen-btn'); // Get the button again

            if (document.fullscreenElement === previewSectionsContainer) {
                previewSectionsContainer?.classList.add('fullscreen-mode');
            } else {
                previewSectionsContainer?.classList.remove('fullscreen-mode');
                if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });        const userPhoneInput = document.getElementById('userPhone');
        if (userPhoneInput) {
            const newUserPhoneInput = userPhoneInput.cloneNode(true);
            userPhoneInput.parentNode.replaceChild(newUserPhoneInput, userPhoneInput);
            newUserPhoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.slice(0, 11);

                if (value.length > 2 && value.length <= 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                } else if (value.length > 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                }

                e.target.value = value;
                this.state.formData.userPhone = value;
                
                // Armazenar telefone para uso no TikTok Events
                if (value && value.length >= 10) { // Mínimo para telefone válido
                    localStorage.setItem('user_phone', value);
                    // Identificar usuário no TikTok Events
                    if (typeof TikTokEvents !== 'undefined' && TikTokEvents.identifyUser) {
                        const email = document.getElementById('userEmail')?.value || null;
                        TikTokEvents.identifyUser(email, value, null);
                        console.log('TikTok: Usuário identificado automaticamente com telefone');
                    }
                }
            });
        }
        
        // Add event listener for userEmail to update both email and userName fields
        const userEmailInput = document.getElementById('userEmail');
        if (userEmailInput) {
            const newUserEmailInput = userEmailInput.cloneNode(true);
            userEmailInput.parentNode.replaceChild(newUserEmailInput, userEmailInput);
            newUserEmailInput.addEventListener('input', (e) => {
                const email = e.target.value.trim();
                this.state.formData.email = email;
                
                // Armazenar email para uso no TikTok Events
                if (email && email.includes('@')) {
                    localStorage.setItem('user_email', email);
                    // Identificar usuário no TikTok Events
                    if (typeof TikTokEvents !== 'undefined' && TikTokEvents.identifyUser) {
                        const phone = document.getElementById('userPhone')?.value || null;
                        TikTokEvents.identifyUser(email, phone, null);
                        console.log('TikTok: Usuário identificado automaticamente com email');
                    }
                }
                
                // Auto-fill userName with email username if userName is empty
                const userNameInput = document.getElementById('userName');
                if (userNameInput && !userNameInput.value.trim() && email) {
                    // Extract username from email (part before @)
                    if (email.includes('@')) {
                        const username = email.split('@')[0];
                        // Format username - replace dots/underscores with spaces, capitalize words
                        const formattedName = username
                            .replace(/[._-]/g, ' ')
                            .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                        
                        userNameInput.value = formattedName;
                        this.state.formData.userName = formattedName;
                    }
                }
                
                // Update the preview to reflect the changes
                this.updatePreview();
                this.saveToLocalStorage();
            });
        }        // Centralized input handlers
        const inputHandlers = {
            'cardName': (e) => { 
                this.state.formData.cardName = e.target.value;
                this.saveToLocalStorage();
            },
            'cardTitle': (e) => {
                const text = e.target.value;
                const titleCounterElem = document.getElementById('titleCounter');
                if (titleCounterElem) titleCounterElem.textContent = text.length;                const cardTitleElem = document.getElementById('cardTitle');
                if (cardTitleElem) cardTitleElem.textContent = text || "Mensagem de Fé para Você";
                this.state.formData.cardTitle = text;
                this.saveToLocalStorage();
            },
            'userName': (e) => {
                const text = e.target.value;
                this.state.formData.userName = text;
                this.updatePreview(); // Update the preview to show the author name
                this.saveToLocalStorage();
            },
            'cardMessage': (e) => {
                const text = e.target.value;
                const messageCounterElem = document.getElementById('messageCounter');
                if (messageCounterElem) messageCounterElem.textContent = text.length;                const cardMessageElem = document.getElementById('cardMessage');
                if (cardMessageElem) cardMessageElem.textContent = text || "Sua mensagem aparecerá aqui...";
                this.state.formData.cardMessage = text;
                this.saveToLocalStorage();
            },
            'cardFinalMessage': (e) => {
                const text = e.target.value;
                const finalMessageCounterElem = document.getElementById('finalMessageCounter');
                if (finalMessageCounterElem) finalMessageCounterElem.textContent = text.length;
                const finalMessagePreviewElem = document.querySelector('#finalSection .final-message');
                if (finalMessagePreviewElem) {
                    const pElement = finalMessagePreviewElem.querySelector('p') || finalMessagePreviewElem;
                    pElement.textContent = text || "Que esta mensagem toque seu coração";
                }
                this.state.formData.finalMessage = text;
                this.saveToLocalStorage();
            },
            'musicLink': (e) => {
                this.state.formData.musicLink = e.target.value;
                this.saveToLocalStorage();
            },            'bibleBook': (e) => {
                this.state.formData.bibleVerse.book = e.target.value;
                // Limpar mensagens de erro ao interagir com campos de versículo
                const errorMessages = document.querySelectorAll('.bible-selector .error-message, .step-content .verse-error');
                errorMessages.forEach(el => el.remove());
                this.saveToLocalStorage();
            },            'bibleChapter': (e) => {
                this.state.formData.bibleVerse.chapter = e.target.value;
                // Limpar mensagens de erro ao interagir com campos de versículo
                const errorMessages = document.querySelectorAll('.bible-selector .error-message, .step-content .verse-error');
                errorMessages.forEach(el => el.remove());
                this.saveToLocalStorage();
            },            'bibleVerse': (e) => {
                this.state.formData.bibleVerse.verse = e.target.value;
                // Limpar mensagens de erro ao interagir com campos de versículo
                const errorMessages = document.querySelectorAll('.bible-selector .error-message, .step-content .verse-error');
                errorMessages.forEach(el => el.remove());
                this.saveToLocalStorage();
            },
            'userEmail': (e) => {
                this.state.formData.email = e.target.value;
                this.saveToLocalStorage();
            }
        };

        Object.keys(inputHandlers).forEach(inputId => {
            const element = document.getElementById(inputId);            if (element) {
                // Avoid re-adding listener if already handled by a more specific setup
                if (inputId === 'cardName' || inputId === 'cardFinalMessage' || 
                    inputId === 'userEmail' || inputId === 'userName') return;

                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                newElement.addEventListener('input', inputHandlers[inputId]);
            }
        });
    }


setupSectionDotListeners() {
    document.querySelectorAll('.section-dot').forEach(indicator => {
        const newIndicator = indicator.cloneNode(true);
        indicator.parentNode.replaceChild(newIndicator, indicator);

        newIndicator.addEventListener('click', () => {
            const targetSectionId = newIndicator.dataset.section;
            this.scrollToSection(targetSectionId);
        });
    });
}

scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    const previewSectionsContainer = document.querySelector('.preview-sections');
    
    if (targetSection && previewSectionsContainer) {
        // Calcular o deslocamento para centralizar a seção
        const containerHeight = previewSectionsContainer.clientHeight;
        const sectionHeight = targetSection.offsetHeight;
        const offset = targetSection.offsetTop - (containerHeight - sectionHeight) / 2;

        previewSectionsContainer.scrollTo({
            top: offset,
            behavior: 'smooth'
        });

        // Atualizar estados ativos imediatamente
        document.querySelectorAll('.section-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.section === sectionId);
        });
        document.querySelectorAll('.preview-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === sectionId);
        });
        this.applyBackgroundEffect(sectionId);
    }
}

    handleNextStep() {
        if (this.validateStep(this.state.currentStep)) {
            if (this.state.currentStep < this.state.totalSteps - 1) { // Prevent going beyond last step
                const previousStep = this.state.currentStep;
                this.state.currentStep++;
                this.updateStepUI();
                
                // Rastrear navegação entre etapas
                if (typeof TikTokEvents !== 'undefined') {
                    const stepNames = {
                        0: 'Informações Básicas',
                        1: 'Imagens',
                        2: 'Versículo',
                        3: 'Música',
                        4: 'Finalização'
                    };
                    TikTokEvents.create.navigateSteps(previousStep + 1, this.state.currentStep + 1);
                    TikTokEvents.create.fillStep(this.state.currentStep + 1, stepNames[this.state.currentStep] || 'Etapa');
                }
            }
        }
    }

    // nextStep() was effectively merged into handleNextStep or updateStepUI

    prevStep() {
        if (this.state.currentStep > 0) { // Prevent going before first step
            const previousStep = this.state.currentStep;
            this.state.currentStep--;
            this.updateStepUI();
            
            // Rastrear navegação para trás
            if (typeof TikTokEvents !== 'undefined') {
                TikTokEvents.create.navigateSteps(previousStep + 1, this.state.currentStep + 1);
            }
        }
    }

    updateStepUI() {
        this.showStep(this.state.currentStep);
        this.updateProgress(); // Calls method in this class
        this.updateStepCounter(); // Calls method in this class
        this.updatePreview();
        // scrollToCurrentStep was removed
    }

    showStep(stepIndex) {
        this.elements.formSteps.forEach((stepElement, index) => {
            stepElement.classList.toggle('active', index === stepIndex);
        });
        // Scroll form into view, not the whole page
        const activeStepElement = this.elements.formSteps[stepIndex];
        if (activeStepElement) {
            activeStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            this.elements.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // This is the class method, the global one was removed
    updateStepCounter() {
        const currentElement = document.querySelector('.step-counter .current');
        const totalElement = document.querySelector('.step-counter .total');
        if (currentElement && totalElement) {
            currentElement.textContent = this.state.currentStep + 1;
            totalElement.textContent = this.state.totalSteps;
        }
    }

    // This is the class method, the global one was removed
    updateProgress() {
        const progressPercentage = ((this.state.currentStep + 1) / this.state.totalSteps) * 100;
        const progressBarFill = document.querySelector('.progress-header .progress-fill'); // More specific selector for the new progress bar

        if (progressBarFill) {
            progressBarFill.style.width = `${progressPercentage}%`;
        } else if (this.elements.progressBar) { // Fallback to old progress bar if new one not found
            this.elements.progressBar.style.width = `${progressPercentage}%`;
        }


        // Update step indicators (assuming .step is the class for indicators in the new progress bar)
        // This part might need adjustment if the HTML structure of step indicators changed significantly
        const stepIndicators = document.querySelectorAll('.progress-header .step'); // Adjust selector if needed
        if (stepIndicators.length > 0) {
            stepIndicators.forEach((indicator, index) => {
                indicator.classList.remove('active', 'completed');
                if (index === this.state.currentStep) {
                    indicator.classList.add('active');
                } else if (index < this.state.currentStep) {
                    indicator.classList.add('completed');
                }
            });
        } else if (this.elements.stepIndicators?.length > 0) { // Fallback to old indicators
            this.elements.stepIndicators.forEach((indicator, index) => {
                indicator.classList.remove('active', 'completed');
                if (index === this.state.currentStep) {
                    indicator.classList.add('active');
                } else if (index < this.state.currentStep) {
                    indicator.classList.add('completed');
                }
            });
        }
    }


    validateStep(step) {
        let isValid = true;
        const currentStepElement = this.elements.formSteps[step];
        if (!currentStepElement) return false; // Should not happen

        switch (step) {
            case 0: // Step 1: Card Name
                const cardNameInput = currentStepElement.querySelector('#cardName');
                if (!cardNameInput?.value.trim()) {
                    this.showError(cardNameInput, 'Por favor, insira um nome para o cartão');
                    isValid = false;
                } else if (!/^[a-z0-9-]+$/.test(cardNameInput.value)) {
                    this.showError(cardNameInput, 'Use apenas letras minúsculas, números e hífens');
                    isValid = false;
                }
                break;
            case 1: // Step 2: Title
                const titleInput = currentStepElement.querySelector('#cardTitle');
                if (!titleInput?.value.trim()) {
                    this.showError(titleInput, 'Por favor, insira um título para o cartão');
                    isValid = false;
                } else if (titleInput.value.trim().length < 3) {
                    this.showError(titleInput, 'O título deve ter pelo menos 3 caracteres');
                    isValid = false;
                }
                break;
            case 2: // Step 3: Messages
                const messageInput = currentStepElement.querySelector('#cardMessage');
                if (!messageInput?.value.trim()) {
                    this.showError(messageInput, 'Por favor, insira uma mensagem para o cartão');
                    isValid = false;
                } else if (messageInput.value.trim().length < 10) {
                    this.showError(messageInput, 'A mensagem deve ter pelo menos 10 caracteres');
                    isValid = false;
                }
                const finalMessageInput = currentStepElement.querySelector('#cardFinalMessage');
                if (!finalMessageInput?.value.trim()) {
                    this.showError(finalMessageInput, 'Por favor, insira uma mensagem final');
                    isValid = false;
                } else if (finalMessageInput.value.trim().length < 5) {
                    this.showError(finalMessageInput, 'A mensagem final deve ter pelo menos 5 caracteres');
                    isValid = false;
                }
                break;
            case 3: // Step 4: Verse - Optional, no specific validation here unless fields are partially filled
                break;
            case 4: // Step 5: Images
                if (this.state.formData.images.length === 0) {
                    this.showError(document.getElementById('uploadArea'), 'Por favor, adicione pelo menos uma imagem');
                    isValid = false;
                }
                break;
            case 5: // Step 6: Music/Video
                const musicLinkInput = document.getElementById('musicLink');
                if (!musicLinkInput?.value.trim()) {
                    this.showError(musicLinkInput, 'Por favor, adicione um link do YouTube ou Spotify');
                    isValid = false;
                } else if (!this.isValidMusicLink(musicLinkInput.value)) {
                    this.showError(musicLinkInput, 'Por favor, insira um link válido do YouTube ou Spotify');
                    isValid = false;
                }
                break;            case 6: // Step 7: Contact Info
                const emailInput = currentStepElement.querySelector('#userEmail');
                const userNameInput = currentStepElement.querySelector('#userName');
                const phoneInput = currentStepElement.querySelector('#userPhone');
                
                if (!emailInput?.value.trim()) {
                    this.showError(emailInput, 'Por favor, insira seu email');
                    isValid = false;
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) { // Basic email regex
                    this.showError(emailInput, 'Por favor, insira um email válido');
                    isValid = false;
                }
                
                if (!userNameInput?.value.trim()) {
                    this.showError(userNameInput, 'Por favor, insira seu nome');
                    isValid = false;
                } else if (userNameInput.value.trim().length < 2) {
                    this.showError(userNameInput, 'O nome deve ter pelo menos 2 caracteres');
                    isValid = false;
                }
                
                if (!phoneInput?.value.trim()) {
                    this.showError(phoneInput, 'Por favor, insira seu telefone');
                    isValid = false;
                } else if (phoneInput.value.replace(/\D/g, '').length < 10) {
                    this.showError(phoneInput, 'Por favor, insira um telefone válido');
                    isValid = false;
                }
                
                // Validação da checkbox de termos
                const acceptTermsInput = currentStepElement.querySelector('#acceptTerms');
                if (!acceptTermsInput?.checked) {
                    this.showError(acceptTermsInput, 'Você deve aceitar os Termos de Uso e Política de Privacidade');
                    isValid = false;
                }
                break;
            case 7: // Step 8: Plan
                if (!this.state.formData.selectedPlan) {
                    this.showError(currentStepElement.querySelector('.plan-cards'), 'Por favor, selecione um plano');
                    isValid = false;
                }
                break;
        }
        return isValid;
    }

    isValidMusicLink(url) {        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(\S*)?$/;
        const spotifyRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]{22}(\S*)?$/;
        return youtubeRegex.test(url) || spotifyRegex.test(url);
    }

    showError(inputElement, message) {
        if (!inputElement) return;
        
        // Tratamento especial para checkbox de termos
        let parent = inputElement.parentNode;
        let targetContainer = parent;
        
        if (inputElement.type === 'checkbox' && inputElement.id === 'acceptTerms') {
            // Para a checkbox de termos, colocar a mensagem abaixo da .form-check
            targetContainer = parent.closest('.form-check') || parent;
            parent = targetContainer.parentNode;
        }
        
        const existingError = parent.querySelector('.error-message');
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

        // Para checkbox de termos, inserir após o container .form-check
        if (inputElement.type === 'checkbox' && inputElement.id === 'acceptTerms') {
            targetContainer.insertAdjacentElement('afterend', errorElement);
        } else {
            parent.appendChild(errorElement);
        }
        
        inputElement.focus();

        setTimeout(() => { errorElement.style.opacity = '1'; }, 10);
        setTimeout(() => {
            errorElement.style.opacity = '0';
            setTimeout(() => errorElement.remove(), 300);
        }, 5000);
    }

    // Função dedicada para exibir notificações de erro de versículos
    showVerseError(message, type = 'not-found') {
        // Remover qualquer erro existente
        const existingErrors = document.querySelectorAll('.verse-error');
        existingErrors.forEach(error => error.remove());
        
        // Encontrar o container da etapa 4
        const stepContent = document.querySelector('.form-step[data-step="4"] .step-content');
        if (!stepContent) {
            console.error('Step content não encontrado para exibir erro de versículo');
            return;
        }
        
        // Criar elemento de erro
        const errorElement = document.createElement('div');
        errorElement.className = 'verse-error';
        errorElement.style.cssText = `
            background: rgba(255, 87, 87, 0.1);
            border: 1px solid rgba(255, 87, 87, 0.3);
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        const iconClass = type === 'not-found' ? 'fas fa-exclamation-triangle' : 'fas fa-exclamation-circle';
        const title = type === 'not-found' ? 'Versículo não encontrado' : 'Erro ao carregar versículo';
        
        errorElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; color: #ff5757; font-weight: 500;">
                <i class="${iconClass}"></i>
                <span>${title}</span>
            </div>
            <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.9rem; margin: 0.5rem 0 0 0; line-height: 1.4;">
                ${message}
            </p>
        `;
        
        // Encontrar posição para inserir (após o botão de busca)
        const fetchButton = document.getElementById('fetchVerse');
        if (fetchButton && fetchButton.parentNode === stepContent) {
            // Inserir após o botão de busca
            fetchButton.insertAdjacentElement('afterend', errorElement);
        } else {
            // Fallback: adicionar no início do step-content
            stepContent.insertBefore(errorElement, stepContent.firstChild);
        }
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.style.opacity = '0';
                errorElement.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => errorElement.remove(), 300);
            }
        }, 10000);
        
        return errorElement;
    }    async convertToWebP(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
        return new Promise((resolve, reject) => {
            // Se já for WebP e não precisar redimensionar, retorna o arquivo original
            if (file.type === 'image/webp' && file.size <= 2 * 1024 * 1024) {
                resolve(file);
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // Calcular dimensões mantendo proporção
                    let { width, height } = img;
                    
                    // Redimensionar se necessário
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    // Configurar canvas
                    canvas.width = width;
                    canvas.height = height;

                    // Desenhar imagem redimensionada
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converter para WebP
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Criar novo arquivo com nome WebP
                                const originalName = file.name.replace(/\.[^/.]+$/, '');
                                const webpFile = new File([blob], `${originalName}.webp`, {
                                    type: 'image/webp',
                                    lastModified: Date.now()
                                });
                                
                                console.log(`Imagem comprimida: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) → ${webpFile.name} (${(webpFile.size / 1024 / 1024).toFixed(2)}MB)`);
                                resolve(webpFile);
                            } else {
                                reject(new Error('Falha na conversão para WebP'));
                            }
                        },
                        'image/webp',
                        quality
                    );
                } catch (error) {
                    reject(new Error(`Erro na compressão: ${error.message}`));
                }
            };

            img.onerror = () => {
                reject(new Error('Falha ao carregar imagem para compressão'));
            };

            // Carregar imagem
            if (file instanceof Blob) {
                img.src = URL.createObjectURL(file);
            } else {
                reject(new Error('Arquivo inválido para compressão'));
            }
        });
    }

    async handleImageUpload() {
        try {
            if (!this.elements.imageUpload || !this.elements.imageUpload.files.length) return;
            
            const files = Array.from(this.elements.imageUpload.files);
            const maxFiles = 5; // Máximo de 5 imagens
            
            if (this.state.formData.images.length + files.length > maxFiles) {
                this.showError(this.elements.imageUpload, `Máximo de ${maxFiles} imagens permitidas`);
                return;
            }

            // Ensure API config is loaded
            if (!this.apiConfig) {
                const { API_CONFIG } = await import('./core/api-config.js');
                this.apiConfig = API_CONFIG;
            }

            for (const file of files) {
                // Validar tipo e tamanho
                if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
                    this.showError(this.elements.imageUpload, 'Formato de imagem inválido. Use JPG, PNG ou WebP');
                    continue;
                }

                if (file.size > 5 * 1024 * 1024) { // 5MB
                    this.showError(this.elements.imageUpload, 'Imagem muito grande. Máximo 5MB');
                    continue;
                }                try {
                    // Comprimir imagem para WebP antes do upload
                    const compressedFile = await this.convertToWebP(file);
                    
                    // Criar URL temporária para preview (usando arquivo original para melhor qualidade visual)
                    const tempUrl = URL.createObjectURL(file);
                    
                    // Adicionar loading indicator
                    const loadingIndex = this.state.formData.images.length;
                    this.state.formData.images.push({
                        isTemp: true,
                        tempUrl: tempUrl,
                        blob: compressedFile, // Usar arquivo comprimido para upload
                        fileName: compressedFile.name,
                        loading: true
                    });

                    // Adicionar preview no formulário com estado de loading
                    this.addImagePreview(tempUrl, loadingIndex);
                    
                    // Upload da imagem comprimida para o servidor
                    const formData = new FormData();
                    formData.append('image', compressedFile);
                    
                    const uploadResponse = await fetch(this.apiConfig.upload, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const responseData = await uploadResponse.json();
                    
                    if (!uploadResponse.ok || !responseData.success) {
                        const errorMessage = responseData.error || 'Erro desconhecido no upload';
                        console.error('Upload error:', {
                            status: uploadResponse.status,
                            statusText: uploadResponse.statusText,
                            response: responseData,
                            url: uploadResponse.url
                        });
                        throw new Error(errorMessage);
                    }
                    
                    if (!responseData.url) {
                        console.error('Invalid response:', responseData);
                        throw new Error('URL da imagem não recebida do servidor');
                    }
                    
                    // Validate the URL
                    try {
                        new URL(responseData.url);
                    } catch (e) {
                        console.error('Invalid URL received:', responseData.url);
                        throw new Error('URL da imagem inválida');
                    }
                      // Atualizar objeto de imagem com URL do servidor
                    this.state.formData.images[loadingIndex] = {
                        isTemp: false,
                        url: responseData.url,
                        tempUrl: tempUrl,  // Manter URL temporária para preview local
                        fileName: compressedFile.name,
                        loading: false
                    };
                    
                } catch (error) {
                    console.error('Erro ao processar imagem:', error);
                    this.showError(this.elements.imageUpload, 'Erro ao processar imagem');
                }
            }                    // Atualizar o preview principal
                    this.updatePreview();
                    
                    // Salvar ao localStorage após adicionar imagem
                    this.saveToLocalStorage();
                    
                    // Limpar o input após processamento bem-sucedido
                    this.elements.imageUpload.value = '';

        } catch (error) {
            console.error('Erro ao fazer upload das imagens:', error);
            this.showError(this.elements.imageUpload, 'Erro ao processar imagens');
        }
    }
    
    async addImagePreview(url, index) {
        const container = document.getElementById('imagePreviewContainer');
        if (!container) return;

        try {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            
            // Criar e carregar a imagem antes de adicionar ao DOM
            const img = document.createElement('img');
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            previewDiv.innerHTML = `
                <img src="${url}" alt="Imagem ${index + 1}">
                <button class="remove-image" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            container.appendChild(previewDiv);

            const removeButton = previewDiv.querySelector('.remove-image');
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    this.removeImage(parseInt(removeButton.dataset.index));
                });
            }
        } catch (error) {
            console.error('Erro ao adicionar preview da imagem:', error);
            throw error; // Propagar erro para tratamento adequado
        }
    }

    reindexImages() { // This re-indexes the remove buttons in the form preview
        const previews = document.querySelectorAll('#imagePreviewContainer .image-preview .remove-image');
        previews.forEach((button, index) => {
            button.dataset.index = index;
        });    }

    // updateCarouselControls() was removed as it was tied to the old preview structure.
    // New gallery in updateGalleryPreview handles its own controls.

    loadBibleBooks() {
        const books = [
            // Old Testament - Most well-known books
            { value: 'genesis', text: 'Gênesis' }, 
            { value: 'exodus', text: 'Êxodo' },
            { value: 'psalms', text: 'Salmos' }, 
            { value: 'proverbs', text: 'Provérbios' },
            { value: 'isaiah', text: 'Isaías' },
            // New Testament - Most well-known books
            { value: 'matthew', text: 'Mateus' },
            { value: 'john', text: 'João' }, 
            { value: 'romans', text: 'Romanos' },
            { value: 'corinthians1', text: '1 Coríntios' },
            { value: 'philippians', text: 'Filipenses' }
        ];
        const bookSelect = document.getElementById('bibleBook');
        if (!bookSelect) return;

        // Clear existing options first
        bookSelect.innerHTML = '<option value="">Selecione o Livro</option>';

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
    
    // Salvar referência do botão e seu texto original
    const fetchButton = document.getElementById('fetchVerse');
    if (!fetchButton) return; // Verificação de segurança
    
    const originalButtonText = '<i class="fas fa-search"></i> Buscar Versículo';
    
    // Verificações dos campos requeridos
    if (!bookSelect?.value) {
        this.showError(bookSelect, 'Por favor, selecione um livro');
        return;
    }
    if (!chapterInput?.value) {
        this.showError(chapterInput, 'Por favor, informe o capítulo');
        return;
    }
    if (!verseInput?.value) {
        this.showError(verseInput, 'Por favor, informe o versículo');
        return;
    }
    
    // Verificar se capítulo e versículo são números válidos
    if (isNaN(parseInt(chapterInput.value, 10))) {
        this.showError(chapterInput, 'O capítulo deve ser um número');
        return;
    }
    
    if (isNaN(parseInt(verseInput.value, 10))) {
        this.showError(verseInput, 'O versículo deve ser um número');
        return;
    }    try {
        // Mostrar indicador de carregamento
        fetchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
        fetchButton.disabled = true;
          // IMPORTANTE: Remover TODAS as mensagens de erro anteriores do seletor de versículos
        const allErrorContainers = document.querySelectorAll('.bible-selector .error-message, .step-content .verse-error');
        allErrorContainers.forEach(container => container.remove());
        
        // Garantir que não há erro persistente exibido
        const persistentError = document.querySelector('.bible-selector .error-message');
        if (persistentError) {
            persistentError.remove();
        }        // Fazer chamada à API para buscar versículos da Bíblia
        let response;
        let apiError = false;
          try {
            response = await this.simulateBibleApiCall(bookSelect.value, chapterInput.value, verseInput.value);
        } catch (error) {
            apiError = true;
        }
        
        // Restaurar o botão ao estado original
        fetchButton.innerHTML = originalButtonText;
        fetchButton.disabled = false;
        
        // Verificar se a API retornou um versículo válido
        if (!apiError && response && response.text && !response.text.includes('Versículo não encontrado')) {// SUCESSO: Remover TODAS as mensagens de erro existentes
            const allErrorMessages = document.querySelectorAll('.bible-selector .error-message, .step-content .verse-error');
            allErrorMessages.forEach(el => el.remove());
            
            // Atualizar o estado com os dados do versículo
            this.state.formData.bibleVerse = {
                book: bookSelect.options[bookSelect.selectedIndex].text,
                chapter: chapterInput.value,
                verse: verseInput.value,
                text: response.text,
                reference: `${bookSelect.options[bookSelect.selectedIndex].text} ${chapterInput.value}:${verseInput.value}`
            };
            
            // 1. Atualizar o preview no formulário
            const versePreviewElement = document.querySelector('.verse-preview');
            const verseTextElement = document.querySelector('.verse-preview .verse-text');
            const verseRefElement = document.querySelector('.verse-preview .verse-reference');
              if (versePreviewElement && verseTextElement && verseRefElement) {
                // Only show valid verse text, never show error messages in the preview
                if (response.text && !response.text.includes('Versículo não encontrado')) {
                    verseTextElement.textContent = `"${response.text}"`;
                    verseRefElement.textContent = this.state.formData.bibleVerse.reference;
                    versePreviewElement.style.display = 'block';
                } else {
                    versePreviewElement.style.display = 'none';
                }
            }
            
            // 2. Atualizar no preview principal
            const verseTextElem = document.querySelector('#verseSection #verseText');
            if (verseTextElem && response.text && !response.text.includes('Versículo não encontrado')) {
                verseTextElem.textContent = `"${response.text}"`;
            }
            
            const verseRefElem = document.querySelector('#verseSection #verseRef');
            if (verseRefElem && response.text && !response.text.includes('Versículo não encontrado')) {
                verseRefElem.textContent = this.state.formData.bibleVerse.reference;
            }
            
            // 3. Destacar o preview do versículo para chamar atenção
            const verseSection = document.getElementById('verseSection');
            if (verseSection) {
                verseSection.classList.add('highlight-pulse');
                setTimeout(() => {
                    verseSection.classList.remove('highlight-pulse');
                }, 2000);
            }
            
            this.updatePreview();        } else {
            // Use the dedicated error function for verse not found
            this.showVerseError('O versículo solicitado não foi encontrado. Verifique se o capítulo e versículo existem no livro selecionado e tente novamente.', 'not-found');
            
            this.state.formData.bibleVerse = { book: '', chapter: '', verse: '', text: '', reference: '' };
            
            // Esconder o preview no formulário caso o versículo não seja encontrado
            const versePreviewElement = document.querySelector('.verse-preview');
            if (versePreviewElement) {
                versePreviewElement.style.display = 'none';
            }
            
            this.updatePreview();
        }    } catch (error) {
        console.error('Erro ao buscar versículo:', error);
        
        // Restaurar o botão ao estado original caso tenha ocorrido erro antes
        if (fetchButton) {
            fetchButton.innerHTML = originalButtonText;
            fetchButton.disabled = false;
        }

        // Use the dedicated error function for API errors
        this.showVerseError('Não foi possível carregar o versículo. Verifique sua conexão com a internet e tente novamente.', 'api-error');
        
        // Limpar o estado do versículo quando há erro
        this.state.formData.bibleVerse = { book: '', chapter: '', verse: '', text: '', reference: '' };
    } finally {
        // Garantir que o botão sempre volte ao estado original
        // Este bloco sempre executa, mesmo se houver erros no try ou no catch
        if (fetchButton) {
            fetchButton.innerHTML = originalButtonText;
            fetchButton.disabled = false;
        }
    }
}

    async fetchBibleVerseFromAPI(book, chapter, verse) {
        try {            // Mapping from internal book names to Bible API book names
            const bookMapping = {
                'genesis': 'genesis',
                'exodus': 'exodus', 
                'psalms': 'psalms',
                'proverbs': 'proverbs',
                'isaiah': 'isaiah',
                'matthew': 'matthew',
                'john': 'john',
                'romans': 'romans',
                'corinthians1': '1corinthians',
                'philippians': 'philippians'
            };

            const apiBookName = bookMapping[book];
            if (!apiBookName) {
                throw new Error(`Livro não suportado: ${book}`);
            }

            // Use Portuguese translation (almeida) if available, otherwise default to web
            const translation = 'almeida';            const apiUrl = `https://bible-api.com/${apiBookName} ${chapter}:${verse}?translation=${translation}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if we have verses in the response
            if (data.verses && data.verses.length > 0) {
                const verseText = data.verses[0].text;                // Clean up the verse text (remove extra whitespace, etc.)
                const cleanedText = verseText.replace(/\s+/g, ' ').trim();
                
                return { text: cleanedText };
            } else {
                throw new Error('Nenhum versículo encontrado na resposta da API');
            }        } catch (error) {
            console.error('Erro ao buscar versículo da API:', error);
            
            // Fallback to local verses for critical verses
            const fallbackResult = this.getFallbackVerse(book, chapter, verse);
            if (fallbackResult) {
                return fallbackResult;
            }
            
            // If no fallback available, throw error to trigger proper error handling
            throw new Error('Versículo não encontrado');
        }
    }    getFallbackVerse(book, chapter, verse) {
        // Fallback verses for the most common requests
        const fallbackVerses = {
            'john_3_16': 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
            'psalms_23_1': 'O SENHOR é o meu pastor; nada me faltará.',
            'proverbs_3_5': 'Confia no SENHOR de todo o teu coração e não te estribes no teu próprio entendimento.',
            'isaiah_41_10': 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.',
            'matthew_6_33': 'Buscai, pois, em primeiro lugar, o seu reino e a sua justiça, e todas estas coisas vos serão acrescentadas.',
            'philippians_4_13': 'Tudo posso naquele que me fortalece.',
            'romans_8_28': 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.'
        };

        const fallbackKey = `${book}_${chapter}_${verse}`;
        const fallbackText = fallbackVerses[fallbackKey];        if (fallbackText) {
            return { text: fallbackText };
        }

        // If no specific fallback, return null to indicate verse not found
        // This will trigger the error handling in fetchBibleVerse
        return null;
    }

    // Legacy method name for backward compatibility - now calls the real API
    simulateBibleApiCall(book, chapter, verse) {
        return this.fetchBibleVerseFromAPI(book, chapter, verse);
    }

    selectTheme(theme) {
        document.querySelectorAll('.theme-option').forEach(option => option.classList.remove('selected'));
        const selectedOption = document.querySelector(`.theme-option[data-theme="${theme}"]`);
        if (selectedOption) selectedOption.classList.add('selected');

        this.state.formData.theme = theme;
        if (window.applyPreviewTheme) window.applyPreviewTheme(theme); // Assuming global function for CSS effects
        this.updatePreview();        this.saveToLocalStorage();
    }

    async selectPlan(plan) {
        // Elementos
        const loadingOverlay = document.getElementById('planLoadingOverlay');
        const clickedButton = document.querySelector(`.btn-select-plan[data-plan="${plan}"]`);
        
        if (!clickedButton) return;

        try {
            // 1. Desabilitar botão e mostrar loading
        clickedButton.disabled = true;            clickedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            
            // 2. Mostrar overlay de loading
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }

            // 3. Processar o plano
            const planMapping = { 'forever': 'para_sempre', 'annual': 'anual' };
            const planoPtBr = planMapping[plan] || plan;
            this.state.formData.selectedPlan = planoPtBr;
            
            // Rastrear seleção de plano
            if (typeof TikTokEvents !== 'undefined') {
                const planValues = { 'para_sempre': 17.99, 'anual': 8.99 };
                const planValue = planValues[planoPtBr] || 0;
                TikTokEvents.create.completeCreation(this.state.cardId);
                TikTokEvents.selectPlan(planoPtBr, planValue);
            }
            
            // Salvar seleção de plano no localStorage
            this.saveToLocalStorage();
            
            const cardCreationResponse = await this.submitFormData();
            if (!cardCreationResponse.success) {
                throw new Error(cardCreationResponse.message || 'Erro ao criar cartão');
            }
            
            const checkoutData = {
                            plano: planoPtBr,
                email: document.getElementById('userEmail')?.value,
                cardId: cardCreationResponse.data.id
            };

            // Ensure API config is loaded
            if (!this.apiConfig) {
                const { API_CONFIG } = await import('./core/api-config.js');
                this.apiConfig = API_CONFIG;
            }

            const checkoutResponse = await fetch(this.apiConfig.checkout.createPreference, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutData)
            });            if (!checkoutResponse.ok) {
                const errorData = await checkoutResponse.json().catch(() => ({ error: 'Erro desconhecido no checkout' }));
                throw new Error(errorData.error || 'Erro ao criar preferência de checkout');
            }

            const mpData = await checkoutResponse.json();
            if (!mpData.success || !mpData.init_point) {
                throw new Error(mpData.error || 'Erro ao obter link de checkout do Mercado Pago');
            }

            // 4. Redirecionar para o checkout
            window.location.href = mpData.init_point;

        } catch (error) {
            console.error('Erro no processo de seleção de plano:', error);
            
            // 5. Restaurar botão em caso de erro
            clickedButton.disabled = false;
            clickedButton.innerHTML = 'Selecionar plano';
            
            // 6. Esconder overlay
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // 7. Mostrar erro
            alert(error.message || 'Erro ao processar pagamento. Tente novamente.');
        }
    }

    navigateCarousel(direction) {
        if (!this.state.formData.images.length) return;
        
        const newIndex = (this.state.currentImageIndex + direction + this.state.formData.images.length) % this.state.formData.images.length;
        this.goToImage(newIndex);
    }

    goToImage(index) {
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        if (!galleryContainer) return;

        // Atualizar imagens
        const images = galleryContainer.querySelectorAll('img');
        images.forEach((img, i) => {
            img.style.display = i === index ? 'block' : 'none';
            img.classList.toggle('active', i === index);
        });

        // Atualizar indicadores
        const indicators = galleryContainer.querySelectorAll('.gallery-indicator');
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });

        // Atualizar contador
        const counter = galleryContainer.querySelector('.image-counter');
        if (counter) {
            counter.innerHTML = `
                <span class="current">${index + 1}</span>/<span class="total">${this.state.formData.images.length}</span>
            `;
        }

        this.state.currentImageIndex = index;
    }


    startImageCarousel() {
        // this.imageInterval was removed. If auto-carousel is needed, new logic for interval management is required.
        // For now, this method is effectively disabled.
        if (this.state.formData.images.length > 1) {
            console.log("Auto-carousel logic would start here if an interval mechanism was in place.");
            // Example:
            // if (this.someNewIntervalId) clearInterval(this.someNewIntervalId);
            // this.someNewIntervalId = setInterval(() => this.navigateCarousel(1), 3000);
        }
    }

    toggleMedia() {
        const cardMediaContainer = this.elements.cardMedia; // Updated to match view.html structure
        if (!cardMediaContainer) return;
        const iframe = cardMediaContainer.querySelector('iframe');
        if (!iframe) return;

        // this.state.isMediaPlaying was removed. Logic needs to be independent or use a different state.
        // For simplicity, let's assume we just try to send a command.
        // This will likely not work as expected without a state to track play/pause.
        let command = 'playVideo'; // Default to play
        const currentToggleIcon = document.querySelector('.media-toggle i');
        if (currentToggleIcon?.classList.contains('fa-pause')) { // If it shows pause, it means it's playing
            command = 'pauseVideo';
            currentToggleIcon.classList.remove('fa-pause');
            currentToggleIcon.classList.add('fa-play');
        } else if (currentToggleIcon) {
            currentToggleIcon.classList.remove('fa-play');
            currentToggleIcon.classList.add('fa-pause');
        }


        if (iframe.src.includes('youtube')) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command }), '*');
        } else if (iframe.src.includes('spotify')) {
            // Spotify embed doesn't have a simple play/pause postMessage API like YouTube
            // Opacity change was a visual cue, actual play/pause needs Spotify SDK or different embed
            iframe.style.opacity = command === 'playVideo' ? '1' : '0.5';
        }
    }

    getEmbedUrl(url) {
        if (!url) return null;
        
        // Process YouTube URLs
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch) {
            return {
                url: `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1&rel=0`,
                type: 'youtube'
            };
        }

        // Process Spotify URLs with improved type detection
        const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist)\/([\w]+)/);
        if (spotifyMatch) {
            const embedPath = spotifyMatch[0].substring(spotifyMatch[0].indexOf('/') + 1);
            const mediaType = spotifyMatch[1] === 'playlist' ? 'spotify-playlist' : 'spotify';
            
            return {
                url: `https://open.spotify.com/embed/${embedPath}?utm_source=generator`,
                type: mediaType
            };
        }

        return null;
    }

    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html; // Basic sanitization by setting textContent
        // Then apply simple formatting. For more complex HTML, a proper sanitizer library is needed.
        return temp.innerHTML
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/\n/g, '<br>'); // Also replace newlines with <br> for display
    }

    updatePreview() {
        // Update Title Section
        const previewTitleElem = document.querySelector('#titleSection h1');
        if (previewTitleElem) previewTitleElem.textContent = this.state.formData.cardTitle || "Mensagem de Fé para Você";

        // Update Message Section
        const previewMessageContainer = document.querySelector('#messageSection .message-container');
        if (previewMessageContainer) {
            let formattedMessage = this.state.formData.cardMessage || "Sua mensagem aparecerá aqui...";
            previewMessageContainer.innerHTML = this.sanitizeHTML(formattedMessage);
        }        // Update Verse Section
        const verseTextElem = document.querySelector('#verseSection #verseText');
        if (verseTextElem) {
            // Only show valid verse text, never show error messages in the verse content
            if (this.state.formData.bibleVerse.text && !this.state.formData.bibleVerse.text.includes('Versículo não encontrado')) {
                verseTextElem.textContent = `"${this.state.formData.bibleVerse.text}"`;
            } else {
                verseTextElem.textContent = '"Porque Deus amou o mundo de tal maneira..."';
            }
        }        const verseRefElem = document.querySelector('#verseSection #verseRef');
        if (verseRefElem) {
            // Only show valid verse reference, never show reference for error messages
            if (this.state.formData.bibleVerse.reference && this.state.formData.bibleVerse.text && !this.state.formData.bibleVerse.text.includes('Versículo não encontrado')) {
                verseRefElem.textContent = this.state.formData.bibleVerse.reference;
            } else {
                verseRefElem.textContent = 'João 3:16';
            }
        }

        // Update Gallery Section
        this.updateGalleryPreview(); // Dedicated method for gallery        // Update Media Section using the enhanced MediaHandler
        const mediaSectionContainer = document.querySelector('#mediaSection #cardMedia');
        if (mediaSectionContainer) {
            // Import MediaHandler dynamically if not available
            if (typeof MediaHandler === 'undefined') {
                import('../core/MediaHandler.js').then(module => {
                    const MediaHandlerClass = module.default || window.MediaHandler;
                    MediaHandlerClass.renderMedia(mediaSectionContainer, this.state.formData.musicLink, {
                        useThumbnailPreview: true,
                        autoplay: false
                    });
                }).catch(() => {
                    // Fallback to original implementation if import fails
                    const embedResult = this.getEmbedUrl(this.state.formData.musicLink);
                    if (embedResult) {
                        mediaSectionContainer.setAttribute('data-media-type', embedResult.type);
                        mediaSectionContainer.innerHTML = `<iframe 
                            src="${embedResult.url}" 
                            frameborder="0" 
                            allow="autoplay; encrypted-media" 
                            allowfullscreen
                            loading="lazy"
                            onload="this.parentElement.classList.add('loaded')"></iframe>`;
                    } else {
                        mediaSectionContainer.removeAttribute('data-media-type');
                        mediaSectionContainer.innerHTML = `
                            <div class="no-media">
                                <i class="fas fa-music"></i>
                                <span>Nenhuma mídia selecionada</span>
                            </div>`;
                    }
                });
            } else {
                // If MediaHandler is already available, use it directly
                MediaHandler.renderMedia(mediaSectionContainer, this.state.formData.musicLink, {
                    useThumbnailPreview: true,
                    autoplay: false
                });
            }
        }        // Update Final Message Section
        const finalMessagePreviewElem = document.querySelector('#finalSection .final-message'); // Target the p inside if structure is .final-message > p
        if (finalMessagePreviewElem) {
            const pElem = finalMessagePreviewElem.querySelector('p') || finalMessagePreviewElem;
            pElem.innerHTML = this.sanitizeHTML(this.state.formData.finalMessage || "Que esta mensagem toque seu coração");
            
            // Update card author
            const authorElem = document.getElementById('previewCardAuthor');
            if (authorElem) {
                const userName = this.state.formData.userName || this.state.formData.email;
                if (userName) {
                    // Format the user name to show "De: Nome"
                    let formattedName = "De: ";
                    // Extract name before @ if it's an email
                    if (userName.includes('@')) {
                        formattedName += userName.split('@')[0];
                    } else {
                        formattedName += userName;
                    }
                    authorElem.textContent = formattedName;
                    authorElem.style.display = 'block';
                } else {
                    authorElem.textContent = "De: Seu Nome";
                    authorElem.style.display = 'block';
                }
            }
            
            // Add heartbeat effect to the cross icon
            const decorationIcon = finalMessagePreviewElem.querySelector('.message-decoration i');
            if (decorationIcon) {
                decorationIcon.className = "fas fa-cross heartbeat";
            }
        }

        // Update URL in Final Section (if it exists there)
        const finalSectionUrlElem = document.querySelector('#finalSection .preview-url .url-text'); // Example selector
        if (finalSectionUrlElem) {
            finalSectionUrlElem.textContent = this.state.formData.cardName || 'seunome';
        }


        // Re-setup observer if it was cleaned or needs refresh (though cleanup was removed)
        // this.setupSectionObserver(); // Called frequently, ensure it's efficient or called less often

        this.saveToLocalStorage();
    }

    updateGalleryPreview() {
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        if (!galleryContainer) return;

        const galleryInner = galleryContainer.querySelector('.gallery-inner') || document.createElement('div');
        galleryInner.className = 'gallery-inner';
        
        // Limpar o container
        galleryInner.innerHTML = '';

        if (this.state.formData.images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-image"></i>
                    <span>Nenhuma imagem selecionada</span>
                </div>`;
            return;
        }

        // Adicionar imagens
        this.state.formData.images.forEach((imageObj, index) => {
            const img = document.createElement('img');
            img.src = imageObj.tempUrl || imageObj.url || imageObj;
            img.alt = `Imagem ${index + 1}`;
            img.style.display = index === this.state.currentImageIndex ? 'block' : 'none';
            img.className = index === this.state.currentImageIndex ? 'active' : '';
            galleryInner.appendChild(img);
        });

        // Atualizar controles do carrossel
        galleryContainer.innerHTML = `
            <div class="gallery-inner">${galleryInner.innerHTML}</div>
            ${this.state.formData.images.length > 1 ? `
                <div class="carousel-controls">
                    <button class="carousel-prev" aria-label="Anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-next" aria-label="Próximo">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="gallery-indicators">
                    ${this.state.formData.images.map((_, i) => `
                        <div class="gallery-indicator ${i === this.state.currentImageIndex ? 'active' : ''}" 
                             data-index="${i}"></div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="image-counter">
                <span class="current">${this.state.formData.images.length}</span>/<span class="total">${this.state.formData.images.length}</span>
            </div>
        `;

        // Adicionar event listeners
        if (this.state.formData.images.length > 1) {
            const prevBtn = galleryContainer.querySelector('.carousel-prev');
            const nextBtn = galleryContainer.querySelector('.carousel-next');
            const indicators = galleryContainer.querySelectorAll('.gallery-indicator');

            prevBtn?.addEventListener('click', () => this.navigateCarousel(-1));
            nextBtn?.addEventListener('click', () => this.navigateCarousel(1));
            
            indicators.forEach(indicator => {
                indicator.addEventListener('click', () => {
                    const index = parseInt(indicator.dataset.index);
                    this.goToImage(index);
                });
            });
        }
    }

    goToImage(index) {
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        if (!galleryContainer) return;

        // Atualizar imagens
        const images = galleryContainer.querySelectorAll('img');
        images.forEach((img, i) => {
            img.style.display = i === index ? 'block' : 'none';
            img.classList.toggle('active', i === index);
        });

        // Atualizar indicadores
        const indicators = galleryContainer.querySelectorAll('.gallery-indicator');
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });

        // Atualizar contador
        const counter = galleryContainer.querySelector('.image-counter');
        if (counter) {
            counter.innerHTML = `
                <span class="current">${index + 1}</span>/<span class="total">${this.state.formData.images.length}</span>
            `;
        }

        this.state.currentImageIndex = index;
    }


    async removeImage(indexToRemove) {
        if (indexToRemove < 0 || indexToRemove >= this.state.formData.images.length) return;

        const imageToRemove = this.state.formData.images[indexToRemove];
        if (imageToRemove.isTemp && imageToRemove.tempUrl) {
            URL.revokeObjectURL(imageToRemove.tempUrl); // Clean up object URL
        }

        this.state.formData.images.splice(indexToRemove, 1);

        if (this.state.currentImageIndex >= this.state.formData.images.length) {
            this.state.currentImageIndex = Math.max(0, this.state.formData.images.length - 1);
        }

        // Remove from the form's image preview list
        const imagePreviewContainerForm = document.getElementById('imagePreviewContainer');
        const formImagePreviews = imagePreviewContainerForm?.querySelectorAll('.image-preview');
        if (formImagePreviews && formImagePreviews[indexToRemove]) {
            formImagePreviews[indexToRemove].remove();
        }

        this.reindexImages(); // Re-index data attributes on form remove buttons        this.updatePreview(); // Update the main preview sections (which calls updateGalleryPreview)
        this.saveToLocalStorage(); // Save state after removing image
    }    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Falha ao copiar para a área de transferência:', err);
            alert('Não foi possível copiar o link. Por favor, copie manualmente.');
        }
        document.body.removeChild(textarea);
    }

    async submitFormData() { // Called by selectPlan
        try {
            const email = document.getElementById('userEmail')?.value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Basic email validation
                throw new Error('Email é obrigatório e deve ser válido');
            }

            const uploadedImageUrls = [];
            for (const imageObj of this.state.formData.images) {
                if (imageObj.isTemp && imageObj.blob) {
                    const imageFormData = new FormData();
                    imageFormData.append('image', imageObj.blob, imageObj.fileName); // Use blob and fileName

                    // Ensure API config is loaded
                    if (!this.apiConfig) {
                        const { API_CONFIG } = await import('./core/api-config.js');
                        this.apiConfig = API_CONFIG;
                    }                    console.log('Attempting upload to:', this.apiConfig.upload);
                    
                    const uploadResponse = await fetch(this.apiConfig.upload, {
                        method: 'POST',
                        body: imageFormData,
                        redirect: 'follow', // Explicitly follow redirects
                        mode: 'cors', // Use CORS mode
                        credentials: 'same-origin',
                        headers: {
                            'Accept': 'application/json',
                            'Origin': window.location.origin
                        }
                    }).catch(err => {
                        console.error('Network error during upload:', err);
                        throw new Error(`Erro de conexão ao fazer upload: ${err.message}`);
                    });

                    console.log('Upload response status:', uploadResponse.status);
                    
                    let responseData;
                    let responseText;
                    try {
                        // First get the raw text to see what's happening
                        responseText = await uploadResponse.text();
                        console.log('Response text:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
                        
                        // Try to parse as JSON
                        try {
                            responseData = JSON.parse(responseText);
                        } catch (jsonErr) {
                            console.error('Invalid JSON response:', jsonErr);
                            console.error('Response starts with:', responseText.substring(0, 100));
                            throw new Error('Resposta do servidor não é um JSON válido');
                        }
                    } catch (err) {
                        console.error('Error processing response:', err);
                        throw new Error('Erro ao processar resposta do servidor: ' + err.message);
                    }
                    
                    if (!uploadResponse.ok || !responseData.success) {
                        console.error('Upload failed:', responseData);
                        const errorMessage = responseData.error || 'Erro desconhecido no upload';
                        throw new Error(`Erro no upload da imagem ${imageObj.fileName}: ${errorMessage}`);
                    }

                    if (!responseData.url) {
                        console.error('Missing URL in response:', responseData);
                        throw new Error('URL da imagem não recebida do servidor');
                    }

                    uploadedImageUrls.push(responseData.url);
                } else if (typeof imageObj === 'string' && imageObj.startsWith('http')) { // Already an URL
                    uploadedImageUrls.push(imageObj);
                } else if (imageObj.url) { // If imageObj has a URL property from previous uploads
                    uploadedImageUrls.push(imageObj.url);
                }
                // If it's an object without blob and not a string URL, it's an issue.
            }

            const dataToSubmit = {
                email: email,
                plano: this.state.formData.selectedPlan,
                conteudo: {
                    cardName: this.state.formData.cardName,
                    cardTitle: this.state.formData.cardTitle,
                    cardMessage: this.state.formData.cardMessage,
                    finalMessage: this.state.formData.finalMessage || '',
                    bibleVerse: this.state.formData.bibleVerse,
                    images: uploadedImageUrls,
                    musicLink: this.state.formData.musicLink || '',
                    userName: document.getElementById('userName')?.value || '',
                    userPhone: document.getElementById('userPhone')?.value || ''
                }
            };            // Ensure API config is loaded
            if (!this.apiConfig) {
                const { API_CONFIG } = await import('./core/api-config.js');
                this.apiConfig = API_CONFIG;
            }
            
            const response = await fetch(this.apiConfig.cards.create, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            let responseData;
            try {
                const responseText = await response.text();
                console.log('Raw response text:', responseText.substring(0, 200));
                
                if (!responseText.trim()) {
                    throw new Error('Resposta vazia do servidor');
                }
                
                responseData = JSON.parse(responseText);
                console.log('Parsed response data:', responseData);
            } catch (jsonError) {
                console.error('Erro ao processar resposta JSON:', jsonError);
                throw new Error('Resposta do servidor não é um JSON válido');
            }

            if (!response.ok) {
                throw new Error(responseData.message || 'Erro ao criar cartão no servidor');
            }
            
            // Tratar tanto o formato antigo (success: true) quanto o novo (status: 'success')
            const isSuccess = responseData.success === true || responseData.status === 'success';
            if (!isSuccess) {
                throw new Error(responseData.message || 'Erro ao criar cartão no servidor');
            }
              // Clear localStorage after successful submission
            this.clearLocalStorage();
            
            // Stop auto-save since form is successfully submitted
            this.stopAutoSave();
            
            // Retornar os dados no formato esperado
            return { success: true, data: responseData.data || responseData };

        } catch (error) {        console.error('Erro ao enviar dados do formulário:', error);
            return { success: false, message: error.message };
        }
    }

    getCorrespondingFormSection(sectionId) { // Used for highlighting
        const mapping = {
            'titleSection': 'cardTitle', 'messageSection': 'cardMessage',
            'verseSection': 'bibleBook', 'gallerySection': 'imageUpload',
            'mediaSection': 'musicLink', 'finalSection': 'cardFinalMessage' // Added final section
        };
        const elementId = mapping[sectionId];
        return elementId ? document.getElementById(elementId) : null;
    }

    highlightFormSection(element) {
        document.querySelectorAll('.highlight-pulse').forEach(el => el.classList.remove('highlight-pulse'));
        if (element) {
            element.classList.add('highlight-pulse');
            if (!this.isElementInViewport(element)) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    isElementInViewport(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    saveToLocalStorage() {
        try {
            // Criar versão serializável dos dados do formulário
            const serializableFormData = { ...this.state.formData };
            
            // Para imagens, salvar apenas metadados (não blobs)
            serializableFormData.images = this.state.formData.images.map((img, index) => {
                if (typeof img === 'string') return { type: 'url', url: img, index };
                if (img.url && !img.isTemp) return { type: 'url', url: img.url, index };
                if (img.isTemp && img.fileName) {
                    // Para imagens temporárias, salvar apenas metadados
                    return { 
                        type: 'temp', 
                        fileName: img.fileName, 
                        index,
                        // Não salvar o blob - será necessário fazer upload novamente
                        needsReupload: true
                    };
                }
                return null;
            }).filter(img => img !== null);

            // Salvar dados e timestamp
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                formData: serializableFormData,
                currentStep: this.state.currentStep,
                currentImageIndex: this.state.currentImageIndex
            }));
            localStorage.setItem(this.STORAGE_TIMESTAMP_KEY, Date.now().toString());
            
            console.log('Dados salvos automaticamente no localStorage');
        } catch (e) {
            console.error("Erro ao salvar no localStorage:", e);
        }
    }

    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            const timestamp = localStorage.getItem(this.STORAGE_TIMESTAMP_KEY);
            
            if (!savedData || !timestamp) return;

            // Verificar se os dados não são muito antigos (7 dias)
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - parseInt(timestamp) > sevenDaysInMs) {
                this.clearLocalStorage();
                return;
            }

            const parsed = JSON.parse(savedData);
            
            // Restaurar dados do formulário
            if (parsed.formData) {
                this.state.formData = { ...this.state.formData, ...parsed.formData };
                
                // Restaurar imagens (apenas URLs válidas)
                if (parsed.formData.images) {
                    this.state.formData.images = parsed.formData.images.filter(img => 
                        img.type === 'url' && img.url
                    );
                }
            }
            
            // Restaurar estado - SEMPRE voltar para o primeiro passo ao recarregar a página
            // mas manter os dados salvos
            this.state.currentStep = 0; // Sempre começar do primeiro passo
            
            if (typeof parsed.currentImageIndex === 'number') {
                this.state.currentImageIndex = parsed.currentImageIndex;
            }
            
            console.log('Dados carregados do localStorage - usuário redirecionado para o primeiro passo');
            
            // Agendar restauração dos campos do formulário após o DOM estar pronto
            setTimeout(() => this.restoreFormFields(), 100);
            
        } catch (e) {
            console.error("Erro ao carregar do localStorage:", e);
            this.clearLocalStorage();
        }
    }

    restoreFormFields() {
        try {
            const data = this.state.formData;
            
            // Verificar se há dados para restaurar
            const hasDataToRestore = data.cardName || data.cardTitle || data.cardMessage || 
                                   data.finalMessage || data.musicLink || data.bibleVerse?.book ||
                                   data.images?.length > 0 || data.theme !== 'stars' || data.selectedPlan;
            
            // Restaurar campos de texto
            const fieldMappings = {
                'cardName': data.cardName,
                'cardTitle': data.cardTitle,
                'cardMessage': data.cardMessage,
                'cardFinalMessage': data.finalMessage,
                'musicLink': data.musicLink,
                'bibleBook': data.bibleVerse?.book,
                'bibleChapter': data.bibleVerse?.chapter,
                'bibleVerse': data.bibleVerse?.verse
            };

            Object.entries(fieldMappings).forEach(([fieldId, value]) => {
                const field = document.getElementById(fieldId);
                if (field && value) {
                    field.value = value;
                    // Disparar evento de input para atualizar contadores
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            // Restaurar tema selecionado
            if (data.theme) {
                this.selectTheme(data.theme);
            }

            // Restaurar plano selecionado
            if (data.selectedPlan) {
                const planButton = document.querySelector(`.btn-select-plan[data-plan="${data.selectedPlan}"]`);
                if (planButton) {
                    planButton.classList.add('selected');
                }
            }

            // Atualizar preview
            this.updatePreview();
            
            // Mostrar notificação amigável se há dados restaurados
            if (hasDataToRestore) {
                this.showRestoreNotification();
            }
            
            console.log('Campos do formulário restaurados');
        } catch (e) {
            console.error("Erro ao restaurar campos do formulário:", e);
        }
    }

    showRestoreNotification() {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = 'restore-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-info-circle"></i>
                <span>Seus dados foram restaurados! Continue de onde parou.</span>
                <button class="notification-close" aria-label="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Estilos inline para a notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 350px;
            font-family: 'Poppins', sans-serif;
        `;

        // Estilos para o conteúdo
        const content = notification.querySelector('.notification-content');
        content.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        // Estilos para o botão de fechar
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
            margin-left: auto;
        `;

        // Adicionar ao body
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Função para remover notificação
        const removeNotification = () => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        // Event listener para o botão de fechar
        closeBtn.addEventListener('click', removeNotification);

        // Hover effect no botão de fechar
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
        });

        // Remover automaticamente após 5 segundos
        setTimeout(removeNotification, 5000);
    }

    clearLocalStorage() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.STORAGE_TIMESTAMP_KEY);
            console.log('Dados do localStorage limpos');
        } catch (e) {
            console.error("Erro ao limpar localStorage:", e);
        }
    }

    startAutoSave() {
        // Salvar a cada 3 segundos
        this.autoSaveInterval = setInterval(() => {
            this.saveToLocalStorage();
        }, 3000);
        
        console.log('Salvamento automático iniciado');
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('Salvamento automático interrompido');
        }
    }
    // validateAllSteps() was removed
    // loadFromLocalStorage() was removed
} // End of DevotlyCreator class

window.addEventListener('load', () => {
    window.devotlyCreator = new DevotlyCreator(); // Make instance globally accessible if needed by PreviewModal
});

class PreviewModal {
    constructor() {
        this.modal = document.getElementById('previewModal');
        if (!this.modal) {
            console.error("Preview modal element not found!");
            return;
        }
        this.modalBody = this.modal.querySelector('.preview-modal-body');
        this.openButton = document.getElementById('previewButton'); // The big preview button
        this.closeButton = document.getElementById('closePreviewButton'); // Button inside the modal to close it

        // The actual preview content that will be moved
        // This should be the '.preview-sections' container if that's the new full preview
        this.previewContentContainer = document.querySelector('.preview-sections');
        this.originalParent = this.previewContentContainer?.parentNode; // Store original parent

        // Variáveis de controle de scroll
        this.scrollPosition = 0;
        this.touchStartY = 0;
        this.isModalActive = false;

        if (!this.modalBody || !this.openButton || !this.closeButton || !this.previewContentContainer) {
            console.error("One or more PreviewModal critical elements are missing:",
                {
                    modalBody: !!this.modalBody, openButton: !!this.openButton,
                    closeButton: !!this.closeButton, previewContent: !!this.previewContentContainer
                });
            return;
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.openButton.addEventListener('click', () => this.openModal());
        this.closeButton.addEventListener('click', () => this.closeModal());
        document.addEventListener('keydown', (e) => {
            if ( e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }    openModal() {
        if (window.devotlyCreator && typeof window.devotlyCreator.updatePreview === 'function') {
            window.devotlyCreator.updatePreview(); // Ensure preview is up-to-date
        }

        if (this.previewContentContainer && this.modalBody) {
            this.modalBody.appendChild(this.previewContentContainer); // Move preview into modal
            this.previewContentContainer.style.display = 'block'; // Ensure it's visible
            // Garantir que não haja scroll vertical livre no modal
            this.previewContentContainer.style.overflow = 'hidden';
            this.previewContentContainer.style.height = '100%';
            // Aplicar touch-action para prevenir gestos nativos
            this.previewContentContainer.style.touchAction = 'none';
        }

        // Prevenir scroll do body de forma mais robusta
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        
        // Salvar posição atual do scroll
        this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        document.body.style.top = `-${this.scrollPosition}px`;
        
        this.modal.classList.add('active');

        // Adicionar event listeners para prevenir scroll touch
        this.addScrollPrevention();        // Inicializar navegador vertical se ainda não existir
        setTimeout(() => {
            if (!window.previewNavigator) {
                restructurePreviewSections();
                window.previewNavigator = new HorizontalPreviewNavigator();
            }
            
            // Garantir que a primeira seção esteja ativa
            const sections = document.querySelectorAll('.preview-section');
            if (sections.length > 0) {
                // Remover active de todas as seções
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                // Ativar apenas a primeira seção
                sections[0].classList.add('active');
                
                // Log para debug
                console.log('Modal opened - First section activated:', sections[0].id);
            }
        }, 100);
    }    closeModal() {
        this.modal.classList.remove('active');
        
        // Restaurar scroll do body de forma completa
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
        document.documentElement.style.overflow = '';
        
        // Restaurar posição do scroll
        if (this.scrollPosition) {
            window.scrollTo(0, this.scrollPosition);
        }

        // Remover event listeners de prevenção de scroll
        this.removeScrollPrevention();        // Move preview content back to its original place if it was moved
        if (this.previewContentContainer && this.originalParent && !this.originalParent.contains(this.previewContentContainer)) {
            this.originalParent.appendChild(this.previewContentContainer);
            this.previewContentContainer.style.height = ''; // Reset height or to original
            this.previewContentContainer.style.overflow = ''; // Reset overflow
            this.previewContentContainer.style.touchAction = ''; // Reset touch-action
            // this.previewContentContainer.style.display = 'block'; // Or original display style
        }
        // If the preview was inside .card-preview-container and that was hidden:
        // const oldPreviewContainer = document.querySelector('.card-preview-container');
        // if (oldPreviewContainer) oldPreviewContainer.style.display = 'none'; // Hide if it's the old sticky preview
        
        this.isModalActive = false;
    }

    // Método para adicionar prevenção de scroll nativo
    addScrollPrevention() {
        this.isModalActive = true;
        
        // Prevenir scroll em eventos de touch
        this.preventTouchMove = (e) => {
            if (this.isModalActive) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Prevenir scroll em eventos de wheel
        this.preventWheel = (e) => {
            if (this.isModalActive) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Prevenir scroll com teclas
        this.preventKeyScroll = (e) => {
            if (this.isModalActive) {
                const keys = [32, 33, 34, 35, 36, 37, 38, 39, 40]; // space, page up/down, end, home, arrows
                if (keys.includes(e.keyCode)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        // Adicionar event listeners
        document.addEventListener('touchmove', this.preventTouchMove, { passive: false });
        document.addEventListener('wheel', this.preventWheel, { passive: false });
        document.addEventListener('keydown', this.preventKeyScroll, { passive: false });
        
        // Prevenir gestos iOS específicos
        document.addEventListener('gesturestart', this.preventTouchMove, { passive: false });
        document.addEventListener('gesturechange', this.preventTouchMove, { passive: false });
        document.addEventListener('gestureend', this.preventTouchMove, { passive: false });
    }

    // Método para remover prevenção de scroll nativo
    removeScrollPrevention() {
        this.isModalActive = false;
        
        // Remover event listeners se existirem
        if (this.preventTouchMove) {
            document.removeEventListener('touchmove', this.preventTouchMove);
            document.removeEventListener('gesturestart', this.preventTouchMove);
            document.removeEventListener('gesturechange', this.preventTouchMove);
            document.removeEventListener('gestureend', this.preventTouchMove);
        }
        
        if (this.preventWheel) {
            document.removeEventListener('wheel', this.preventWheel);
        }
        
        if (this.preventKeyScroll) {
            document.removeEventListener('keydown', this.preventKeyScroll);
        }
    }
}

// Initialize PreviewModal after DOM is ready (DevotlyCreator also initializes it)
// This might lead to double instantiation if not careful.
// The DevotlyCreator constructor already does `this.previewModal = new PreviewModal();`
// So this standalone instantiation might be redundant or for a different purpose.
// For now, I'll keep it as it was in the original structure, but it's worth reviewing.
document.addEventListener('DOMContentLoaded', () => {
    if (!window.devotlyCreator?.previewModal) { // Instantiate only if not already done by DevotlyCreator
        new PreviewModal();
    }
});

// Styling for .btn-preview (this was likely for the old preview button, may not be needed)
document.addEventListener('DOMContentLoaded', () => {
    const previewButton = document.querySelector('.btn-preview'); // This is the main preview button
    if (previewButton) {
    }
});

// Adicionar ao final do arquivo create.js
document.addEventListener('DOMContentLoaded', function() {
    // Garantir que o navegador horizontal seja inicializado quando o modal de preview for aberto

   

    const previewButton = document.getElementById('previewButton');
    if (previewButton) {
        previewButton.addEventListener('click', function() {
            setTimeout(() => {
                if (!window.previewNavigator) {
                    restructurePreviewSections();
                    window.previewNavigator = new HorizontalPreviewNavigator();
                }
            }, 100);
        });
    }
});

// Horizontal Preview Navigator Class
class HorizontalPreviewNavigator {
    constructor() {
        this.carousel = document.querySelector('.preview-carousel');
       
        this.sections = Array.from(document.querySelectorAll('.preview-section'));
        this.indicators = Array.from(document.querySelectorAll('.h-indicator'));
        this.verticalDots = Array.from(document.querySelectorAll('.section-dot'));
        this.prevButton = document.querySelector('.preview-nav-prev');
        this.nextButton = document.querySelector('.preview-nav-next');
        
        this.currentIndex = 0;
        this.totalSections = this.sections.length;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        // Inicializar posição
        this.goToSection(0, false);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Touch Events
        this.carousel.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        this.carousel.addEventListener('touchend', (e) => {
            if (this.isAnimating) return;
            
            this.touchEndX = e.changedTouches[0].clientX;
            const diff = this.touchStartX - this.touchEndX;
            
            if (Math.abs(diff) > this.minSwipeDistance) {
                if (diff > 0) {
                    this.nextSection();
                } else {
                    this.prevSection();
                }
            }
        }, { passive: true });
        
        // Button Navigation
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.prevSection());
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextSection());
        }
        
        // Indicator Navigation
        if (this.indicators && this.indicators.length) {
            this.indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => this.goToSection(index));
            });
        }
        
        // Vertical Dots (sync with horizontal)
        if (this.verticalDots && this.verticalDots.length) {
            this.verticalDots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.goToSection(index));
            });
        }
        
        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            if (e.key === 'ArrowRight') {
                this.nextSection();
            } else if (e.key === 'ArrowLeft') {
                this.prevSection();
            }
        });
    }
    
    goToSection(index, animate = true) {
        if (index < 0 || index >= this.totalSections || this.isAnimating) return;
        
        this.isAnimating = animate;
        this.currentIndex = index;
        
        // Atualizar seções - mostrar apenas a seção atual
        this.sections.forEach((section, i) => {
            section.classList.toggle('active', i === index);
        });
        
        // Atualizar indicadores
        if (this.indicators && this.indicators.length) {
            this.indicators.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
        
        // Sincronizar com indicadores verticais
        if (this.verticalDots && this.verticalDots.length) {
            this.verticalDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
        
        // Aplicar efeito de fundo
        const sectionId = this.sections[index]?.id;
        if (window.devotlyCreator && sectionId) {
            window.devotlyCreator.applyBackgroundEffect(sectionId);
        }
        
        // Reset do flag de animação
        if (animate) {
            setTimeout(() => {
                this.isAnimating = false;
            }, 500);
        } else {
            this.isAnimating = false;
        }
    }
    
    nextSection() {
        if (this.currentIndex < this.totalSections - 1) {
            this.goToSection(this.currentIndex + 1);
        }
    }
    
    prevSection() {
        if (this.currentIndex > 0) {
            this.goToSection(this.currentIndex - 1);
        }
    }
}

/**
 * VerticalPreviewNavigator - Controla navegação vertical das seções do preview
 * @class
 */
class VerticalPreviewNavigator {
    constructor() {
        // Elementos
        this.previewContainer = document.querySelector('.preview-sections');
        this.sections = Array.from(document.querySelectorAll('.preview-section'));
        this.indicators = []; // Será preenchido após criar os indicadores
        
        // Estado
        this.currentIndex = 0;
        this.isAnimating = false;
        this.touchStartY = 0;
        this.minSwipeDistance = 50;
        
        // Inicialização
        this.createIndicators();
        this.setupEventListeners();
        this.goToSection(0, false);
    }
    
    createIndicators() {
        // Criar indicadores verticais se não existirem
        if (!document.querySelector('.vertical-section-indicators')) {
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'vertical-section-indicators';
            
            this.sections.forEach((_, index) => {
                const indicator = document.createElement('div');
                indicator.className = 'v-indicator' + (index === 0 ? ' active' : '');
                indicator.dataset.index = index;
                indicatorsContainer.appendChild(indicator);
            });
            
            if (this.previewContainer) {
                this.previewContainer.appendChild(indicatorsContainer);
            }
        }
        
        // Obter referências para os indicadores
        this.indicators = Array.from(document.querySelectorAll('.v-indicator'));
    }
    
    setupEventListeners() {
        if (!this.previewContainer) return;
        
        // 1. Eventos de toque (swipe vertical)
        this.previewContainer.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        this.previewContainer.addEventListener('touchend', (e) => {
            if (this.isAnimating) return;
            
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = this.touchStartY - touchEndY;
            
            if (Math.abs(deltaY) > this.minSwipeDistance) {
                if (deltaY > 0) {
                    this.nextSection();
                } else {
                    this.prevSection();
                }
            }
        }, { passive: true });
        
        // 2. Eventos de roda do mouse
        this.previewContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (this.isAnimating) return;
            
            // Debounce para evitar múltiplos eventos
            if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
            
            this.wheelTimeout = setTimeout(() => {
                const direction = e.deltaY > 0 ? 1 : -1;
                
                if (direction > 0) {
                    this.nextSection();
                } else {
                    this.prevSection();
                }
            }, 50);
        }, { passive: false });
        
        // 3. Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextSection();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevSection();
            }
        });
        
        // 4. Clique nos indicadores
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSection(index));
        });
    }
    
    goToSection(index, animate = true) {
        if (index < 0 || index >= this.sections.length || this.isAnimating) return;
        
        this.isAnimating = animate;
        
        // Remover classe 'active' de todas as seções e indicadores
        this.sections.forEach(section => section.classList.remove('active'));
        this.indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Adicionar classe 'active' à seção atual e indicador
        this.sections[index].classList.add('active');
        this.indicators[index].classList.add('active');
        
        // Atualizar background se necessário
        if (window.devotlyCreator) {
            const sectionId = this.sections[index].id;
            if (sectionId) {
                window.devotlyCreator.applyBackgroundEffect(sectionId);
            }
        }
        
        this.currentIndex = index;
        
        // Reset do flag de animação após a transição
        if (animate) {
            setTimeout(() => {
                this.isAnimating = false;
            }, 400);
        } else {
            this.isAnimating = false;
        }
    }
    
    nextSection() {
        if (this.currentIndex < this.sections.length - 1) {
            this.goToSection(this.currentIndex + 1);
        }
    }
    
    prevSection() {
        if (this.currentIndex > 0) {
            this.goToSection(this.currentIndex - 1);
        }
    }
}