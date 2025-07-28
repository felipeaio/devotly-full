// Enhanced button interactions - VERSÃO APRIMORADA
document.addEventListener('DOMContentLoaded', () => {
    // Detectar tipo de dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasHoverSupport = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    
    // Botão criar agora
    const createBtn = document.querySelector('.btn--create');
    if (createBtn) {
        // Efeitos para desktop com hover
        if (hasHoverSupport) {
            createBtn.addEventListener('mouseenter', function() {
                // Efeito sparkle aprimorado
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => createSparkle(this), i * 100);
                }
                
                // Adicionar glow sutil ao ícone
                const icon = this.querySelector('.btn-icon');
                if (icon) {
                    icon.style.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))';
                }
            });
            
            createBtn.addEventListener('mouseleave', function() {
                const icon = this.querySelector('.btn-icon');
                if (icon) {
                    icon.style.filter = '';
                }
            });
            
            // Efeito de movimento do mouse
            createBtn.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const deltaX = (x - centerX) / centerX;
                const deltaY = (y - centerY) / centerY;
                
                const rotateX = deltaY * 5;
                const rotateY = deltaX * -5;
                
                this.style.transform = `translateY(-4px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            createBtn.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        }
        
        // Efeitos para mobile (touch)
        if (isMobile || !hasHoverSupport) {
            createBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                
                // Efeito de feedback tátil
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                // Sparkle no toque
                const touch = e.touches[0];
                const rect = this.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                createTouchSparkle(this, x, y);
                
                // Adicionar classe de toque ativo
                this.classList.add('touch-active');
            });
            
            createBtn.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            });
        }
        
        // Efeito de clique universal
        createBtn.addEventListener('click', function(e) {
            // Prevenir múltiplos cliques rápidos
            if (this.classList.contains('processing')) {
                e.preventDefault();
                return;
            }
            
            this.classList.add('processing');
            
            // Efeito ripple melhorado
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            createRipple(this, x, y, 'gold');
            
            // Efeito de loading sutil
            setTimeout(() => {
                this.classList.remove('processing');
            }, 1000);
        });
    }
    
    // Função para criar sparkle aprimorado
    function createSparkle(element) {
        const sparkle = document.createElement('span');
        sparkle.className = 'sparkle';
        
        // Tamanhos e posições variados
        const size = Math.random() * 6 + 3; // 3-9px
        const left = Math.random() * 80 + 10; // 10-90%
        const top = Math.random() * 80 + 10; // 10-90%
        
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${left}%`;
        sparkle.style.top = `${top}%`;
        sparkle.style.animationDelay = `${Math.random() * 0.3}s`;
        
        element.appendChild(sparkle);
        
        setTimeout(() => {
            if (element.contains(sparkle)) {
                element.removeChild(sparkle);
            }
        }, 800);
    }
    
    // Função para sparkle no toque
    function createTouchSparkle(element, x, y) {
        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('span');
            sparkle.className = 'sparkle touch-sparkle';
            
            const size = Math.random() * 8 + 4;
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;
            sparkle.style.left = `${x + offsetX}px`;
            sparkle.style.top = `${y + offsetY}px`;
            sparkle.style.position = 'absolute';
            sparkle.style.animationDelay = `${i * 0.1}s`;
            
            element.appendChild(sparkle);
            
            setTimeout(() => {
                if (element.contains(sparkle)) {
                    element.removeChild(sparkle);
                }
            }, 600);
        }
    }
    
    // Função para ripple aprimorado
    function createRipple(element, x, y, color = 'white') {
        const ripple = document.createElement('span');
        ripple.className = `ripple ripple--${color}`;
        
        const size = Math.max(element.clientWidth, element.clientHeight);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            if (element.contains(ripple)) {
                element.removeChild(ripple);
            }
        }, 600);
    }
    
    // Botão demo com efeitos aprimorados
    const demoBtn = document.querySelector('.btn--demo');
    if (demoBtn) {
        if (hasHoverSupport) {
            demoBtn.addEventListener('mouseenter', function() {
                const icon = this.querySelector('.btn-icon');
                if (icon) {
                    icon.classList.add('pulsing');
                    icon.style.color = 'var(--gold-light)';
                }
            });
            
            demoBtn.addEventListener('mouseleave', function() {
                const icon = this.querySelector('.btn-icon');
                if (icon) {
                    icon.classList.remove('pulsing');
                    icon.style.color = '';
                }
            });
        }
        
        demoBtn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            createRipple(this, x, y, 'demo');
        });
    }
});
