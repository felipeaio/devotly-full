/**
 * AgapeCard - Sistema Avançado de Efeitos de Fundo no Preview
 * 
 * Controla os efeitos visuais dentro do preview do cartão com:
 * - Melhor performance e suavidade de animações
 * - Sistema de temas extensível
 * - Controles de intensidade
 * - Responsividade aprimorada
 * - Efeitos de transição entre temas
 */

class BackgroundEffects {
    constructor() {
        this.container = document.getElementById('previewTheme');
        this.currentTheme = 'stars';
        this.themeIntensity = 1.0; // 0 a 1
        this.animationFrame = null;
        this.resizeObserver = null;
        this.mousePosition = { x: 0, y: 0 };
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Preview container (#previewTheme) not found');
            return;
        }

        // Configurações iniciais
        this.setupThemeSelector();
        this.setupIntensityControls();
        this.setupInteractivity();
        this.setupResponsive();

        // Expor API global se necessário
        window.AgapeEffects = {
            applyTheme: (theme) => this.applyTheme(theme),
            setIntensity: (value) => this.setIntensity(value)
        };

        // Aplicar tema inicial
        this.applyTheme(this.currentTheme);
    }

    setupResponsive() {
        // Observar mudanças de tamanho para ajustar efeitos
        this.resizeObserver = new ResizeObserver(() => {
            if (this.currentTheme) {
                this.applyTheme(this.currentTheme, true); // Redesenha mantendo o tema
            }
        });
        this.resizeObserver.observe(this.container);

        // Otimização para dispositivos móveis
        if ('ontouchstart' in window) {
            this.container.classList.add('is-touch');
        }
    }


    setIntensity(value) {
        this.themeIntensity = Math.max(0.1, Math.min(1, value));
        this.updateEffectsIntensity();
    }

    updateEffectsIntensity() {
        switch (this.currentTheme) {
            case 'stars':
                this.updateStarsIntensity();
                break;
            case 'clouds':
                this.updateCloudsIntensity();
                break;
            case 'light':
                this.updateLightIntensity();
                break;
        }
    }

