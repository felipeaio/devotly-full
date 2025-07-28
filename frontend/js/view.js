/**
 * DevotlyViewer - Visualização de cartões
 * Baseado no layout de preview do create.js
 */

// API Configuration
import { API_BASE_URL, API_CONFIG } from './core/api-config.js';

class DevotlyViewer {    constructor() {
        console.log('🚀 DevotlyViewer: Iniciando constructor...');
        
        // Estado inicial
        this.state = {
            cardId: null,
            cardData: null,
            currentImageIndex: 0,
            loading: true,
            error: null,
            activeSection: 'titleSection'
        };
        
        // Variáveis de controle para rolagem suave
        this.isScrolling = false;
        this.lastScrollTime = 0;

        // Definir elementos da página
        this.elements = {
            startViewState: document.getElementById('startViewState'),
            startViewBtn: document.getElementById('startViewBtn'),
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            notFoundState: document.getElementById('notFoundState'),
            paymentErrorState: document.getElementById('paymentErrorState'),
            cardContent: document.getElementById('cardContent'),
            cardTheme: document.getElementById('cardTheme'),
            cardTitle: document.getElementById('cardTitle'),
            cardMessage: document.getElementById('cardMessage'),
            finalMessage: document.getElementById('finalMessage'),
            cardAuthor: document.getElementById('cardAuthor'),
            verseSection: document.getElementById('verseSection'),
            verseText: document.getElementById('verseText'),
            verseRef: document.getElementById('verseRef'),
            cardImages: document.getElementById('cardImages'),
            galleryInner: document.querySelector('.gallery-inner'),
            cardMedia: document.getElementById('cardMedia'),
            qrCodeImage: document.getElementById('qrCodeImage'),
            sectionDots: document.querySelectorAll('.section-dot'),
            previewSections: document.querySelector('.preview-sections'),
            sections: document.querySelectorAll('.preview-section'),
            retryBtn: document.getElementById('retryBtn'),
            checkAgainBtn: document.getElementById('checkAgainBtn'),
            carouselPrev: document.querySelector('.carousel-prev'),
            carouselNext: document.querySelector('.carousel-next'),
            imageCounter: document.querySelector('.image-counter')
        };

        // Log dos elementos encontrados/não encontrados
        console.log('🔍 DevotlyViewer: Verificando elementos do DOM...');
        Object.entries(this.elements).forEach(([key, element]) => {
            if (element) {
                if (element.length !== undefined) {
                    console.log(`✅ ${key}: ${element.length} elementos encontrados`);
                } else {
                    console.log(`✅ ${key}: elemento encontrado`);
                }
            } else {
                console.log(`❌ ${key}: elemento NÃO encontrado`);
            }
        });

        this.initialize();
    }

