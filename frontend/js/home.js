document.addEventListener('DOMContentLoaded', () => {
    // Rastrear visualização da página inicial
    if (typeof TikTokEvents !== 'undefined') {
        TikTokEvents.viewHomePage();
        console.log('TikTok: Página inicial rastreada');
    }

    // Menu hambúrguer
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');

    navToggle.addEventListener('click', () => {
        const isOpen = nav.getAttribute('data-state') === 'open';
        nav.setAttribute('data-state', isOpen ? 'closed' : 'open');
        navToggle.setAttribute('aria-expanded', !isOpen);
        
        // Rastrear interação com menu
        if (typeof TikTokEvents !== 'undefined') {
            TikTokEvents.trackClickButton(isOpen ? 'Fechar Menu' : 'Abrir Menu', 'navigation', 1);
        }
    });

    // Navegação suave
    document.querySelectorAll('.nav__link').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                
                // Rastrear navegação entre seções
                if (typeof TikTokEvents !== 'undefined') {
                    const sectionNames = {
                        'inicio': 'Hero',
                        'como-funciona': 'Como Funciona',
                        'precos': 'Preços'
                    };
                    TikTokEvents.trackSectionView(targetId, sectionNames[targetId] || targetId);
                }
            }
            
            if (nav.getAttribute('data-state') === 'open') {
                nav.setAttribute('data-state', 'closed');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Rastrear cliques nos botões de CTA
    document.querySelectorAll('.btn, .cta-button, .hero__cta').forEach(button => {
        button.addEventListener('click', (e) => {
            const buttonText = button.textContent.trim();
            const buttonHref = button.getAttribute('href');
            
            if (typeof TikTokEvents !== 'undefined') {
                if (buttonText.toLowerCase().includes('criar') || buttonHref?.includes('create')) {
                    TikTokEvents.home.clickCreateCard();
                } else {
                    TikTokEvents.trackButtonClick('cta', buttonText);
                }
            }
        });
    });

    // Rastrear cliques nos planos
    document.querySelectorAll('.pricing-card .btn, .plan-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const planCard = button.closest('.pricing-card');
            if (planCard && typeof TikTokEvents !== 'undefined') {
                const planType = planCard.classList.contains('plan-forever') ? 'para_sempre' : 'anual';
                const priceElement = planCard.querySelector('.price-value');
                const planValue = priceElement ? parseFloat(priceElement.textContent.replace(/[^\d,]/g, '').replace(',', '.')) : 0;
                
                TikTokEvents.home.clickPlan(planType, planValue);
            }
        });
    });

    // Slider de preview
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            slide.setAttribute('aria-current', i === index);
        });
        
        // Rastrear mudança de slide
        if (typeof TikTokEvents !== 'undefined') {
            TikTokEvents.trackClickButton(`Slide ${index + 1}`, 'slider', 1);
        }
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    if (slides.length > 0) {
        setInterval(nextSlide, 5000);
        showSlide(currentSlide);
    }

    // Animação de contador
    const counter = document.querySelector('.counter .number');
    if (counter) {
        const target = parseInt(counter.getAttribute('data-counter'));
        let count = 0;
        const speed = 50;

        function updateCounter() {
            const increment = Math.ceil(target / 200);
            count += increment;
            if (count < target) {
                counter.textContent = count;
                setTimeout(updateCounter, speed);
            } else {
                counter.textContent = target;
                
                // Rastrear quando o contador finaliza
                if (typeof TikTokEvents !== 'undefined') {
                    TikTokEvents.trackClickButton('Contador Finalizado', 'engagement', 5);
                }
            }
        }

        // Animação ao visualizar
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    
                    // Rastrear visualização de seções
                    if (typeof TikTokEvents !== 'undefined') {
                        if (entry.target.classList.contains('counter')) {
                            updateCounter();
                            TikTokEvents.trackSectionView('counter', 'Contador de Cartões');
                        } else if (entry.target.classList.contains('hero__content')) {
                            TikTokEvents.home.viewHero();
                        } else if (entry.target.closest('#como-funciona')) {
                            TikTokEvents.home.viewHowItWorks();
                        } else if (entry.target.closest('#precos')) {
                            TikTokEvents.home.viewPricing();
                        }
                    }
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.hero__content, .step-card, .pricing-card, .counter').forEach(el => {
            observer.observe(el);
        });
    }

    // Rastreamento de scroll da página
    let scrollTimeout;
    let lastScrollPercentage = 0;
    
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolled = window.scrollY;
            const maxHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercentage = Math.round((scrolled / maxHeight) * 100);
            
            // Rastrear apenas marcos importantes e evitar spam
            if (scrollPercentage !== lastScrollPercentage && typeof TikTokEvents !== 'undefined') {
                TikTokEvents.home.scrollProgress(scrollPercentage);
                lastScrollPercentage = scrollPercentage;
            }
        }, 250);
    });

    // Rastrear tempo na página
    let pageStartTime = Date.now();
    let timeTracked = false;
    
    // Rastrear quando usuário fica 30 segundos na página
    setTimeout(() => {
        if (!timeTracked && typeof TikTokEvents !== 'undefined') {
            TikTokEvents.trackClickButton('Tempo na Página: 30s', 'engagement', 10);
            timeTracked = true;
        }
    }, 30000);

    // Rastrear saída da página
    window.addEventListener('beforeunload', () => {
        if (typeof TikTokEvents !== 'undefined') {
            const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
            if (timeOnPage > 10) { // Só rastrear se ficou mais de 10 segundos
                TikTokEvents.trackClickButton(`Tempo Total na Página: ${timeOnPage}s`, 'engagement', Math.min(timeOnPage / 10, 20));
            }
        }
    });
});