    setupInteractivity() {
        // Rastrear posição do mouse para efeitos de parallax
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mousePosition = {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height
            };
            this.handleMouseMove();
        });

        this.container.addEventListener('mouseleave', () => {
            this.mousePosition = { x: 0.5, y: 0.5 };
            this.handleMouseLeave();
        });

        // Otimização: Usar requestAnimationFrame para interações suaves
        this.animationFrame = requestAnimationFrame(this.updateAnimations.bind(this));
    }

    handleMouseMove() {
        if (this.currentTheme === 'clouds') {
            const clouds = this.container.querySelectorAll('.cloud');
            const intensity = this.themeIntensity * 0.1;

            clouds.forEach(cloud => {
                const speed = parseFloat(cloud.dataset.speed) || 0.05;
                const x = (this.mousePosition.x - 0.5) * speed * 100 * intensity;
                const y = (this.mousePosition.y - 0.5) * speed * 100 * intensity;
                cloud.style.transform = `translate(${x}px, ${y}px)`;
            });
        }
    }

    handleMouseLeave() {
        if (this.currentTheme === 'clouds') {
            const clouds = this.container.querySelectorAll('.cloud');
            clouds.forEach(cloud => {
                cloud.style.transform = 'translate(0, 0)';
            });
        }
    }

    updateAnimations() {
        // Atualizar animações baseadas em tempo ou interação
        if (this.currentTheme === 'stars') {
            this.updateStarsAnimation();
        }

        this.animationFrame = requestAnimationFrame(this.updateAnimations.bind(this));
    }

    updateStarsAnimation() {
        // Implementação opcional para animações mais complexas
    }

    applyTheme(theme, keepContent = false) {
        if (!this.container || !theme) return;

        // Transição suave entre temas
        this.container.classList.add('theme-transition');
        setTimeout(() => {
            this.container.classList.remove('theme-transition');
        }, 500);

        // Limpar efeitos anteriores
        if (!keepContent) {
            const previewCard = this.container.querySelector('.preview-card');
            this.container.innerHTML = '';
            if (previewCard) this.container.appendChild(previewCard);
        }

        // Remover classes de tema antigo
        this.container.className = 'preview-theme';
        this.container.classList.add(`theme-${theme}`);
        this.currentTheme = theme;

        // Aplicar novo tema
        switch (theme) {
            case 'none':
                this.container.style.background = '';
                break;
            case 'stars':
                this.createStars();
                break;
            case 'clouds':
                this.createClouds();
                break;
            case 'light':
                this.createLight();
                break;
            default:
                this.createCustomTheme(theme);
        }

        // Ativar efeitos
        setTimeout(() => {
            this.activateEffects();
            this.updateEffectsIntensity();
        }, 100);
    }

    createStars() {
        this.container.style.background = 'linear-gradient(135deg, #0a0e17, #1a1a2e)';
        const density = this.calculateDensity(30, 100, 150);

        for (let i = 0; i < density; i++) {
            const star = document.createElement('div');
            star.className = 'star';

            // Tipos de estrela com diferentes características
            const type = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)];
            star.classList.add(type);

            // Posicionamento aleatório
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;

            // Animação personalizada
            const duration = Math.random() * 15 + 5;
            const delay = Math.random() * 10;
            star.style.animation = `twinkle ${duration}s ease-in-out ${delay}s infinite`;

            // Brilho baseado na intensidade
            star.style.opacity = (Math.random() * 0.7 + 0.3) * this.themeIntensity;

            this.container.appendChild(star);
        }
    }

    createClouds() {
        this.container.style.background = 'linear-gradient(135deg, #87CEEB, #E0F6FF)';
        const density = this.calculateDensity(5, 10, 15);

        for (let i = 0; i < density; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';

            // Tamanho e posição
            const size = Math.random() * 100 + 50;
            cloud.style.width = `${size}px`;
            cloud.style.height = `${size * 0.5}px`;
            cloud.style.top = `${Math.random() * 100}%`;

            // Animação de movimento
            const duration = Math.random() * 30 + 20;
            const direction = Math.random() > 0.5 ? 'normal' : 'reverse';
            cloud.style.animation = `float ${duration}s linear infinite ${direction}`;

            // Opacidade e velocidade de parallax
            cloud.style.opacity = (Math.random() * 0.3 + 0.1) * this.themeIntensity;
            cloud.dataset.speed = (Math.random() * 0.05 + 0.02).toFixed(3);

            this.container.appendChild(cloud);
        }
    }

    createLight() {
        this.container.style.background = 'linear-gradient(135deg, #FFF9E6, #FFE4B5)';

        // Luz central
        const holyLight = document.createElement('div');
        holyLight.className = 'holy-light';
        holyLight.style.opacity = this.themeIntensity;
        this.container.appendChild(holyLight);

        // Raios de luz
        const rays = 8 + Math.floor(this.themeIntensity * 4);
        for (let i = 0; i < rays; i++) {
            const ray = document.createElement('div');
            ray.className = 'light-ray';

            const angle = (i / rays) * 360;
            const length = 50 + (Math.random() * 50 * this.themeIntensity);

            ray.style.transform = `rotate(${angle}deg)`;
            ray.style.height = `${length}%`;
            ray.style.animationDelay = `${i * 0.3}s`;
            ray.style.opacity = 0.7 * this.themeIntensity;

            this.container.appendChild(ray);
        }
    }

    createCustomTheme(theme) {
        // Implementação para temas personalizados
        console.log(`Tema personalizado "${theme}" não implementado`);
    }

    calculateDensity(mobile, tablet, desktop) {
        // Calcular densidade baseada no tamanho da tela e intensidade
        const width = window.innerWidth;
        let baseDensity = width < 768 ? mobile : width < 1024 ? tablet : desktop;
        return Math.floor(baseDensity * this.themeIntensity);
    }

    activateEffects() {
        this.container.querySelectorAll('.star, .cloud, .holy-light, .light-ray')
            .forEach(el => el.classList.add('visible'));
    }

    updateStarsIntensity() {
        const stars = this.container.querySelectorAll('.star');
        stars.forEach(star => {
            const baseOpacity = parseFloat(star.dataset.baseOpacity) || Math.random() * 0.7 + 0.3;
            star.style.opacity = baseOpacity * this.themeIntensity;
        });
    }

    updateCloudsIntensity() {
        const clouds = this.container.querySelectorAll('.cloud');
        clouds.forEach(cloud => {
            const baseOpacity = parseFloat(cloud.dataset.baseOpacity) || Math.random() * 0.3 + 0.1;
            cloud.style.opacity = baseOpacity * this.themeIntensity;
        });
    }

    updateLightIntensity() {
        const holyLight = this.container.querySelector('.holy-light');
        if (holyLight) holyLight.style.opacity = this.themeIntensity;

        const rays = this.container.querySelectorAll('.light-ray');
        rays.forEach(ray => {
            ray.style.opacity = 0.7 * this.themeIntensity;
        });
    }

    setupThemeSelector() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                themeOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.applyTheme(option.dataset.theme);
            });
        });
    }

    destroy() {
        // Limpeza para evitar memory leaks
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.removeEventListener('mousemove', this.handleMouseMove);
        this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    }
}

// Inicialização segura
document.addEventListener('DOMContentLoaded', () => {
    window.agapeEffects = new BackgroundEffects();
});