    initialize() {
        console.log('⚙️ DevotlyViewer: Inicializando...');
        
        // Mostrar tela inicial primeiro
        this.showState('startViewState');
        
        // Adicionar evento de clique no botão
        if (this.elements.startViewBtn) {
            console.log('🔘 DevotlyViewer: Configurando botão de início...');
            this.elements.startViewBtn.addEventListener('click', () => {
                console.log('🔘 DevotlyViewer: Botão "Abrir Devocional" clicado');
                // Adicionar fade-out suave
                const startScreen = this.elements.startViewState;
                startScreen.style.opacity = '0';
                startScreen.style.transition = 'opacity 0.3s ease';
                
                // Carregar cartão após transição
                setTimeout(() => {
                    startScreen.style.display = 'none';
                    this.loadCard();
                }, 300);
            });
        } else {
            console.log('❌ DevotlyViewer: Botão de início não encontrado!');
        }

        // Adicionar eventos para botões
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => {
                console.log('🔄 DevotlyViewer: Botão "Tentar novamente" clicado');
                this.loadCard();
            });
        }

        if (this.elements.checkAgainBtn) {
            this.elements.checkAgainBtn.addEventListener('click', () => {
                console.log('🔄 DevotlyViewer: Botão "Verificar novamente" clicado');
                this.loadCard();
            });
        }

        // Setup carousel control events
        if (this.elements.carouselPrev) {
            this.elements.carouselPrev.addEventListener('click', () => this.navigateCarousel(-1));
        }

        if (this.elements.carouselNext) {
            this.elements.carouselNext.addEventListener('click', () => this.navigateCarousel(1));
        }

        // Auto-carregamento
        const urlParams = new URLSearchParams(window.location.search);
        const autoload = urlParams.get('autoload');
        if (autoload === 'true') {
            console.log('🚀 DevotlyViewer: Auto-carregamento ativado');
            this.loadCard();
        }
        
        console.log('✅ DevotlyViewer: Inicialização concluída');
    }

    async loadCard() {
        console.log('🔄 DevotlyViewer: Iniciando carregamento do cartão...');
        
        // Adicionar fade-out suave
        if (this.elements.startViewState) {
            this.elements.startViewState.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 300));
            this.elements.startViewState.style.display = 'none';
        }
        
        // Extract ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        let cardId = urlParams.get('id');
        console.log('🔍 DevotlyViewer: ID da URL (query):', cardId);

        // Check pathname for ID
        if (!cardId) {
            const pathParts = window.location.pathname.split('/');
            cardId = pathParts[pathParts.length - 1];
            console.log('🔍 DevotlyViewer: ID do path:', cardId);

            if (!cardId || cardId === 'view' || cardId === 'view.html') {
                console.log('❌ DevotlyViewer: ID não encontrado na URL');
                this.showState('notFoundState');
                return;
            }
        }

        this.state.cardId = cardId;
        console.log('✅ DevotlyViewer: Card ID definido:', cardId);
        await this.fetchCardData();
    }

    async fetchCardData() {
        console.log('🌐 DevotlyViewer: Iniciando requisição para API...');
        this.showState('loadingState');

        try {
            const apiUrl = API_CONFIG.cards.get(this.state.cardId);
            console.log('🔗 DevotlyViewer: URL da API:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('📡 DevotlyViewer: Resposta da API:', response.status, response.statusText);

            if (!response.ok) {
                console.log('❌ DevotlyViewer: Erro na resposta da API:', response.status);
                if (response.status === 404) {
                    this.showState('notFoundState');
                } else {
                    this.showState('errorState');
                }
                return;
            }

            const result = await response.json();
            console.log('📦 DevotlyViewer: Dados recebidos:', result);

            if (result.status !== 'success' || !result.data) {
                console.log('❌ DevotlyViewer: Estrutura de dados inválida:', result);
                this.showState('errorState');
                return;
            }

            this.state.cardData = result.data;
            console.log('✅ DevotlyViewer: Dados do cartão carregados:', this.state.cardData);

            // Verificar se o cartão está pago ou se tem versão de preview
            if (result.data.status_pagamento !== 'aprovado' && !result.data.preview_mode) {
                console.log('⏳ DevotlyViewer: Pagamento não aprovado:', result.data.status_pagamento);
                this.showState('paymentErrorState');
                return;
            }

            // Rastrear visualização do cartão via backend
            this.trackCardView();

            console.log('🎨 DevotlyViewer: Renderizando cartão...');
            this.renderCard();
            console.log('👀 DevotlyViewer: Mostrando cartão...');
            this.showState('cardContent');
            console.log('🎮 DevotlyViewer: Configurando event listeners...');
            this.setupEventListeners();
            console.log('🔍 DevotlyViewer: Configurando observador de seções...');
            this.setupSectionObserver();
            console.log('📍 DevotlyViewer: Configurando indicadores de seção...');
            this.setupSectionIndicators();
            console.log('✅ DevotlyViewer: Cartão carregado com sucesso!');

        } catch (error) {
            console.error('❌ DevotlyViewer: Erro ao carregar cartão:', error);
            this.showState('errorState');
        }
    }

    showState(stateId) {
        console.log(`🎭 DevotlyViewer: Mudando para estado: ${stateId}`);
        
        // Ocultar todos os estados
        ['startViewState', 'loadingState', 'errorState', 'notFoundState', 'paymentErrorState', 'cardContent'].forEach(state => {
            const element = this.elements[state];
            if (element) {
                element.style.display = 'none';
                console.log(`🙈 DevotlyViewer: Ocultando estado: ${state}`);
            } else {
                console.log(`⚠️ DevotlyViewer: Elemento não encontrado: ${state}`);
            }
        });

        // Mostrar o estado solicitado
        const stateElement = this.elements[stateId];
        if (stateElement) {
            stateElement.style.display = 'flex';
            console.log(`👁️ DevotlyViewer: Mostrando estado: ${stateId}`);
        } else {
            console.log(`❌ DevotlyViewer: Estado não encontrado: ${stateId}`);
        }
    }

    renderCard() {
        console.log('🎨 DevotlyViewer: Iniciando renderização do cartão...');
        
        if (!this.state.cardData || !this.state.cardData.conteudo) {
            console.log('❌ DevotlyViewer: Dados do cartão inválidos:', this.state.cardData);
            this.showState('errorState');
            return;
        }

        const { conteudo } = this.state.cardData;
        console.log('📦 DevotlyViewer: Conteúdo do cartão:', conteudo);

        // Atualizar título da página
        document.title = `${conteudo.cardTitle || 'Mensagem de Fé'} | Devotly`;

        // Verificar e atualizar cada elemento
        if (this.elements.cardTitle) {
            this.elements.cardTitle.textContent = conteudo.cardTitle || 'Mensagem de Fé';
            console.log('✅ DevotlyViewer: Título definido:', conteudo.cardTitle);
        } else {
            console.log('❌ DevotlyViewer: Elemento cardTitle não encontrado');
        }

        if (this.elements.cardMessage) {
            this.elements.cardMessage.textContent = conteudo.cardMessage || '';
            console.log('✅ DevotlyViewer: Mensagem definida:', conteudo.cardMessage);
        } else {
            console.log('❌ DevotlyViewer: Elemento cardMessage não encontrado');
        }
        
        if (this.elements.finalMessage) {
            this.elements.finalMessage.textContent = conteudo.finalMessage || '';
            console.log('✅ DevotlyViewer: Mensagem final definida:', conteudo.finalMessage);
            
            // Adicionar efeito de fade-in na mensagem final quando for visível
            this.setupFinalMessageEffect();
        } else {
            console.log('❌ DevotlyViewer: Elemento finalMessage não encontrado');
        }

        // Autor
        if (this.elements.cardAuthor) {
            if (conteudo.userName) {
                this.elements.cardAuthor.textContent = conteudo.userName;
                this.elements.cardAuthor.style.display = 'block';
                console.log('✅ DevotlyViewer: Autor definido:', conteudo.userName);
                
                // Formatar nome do autor se necessário
                if (conteudo.userName.includes('-')) {
                    const formattedName = conteudo.userName
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    this.elements.cardAuthor.textContent = formattedName;
                    console.log('✅ DevotlyViewer: Nome do autor formatado:', formattedName);
                }
            } else {
                this.elements.cardAuthor.style.display = 'none';
                console.log('ℹ️ DevotlyViewer: Sem autor para exibir');
            }
        } else {
            console.log('❌ DevotlyViewer: Elemento cardAuthor não encontrado');
        }

        // Versículo
        if (this.elements.verseSection && this.elements.verseText && this.elements.verseRef) {
            if (conteudo.bibleVerse && conteudo.bibleVerse.text) {
                this.elements.verseText.textContent = conteudo.bibleVerse.text;
                this.elements.verseRef.textContent = conteudo.bibleVerse.reference;
                this.elements.verseSection.style.display = 'flex';
                console.log('✅ DevotlyViewer: Versículo definido:', conteudo.bibleVerse.text);
            } else {
                this.elements.verseSection.style.display = 'none';
                console.log('ℹ️ DevotlyViewer: Sem versículo para exibir');
            }
        } else {
            console.log('❌ DevotlyViewer: Elementos do versículo não encontrados');
        }

        // Galeria
        if (this.elements.galleryInner) {
            console.log('🖼️ DevotlyViewer: Renderizando galeria...');
            this.renderGallery(conteudo.images);
        } else {
            console.log('❌ DevotlyViewer: Elemento galleryInner não encontrado');
        }

        // Mídia
        if (this.elements.cardMedia) {
            console.log('🎵 DevotlyViewer: Renderizando mídia...');
            this.renderMedia(conteudo.musicLink);
        } else {
            console.log('❌ DevotlyViewer: Elemento cardMedia não encontrado');
        }

        // QR Code (oculto)
        if (this.elements.qrCodeImage && this.state.cardData.qr_code_url) {
            this.elements.qrCodeImage.src = this.state.cardData.qr_code_url;
            console.log('✅ DevotlyViewer: QR Code definido');
        } else {
            console.log('❌ DevotlyViewer: QR Code não encontrado ou não disponível');
        }

        // Mostrar o cartão
        console.log('📺 DevotlyViewer: Mostrando cartão...');
        this.showState('cardContent');

        // Marcar o primeiro dot como ativo e garantir posição inicial
        if (this.elements.sectionDots && this.elements.sectionDots.length > 0) {
            this.elements.sectionDots[0].classList.add('active');
            console.log('✅ DevotlyViewer: Primeiro dot marcado como ativo');
            
            // Garantir que inicia na primeira seção
            setTimeout(() => {
                this.scrollToSection('titleSection');
            }, 100);
        } else {
            console.log('❌ DevotlyViewer: Section dots não encontrados');
        }
        
        // Rolagem suave entre seções
        if (this.elements.previewSections) {
            this.elements.previewSections.style.scrollBehavior = 'smooth';
            console.log('✅ DevotlyViewer: Rolagem suave configurada');
        } else {
            console.log('❌ DevotlyViewer: Preview sections não encontrado');
        }
        
        console.log('✅ DevotlyViewer: Renderização do cartão concluída!');
    }

    renderGallery(images) {
        const galleryInner = this.elements.galleryInner;
        if (!galleryInner) return;

        galleryInner.innerHTML = '';

        if (!images || !images.length) {
            galleryInner.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-image"></i>
                    <p>Sem imagens</p>
                </div>
            `;
            
            // Esconder controles se não houver imagens
            if (this.elements.carouselPrev) this.elements.carouselPrev.style.display = 'none';
            if (this.elements.carouselNext) this.elements.carouselNext.style.display = 'none';
            if (this.elements.imageCounter) this.elements.imageCounter.style.display = 'none';
            
            return;
        }

        // Adicionar todas as imagens
        images.forEach((src, index) => {
            if (!src) return;

            const img = document.createElement('img');
            img.src = src;
            img.alt = `Imagem ${index + 1}`;
            img.loading = 'lazy';
            img.style.display = index === 0 ? 'block' : 'none';
            
            if (index === 0) {
                img.classList.add('active');
            }
            
            galleryInner.appendChild(img);
        });

        // Atualizar contador de imagens
        if (this.elements.imageCounter) {
            const currentElem = this.elements.imageCounter.querySelector('.current');
            const totalElem = this.elements.imageCounter.querySelector('.total');
            
            if (currentElem) currentElem.textContent = '1';
            if (totalElem) totalElem.textContent = images.length;
        }
        
        // Mostrar/esconder controles de carrossel
        const showControls = images.length > 1;
        if (this.elements.carouselPrev) {
            this.elements.carouselPrev.style.display = showControls ? 'flex' : 'none';
        }
        if (this.elements.carouselNext) {
            this.elements.carouselNext.style.display = showControls ? 'flex' : 'none';
        }
        if (this.elements.imageCounter) {
            this.elements.imageCounter.style.display = showControls ? 'flex' : 'none';
        }
    }    renderMedia(mediaLink) {
        const container = this.elements.cardMedia;
        if (!container) return;
        
        // Use MediaHandler if available, otherwise fall back to the old implementation
        if (typeof MediaHandler !== 'undefined') {
            MediaHandler.renderMedia(container, mediaLink, {
                useThumbnailPreview: true,
                autoplay: false,
                onLoad: () => this.setupMediaVisibilityObserver()
            });
            return;
        }
        
        // Legacy implementation as fallback
        container.innerHTML = '';
        container.removeAttribute('data-media-type');

        // Se não houver link de mídia
        if (!mediaLink) {
            container.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-music"></i>
                    <p>Sem mídia</p>
                </div>
            `;
            return;
        }

        // Adicionar overlay de carregamento
        container.innerHTML = `
            <div class="media-loading-overlay">
                <div class="media-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>
        `;

        // Determinar tipo de mídia e renderizar
        if (mediaLink.includes('youtube.com') || mediaLink.includes('youtu.be')) {
            const videoId = this.getYouTubeId(mediaLink);
            if (videoId) {
                // Definir tipo para estilização específica
                container.setAttribute('data-media-type', 'youtube');
                
                // Usar poster antes de carregar o iframe para melhorar o desempenho
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                
                // Criar elemento de pré-visualização
                const previewDiv = document.createElement('div');
                previewDiv.className = 'youtube-preview';
                previewDiv.style.backgroundImage = `url(${thumbnailUrl})`;
                previewDiv.innerHTML = `
                    <div class="youtube-play-button">
                        <i class="fas fa-play"></i>
                    </div>
                `;
                
                // Substituir loading
                container.innerHTML = '';
                container.appendChild(previewDiv);
                
                // Carregar iframe ao clicar
                previewDiv.addEventListener('click', () => {
                    container.innerHTML = `
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=1" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            title="YouTube video player"
                            loading="lazy"
                            onload="this.parentElement.classList.add('loaded')">
                        </iframe>
                    `;
                    
                    // Configurar observador para animações quando a seção estiver visível
                    this.setupMediaVisibilityObserver();
                });
            }
        } else if (mediaLink.includes('spotify.com')) {
            const spotifyData = this.getSpotifyId(mediaLink);
            if (spotifyData) {
                // Definir tipo para estilização específica
                const mediaType = spotifyData.type === 'playlist' ? 'spotify-playlist' : 'spotify';
                container.setAttribute('data-media-type', mediaType);
                
                container.innerHTML = `
                    <iframe 
                        src="https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator" 
                        frameborder="0" 
                        allowtransparency="true"
                        allow="encrypted-media"
                        loading="lazy"
                        onload="this.parentElement.classList.add('loaded')">
                    </iframe>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Formato de mídia não suportado</p>
                </div>
            `;
        }
    }
    
    // Observador para ativar efeitos quando a mídia estiver visível
    setupMediaVisibilityObserver() {
        const mediaSection = document.getElementById('mediaSection');
        const mediaContainer = this.elements.cardMedia;
        
        if (!mediaSection || !mediaContainer) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Adicionar classe para ativar efeitos quando visível
                    mediaContainer.classList.add('media-visible');
                }
            });
        }, { threshold: 0.6 });
        
        observer.observe(mediaSection);
    }

    setupEventListeners() {
        console.log('🎮 DevotlyViewer: Configurando event listeners...');
        
        // Verificar se os elementos existem antes de configurar
        if (!this.elements.sectionDots || this.elements.sectionDots.length === 0) {
            console.warn('⚠️ DevotlyViewer: Nenhum indicador de seção encontrado, criando indicadores...');
            this.createSectionIndicators();
            return;
        }
        
        // Configurar os eventos para os indicadores de seção
        this.elements.sectionDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                const sectionId = dot.getAttribute('data-section');
                console.log(`🎯 DevotlyViewer: Clique no indicador ${index} (${sectionId})`);
                this.scrollToSection(sectionId);
                
                // Atualizar indicador ativo
                this.updateSectionIndicator(sectionId);
            });
        });
        
        // Configurar navegação por teclado
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                console.log('⌨️ DevotlyViewer: Navegação por teclado:', e.key);
                
                if (e.key === 'Home') {
                    // Ir para primeira seção
                    this.scrollToSection('titleSection');
                } else if (e.key === 'End') {
                    // Ir para última seção
                    this.scrollToSection('finalSection');
                } else {
                    // Navegação sequencial
                    const direction = ['ArrowDown', 'PageDown'].includes(e.key) ? 1 : -1;
                    this.navigateToSection(direction);
                }
            }
        });
        
        console.log('✅ DevotlyViewer: Event listeners configurados');
    }
    
    createSectionIndicators() {
        console.log('🔧 DevotlyViewer: Criando indicadores de seção...');
        
        // Verificar se já existe um container de indicadores
        let indicatorsContainer = document.querySelector('.section-indicators');
        if (!indicatorsContainer) {
            console.log('📍 DevotlyViewer: Criando container de indicadores...');
            indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'section-indicators';
            document.body.appendChild(indicatorsContainer);
        }
        
        // Limpar indicadores existentes
        indicatorsContainer.innerHTML = '';
        
        // Definir as seções
        const sectionConfigs = [
            { id: 'titleSection', label: 'Título' },
            { id: 'messageSection', label: 'Mensagem' },
            { id: 'verseSection', label: 'Versículo' },
            { id: 'gallerySection', label: 'Galeria' },
            { id: 'mediaSection', label: 'Mídia' },
            { id: 'finalSection', label: 'Final' }
        ];
        
        // Criar indicadores
        sectionConfigs.forEach((config, index) => {
            const dot = document.createElement('div');
            dot.className = `section-dot ${index === 0 ? 'active' : ''}`;
            dot.setAttribute('data-section', config.id);
            dot.setAttribute('data-label', config.label);
            indicatorsContainer.appendChild(dot);
        });
        
        // Atualizar referência dos elementos
        this.elements.sectionDots = document.querySelectorAll('.section-dot');
        console.log(`✅ DevotlyViewer: ${this.elements.sectionDots.length} indicadores criados`);
        
        // Configurar eventos após criação
        this.setupEventListeners();
    }    setupSectionObserver() {
        console.log('👁️ DevotlyViewer: Configurando observador de seções...');
        
        const previewSections = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSections) {
            console.warn('⚠️ DevotlyViewer: Container .preview-sections não encontrado');
            return;
        }
        
        if (!sections || sections.length === 0) {
            console.warn('⚠️ DevotlyViewer: Nenhuma seção .preview-section encontrada');
            return;
        }
        
        console.log(`🔍 DevotlyViewer: Observando ${sections.length} seções`);

        // Configurar IntersectionObserver para detectar seções visíveis
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
                    const sectionId = entry.target.id;
                    console.log('👁️ DevotlyViewer: Seção visível:', sectionId);
                    
                    // Atualizar estado
                    this.state.activeSection = sectionId;
                    
                    // Atualizar indicadores
                    this.updateSectionIndicator(sectionId);
                }
            });
        }, {
            root: previewSections,
            threshold: [0.7], // Threshold mais alto para detecção precisa
            rootMargin: '0px' // Sem margem para snap exato
        });

        // Observar todas as seções
        sections.forEach(section => {
            observer.observe(section);
            console.log(`👁️ DevotlyViewer: Observando seção: ${section.id}`);
        });

        // Implementar controle de scroll por seções
        this.setupSectionScrollControl(previewSections, sections);
        
        console.log('✅ DevotlyViewer: Observador de seções configurado');
    }
    
    setupSectionScrollControl(container, sections) {
        console.log('🎮 DevotlyViewer: Configurando controle de scroll por seções...');
        
        let isScrolling = false;
        let scrollTimeout;
        
        // Controle por wheel (roda do mouse)
        container.addEventListener('wheel', (e) => {
            e.preventDefault(); // Bloquear scroll padrão
            
            if (isScrolling) return; // Prevenir scroll múltiplo
            
            isScrolling = true;
            
            const direction = e.deltaY > 0 ? 1 : -1; // 1 = down, -1 = up
            this.navigateToSection(direction);
            
            // Reset flag após delay
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 800);
            
        }, { passive: false });
        
        // Controle por toque (mobile)
        let touchStartY = 0;
        let touchEndY = 0;
        let isTouching = false;
        
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            isTouching = false;
        }, { passive: true });
        
        container.addEventListener('touchmove', (e) => {
            isTouching = true;
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            if (!isTouching || isScrolling) return;
            
            touchEndY = e.changedTouches[0].clientY;
            const touchDistance = touchStartY - touchEndY;
            const minSwipeDistance = 50;
            
            if (Math.abs(touchDistance) > minSwipeDistance) {
                isScrolling = true;
                
                const direction = touchDistance > 0 ? 1 : -1; // swipe up = next, swipe down = prev
                this.navigateToSection(direction);
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    isScrolling = false;
                }, 800);
            }
        }, { passive: true });
        
        console.log('✅ DevotlyViewer: Controle de scroll configurado');
    }
    
    navigateToSection(direction) {
        const sections = Array.from(document.querySelectorAll('.preview-section'));
        const currentIndex = sections.findIndex(section => section.id === this.state.activeSection);
        
        if (currentIndex === -1) {
            console.warn('⚠️ DevotlyViewer: Seção atual não encontrada');
            return;
        }
        
        const newIndex = currentIndex + direction;
        
        // Verificar limites
        if (newIndex < 0 || newIndex >= sections.length) {
            console.log('🚫 DevotlyViewer: Limite de seções atingido');
            return;
        }
        
        const targetSection = sections[newIndex];
        const sectionId = targetSection.id;
        
        console.log(`🎯 DevotlyViewer: Navegando de ${this.state.activeSection} para ${sectionId}`);
        
        // Navegar para a seção
        this.scrollToSection(sectionId);
    }
      // Método para controlar a navegação com a roda do mouse
    handleWheelNavigation(event) {
        event.preventDefault();
        
        const currentSectionIndex = this.getCurrentSectionIndex();
        if (currentSectionIndex === -1) return;
        
        // Variáveis para debounce da rolagem
        if (this.isScrolling) return;
        this.isScrolling = true;
        
        // Determinar direção da rolagem
        const direction = event.deltaY > 0 ? 1 : -1;
        this.navigateToAdjacentSection(currentSectionIndex, direction);
        
        // Definir timeout para permitir nova navegação
        setTimeout(() => {
            this.isScrolling = false;
        }, 800); // Tempo suficiente para a animação de rolagem terminar
    }
    
    // Método para controlar a navegação com teclado
    handleKeyNavigation(event) {
        // Setas para cima/baixo
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            
            const currentSectionIndex = this.getCurrentSectionIndex();
            if (currentSectionIndex === -1) return;
            
            // Determinar direção da navegação
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            this.navigateToAdjacentSection(currentSectionIndex, direction);
        }
    }
    
    // Obter índice da seção atual
    getCurrentSectionIndex() {
        const sections = Array.from(document.querySelectorAll('.preview-section'));
        return sections.findIndex(section => section.id === this.state.activeSection);
    }
    
    // Navegar para a seção adjacente
    navigateToAdjacentSection(currentIndex, direction) {
        const sections = document.querySelectorAll('.preview-section');
        const newIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));
        
        if (newIndex !== currentIndex) {
            const targetSection = sections[newIndex];
            this.scrollToSection(targetSection.id);
            
            // Atualizar indicador de seção
            this.updateSectionIndicator(targetSection.id);
        }
    }
    
    // Atualizar o indicador de seção ativa
    updateSectionIndicator(sectionId) {
        this.elements.sectionDots.forEach(dot => {
            const isActive = dot.getAttribute('data-section') === sectionId;
            dot.classList.toggle('active', isActive);
        });
    }
    // Scroll para seção específica com snap obrigatório
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) {
            console.warn('⚠️ DevotlyViewer: Seção não encontrada:', sectionId);
            return;
        }
        
        console.log(`📍 DevotlyViewer: Scrolling para seção: ${sectionId}`);
        
        // Atualizar estado antes da rolagem
        this.state.activeSection = sectionId;
        
        // Aplica transição suave personalizada
        const previewSections = this.elements.previewSections;
        if (previewSections) {
            // Efeito de transição
            section.classList.add('section-transition');
            
            // Calcular posição exata da seção
            const sectionIndex = Array.from(document.querySelectorAll('.preview-section')).indexOf(section);
            const targetScrollTop = sectionIndex * window.innerHeight;
            
            // Scroll suave para posição exata
            previewSections.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
            
            // Atualizar indicadores
            this.updateSectionIndicator(sectionId);
            
            // Remover classe de transição após animação concluída
            setTimeout(() => {
                section.classList.remove('section-transition');
            }, 600);
            
            console.log(`✅ DevotlyViewer: Navegação para ${sectionId} concluída`);
        }
    }setupSectionIndicators() {
        console.log('📍 DevotlyViewer: Configurando indicadores de seção...');
        
        const dots = document.querySelectorAll('.section-dot');
        const sections = document.querySelectorAll('.preview-section');
        
        if (!dots || dots.length === 0) {
            console.warn('⚠️ DevotlyViewer: Nenhum indicador encontrado em setupSectionIndicators');
            return;
        }
        
        if (!sections || sections.length === 0) {
            console.warn('⚠️ DevotlyViewer: Nenhuma seção encontrada em setupSectionIndicators');
            return;
        }
        
        console.log(`📍 DevotlyViewer: Configurando ${dots.length} indicadores para ${sections.length} seções`);
        
        // Verificar se o container de scroll existe
        if (this.elements.previewSections) {
            // Verifica visibilidade das seções no carregamento
            this.checkSectionVisibility();
            
            // Atualiza indicadores quando há rolagem
            this.elements.previewSections.addEventListener('scroll', () => {
                this.checkSectionVisibility();
            }, { passive: true });
        }
        
        // Adiciona feedback visual ao clicar e navegação entre seções
        dots.forEach((dot, index) => {
            console.log(`📍 DevotlyViewer: Configurando indicador ${index}: ${dot.dataset.section}`);
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`🔘 DevotlyViewer: Clique no indicador ${index} (${dot.dataset.section})`);
                
                // Efeito visual de clique
                dot.style.transform = 'scaleX(0.8) scaleY(0.9)';
                dot.style.opacity = '0.8';
                
                // Restaurar estado após a animação
                setTimeout(() => {
                    dot.style.transform = '';
                    dot.style.opacity = '';
                }, 300);
                
                // Navegação para a seção
                const sectionId = dot.getAttribute('data-section');
                this.scrollToSection(sectionId);
                
                // Atualizar navegação
                this.updateSectionIndicator(sectionId);
            });
        });
        
        // Adicionar suporte a navegação por toque para seções
        this.setupTouchNavigation();
        
        console.log('✅ DevotlyViewer: Indicadores de seção configurados');
    }
    
    // Configuração do efeito especial para a mensagem final
    setupFinalMessageEffect() {
        const finalSection = document.getElementById('finalSection');
        const finalMessage = document.querySelector('.final-message');
        const messageDecoration = document.querySelector('.message-decoration i');
        
        if (!finalSection || !finalMessage || !messageDecoration) return;
        
        // Adicionar evento de pulsação ao ícone quando a seção estiver visível
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animar o coração quando a seção se tornar visível
                    messageDecoration.classList.add('heartbeat');
                    finalMessage.classList.add('active');
                } else {
                    messageDecoration.classList.remove('heartbeat');
                    finalMessage.classList.remove('active');
                }
            });
        }, { threshold: 0.7 });
        
        observer.observe(finalSection);
        
        // Adicionar evento de clique no ícone de coração
        messageDecoration.addEventListener('click', () => {
            messageDecoration.classList.add('heartbeat-intense');
            
            // Remover a classe após a animação
            setTimeout(() => {
                messageDecoration.classList.remove('heartbeat-intense');
            }, 1000);
        });
    }
        
    // Configurar navegação por toque entre seções (simplificado)
    setupTouchNavigation() {
        console.log('👆 DevotlyViewer: Configuração de toque simplificada (já gerenciada pelo scroll control)');
        // A navegação por toque agora é gerenciada pelo setupSectionScrollControl
    }
    
    checkSectionVisibility() {
        const sections = Array.from(document.querySelectorAll('.preview-section'));
        const dots = document.querySelectorAll('.section-dot');
        const container = this.elements.previewSections;
        
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        // Encontra a seção mais próxima do centro da viewport
        let closestSection = null;
        let minDistance = Infinity;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + rect.height / 2;
            const distance = Math.abs(sectionCenter - containerCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestSection = section;
            }
        });
        
        if (closestSection) {
            const sectionId = closestSection.id;
            this.state.activeSection = sectionId;
            
            // Atualiza os dots
            dots.forEach(dot => {
              if (dot.getAttribute('data-section') === sectionId) {
                dot.classList.add('active');
              } else {
                dot.classList.remove('active');
              }
            });
        }
    }

    navigateCarousel(direction) {
        const galleryInner = this.elements.galleryInner;
        if (!galleryInner) return;

        const images = galleryInner.querySelectorAll('img');
        if (images.length <= 1) return;

        // Ocultar imagem atual
        images[this.state.currentImageIndex].style.display = 'none';
        images[this.state.currentImageIndex].classList.remove('active');

        // Calcular novo índice
        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;

        // Mostrar nova imagem
        images[this.state.currentImageIndex].style.display = 'block';
        images[this.state.currentImageIndex].classList.add('active');
        
        // Atualizar contador
        if (this.elements.imageCounter) {
            const currentElem = this.elements.imageCounter.querySelector('.current');
            if (currentElem) {
                currentElem.textContent = (this.state.currentImageIndex + 1).toString();
            }
        }
    }

    setupTouchInteractions() {
        const galleryInner = this.elements.galleryInner;
        if (!galleryInner) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        galleryInner.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        galleryInner.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        const handleSwipe = () => {
            const minSwipeDistance = 50;
            const swipeDistance = touchEndX - touchStartX;
            
            if (Math.abs(swipeDistance) < minSwipeDistance) return;
            
            if (swipeDistance > 0) {
                // Swipe right - prev image
                this.navigateCarousel(-1);
            } else {
                // Swipe left - next image
                this.navigateCarousel(1);
            }
        };
    }

    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    getSpotifyId(url) {
        const regExp = /spotify.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/;
        const match = url.match(regExp);

        if (match && match[1] && match[2]) {
            return {
                type: match[1],
                id: match[2]
            };
        }

        return null;
    }

    /**
     * Rastreia visualização do cartão via backend
     */
    async trackCardView() {
        try {
            const trackUrl = API_CONFIG.cards.trackView ? 
                API_CONFIG.cards.trackView(this.state.cardId) : 
                `${API_CONFIG.cards.get(this.state.cardId)}/track-view`;
            
            await fetch(trackUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Visualização de cartão rastreada via backend');
        } catch (error) {
            console.error('Erro ao rastrear visualização via backend:', error);
            // Não falha o carregamento do cartão
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DevotlyViewer: DOM carregado, inicializando...');
    
    try {
        window.devotlyViewer = new DevotlyViewer();
        console.log('✅ DevotlyViewer: Inicializado com sucesso');
    } catch (error) {
        console.error('❌ DevotlyViewer: Erro na inicialização:', error);
        
        // Fallback: mostrar estado de erro
        const errorState = document.getElementById('errorState');
        if (errorState) {
            // Ocultar outros estados
            document.querySelectorAll('[id$="State"]').forEach(el => {
                el.style.display = 'none';
            });
            errorState.style.display = 'flex';
        }
    }
});

// Fallback para garantir que inicialize mesmo se DOMContentLoaded já passou
if (document.readyState === 'loading') {
    console.log('🔄 DevotlyViewer: DOM ainda carregando, aguardando...');
} else {
    console.log('🚀 DevotlyViewer: DOM já carregado, inicializando imediatamente...');
    try {
        window.devotlyViewer = new DevotlyViewer();
        console.log('✅ DevotlyViewer: Inicializado com sucesso (fallback)');
    } catch (error) {
        console.error('❌ DevotlyViewer: Erro na inicialização (fallback):', error);
    }
}

function setupMediaContainer() {
  const mediaContainers = document.querySelectorAll('.media-container');
  
  mediaContainers.forEach(container => {
    const iframe = container.querySelector('iframe');
    
    if (iframe) {
      // Add loading state handling
      iframe.addEventListener('load', () => {
        container.classList.add('loaded');
        
        // Adicionar notificação discreta quando o vídeo estiver pronto
        const loadedNotification = document.createElement('div');
        loadedNotification.className = 'media-loaded-notification';
        loadedNotification.innerHTML = `<i class="fas fa-check"></i> Pronto para assistir`;
        container.appendChild(loadedNotification);
        
        // Removê-la após alguns segundos
        setTimeout(() => {
          loadedNotification.classList.add('fade-out');
          setTimeout(() => loadedNotification.remove(), 500);
        }, 3000);
      });

      // Add error handling
      iframe.addEventListener('error', () => {
        container.innerHTML = `
          <div class="no-media">
            <i class="fas fa-exclamation-circle"></i>
            <p>Não foi possível carregar o conteúdo</p>
            <button class="retry-media-btn">Tentar novamente</button>
          </div>
        `;
        
        // Adicionar evento para botão de tentar novamente
        const retryBtn = container.querySelector('.retry-media-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            // Recarregar o iframe com mesma URL
            const currentSrc = iframe.src;
            container.innerHTML = `<iframe src="${currentSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="no-referrer" title="Conteúdo de mídia incorporado"></iframe>`;
            setupMediaContainer(); // Reconfigurar eventos
          });
        }
      });

      // Improve iframe attributes for better performance and security
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      
      // Add title for accessibility
      iframe.setAttribute('title', 'Conteúdo de mídia incorporado');

      // Add sandbox attributes for security while allowing necessary functionality
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
      
      // Adicionar classe para ativar efeitos quando o iframe for carregado
      container.classList.add('media-enhanced');
      
      // Adicionar atributos para otimização de desempenho
      if (iframe.src.includes('youtube')) {
        // Preferir carregamento por DNS prefetch para YouTube
        const linkPrefetch = document.createElement('link');
        linkPrefetch.rel = 'preconnect';
        linkPrefetch.href = 'https://www.youtube.com';
        document.head.appendChild(linkPrefetch);
      }
    }
  });
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', setupMediaContainer);

