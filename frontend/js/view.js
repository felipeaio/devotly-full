// view.js - Lógica completa da visualização
document.addEventListener('DOMContentLoaded', async () => {
    // Elementos do DOM
    const cardTitle = document.getElementById('cardTitle');
    const cardMessage = document.getElementById('cardMessage');
    const bibleVerse = document.getElementById('bibleVerse');
    const verseReference = document.getElementById('verseReference');
    const finalMessage = document.getElementById('finalMessage');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const mediaSection = document.getElementById('mediaSection');
    const mediaButton = document.getElementById('mediaButton');
    const imagesSection = document.getElementById('imagesSection');
    const swiperWrapper = document.getElementById('swiperWrapper');

    // Efeitos de fundo
    const canvas = document.getElementById('backgroundCanvas');
    const effectManager = new EffectManager(canvas);

    // Carrega os dados do cartão
    const cardId = new URLSearchParams(window.location.search).get('id');
    let cardData = {};

    try {
        cardData = await fetchCardData(cardId);
        renderCard(cardData);

        // Configura o tema do efeito de fundo
        effectManager.changeTheme(cardData.theme || 'starry');
        effectManager.init();
    } catch (error) {
        console.error('Erro ao carregar cartão:', error);
        renderError();
    }

    // Função para buscar dados do cartão
    async function fetchCardData(id) {
        // Em produção, substitua por uma chamada real à sua API
        // const response = await fetch(`/api/cards/${id}`);
        // return await response.json();

        // Simulação de dados para demonstração
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: id || 'demo-card',
                    title: 'Bênção para sua Vida',
                    message: 'Que Deus abençoe seu caminho e ilumine seus passos cada dia. Que você sinta o amor dEle em cada momento.',
                    verse: {
                        text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
                        reference: 'João 3:16'
                    },
                    images: [
                        'https://source.unsplash.com/random/600x400/?faith,christian',
                        'https://source.unsplash.com/random/600x400/?bible,church',
                        'https://source.unsplash.com/random/600x400/?cross,jesus'
                    ],
                    mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    mediaType: 'youtube',
                    finalMessage: 'Que o Senhor te guarde e te abençoe abundantemente!',
                    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://devotly.app/card/' + (id || 'demo-card'),
                    theme: 'light'
                });
            }, 500);
        });
    }

    // Função para renderizar o cartão
    function renderCard(data) {
        // Informações básicas
        cardTitle.textContent = data.title;
        cardMessage.textContent = data.message;

        // Versículo bíblico
        if (data.verse) {
            bibleVerse.textContent = `"${data.verse.text}"`;
            verseReference.textContent = `— ${data.verse.reference}`;
        } else {
            bibleVerse.textContent = '"O Senhor é o meu pastor, nada me faltará."';
            verseReference.textContent = '— Salmos 23:1';
        }

        // Mensagem final
        finalMessage.textContent = data.finalMessage || 'Que Deus te abençoe!';

        // QR Code
        if (data.qrCode) {
            qrCodeImage.src = data.qrCode;
        }

        // Mídia (YouTube/Spotify)
        if (data.mediaUrl && data.mediaType) {
            mediaSection.classList.remove('hidden');

            // Configura o botão de mídia
            const iconClass = data.mediaType === 'youtube' ? 'fa-youtube' : 'fa-spotify';
            const buttonText = data.mediaType === 'youtube' ? 'Reproduzir Vídeo' : 'Reproduzir Música';

            mediaButton.innerHTML = `<i class="fab ${iconClass}"></i> ${buttonText}`;

            // Configura o evento de clique
            mediaButton.addEventListener('click', () => {
                window.open(data.mediaUrl, '_blank');
            });
        }

        // Carrossel de imagens
        if (data.images && data.images.length > 0) {
            imagesSection.classList.remove('hidden');

            // Adiciona as imagens ao carrossel
            swiperWrapper.innerHTML = data.images.map(img => `
          <div class="swiper-slide">
            <img src="${img}" alt="Imagem do cartão">
          </div>
        `).join('');

            // Inicializa o Swiper
            new Swiper('.swiper', {
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });
        }
    }

    // Função para exibir erro
    function renderError() {
        cardTitle.textContent = 'Cartão não encontrado';
        cardMessage.textContent = 'O cartão que você está tentando acessar não foi encontrado. Verifique o link e tente novamente.';

        // Esconde seções opcionais
        mediaSection.classList.add('hidden');
        imagesSection.classList.add('hidden');
    }

    // Efeito de rolagem suave para seções
    document.querySelectorAll('.scroll-indicator').forEach(indicator => {
        indicator.addEventListener('click', () => {
            window.scrollBy({
                top: window.innerHeight,
                behavior: 'smooth'
            });
        });
    });
});