/**
 * Devotly - Create (Versão Aprimorada)
 * 
 * Controle completo do fluxo de criação de cartões com pré-visualização em tempo real
 */

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

        this.state = {
            currentStep: 0,
            totalSteps: this.elements.formSteps.length,
            formData: {
                cardName: '',
                cardTitle: '',
                cardMessage: '',
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

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showStep(this.state.currentStep);
        this.updateProgress();
        this.updatePreview();
        this.loadBibleBooks();
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
            this.state.formData.cardName = e.target.value.trim().toLowerCase();
            document.getElementById('urlPreview').textContent =
                this.state.formData.cardName || 'seunome';
            document.getElementById('previewUrl').textContent =
                this.state.formData.cardName || 'seunome';
            this.updatePreview();
        });

        document.getElementById('cardTitle').addEventListener('input', (e) => {
            this.state.formData.cardTitle = e.target.value;
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

        document.querySelectorAll('.format-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.formatText(e.target.closest('button').dataset.format);
                this.updatePreview();
            });
        });

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

        document.querySelectorAll('.section-dot').forEach(indicator => {
            indicator.addEventListener('click', () => {
                const targetSection = document.getElementById(indicator.dataset.section);
                targetSection.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Adicione um observer para atualizar os indicadores conforme o scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    document.querySelectorAll('.section-dot').forEach(dot => {
                        dot.classList.toggle(
                            'active', 
                            dot.dataset.section === entry.target.id
                        );
                    });
                }
            });
        }, {
            threshold: 0.5
        });

        // Observe todas as seções
        document.querySelectorAll('.preview-section').forEach(section => {
            observer.observe(section);
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
            stepElement.classList.toggle('active', index === step);
        });

        this.elements.stepIndicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index <= step);
        });

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
                const messageInput = currentStepElement.querySelector('#cardMessage');

                if (!titleInput.value.trim()) {
                    this.showError(titleInput, 'Por favor, insira um título para o cartão');
                    isValid = false;
                }

                if (!messageInput.value.trim()) {
                    this.showError(messageInput, 'Por favor, insira uma mensagem para o cartão');
                    isValid = false;
                }
                break;

            case 2:
                const bookSelect = currentStepElement.querySelector('#bibleBook');
                const chapterInput = currentStepElement.querySelector('#bibleChapter');
                const verseInput = currentStepElement.querySelector('#bibleVerse');

                if (!bookSelect.value || !chapterInput.value || !verseInput.value) {
                    this.showError(bookSelect, 'Por favor, selecione um livro, capítulo e versículo');
                    isValid = false;
                }
                break;

            case 4:
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
        const progress = ((this.state.currentStep + 1) / this.state.totalSteps) * 100;
        this.elements.progressBar.style.width = `${progress}%`;
    }

    formatText(format) {
        const textarea = document.getElementById('cardMessage');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let formattedText = '';

        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `_${selectedText}_`;
                break;
        }

        textarea.value = textarea.value.substring(0, start) +
            formattedText +
            textarea.value.substring(end);

        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
        this.state.formData.cardMessage = textarea.value;
    }

    async convertToWebP(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                            type: 'image/webp'
                        });
                        resolve(webpFile);
                    } else {
                        reject(new Error('Failed to convert to WebP'));
                    }
                }, 'image/webp', 0.8); // 80% quality
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            reader.onerror = () => reject(new Error('Failed to read file'));

            reader.readAsDataURL(file);
        });
    }

    // Atualize o método handleImageUpload
    async handleImageUpload() {
        const files = Array.from(this.elements.imageUpload.files);
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        
        if (!files.length) return;

        if (this.state.formData.images.length + files.length > 7) {
            this.showError(uploadArea, 'Você pode enviar no máximo 7 imagens');
            this.elements.imageUpload.value = '';
            return;
        }

        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                this.showError(uploadArea, `A imagem "${file.name}" é muito grande (máx. 2MB)`);
                continue;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Adiciona ao estado
                this.state.formData.images.push(e.target.result);

                // Cria o preview da imagem
                const previewElement = document.createElement('div');
                previewElement.className = 'image-preview';
                previewElement.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-image" data-index="${this.state.formData.images.length - 1}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                // Adiciona ao container de preview
                imagePreviewContainer.appendChild(previewElement);

                // Adiciona evento para remover imagem
                previewElement.querySelector('.remove-image').addEventListener('click', (event) => {
                    const index = parseInt(event.currentTarget.dataset.index);
                    this.state.formData.images.splice(index, 1);
                    previewElement.remove();
                    this.updatePreview();
                    this.reindexImages();
                });

                this.updatePreview();
            };

            reader.readAsDataURL(file);
        }
    }

    // Adicione este novo método para reindexar as imagens após remoção
    reindexImages() {
        const previews = document.querySelectorAll('.image-preview .remove-image');
        previews.forEach((button, index) => {
            button.dataset.index = index;
        });
    }

    updateCarouselControls() {
        const galleryContainer = document.getElementById('previewImages');
        
        // Só mostra controles se houver mais de uma imagem
        if (this.state.formData.images.length > 1) {
            // Adiciona controles de navegação se ainda não existirem
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
        window.applyPreviewTheme(theme); // Call the global function from effects.js
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
        
        if (images.length <= 1) return;

        images[this.state.currentImageIndex].classList.remove('active');
        indicators[this.state.currentImageIndex].classList.remove('active');

        this.state.currentImageIndex = (this.state.currentImageIndex + direction + images.length) % images.length;
        
        images[this.state.currentImageIndex].classList.add('active');
        indicators[this.state.currentImageIndex].classList.add('active');
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

updatePreview() {
    // Seção 1: Título
    document.getElementById('previewCardTitle').textContent = 
        this.state.formData.cardTitle || "Mensagem de Fé para Você";

    // Seção 2: Mensagem
    const messageElement = document.getElementById('previewCardMessage');
    let formattedMessage = this.state.formData.cardMessage || "Sua mensagem aparecerá aqui...";
    formattedMessage = formattedMessage
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>');
    messageElement.innerHTML = formattedMessage;

    // Seção 3: Versículo
    document.getElementById('previewVerseText').textContent =
        this.state.formData.bibleVerse.text
            ? `"${this.state.formData.bibleVerse.text}"`
            : '"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito..."';
    document.getElementById('previewVerseRef').textContent =
        this.state.formData.bibleVerse.reference || 'João 3:16';

    // Seção 4: Imagens
    const galleryContainer = document.querySelector('#gallerySection .gallery-container');
    galleryContainer.innerHTML = '';

    if (this.state.formData.images.length > 0) {
        this.state.formData.images.forEach((imageUrl, index) => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Imagem ${index + 1}`;
            img.classList.toggle('active', index === this.state.currentImageIndex);
            galleryContainer.appendChild(img);
        });

        if (this.state.formData.images.length > 1) {
            // Adiciona controles do carrossel
            galleryContainer.innerHTML += `
                <div class="carousel-controls">
                    <button class="carousel-prev">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="carousel-indicators">
                    ${this.state.formData.images.map((_, index) => `
                        <div class="carousel-indicator${index === this.state.currentImageIndex ? ' active' : ''}"></div>
                    `).join('')}
                </div>
            `;

            // Adiciona event listeners para os controles
            galleryContainer.querySelector('.carousel-prev').addEventListener('click', () => this.navigateCarousel(-1));
            galleryContainer.querySelector('.carousel-next').addEventListener('click', () => this.navigateCarousel(1));
        }
    } else {
        galleryContainer.innerHTML = `
            <div class="no-images">
                <i class="fas fa-image"></i>
                <span>Nenhuma imagem selecionada</span>
            </div>
        `;
    }

    // Seção 5: Mídia
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

    // URL (rodapé)
    document.getElementById('previewUrl').textContent =
        this.state.formData.cardName || 'seunome';
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
}

document.addEventListener('DOMContentLoaded', () => {
    new DevotlyCreator();
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            document.querySelectorAll('.section-dot').forEach(dot => {
                dot.classList.toggle(
                    'active', 
                    dot.dataset.section === entry.target.id
                );
            });
        }
    });
}, {
    threshold: 0.5
});