/**
 * Enhanced Hero Section JavaScript - 2025
 * Implements improved animations, slider functionality, particles, and responsive behavior
 */

document.addEventListener('DOMContentLoaded', () => {
    // ======== Hero Section Enhancements ========
    
    // Menu hambúrguer com animação suave
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            const isOpen = nav.getAttribute('data-state') === 'open';
            nav.setAttribute('data-state', isOpen ? 'closed' : 'open');
            navToggle.setAttribute('aria-expanded', !isOpen);
            
            // Adiciona classe para animação
            nav.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            if (!isOpen) {
                nav.style.transform = 'translateY(0)';
                nav.style.opacity = '1';
            } else {
                nav.style.transform = 'translateY(-10px)';
                nav.style.opacity = '0';
            }
        });
    }
    
    // Inicializa as partículas para o fundo
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 30,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#d4af37"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                    "polygon": {
                        "nb_sides": 5
                    }
                },
                "opacity": {
                    "value": 0.3,
                    "random": true,
                    "anim": {
                        "enable": true,
                        "speed": 0.2,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": true,
                        "speed": 2,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#d4af37",
                    "opacity": 0.2,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 0.8,
                    "direction": "none",
                    "random": true,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": true,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": false,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 150,
                        "line_linked": {
                            "opacity": 0.8
                        }
                    }
                }
            },
            "retina_detect": true
        });
    }

    // Navegação suave com scroll melhorado
    document.querySelectorAll('.nav__link').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Cálculo para deslocamento do header
                const headerOffset = document.querySelector('.header').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollBy({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
            
            // Fecha o menu em mobile
            if (nav && nav.getAttribute('data-state') === 'open') {
                nav.setAttribute('data-state', 'closed');
                navToggle.setAttribute('aria-expanded', 'false');
                nav.style.transform = 'translateY(-10px)';
                nav.style.opacity = '0';
            }
        });
    });    // Texto dinâmico com efeito de digitação aprimorado
    const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos', 'de Esperança'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typedText = document.querySelector('.typed-text');

    if (typedText) {
        function type() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                typedText.textContent = currentWord.substring(0, charIndex--);
                if (charIndex < 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    setTimeout(type, 500); // Pausa antes de digitar nova palavra
                    return;
                }
            } else {
                typedText.textContent = currentWord.substring(0, charIndex++);
                if (charIndex > currentWord.length) {
                    isDeleting = true;
                    setTimeout(type, 1500); // Pausa antes de apagar
                    return;
                }
            }
            
            // Velocidade variável para efeito mais natural
            const typingSpeed = isDeleting ? Math.random() * (80 - 40) + 40 : Math.random() * (120 - 80) + 80;
            setTimeout(type, typingSpeed);
        }

        type();
    }

    // Controle de slides aprimorado
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.card-pagination .dot');
    let currentSlide = 0;
    
    function showSlide(index) {
        // Normalizar o índice
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }
        
        // Atualizar slides com transição suave
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === currentSlide);
            slide.setAttribute('aria-current', i === currentSlide);
        });
        
        // Atualizar indicadores (dots)
        if (dots.length > 0) {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
        }
    }
    
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    // Adicionar eventos de clique aos dots se existirem
    if (dots.length > 0) {
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                showSlide(i);
            });
        });
    }
    
    // Iniciar slider automático
    let slideInterval = setInterval(nextSlide, 5000);
    
    // Pausar slider ao hover
    const previewCard = document.querySelector('.preview-card');
    if (previewCard) {
        previewCard.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        previewCard.addEventListener('mouseleave', () => {
            slideInterval = setInterval(nextSlide, 5000);
        });
    }
    
    // Inicializar o slider
    showSlide(currentSlide);
    
    // Animação do contador com efeito suave
    const counter = document.querySelector('.counter .number');
    if (counter) {
        const target = parseInt(counter.getAttribute('data-counter'));
        const duration = 2000; // Duração em ms
        
        // Função de easing para animação mais suave
        function easeOutQuart(x) {
            return 1 - Math.pow(1 - x, 4);
        }
        
        let startTime;
        
        function animateCount(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const currentCount = Math.floor(easedProgress * target);
            
            counter.textContent = currentCount.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animateCount);
            } else {
                counter.textContent = target.toLocaleString();
            }
        }
        
        // Iniciar animação quando o elemento estiver visível
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(animateCount);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(counter);
    }
    
    // Animações baseadas em scroll
    const animatedElements = document.querySelectorAll('[data-animation]');
    
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                scrollObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    
    animatedElements.forEach(el => {
        scrollObserver.observe(el);
    });
    
    // Efeito de movimento paralaxe suave nos elementos
    if (window.innerWidth > 768) {
        const hero = document.querySelector('.hero');
        const heroContent = document.querySelector('.hero__content');
        const heroPreview = document.querySelector('.hero__preview');
        const badge = document.querySelector('.badge');
        const title = document.querySelector('.hero__title');
        
        // Função para efeito de parallaxe leve no movimento do mouse
        if (hero && heroContent) {
            hero.addEventListener('mousemove', (e) => {
                const { clientX, clientY } = e;
                const x = (clientX - window.innerWidth / 2) / 25;
                const y = (clientY - window.innerHeight / 2) / 25;
                
                // Aplicar transformações suaves nos elementos
                if (heroContent) heroContent.style.transform = `translate3d(${x * 0.5}px, ${y * 0.5}px, 0)`;
                if (heroPreview) heroPreview.style.transform = `translate3d(${x * -0.8}px, ${y * -0.8}px, 0) perspective(1000px) rotateY(${x * 0.05}deg)`;
                if (badge) badge.style.transform = `translate3d(${x * 1.2}px, ${y * 1.2}px, 20px)`;
                if (title) title.style.transform = `translate3d(${x * 0.3}px, ${y * 0.3}px, 10px)`;
            });
            
            // Restaurar posição original ao sair
            hero.addEventListener('mouseleave', () => {
                if (heroContent) heroContent.style.transform = 'translate3d(0, 0, 0)';
                if (heroPreview) heroPreview.style.transform = 'translate3d(0, 0, 0)';
                if (badge) badge.style.transform = 'translate3d(0, 0, 20px)';
                if (title) title.style.transform = 'translate3d(0, 0, 10px)';
            });
        }
    }
    
    // Efeito de brilho ao passar o mouse sobre os botões
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            btn.style.setProperty('--x', `${x}px`);
            btn.style.setProperty('--y', `${y}px`);
        });
    });
});
