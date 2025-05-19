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

// main.js
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

        // Add preview modal instance
        this.previewModal = new PreviewModal(); // PreviewModal class is defined later
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
            progressBar: document.querySelector('.progress'), // Used by this.updateProgress()
            stepIndicators: document.querySelectorAll('.step'), // Used by this.updateProgress()
            cardPreview: document.querySelector('.card-preview-container'), // Used by PreviewModal
            loadingModal: document.getElementById('loadingModal'),
            successModal: document.getElementById('successModal'),
            viewCardBtn: document.getElementById('viewCardBtn'),
            copyCardLinkBtn: document.getElementById('copyCardLinkBtn'),
            previewImages: document.getElementById('previewImages'), // Refers to the old preview structure, might be unused
            previewMedia: document.getElementById('previewMedia'), // Refers to the old preview structure, might be unused
            imageUpload: document.getElementById('imageUpload'),
            previewTheme: document.getElementById('previewTheme'), // Used by applyBackgroundEffect
            finalMessageInput: document.getElementById('cardFinalMessage'),
            finalMessageCounter: document.getElementById('finalMessageCounter'),
            finalMessagePreview: document.querySelector('.final-message p') // Used in init and setupEventListeners
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

        // Remover inicialização duplicada
        // this.state.formData.finalMessage = ''; // Already initialized above

        // Inicializar elementos uma única vez (alguns já em this.elements)
        this.finalMessageInput = document.getElementById('cardFinalMessage');
        this.finalMessageCounter = document.getElementById('finalMessageCounter');
        this.finalMessagePreview = document.querySelector('.final-message p');

        this.init(); // Called again, was also in initialize()
        this.setupMessageHandlers();
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
        }, 500);

        // Definir manualmente a seção ativa no carregamento da página
        document.querySelector('.section-dot[data-section="titleSection"]')?.classList.add('active');
        document.querySelector('.preview-section#titleSection')?.classList.add('active');

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
             if(this.elements.finalMessageCounter) this.elements.finalMessageCounter.textContent = this.state.formData.finalMessage.length;
             this.updateFinalMessagePreview(); // Ensure this method exists or is defined
        }
    }

    updateFinalMessagePreview() {
        if (this.elements.finalMessagePreview && this.state.formData.finalMessage !== undefined) {
            this.elements.finalMessagePreview.textContent = this.state.formData.finalMessage || "Que esta mensagem toque seu coração";
        } else if (this.elements.finalMessagePreview) {
            this.elements.finalMessagePreview.textContent = "Que esta mensagem toque seu coração";
        }
    }


    setupSectionObserver() {
        const previewSectionsContainer = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSectionsContainer || !sections.length) return;
        
        // Disconnect previous observer if it exists to prevent multiple observers
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
        }

        const observerOptions = {
            root: previewSectionsContainer,
            threshold: 0.3, 
            rootMargin: '0px' 
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Seção visível:', entry.target.id); 
                    
                    document.querySelectorAll('.section-dot').forEach(dot => {
                        dot.classList.toggle('active', dot.dataset.section === entry.target.id);
                    });
                    
                    // Apply visual effect for the active section background
                    this.applyBackgroundEffect(entry.target.id);

                    // Update active class on preview sections for CSS transitions
                    sections.forEach(sec => sec.classList.remove('active', 'data-entering', 'data-exiting'));
                    entry.target.classList.add('active');
                    entry.target.setAttribute('data-entering', '');
                    setTimeout(() => entry.target.removeAttribute('data-entering'), 800);


                } else {
                    // Handle exiting elements if needed for transitions
                     entry.target.classList.remove('active'); // Ensure non-intersecting are not active
                     // entry.target.setAttribute('data-exiting', '');
                     // setTimeout(() => entry.target.removeAttribute('data-exiting'), 600);
                }
            });
        };

        this.sectionObserver = new IntersectionObserver(observerCallback, observerOptions);

        sections.forEach(section => {
            this.sectionObserver.observe(section);
            console.log('Observando seção:', section.id); 
        });

        setTimeout(() => {
            previewSectionsContainer.scrollBy(0, 1);
            previewSectionsContainer.scrollBy(0, -1);
        }, 100);
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

        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            // No need to clone for these as they don't call instance methods directly that might change
            uploadArea.addEventListener('click', () => this.elements.imageUpload?.click());
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
                if (e.dataTransfer.files.length && this.elements.imageUpload) {
                    this.elements.imageUpload.files = e.dataTransfer.files;
                    this.handleImageUpload();
                }
            });
        }

        if (this.elements.imageUpload) {
            // Remove todos os listeners anteriores
            const newImageUpload = this.elements.imageUpload.cloneNode(true);
            this.elements.imageUpload.parentNode.replaceChild(newImageUpload, this.elements.imageUpload);
            this.elements.imageUpload = newImageUpload;
            
            // Adiciona um único listener
            this.elements.imageUpload.addEventListener('change', (e) => {
                e.preventDefault();
                this.handleImageUpload();
            }, { once: true }); // Garante que o evento só será disparado uma vez
        }

        const fetchVerseButton = document.getElementById('fetchVerse');
        if (fetchVerseButton) {
            const newFetchVerseButton = fetchVerseButton.cloneNode(true);
            fetchVerseButton.parentNode.replaceChild(newFetchVerseButton, fetchVerseButton);
            newFetchVerseButton.addEventListener('click', (e) => {
                e.preventDefault();
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
            const newButton = button.cloneNode(true); // Clone if selectPlan might change
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', (e) => {
                this.selectPlan(e.target.dataset.plan);
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
                    if(this.elements.copyCardLinkBtn) this.elements.copyCardLinkBtn.innerHTML = originalText;
                }, 2000);
            });
        }

        document.querySelectorAll('.suggestion-item').forEach(button => {
            button.addEventListener('click', () => {
                const musicUrl = button.dataset.url;
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
        });


        const userPhoneInput = document.getElementById('userPhone');
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
            });
        }
        
        // Centralized input handlers
        const inputHandlers = {
            'cardName': (e) => { /* Already handled above with cloning, this is a duplicate setup */ },
            'cardTitle': (e) => {
                const text = e.target.value;
                const titleCounterElem = document.getElementById('titleCounter');
                if (titleCounterElem) titleCounterElem.textContent = text.length;
                const previewCardTitleElem = document.getElementById('previewCardTitle');
                if (previewCardTitleElem) previewCardTitleElem.textContent = text || "Mensagem de Fé para Você";
                this.state.formData.cardTitle = text;
            },
            'cardMessage': (e) => {
                const text = e.target.value;
                const messageCounterElem = document.getElementById('messageCounter');
                if (messageCounterElem) messageCounterElem.textContent = text.length;
                const previewCardMessageElem = document.getElementById('previewCardMessage');
                if (previewCardMessageElem) previewCardMessageElem.textContent = text || "Sua mensagem aparecerá aqui...";
                this.state.formData.cardMessage = text;
            },
            'cardFinalMessage': (e) => { // This is also handled by setupMessageHandlers, potential duplicate
                const text = e.target.value;
                const finalMessageCounterElem = document.getElementById('finalMessageCounter');
                if (finalMessageCounterElem) finalMessageCounterElem.textContent = text.length;
                const finalMessagePreviewElem = document.querySelector('#finalSection .final-message'); // More specific selector for preview
                if (finalMessagePreviewElem) { // Check if the element exists
                     const pElement = finalMessagePreviewElem.querySelector('p') || finalMessagePreviewElem; // Handle if p is direct child or the element itself
                     pElement.textContent = text || "Que esta mensagem toque seu coração";
                }
                this.state.formData.finalMessage = text;
            }
        };

        Object.keys(inputHandlers).forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                // Avoid re-adding listener if already handled by a more specific setup (e.g., cardName, cardFinalMessage)
                if (inputId === 'cardName' || inputId === 'cardFinalMessage') return;

                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                newElement.addEventListener('input', inputHandlers[inputId]);
            }
        });
    }


    setupSectionDotListeners() {
        document.querySelectorAll('.section-dot').forEach(indicator => {
            // Clone to remove old listeners if any, though these are dynamically added
            const newIndicator = indicator.cloneNode(true);
            indicator.parentNode.replaceChild(newIndicator, indicator);

            newIndicator.addEventListener('click', () => {
                const targetSectionId = newIndicator.dataset.section;
                const targetSection = document.getElementById(targetSectionId);
                const previewSectionsContainer = document.querySelector('.preview-sections');
                
                if (targetSection && previewSectionsContainer) {
                    previewSectionsContainer.scrollTo({
                        top: targetSection.offsetTop,
                        behavior: 'auto' 
                    });
                    
                    // Manually update active dot for immediate feedback
                    document.querySelectorAll('.section-dot').forEach(dot => dot.classList.remove('active'));
                    newIndicator.classList.add('active');

                    // Manually update active section for CSS transitions
                    document.querySelectorAll('.preview-section').forEach(sec => sec.classList.remove('active'));
                    targetSection.classList.add('active');
                    this.applyBackgroundEffect(targetSectionId); // Apply background for clicked section
                }
            });
        });
    }

    handleNextStep() {
        if (this.validateStep(this.state.currentStep)) {
            if (this.state.currentStep < this.state.totalSteps -1 ) { // Prevent going beyond last step
                this.state.currentStep++;
                this.updateStepUI();
            }
        }
    }

    // nextStep() was effectively merged into handleNextStep or updateStepUI

    prevStep() {
        if (this.state.currentStep > 0) { // Prevent going before first step
            this.state.currentStep--;
            this.updateStepUI();
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
                break;
            case 6: // Step 7: Contact Info
                const emailInput = currentStepElement.querySelector('#userEmail');
                const phoneInput = currentStepElement.querySelector('#userPhone');
                if (!emailInput?.value.trim()) {
                    this.showError(emailInput, 'Por favor, insira seu email');
                    isValid = false;
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) { // Basic email regex
                    this.showError(emailInput, 'Por favor, insira um email válido');
                    isValid = false;
                }
                if (!phoneInput?.value.trim()) {
                    this.showError(phoneInput, 'Por favor, insira seu telefone');
                    isValid = false;
                } else if (phoneInput.value.replace(/\D/g, '').length < 10) {
                    this.showError(phoneInput, 'Por favor, insira um telefone válido');
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

    isValidMusicLink(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(\S*)?$/;
        const spotifyRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]{22}(\S*)?$/;
        return youtubeRegex.test(url) || spotifyRegex.test(url);
    }

    showError(inputElement, message) {
        if (!inputElement) return;
        const parent = inputElement.parentNode;
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

        parent.appendChild(errorElement);
        inputElement.focus();

        setTimeout(() => { errorElement.style.opacity = '1'; }, 10);
        setTimeout(() => {
            errorElement.style.opacity = '0';
            setTimeout(() => errorElement.remove(), 300);
        }, 5000);
    }
    
    async convertToWebP(file) { // Simplified as per original logic
        return new Promise((resolve, reject) => {
            if (window.Worker && !this.isLowEndDevice) {
                try {
                    const blobURL = URL.createObjectURL(file);
                    resolve(blobURL); // Using object URL directly
                    return;
                } catch (err) {
                    console.warn('Web Worker or Object URL creation failed, using FileReader:', err);
                }
            }
            // Fallback for low-end or if worker fails
            const reader = new FileReader();
            reader.onload = () => resolve(file); // Resolve with the original file (as Blob)
            reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
            reader.readAsDataURL(file); // This is actually not needed if we resolve with 'file'
        });
    }


    async handleImageUpload() {
        if (!this.elements.imageUpload || !this.elements.imageUpload.files.length) return;
        
        // Previne múltiplos uploads do mesmo conjunto de arquivos
        const files = Array.from(this.elements.imageUpload.files);
        this.elements.imageUpload.value = ''; // Limpa o input após pegar os arquivos
        
        if (this.state.formData.images.length + files.length > 7) {
            alert('Você pode adicionar no máximo 7 imagens.'); // Consider using a custom modal/toast
            return;
        }

        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.classList.add('loading');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 2 * 1024 * 1024) { // 2MB limit
                    alert(`A imagem ${file.name} excede o limite de 2MB.`);
                    continue;
                }
                
                const tempUrl = URL.createObjectURL(file); // Use object URL for immediate preview
                const fileName = `${Date.now()}-${i}.${file.name.split('.').pop() || 'webp'}`; // Keep original extension or default to webp
                
                this.state.formData.images.push({
                    tempUrl, 
                    blob: file, 
                    fileName, 
                    isTemp: true // Mark as temporary, needs upload
                });
                
                this.addImagePreview(tempUrl, this.state.formData.images.length - 1);
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
            }
            
            this.reindexImages(); // Re-index data attributes on remove buttons
            this.updatePreview(); // Update the main preview sections
            
            // setupAutoGallery was removed, if gallery needs auto-play, it needs new logic.
            // For now, manual navigation will work if controls are present.

        } catch (error) {
            console.error('Erro ao processar imagens:', error);
            alert('Ocorreu um erro ao processar as imagens.');
        } finally {
            if (uploadArea) uploadArea.classList.remove('loading');
            if (this.elements.imageUpload) this.elements.imageUpload.value = ''; // Reset file input
        }
    }

    addImagePreview(url, index) {
        const container = document.getElementById('imagePreviewContainer');
        if (!container) return;
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        previewDiv.innerHTML = `
            <img src="${url}" alt="Imagem ${index + 1}">
            <button class="remove-image" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(previewDiv);
        
        const removeButton = previewDiv.querySelector('.remove-image');
        removeButton.addEventListener('click', () => {
            this.removeImage(parseInt(removeButton.dataset.index));
        });
    }

    reindexImages() { // This re-indexes the remove buttons in the form preview
        const previews = document.querySelectorAll('#imagePreviewContainer .image-preview .remove-image');
        previews.forEach((button, index) => {
            button.dataset.index = index;
        });
    }

    // updateCarouselControls() was removed as it was tied to the old preview structure.
    // New gallery in updateGalleryPreview handles its own controls.

    loadBibleBooks() {
        const books = [ /* Same book list */ 
            { value: 'genesis', text: 'Gênesis' }, { value: 'exodus', text: 'Êxodo' },
            { value: 'psalms', text: 'Salmos' }, { value: 'proverbs', text: 'Provérbios' },
            { value: 'isaiah', text: 'Isaías' }, { value: 'matthew', text: 'Mateus' },
            { value: 'john', text: 'João' }, { value: 'romans', text: 'Romanos' }
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

        if (!bookSelect?.value || !chapterInput?.value || !verseInput?.value) {
            this.showError(bookSelect || chapterInput || verseInput, 'Por favor, selecione um livro, capítulo e versículo');
            return;
        }

        try {
            const response = await this.simulateBibleApiCall(bookSelect.value, chapterInput.value, verseInput.value);
            if (response && response.text !== "Versículo não encontrado") {
                this.state.formData.bibleVerse = {
                    book: bookSelect.options[bookSelect.selectedIndex].text,
                    chapter: chapterInput.value,
                    verse: verseInput.value,
                    text: response.text,
                    reference: `${bookSelect.options[bookSelect.selectedIndex].text} ${chapterInput.value}:${verseInput.value}`
                };
                const verseTextElem = document.querySelector('.verse-preview .verse-text'); // Form preview
                if (verseTextElem) verseTextElem.textContent = `"${response.text}"`;
                const verseRefElem = document.querySelector('.verse-preview .verse-reference'); // Form preview
                if (verseRefElem) verseRefElem.textContent = this.state.formData.bibleVerse.reference;
                this.updatePreview(); // Update main preview
            } else {
                 this.showError(bookSelect, 'Versículo não encontrado. Verifique os dados.');
                 this.state.formData.bibleVerse = { book: '', chapter: '', verse: '', text: '', reference: '' }; // Clear verse
                 this.updatePreview();
            }
        } catch (error) {
            console.error('Erro ao buscar versículo:', error);
            this.showError(bookSelect, 'Não foi possível carregar o versículo. Tente novamente.');
        }
    }

    simulateBibleApiCall(book, chapter, verse) { // Same simulation
        return new Promise((resolve) => {
            setTimeout(() => {
                const verses = {
                    genesis: { 1: { 1: "No princípio, criou Deus os céus e a terra.", 2: "A terra era sem forma e vazia...", 3: "Disse Deus: Haja luz..." } },
                    exodus: { 14: { 14: "O SENHOR pelejará por vós, e vós vos calareis." }, 20: {12: "Honra teu pai e tua mãe..."}},
                    psalms: { 23: { 1: "O SENHOR é o meu pastor; nada me faltará.", 2: "Ele me faz repousar...", 3: "Refrigera-me a alma..." }, 91: {1: "Aquele que habita...", 2: "Direi do SENHOR..."}},
                    proverbs: { 3: { 5: "Confia no SENHOR de todo o teu coração...", 6: "Reconhece-o em todos os teus caminhos..."}},
                    isaiah: { 41: { 10: "Não temas, porque eu sou contigo..."}},
                    matthew: { 6: { 33: "Buscai, pois, em primeiro lugar, o seu reino..." }, 28: {20: "Ensinando-os a guardar todas as coisas..."}},
                    john: { 3: { 16: "Porque Deus amou o mundo de tal maneira..." }, 14: {6: "Respondeu Jesus: Eu sou o caminho...", 27: "Deixo-vos a paz..."}},
                    romans: { 8: { 28: "Sabemos que todas as coisas cooperam para o bem...", 31: "Que diremos, pois, à vista destas coisas?" }, 12: {12: "Alegrai-vos na esperança..."}}
                };
                const verseText = verses[book]?.[chapter]?.[verse];
                resolve({ text: verseText || "Versículo não encontrado" });
            }, 800);
        });
    }

    selectTheme(theme) {
        document.querySelectorAll('.theme-option').forEach(option => option.classList.remove('selected'));
        const selectedOption = document.querySelector(`.theme-option[data-theme="${theme}"]`);
        if (selectedOption) selectedOption.classList.add('selected');

        this.state.formData.theme = theme;
        if (window.applyPreviewTheme) window.applyPreviewTheme(theme); // Assuming global function for CSS effects
        this.updatePreview();
    }

    async selectPlan(plan) {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) loadingModal.style.display = 'flex';
        
        try {
            const planMapping = { 'forever': 'para_sempre', 'annual': 'anual' };
            const planoPtBr = planMapping[plan] || plan;
            this.state.formData.selectedPlan = planoPtBr;

            const cardCreationResponse = await this.submitFormData(); // This now handles image uploads internally
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

            const checkoutResponse = await fetch('http://localhost:3000/api/checkout/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutData)
            });

            if (!checkoutResponse.ok) {
                const errorData = await checkoutResponse.json().catch(() => ({error: 'Erro desconhecido no checkout'}));
                throw new Error(errorData.error || 'Erro ao criar preferência de checkout');
            }
            const mpData = await checkoutResponse.json();

            if (!mpData.success || !mpData.init_point) {
                throw new Error(mpData.error || 'Erro ao obter link de checkout do Mercado Pago');
            }
            console.log('Checkout criado, redirecionando:', mpData.init_point);
            window.location.href = mpData.init_point;

        } catch (error) {
            console.error('Erro no processo de seleção de plano:', error);
            if (loadingModal) loadingModal.style.display = 'none';
            alert(error.message || 'Erro ao processar pagamento. Tente novamente.'); // Use custom modal for errors
        }
    }

    navigateCarousel(direction) { // For the new preview gallery
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        if (!galleryContainer) return;
        const images = galleryContainer.querySelectorAll('img');
        const indicators = document.querySelectorAll('#gallerySection .gallery-indicator'); // Corrected selector for new indicators

        if (images.length <= 1) return;

        const currentImage = images[this.state.currentImageIndex];
        if (currentImage) {
            currentImage.classList.remove('active');
            currentImage.style.display = 'none'; // Or use opacity/transform for transitions
        }
        if (indicators.length > 0 && indicators[this.state.currentImageIndex]) {
             indicators[this.state.currentImageIndex].classList.remove('active');
        }


        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;

        const nextImage = images[this.state.currentImageIndex];
        if (nextImage) {
            nextImage.classList.add('active');
            nextImage.style.display = 'block'; // Or use opacity/transform
        }
         if (indicators.length > 0 && indicators[this.state.currentImageIndex]) {
            indicators[this.state.currentImageIndex].classList.add('active');
        }
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

    toggleMedia() { // This was for the old previewMedia, might be unused or need adapting
        const previewMediaContainer = this.elements.previewMedia; // Old preview element
        if (!previewMediaContainer) return;
        const iframe = previewMediaContainer.querySelector('iframe');
        if (!iframe) return;

        // this.state.isMediaPlaying was removed. Logic needs to be independent or use a different state.
        // For simplicity, let's assume we just try to send a command.
        // This will likely not work as expected without a state to track play/pause.
        const currentToggleIcon = document.querySelector('.media-toggle i');

        // Simplified: just try to play/pause without knowing current state
        let command = 'playVideo'; // Default to play
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
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1`; // Use https and standard embed

        const spotifyMatch = url.match(/spotify\.com\/(?:track|album|playlist)\/([\w]+)/);
        if (spotifyMatch) return `https://open.spotify.com/embed/${spotifyMatch[0].substring(spotifyMatch[0].indexOf('/') + 1)}?utm_source=generator`; // Use standard Spotify embed

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
        }

        // Update Verse Section
        const previewVerseTextElem = document.querySelector('#verseSection #previewVerseText');
        if (previewVerseTextElem) {
            previewVerseTextElem.textContent = this.state.formData.bibleVerse.text ? 
                                             `"${this.state.formData.bibleVerse.text}"` : 
                                             '"Porque Deus amou o mundo de tal maneira..."';
        }
        const previewVerseRefElem = document.querySelector('#verseSection #previewVerseRef');
        if (previewVerseRefElem) {
            previewVerseRefElem.textContent = this.state.formData.bibleVerse.reference || 'João 3:16';
        }

        // Update Gallery Section
        this.updateGalleryPreview(); // Dedicated method for gallery

        // Update Media Section (for the new .preview-section #mediaSection)
        const mediaSectionContainer = document.querySelector('#mediaSection .media-container');
        if (mediaSectionContainer) {
            const embedUrl = this.getEmbedUrl(this.state.formData.musicLink);
            if (embedUrl) {
                mediaSectionContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            } else {
                mediaSectionContainer.innerHTML = `
                    <div class="no-media" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color: var(--color-text-secondary); opacity: 0.7;">
                        <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <span>Nenhuma mídia selecionada</span>
                    </div>`;
            }
        }
        
        // Update Final Message Section
        const finalMessagePreviewElem = document.querySelector('#finalSection .final-message'); // Target the p inside if structure is .final-message > p
        if (finalMessagePreviewElem) {
             const pElem = finalMessagePreviewElem.querySelector('p') || finalMessagePreviewElem;
             pElem.innerHTML = this.sanitizeHTML(this.state.formData.finalMessage || "Que esta mensagem toque seu coração");
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
        galleryContainer.innerHTML = ''; // Clear previous images

        const indicatorsContainer = document.querySelector('#gallerySection .gallery-indicators');
        if (indicatorsContainer) indicatorsContainer.innerHTML = '';


        if (this.state.formData.images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="no-images" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color: var(--color-text-secondary); opacity: 0.7;">
                    <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <span>Nenhuma imagem selecionada</span>
                </div>`;
            return;
        }

        this.state.formData.images.forEach((imageObj, index) => {
            const img = document.createElement('img');
            img.src = imageObj.tempUrl || imageObj; // tempUrl for fresh uploads, direct URL if already processed/loaded
            img.alt = `Imagem ${index + 1}`;
            img.style.display = index === this.state.currentImageIndex ? 'block' : 'none'; // Manage visibility
            if (index === this.state.currentImageIndex) img.classList.add('active');
            galleryContainer.appendChild(img);

            if (indicatorsContainer && this.state.formData.images.length > 1) {
                const indicatorDot = document.createElement('div');
                indicatorDot.className = 'gallery-indicator';
                if (index === this.state.currentImageIndex) indicatorDot.classList.add('active');
                indicatorDot.addEventListener('click', () => this.goToImage(index));
                indicatorsContainer.appendChild(indicatorDot);
            }
        });
        
        // Add carousel controls if more than one image and not already present
        if (this.state.formData.images.length > 1 && !galleryContainer.querySelector('.carousel-controls')) {
            const controlsHTML = `
                <div class="carousel-controls">
                    <button class="carousel-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-next"><i class="fas fa-chevron-right"></i></button>
                </div>`;
            galleryContainer.insertAdjacentHTML('beforeend', controlsHTML);
            galleryContainer.querySelector('.carousel-prev').addEventListener('click', () => this.navigateCarousel(-1));
            galleryContainer.querySelector('.carousel-next').addEventListener('click', () => this.navigateCarousel(1));
        } else if (this.state.formData.images.length <= 1) {
            const controls = galleryContainer.querySelector('.carousel-controls');
            if (controls) controls.remove();
        }
    }
    
    goToImage(index) { // For indicator clicks
        const galleryContainer = document.querySelector('#gallerySection .gallery-container');
        if (!galleryContainer) return;
        const images = galleryContainer.querySelectorAll('img');
        const indicators = document.querySelectorAll('#gallerySection .gallery-indicator');

        if (images.length <= 1 || index < 0 || index >= images.length) return;

        if (images[this.state.currentImageIndex]) {
            images[this.state.currentImageIndex].classList.remove('active');
            images[this.state.currentImageIndex].style.display = 'none';
        }
        if (indicators.length > 0 && indicators[this.state.currentImageIndex]) {
            indicators[this.state.currentImageIndex].classList.remove('active');
        }

        this.state.currentImageIndex = index;

        if (images[this.state.currentImageIndex]) {
            images[this.state.currentImageIndex].classList.add('active');
            images[this.state.currentImageIndex].style.display = 'block';
        }
        if (indicators.length > 0 && indicators[this.state.currentImageIndex]) {
            indicators[this.state.currentImageIndex].classList.add('active');
        }
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
        
        this.reindexImages(); // Re-index data attributes on form remove buttons
        this.updatePreview(); // Update the main preview sections (which calls updateGalleryPreview)
    }

    // reindexFormImages() was removed

    copyToClipboard(text) {
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

                    const uploadResponse = await fetch('http://localhost:3000/api/upload-image', {
                        method: 'POST',
                        body: imageFormData
                    });
                    if (!uploadResponse.ok) {
                        const errorData = await uploadResponse.json().catch(()=>({message: 'Erro desconhecido no upload'}));
                        throw new Error(`Erro no upload da imagem ${imageObj.fileName}: ${errorData.message}`);
                    }
                    const uploadData = await uploadResponse.json();
                    uploadedImageUrls.push(uploadData.url); // Assuming server returns { url: '...' }
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
            };

            const response = await fetch('http://localhost:3000/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit)
            });
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Erro ao criar cartão no servidor');
            }
            return { success: true, data: responseData.data }; // Assuming server returns { success: true, data: { id: '...' } }

        } catch (error) {
            console.error('Erro ao enviar dados do formulário:', error);
            return { success: false, message: error.message };
        }
    }

    // updateImages() was removed
    // uploadAllImages() was removed (merged into submitFormData)

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
            // Create a serializable version of formData, especially for images
            const serializableFormData = { ...this.state.formData };
            // For images, only store URLs if they are not temporary blobs.
            // Blobs cannot be directly stringified. For draft saving, consider storing metadata or temp IDs.
            // For simplicity here, if images are complex objects with blobs, they won't be saved correctly.
            // A better approach would be to save image metadata or not save images in localStorage if they are blobs.
            // Or, if images are already URLs (after upload), then it's fine.
            serializableFormData.images = this.state.formData.images.map(img => {
                if (typeof img === 'string') return img; // It's already a URL
                if (img.url) return img.url; // It's an object with a URL (e.g., after upload)
                // If it's a temp blob, don't save it or save placeholder/metadata
                return null; // Or some placeholder
            }).filter(img => img !== null);


            localStorage.setItem('devotlyDraft', JSON.stringify(serializableFormData));
        } catch (e) {
            console.error("Error saving to localStorage:", e);
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

        if (!this.modalBody || !this.openButton || !this.closeButton || !this.previewContentContainer) {
            console.error("One or more PreviewModal critical elements are missing:", 
                          {modalBody: !!this.modalBody, openButton: !!this.openButton, 
                           closeButton: !!this.closeButton, previewContent: !!this.previewContentContainer});
            return;
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.openButton.addEventListener('click', () => this.openModal());
        this.closeButton.addEventListener('click', () => this.closeModal());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (window.devotlyCreator && typeof window.devotlyCreator.updatePreview === 'function') {
            window.devotlyCreator.updatePreview(); // Ensure preview is up-to-date
        }
        
        if (this.previewContentContainer && this.modalBody) {
            this.modalBody.appendChild(this.previewContentContainer); // Move preview into modal
            this.previewContentContainer.style.display = 'block'; // Ensure it's visible
            // Potentially adjust styles for modal view, e.g., height
            this.previewContentContainer.style.height = 'calc(100vh - 4rem - 60px)'; // Example: full height minus padding and close button
        }
        
        document.body.style.overflow = 'hidden';
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Move preview content back to its original place if it was moved
        if (this.previewContentContainer && this.originalParent && !this.originalParent.contains(this.previewContentContainer)) {
             this.originalParent.appendChild(this.previewContentContainer);
             this.previewContentContainer.style.height = ''; // Reset height or to original
             // this.previewContentContainer.style.display = 'block'; // Or original display style
        }
        // If the preview was inside .card-preview-container and that was hidden:
        // const oldPreviewContainer = document.querySelector('.card-preview-container');
        // if (oldPreviewContainer) oldPreviewContainer.style.display = 'none'; // Hide if it's the old sticky preview
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
        // These styles might conflict with CSS, use with caution or integrate into CSS
        // previewButton.style.setProperty('bottom', '0', 'important');
        // previewButton.style.setProperty('margin', '0', 'important');
        // previewButton.style.setProperty('padding', '0', 'important');
        // previewButton.offsetHeight; // Force reflow
    }
});

// scrollToCurrentStep and its listeners were removed
// centerActiveStep and its listeners were removed
// Global updateProgress and updateStepCounter were removed
// Global sectionObserver and handleSectionTransition were removed
// setupAutoGallery and setupGalleryRotation were removed
