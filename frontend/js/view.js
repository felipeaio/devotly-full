/**
 * DevotlyViewer - Visualização de cartões
 * Baseado no layout de preview do create.js
 */

// API Configuration
import { API_BASE_URL, API_CONFIG } from './core/api-config.js';

class DevotlyViewer {    constructor() {
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

        this.initialize();
    }

    initialize() {
        // Mostrar tela inicial primeiro
        this.showState('startViewState');
        
        // Adicionar evento de clique no botão
        if (this.elements.startViewBtn) {
            this.elements.startViewBtn.addEventListener('click', () => {
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
        }

        // Adicionar eventos para botões
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.loadCard());
        }

        if (this.elements.checkAgainBtn) {
            this.elements.checkAgainBtn.addEventListener('click', () => this.loadCard());
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
            this.loadCard();
        }
    }

    async loadCard() {
        // Adicionar fade-out suave
        if (this.elements.startViewState) {
            this.elements.startViewState.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 300));
            this.elements.startViewState.style.display = 'none';
        }
        
        // Extract ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        let cardId = urlParams.get('id');

        // Check pathname for ID
        if (!cardId) {
            const pathParts = window.location.pathname.split('/');
            cardId = pathParts[pathParts.length - 1];

            if (!cardId || cardId === 'view' || cardId === 'view.html') {
                this.showState('notFoundState');
                return;
            }
        }

        this.state.cardId = cardId;
        await this.fetchCardData();
    }

    async fetchCardData() {
        this.showState('loadingState');

        try {
            const response = await fetch(API_CONFIG.cards.get(this.state.cardId));

            if (!response.ok) {
                if (response.status === 404) {
                    this.showState('notFoundState');
                } else {
                    this.showState('errorState');
                }
                return;
            }

            const result = await response.json();

            if (result.status !== 'success' || !result.data) {
                this.showState('errorState');
                return;
            }

            this.state.cardData = result.data;

            // Verificar se o cartão está pago ou se tem versão de preview
            if (result.data.payment_status !== 'approved' && !result.data.preview_mode) {
                this.showState('paymentPendingState');
                return;
            }

            // Rastrear visualização do cartão via backend
            this.trackCardView();

            // Rastrear no frontend também
            if (typeof TikTokEvents !== 'undefined') {
                TikTokEvents.viewCard(this.state.cardId, result.data.conteudo?.cardTitle);
            }

            this.renderCard();
            this.showState('cardViewState');
            this.setupEventListeners();

        } catch (error) {
            console.error('Erro ao carregar cartão:', error);
            this.showState('errorState');
        }
    }

    showState(stateId) {
        // Ocultar todos os estados
        ['startViewState', 'loadingState', 'errorState', 'notFoundState', 'paymentErrorState', 'cardContent'].forEach(state => {
            const element = this.elements[state];
            if (element) {
                element.style.display = 'none';
            }
        });

        // Mostrar o estado solicitado
        const stateElement = this.elements[stateId];
        if (stateElement) {
            stateElement.style.display = 'flex';
        }
    }

    renderCard() {
        if (!this.state.cardData || !this.state.cardData.conteudo) {
            this.showState('errorState');
            return;
        }

        const { conteudo } = this.state.cardData;

        // Atualizar título da página
        document.title = `${conteudo.cardTitle || 'Mensagem de Fé'} | Devotly`;

        // Verificar e atualizar cada elemento
        if (this.elements.cardTitle) {
            this.elements.cardTitle.textContent = conteudo.cardTitle || 'Mensagem de Fé';
        }

        if (this.elements.cardMessage) {
            this.elements.cardMessage.textContent = conteudo.cardMessage || '';
        }        if (this.elements.finalMessage) {
            this.elements.finalMessage.textContent = conteudo.finalMessage || '';
            
            // Adicionar efeito de fade-in na mensagem final quando for visível
            this.setupFinalMessageEffect();
        }

        // Autor
        if (this.elements.cardAuthor) {
            if (conteudo.userName) {
                this.elements.cardAuthor.textContent = conteudo.userName;
                this.elements.cardAuthor.style.display = 'block';
                
                // Formatar nome do autor se necessário
                if (conteudo.userName.includes('-')) {
                    const formattedName = conteudo.userName
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    this.elements.cardAuthor.textContent = formattedName;
                }
            } else {
                this.elements.cardAuthor.style.display = 'none';
            }
        }

        // Versículo
        if (this.elements.verseSection && this.elements.verseText && this.elements.verseRef) {
            if (conteudo.bibleVerse && conteudo.bibleVerse.text) {
                this.elements.verseText.textContent = conteudo.bibleVerse.text;
                this.elements.verseRef.textContent = conteudo.bibleVerse.reference;
                this.elements.verseSection.style.display = 'flex';
            } else {
                this.elements.verseSection.style.display = 'none';
            }
        }

        // Galeria
        if (this.elements.galleryInner) {
            this.renderGallery(conteudo.images);
        }

        // Mídia
        if (this.elements.cardMedia) {
            this.renderMedia(conteudo.musicLink);
        }

        // QR Code (oculto)
        if (this.elements.qrCodeImage && this.state.cardData.qr_code_url) {
            this.elements.qrCodeImage.src = this.state.cardData.qr_code_url;
        }

        // Mostrar o cartão
        this.showState('cardContent');

        // Marcar o primeiro dot como ativo
        if (this.elements.sectionDots && this.elements.sectionDots.length > 0) {
            this.elements.sectionDots[0].classList.add('active');
        }
        
        // Rolagem suave entre seções
        if (this.elements.previewSections) {
            this.elements.previewSections.style.scrollBehavior = 'smooth';
        }
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
        // Configurar os eventos para os indicadores de seção
        this.elements.sectionDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const sectionId = dot.getAttribute('data-section');
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
                
                // Atualiza os dots
                this.elements.sectionDots.forEach(d => {
                    d.classList.remove('active');
                });
                dot.classList.add('active');
            });
        });
    }    setupSectionObserver() {
        const previewSections = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSections || !sections.length) return;

        // Configurar IntersectionObserver para detectar seções visíveis com maior precisão
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                    const sectionId = entry.target.id;
                    
                    // Atualiza o estado
                    this.state.activeSection = sectionId;
                    
                    // Atualizar classe ativa no indicator
                    this.elements.sectionDots.forEach(dot => {
                        const isActive = dot.getAttribute('data-section') === sectionId;
                        dot.classList.toggle('active', isActive);
                    });
                }
            });
        }, {
            root: previewSections,
            threshold: 0.7
        });

        // Observar todas as seções
        sections.forEach(section => {
            observer.observe(section);
        });

        // Adicionar evento de rolagem para controlar a navegação entre seções
        previewSections.addEventListener('wheel', this.handleWheelNavigation.bind(this));
        previewSections.addEventListener('keydown', this.handleKeyNavigation.bind(this));
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
      // Scroll para seção específica com efeito de transição aprimorado
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        // Atualizar estado antes da rolagem
        this.state.activeSection = sectionId;
        
        // Aplica transição suave personalizada
        const previewSections = this.elements.previewSections;
        if (previewSections) {
            // Efeito de transição
            section.classList.add('section-transition');
            
            // Rolar para a seção
            section.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            
            // Remover classe de transição após animação concluída
            setTimeout(() => {
                section.classList.remove('section-transition');
            }, 600);
        }
    }setupSectionIndicators() {
        const dots = document.querySelectorAll('.section-dot');
        const sections = document.querySelectorAll('.preview-section');
        
        // Verifica visibilidade das seções no carregamento
        this.checkSectionVisibility();
        
        // Atualiza indicadores quando há rolagem
        this.elements.previewSections.addEventListener('scroll', () => {
            this.checkSectionVisibility();
        });
          // Adiciona feedback visual ao clicar e navegação entre seções
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Efeito visual de clique adaptado para formato de traço
                dot.style.transform = 'scaleX(0.8) scaleY(0.9)';
                dot.style.opacity = '0.8';
                
                // Adicionar efeito de pulsação temporário
                const flash = document.createElement('div');
                flash.style.position = 'absolute';
                flash.style.top = '0';
                flash.style.left = '0';
                flash.style.right = '0';
                flash.style.bottom = '0';
                flash.style.background = 'var(--color-accent)';
                flash.style.borderRadius = '1.5px';
                flash.style.opacity = '0.6';
                flash.style.animation = 'flash-bar 0.4s ease-out';
                
                // Adicionar animação ao CSS se ainda não existir
                if (!document.querySelector('#flash-bar-animation')) {
                    const style = document.createElement('style');
                    style.id = 'flash-bar-animation';
                    style.textContent = `
                        @keyframes flash-bar {
                            0% { opacity: 0.6; }
                            100% { opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                dot.appendChild(flash);
                
                // Restaurar estado após a animação
                setTimeout(() => {
                    dot.style.transform = '';
                    dot.style.opacity = '';
                    if (flash.parentNode) {
                        flash.parentNode.removeChild(flash);
                    }
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
    }    // Configuração do efeito especial para a mensagem final
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
        
    // Configurar navegação por toque entre seções
    setupTouchNavigation() {
        const previewSections = document.querySelector('.preview-sections');
        if (!previewSections) return;
        
        let touchStartY = 0;
        let touchEndY = 0;
        let isTouchScrolling = false;
        
        previewSections.addEventListener('touchstart', (e) => {
            // Não iniciar nova navegação se já estiver rolando
            if (this.isScrolling) return;
            
            touchStartY = e.touches[0].clientY;
            isTouchScrolling = false;
        }, { passive: true });
        
        previewSections.addEventListener('touchmove', (e) => {
            // Marcar que está rolando para evitar navegação indesejada com pequenos toques
            isTouchScrolling = true;
        }, { passive: true });
        
        previewSections.addEventListener('touchend', (e) => {
            // Verificar se pode rolar (debounce)
            if (!isTouchScrolling || this.isScrolling) return;
            
            touchEndY = e.changedTouches[0].clientY;
            const touchDistance = touchEndY - touchStartY;
            
            // Garantir que o gesto foi significativo (distância mínima)
            if (Math.abs(touchDistance) > 70) {
                // Bloquear novas rolagens
                this.isScrolling = true;
                
                const currentSectionIndex = this.getCurrentSectionIndex();
                const direction = touchDistance < 0 ? 1 : -1; // Para baixo : Para cima
                
                this.navigateToAdjacentSection(currentSectionIndex, direction);
                
                // Permitir nova navegação após um período
                setTimeout(() => {
                    this.isScrolling = false;
                }, 800);
            }
        }, { passive: true });
    }checkSectionVisibility() {
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
    new DevotlyViewer();
});

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