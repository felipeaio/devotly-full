document.addEventListener('DOMContentLoaded', () => {
    // Menu hambúrguer
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');

    navToggle.addEventListener('click', () => {
        const isOpen = nav.getAttribute('data-state') === 'open';
        nav.setAttribute('data-state', isOpen ? 'closed' : 'open');
        navToggle.setAttribute('aria-expanded', !isOpen);
    });

    // Navegação suave
    document.querySelectorAll('.nav__link').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
            if (nav.getAttribute('data-state') === 'open') {
                nav.setAttribute('data-state', 'closed');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Texto dinâmico no hero
    const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typedText = document.querySelector('.typed-text');

    function type() {
        const currentWord = words[wordIndex];
        if (isDeleting) {
            typedText.textContent = currentWord.substring(0, charIndex--);
            if (charIndex < 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
            }
        } else {
            typedText.textContent = currentWord.substring(0, charIndex++);
            if (charIndex > currentWord.length) {
                isDeleting = true;
                setTimeout(type, 1500);
                return;
            }
        }
        setTimeout(type, isDeleting ? 50 : 100);
    }

    type();

    // Slider de preview
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            slide.setAttribute('aria-current', i === index);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    setInterval(nextSlide, 5000);
    showSlide(currentSlide);

    // Animação de contador
    const counter = document.querySelector('.counter .number');
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
        }
    }

    // Animação ao visualizar
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                if (entry.target.classList.contains('counter')) {
                    updateCounter();
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.hero__content, .step-card, .pricing-card').forEach(el => {
        observer.observe(el);
    });
});