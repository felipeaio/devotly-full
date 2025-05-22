/**
 * DevotlyViewer - Visualização de cartões
 * Baseado no layout de preview do create.js
 */
class DevotlyViewer {
    constructor() {
        // Estado inicial
        this.state = {
            cardId: null,
            cardData: null,
            currentImageIndex: 0,
            loading: true,
            error: null,
            activeSection: 'titleSection'
        };

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
            toastNotification: document.getElementById('toastNotification'),
            toastMessage: document.getElementById('toastMessage'),
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
            // Determine server URL based on environment
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000'
                : 'https://api.devotly.com';

            const response = await fetch(`${baseUrl}/api/cards/${this.state.cardId}`);

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

            if (this.state.cardData.status_pagamento !== 'aprovado') {
                this.showState('paymentErrorState');
                return;
            }

            this.renderCard();
            this.setupEventListeners();
            this.setupSectionObserver();
            this.setupTouchInteractions();

        } catch (error) {
            console.error('Erro ao buscar dados do cartão:', error);
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
        }

        if (this.elements.finalMessage) {
            this.elements.finalMessage.textContent = conteudo.finalMessage || '';
        }

        // Autor
        if (this.elements.cardAuthor) {
            if (conteudo.userName) {
                this.elements.cardAuthor.textContent = conteudo.userName;
                this.elements.cardAuthor.style.display = 'block';
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
    }

    renderMedia(mediaLink) {
        const container = this.elements.cardMedia;
        if (!container) return;

        // Limpar conteúdo existente
        container.innerHTML = '';

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

        // Determinar tipo de mídia e renderizar
        if (mediaLink.includes('youtube.com') || mediaLink.includes('youtu.be')) {
            const videoId = this.getYouTubeId(mediaLink);
            if (videoId) {
                container.innerHTML = `
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
            }
        } else if (mediaLink.includes('spotify.com')) {
            const spotifyData = this.getSpotifyId(mediaLink);
            if (spotifyData) {
                container.innerHTML = `
                    <iframe 
                        src="https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}" 
                        frameborder="0" 
                        allowtransparency="true" 
                        allow="encrypted-media">
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
    }

    setupSectionObserver() {
        const previewSections = document.querySelector('.preview-sections');
        const sections = document.querySelectorAll('.preview-section');

        if (!previewSections || !sections.length) return;

        // Configurar IntersectionObserver para detectar seções visíveis
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
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
            threshold: 0.5
        });

        // Observar todas as seções
        sections.forEach(section => {
            observer.observe(section);
        });
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
      });

      // Add error handling
      iframe.addEventListener('error', () => {
        container.innerHTML = `
          <div class="no-media">
            <i class="fas fa-exclamation-circle"></i>
            <p>Não foi possível carregar o conteúdo</p>
          </div>
        `;
      });

      // Improve iframe attributes for better performance and security
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      
      // Add title for accessibility
      iframe.setAttribute('title', 'Conteúdo de mídia incorporado');

      // Add sandbox attributes for security
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    }
  });
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', setupMediaContainer);