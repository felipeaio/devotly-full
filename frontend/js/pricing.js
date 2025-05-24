/**
 * Enhanced Pricing Section JavaScript
 * Adds interactivity to pricing cards and animates elements when in viewport
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos da seção de preços
    const pricingSection = document.querySelector('.pricing-section');
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    // Adiciona interatividade às cards de preço
    if (pricingCards.length) {
        pricingCards.forEach((card, index) => {
            // Configurar animação inicial (será ativada pelo IntersectionObserver)
            card.style.opacity = '0';
            
            // Adicionar efeitos de foco para acessibilidade
            card.addEventListener('focus', () => {
                card.classList.add('focused');
            });
            
            card.addEventListener('blur', () => {
                card.classList.remove('focused');
            });
            
            // Adicionar efeito de hover em dispositivos touch
            card.addEventListener('touchstart', () => {
                // Remover classe hover de todos os cards
                pricingCards.forEach(c => c.classList.remove('hovering'));
                // Adicionar apenas ao card atual
                card.classList.add('hovering');
            }, { passive: true });
        });
    }
    
    // Observer para ativar animações quando a seção estiver visível
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Ativar as animações com delay sequencial
                pricingCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                    }, 200 * (index + 1));
                });
                
                // Parar de observar depois que as animações forem ativadas
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    
    // Observar a seção de preços
    if (pricingSection) {
        observer.observe(pricingSection);
    }
    
    // Efeito de parallax suave ao rolar (apenas em desktop)
    if (window.innerWidth > 992 && pricingSection) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY;
            const sectionOffset = pricingSection.offsetTop;
            const sectionHeight = pricingSection.offsetHeight;
            
            if (scrollPosition > sectionOffset - window.innerHeight && 
                scrollPosition < sectionOffset + sectionHeight) {
                const parallaxValue = (scrollPosition - (sectionOffset - window.innerHeight)) * 0.05;
                
                // Aplicar efeito parallax aos elementos
                document.querySelectorAll('.pricing-card:nth-child(odd)').forEach(card => {
                    card.style.transform = `translateY(${-parallaxValue * 0.5}px)`;
                });
                
                document.querySelectorAll('.pricing-card:nth-child(even)').forEach(card => {
                    card.style.transform = `translateY(${parallaxValue * 0.5}px)`;
                });
            }
        });
    }
    
    // Adicionar preferencialidade de animação reduzida
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Desativar animações para usuários que preferem movimento reduzido
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.style.animation = 'none';
            card.style.opacity = '1';
            card.style.transform = 'none';
        });
    }
});