/**
 * Melhora a navegação simples do carrossel
 */
function enhanceSimpleGallery() {
  document.addEventListener('DOMContentLoaded', () => {
    const galleryInner = document.querySelector('.gallery-inner');
    if (!galleryInner) return;
    
    // Adicionar navegação por toque
    let touchStartX = 0;
    let touchEndX = 0;
    
    galleryInner.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    galleryInner.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        // Swipe para esquerda - próxima imagem
        document.querySelector('.carousel-next')?.click();
      } else if (touchEndX - touchStartX > 50) {
        // Swipe para direita - imagem anterior
        document.querySelector('.carousel-prev')?.click();
      }
    }, { passive: true });
    
    // Pré-carregar imagens para transição mais suave
    const images = galleryInner.querySelectorAll('img');
    images.forEach(img => {
      if (img.getAttribute('data-src')) {
        const preloadImg = new Image();
        preloadImg.src = img.getAttribute('data-src');
        preloadImg.onload = () => {
          img.src = preloadImg.src;
          img.removeAttribute('data-src');
        };
      }
    });
  });
}

enhanceSimpleGallery();

/**
 * Melhora a navegação por teclado em toda a página
 */
function enhanceKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Navegar entre seções com PageUp/PageDown, Space, Home e End
    if (['PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      
      const previewSections = document.querySelector('.preview-sections');
      const sections = Array.from(document.querySelectorAll('.preview-section'));
      const currentSectionIndex = sections.findIndex(section => 
        section.getBoundingClientRect().top >= 0 && 
        section.getBoundingClientRect().top <= window.innerHeight/2
      );
      
      let targetIndex;
      
      switch (e.key) {
        case 'PageUp':
          targetIndex = Math.max(0, currentSectionIndex - 1);
          break;
        case 'PageDown':
        case ' ':
          targetIndex = Math.min(sections.length - 1, currentSectionIndex + 1);
          break;
        case 'Home':
          targetIndex = 0;
          break;
        case 'End':
          targetIndex = sections.length - 1;
          break;
      }
      
      if (targetIndex !== undefined && sections[targetIndex]) {
        sections[targetIndex].scrollIntoView({ behavior: 'smooth' });
        
        // Atualizar indicador visual
        const sectionDots = document.querySelectorAll('.section-dot');
        sectionDots.forEach(dot => {
          const isActive = dot.getAttribute('data-section') === sections[targetIndex].id;
          dot.classList.toggle('active', isActive);
        });
      }
    }
  });
}

enhanceKeyboardNavigation();