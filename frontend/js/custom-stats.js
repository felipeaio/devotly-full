/**
 * DEVOTLY - CUSTOM STATS INTERACTIVE ENHANCEMENTS
 * Adds interactive functionality and animations to the custom-stats element
 */

class CustomStatsEnhancer {
    constructor() {
        this.statsElement = document.querySelector('.custom-stats');
        this.numberElement = document.querySelector('.counter .number');
        this.starsElement = document.querySelector('.stars');
        this.avatarFrames = document.querySelectorAll('.avatar-frame');
        
        this.currentNumber = 112;
        this.targetNumber = 112;
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        if (!this.statsElement) return;
        
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.startPeriodicUpdates();
        this.addTooltips();
        this.setupKeyboardNavigation();
    }

    setupEventListeners() {
        // Add click handlers for avatars
        this.avatarFrames.forEach((avatar, index) => {
            avatar.addEventListener('click', () => this.onAvatarClick(avatar, index));
            avatar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.onAvatarClick(avatar, index);
                }
            });
        });

        // Add stats element click handler
        if (this.statsElement) {
            this.statsElement.addEventListener('click', () => this.onStatsClick());
        }

        // Add star hover effects
        if (this.starsElement) {
            this.starsElement.addEventListener('mouseenter', () => this.animateStars());
        }
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateOnEntry();
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -50px 0px'
        });

        if (this.statsElement) {
            observer.observe(this.statsElement);
        }
    }

    onAvatarClick(avatar, index) {
        // Add ripple effect
        this.createRippleEffect(avatar);
        
        // Add temporary highlight class
        avatar.classList.add('avatar-clicked');
        setTimeout(() => {
            avatar.classList.remove('avatar-clicked');
        }, 600);

        // Show tooltip with user info
        this.showAvatarTooltip(avatar, index);
    }

    onStatsClick() {
        if (this.isAnimating) return;
        
        // Simulate a stats update
        this.simulateStatsUpdate();
    }

    animateStars() {
        const stars = this.starsElement.textContent.split('');
        stars.forEach((star, index) => {
            if (star === '★') {
                setTimeout(() => {
                    this.createStarTwinkle(index);
                }, index * 100);
            }
        });
    }

    createStarTwinkle(starIndex) {
        // Create a temporary twinkle element
        const twinkle = document.createElement('span');
        twinkle.textContent = '✨';
        twinkle.style.cssText = `
            position: absolute;
            top: -5px;
            left: ${starIndex * 20 + 10}px;
            animation: starTwinkleEffect 0.8s ease-out forwards;
            pointer-events: none;
            z-index: 10;
        `;
        
        this.starsElement.style.position = 'relative';
        this.starsElement.appendChild(twinkle);
        
        setTimeout(() => {
            twinkle.remove();
        }, 800);
    }

    createRippleEffect(element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(244, 196, 64, 0.3);
            transform: translate(-50%, -50%) scale(0);
            animation: rippleEffect 0.6s ease-out forwards;
            pointer-events: none;
            z-index: 1;
        `;
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    simulateStatsUpdate() {
        this.isAnimating = true;
        this.statsElement.classList.add('loading');
        
        // Simulate incrementing the number
        const increment = Math.floor(Math.random() * 10) + 1;
        this.targetNumber = this.currentNumber + increment;
        
        this.animateNumber(this.currentNumber, this.targetNumber, 1500);
        
        setTimeout(() => {
            this.statsElement.classList.remove('loading');
            this.statsElement.classList.add('updated');
            this.isAnimating = false;
            
            setTimeout(() => {
                this.statsElement.classList.remove('updated');
            }, 2000);
        }, 1500);
    }

    animateNumber(start, end, duration) {
        const startTime = performance.now();
        const range = end - start;
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentNumber = Math.floor(start + (range * easeOutQuart));
            
            if (this.numberElement) {
                this.numberElement.textContent = currentNumber.toLocaleString('pt-BR');
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                this.currentNumber = end;
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    animateOnEntry() {
        // Stagger animation for avatars
        this.avatarFrames.forEach((avatar, index) => {
            setTimeout(() => {
                avatar.style.animation = 'slideInUp 0.6s ease-out forwards';
            }, index * 150);
        });

        // Animate stats display
        setTimeout(() => {
            if (this.starsElement) {
                this.starsElement.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        }, 450);

        setTimeout(() => {
            this.animateNumber(0, this.currentNumber, 2000);
        }, 600);
    }

    addTooltips() {
        const tooltipTexts = [
            'Maria - Membro ativo há 2 anos',
            'João - Compartilhou 150+ cartões',
            'Ana - Designer de cartões especiais'
        ];

        this.avatarFrames.forEach((avatar, index) => {
            avatar.setAttribute('title', tooltipTexts[index]);
            avatar.setAttribute('tabindex', '0');
            avatar.setAttribute('role', 'button');
        });

        if (this.starsElement) {
            this.starsElement.setAttribute('title', 'Avaliação média de 5 estrelas dos nossos usuários');
        }

        if (this.numberElement) {
            this.numberElement.setAttribute('title', 'Total de cartões criados pela nossa comunidade');
        }
    }

    showAvatarTooltip(avatar, index) {
        const messages = [
            'Maria já criou mais de 50 cartões inspiradores! 🙏',
            'João é nosso evangelizador digital! ✝️',
            'Ana desenha os cartões mais belos! 🎨'
        ];

        this.showTemporaryTooltip(avatar, messages[index]);
    }

    showTemporaryTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: var(--color-light);
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
            font-size: 0.8rem;
            white-space: nowrap;
            z-index: 1000;
            margin-bottom: 5px;
            opacity: 0;
            animation: tooltipFadeIn 0.3s ease-out forwards;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.animation = 'tooltipFadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                tooltip.remove();
            }, 300);
        }, 2000);
    }

    setupKeyboardNavigation() {
        // Add tab navigation support
        this.avatarFrames.forEach((avatar, index) => {
            avatar.addEventListener('focus', () => {
                avatar.style.outline = '2px solid var(--color-accent)';
                avatar.style.outlineOffset = '2px';
            });

            avatar.addEventListener('blur', () => {
                avatar.style.outline = 'none';
            });
        });
    }

    startPeriodicUpdates() {
        // Simulate periodic stats updates (every 30 seconds)
        setInterval(() => {
            if (!this.isAnimating && Math.random() > 0.7) {
                this.simulateStatsUpdate();
            }
        }, 30000);
    }
}

// CSS animations for JavaScript effects
const dynamicStyles = `
@keyframes rippleEffect {
    from {
        transform: translate(-50%, -50%) scale(0);
        opacity: 1;
    }
    to {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
    }
}

@keyframes starTwinkleEffect {
    0% {
        transform: scale(0) rotate(0deg);
        opacity: 1;
    }
    50% {
        transform: scale(1.5) rotate(180deg);
        opacity: 0.8;
    }
    100% {
        transform: scale(0) rotate(360deg);
        opacity: 0;
    }
}

@keyframes slideInUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes fadeInUp {
    from {
        transform: translateY(10px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes tooltipFadeIn {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(5px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

@keyframes tooltipFadeOut {
    from {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    to {
        opacity: 0;
        transform: translateX(-50%) translateY(-5px);
    }
}

.avatar-clicked {
    animation: avatarPulse 0.6s ease-out !important;
}

@keyframes avatarPulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.15);
        box-shadow: 0 0 20px rgba(244, 196, 64, 0.6);
    }
    100% {
        transform: scale(1);
    }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CustomStatsEnhancer();
});

// Re-initialize if navigating back to page
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        new CustomStatsEnhancer();
    }
});