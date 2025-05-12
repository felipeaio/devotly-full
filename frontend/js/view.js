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
            error: null
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
            cardMedia: document.getElementById('cardMedia'),
            qrCodeImage: document.getElementById('qrCodeImage'),
            sectionDots: document.querySelectorAll('.section-dot'),
            toastNotification: document.getElementById('toastNotification'),
            toastMessage: document.getElementById('toastMessage'),
            retryBtn: document.getElementById('retryBtn'),
            checkAgainBtn: document.getElementById('checkAgainBtn')
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
            const response = await fetch(`http://localhost:3000/api/cards/${this.state.cardId}`);

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
            stateElement.style.display = 'block';
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
                this.elements.verseSection.style.display = 'block';
            } else {
                this.elements.verseSection.style.display = 'none';
            }
        }

        // Galeria
        if (this.elements.cardImages) {
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
    }

    renderGallery(images) {
        const container = this.elements.cardImages;
        if (!container) return;

        container.innerHTML = '';

        if (!images || !images.length) {
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-image"></i>
                    <p>Sem imagens</p>
                </div>
            `;
            return;
        }

        // Criar container para as imagens
        const galleryImages = document.createElement('div');
        galleryImages.className = 'gallery-images';
        container.appendChild(galleryImages);

        // Adicionar todas as imagens
        images.forEach((src, index) => {
            if (!src) return;

            const img = document.createElement('img');
            img.src = src;
            img.alt = `Imagem ${index + 1}`;
            img.loading = 'lazy';
            galleryImages.appendChild(img);
        });

        // Adicionar indicador de scroll
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'gallery-scroll-indicator';
        container.appendChild(scrollIndicator);

        let autoScrollInterval = null;
        let isUserInteracting = false;

        // Função de scroll automático refinada
        const autoScroll = () => {
            if (isUserInteracting) return;

            const scrollWidth = galleryImages.scrollWidth - container.clientWidth;
            let currentScroll = container.scrollLeft;

            currentScroll += container.clientWidth;

            if (currentScroll > scrollWidth) {
                currentScroll = 0;
            }

            container.scrollTo({
                left: currentScroll,
                behavior: 'smooth'
            });
        };

        // Iniciar transição automática com 5 segundos
        const startAutoScroll = () => {
            if (autoScrollInterval) clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(autoScroll, 5000); // Alterado para 5 segundos
        };

        // Parar transição automática
        const stopAutoScroll = () => {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
        };

        // Eventos de interação do usuário
        container.addEventListener('touchstart', () => {
            isUserInteracting = true;
            stopAutoScroll();
        }, { passive: true });

        container.addEventListener('mouseenter', () => {
            isUserInteracting = true;
            stopAutoScroll();
        });

        // Reiniciar transição após interação
        const resetAutoScroll = () => {
            isUserInteracting = false;
            // Pequeno delay antes de reiniciar para melhor experiência
            setTimeout(startAutoScroll, 500);
        };

        container.addEventListener('touchend', resetAutoScroll);
        container.addEventListener('mouseleave', resetAutoScroll);

        // Atualizar indicador de scroll
        container.addEventListener('scroll', () => {
            const progress = container.scrollLeft / (galleryImages.scrollWidth - container.clientWidth);
            if (scrollIndicator) {
                scrollIndicator.style.left = `${(progress * 80) + 10}%`;
                scrollIndicator.style.opacity = '1';

                clearTimeout(scrollIndicator.timeout);
                scrollIndicator.timeout = setTimeout(() => {
                    scrollIndicator.style.opacity = '0';
                }, 1500);
            }
        });

        // Iniciar o autoScroll
        startAutoScroll();
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
                    // Atualizar classe ativa no indicator
                    this.elements.sectionDots.forEach(dot => {
                        const isActive = dot.getAttribute('data-section') === entry.target.id;
                        dot.classList.toggle('active', isActive);
                    });

                    // Aplicar efeito de fundo baseado na seção
                    this.applyBackgroundEffect(entry.target.id);
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

        // Configurar evento de clique nos dots para navegação
        this.elements.sectionDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const sectionId = dot.getAttribute('data-section');
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    applyBackgroundEffect(sectionId) {
        // Método intencionalmente vazio para não alterar o fundo
        return;
    }

    navigateCarousel(direction) {
        const container = this.elements.cardImages;
        if (!container) return;

        const images = container.querySelectorAll('img');
        if (images.length <= 1) return;

        // Ocultar imagem atual
        images[this.state.currentImageIndex].style.display = 'none';
        images[this.state.currentImageIndex].classList.remove('active');

        // Calcular novo índice
        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;

        // Mostrar nova imagem
        images[this.state.currentImageIndex].style.display = 'block';
        images[this.state.currentImageIndex].classList.add('active');
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

    showToast(message, type = 'success') {
        if (!this.elements.toastNotification || !this.elements.toastMessage) return;

        // Definir mensagem
        this.elements.toastMessage.textContent = message;

        // Remover classes anteriores
        this.elements.toastNotification.className = 'toast-notification';

        // Adicionar classe de tipo
        this.elements.toastNotification.classList.add(`toast-${type}`);

        // Mostrar notificação
        this.elements.toastNotification.classList.add('visible');

        // Ocultar após 3 segundos
        setTimeout(() => {
            this.elements.toastNotification.classList.remove('visible');
        }, 3000);
    }

    setupTouchInteractions() {
        let touchStartY;
        const container = document.querySelector('.preview-sections');
        
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        container.addEventListener('touchmove', (e) => {
            if (!touchStartY) return;
            
            const touchY = e.touches[0].clientY;
            const diff = touchStartY - touchY;
            
            // Adicionar feedback visual baseado no gesto
            if (Math.abs(diff) > 50) {
                container.style.transform = `translateY(${-diff/10}px)`;
            }
        }, { passive: true });
        
        container.addEventListener('touchend', () => {
            container.style.transform = '';
            touchStartY = null;
        });
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new DevotlyViewer();
});