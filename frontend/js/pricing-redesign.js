/**
 * Devotly - Pricing Redesign JavaScript
 * Adds interactive features and animations to the pricing section
 */

document.addEventListener('DOMContentLoaded', () => {
  // References to pricing section elements
  const pricingSection = document.querySelector('.pricing-section');
  const pricingCards = document.querySelectorAll('.pricing-card');
  const featuredCard = document.querySelector('.pricing-card.featured');
  const recommendedTag = document.querySelector('.recommended-tag');
  
  // Animate cards when they enter the viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add animation class to cards with a staggered delay
        pricingCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('animate-in');
          }, index * 150); // Stagger by 150ms
        });
        
        // Disconnect after animation
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });
  
  // Start observing the pricing section
  if (pricingSection) {
    observer.observe(pricingSection);
  }
  
  // Add hover state management for mobile
  if (pricingCards.length) {
    pricingCards.forEach(card => {
      // Touch device support - simulate hover
      card.addEventListener('touchstart', function() {
        const wasActive = this.classList.contains('hover-active');
        
        // Remove active state from all cards
        pricingCards.forEach(c => c.classList.remove('hover-active'));
        
        // Toggle for the current card
        if (!wasActive) {
          this.classList.add('hover-active');
        }
      }, { passive: true });
      
      // Add enhanced focus support for accessibility
      card.addEventListener('focus', function() {
        this.classList.add('focus-visible');
      });
      
      card.addEventListener('blur', function() {
        this.classList.remove('focus-visible');
      });
    });
  }
    // Enhanced tag visibility and positioning
  if (recommendedTag && featuredCard) {
    // Ensure proper positioning of tag
    const ensureTagAlignment = () => {
      // Measure and make sure tag is centered
      const cardWidth = featuredCard.offsetWidth;
      const tagWidth = recommendedTag.offsetWidth;
      
      // Check if tag is wider than the card on small screens and adjust
      if (tagWidth > cardWidth * 0.9) {
        recommendedTag.style.maxWidth = (cardWidth * 0.9) + 'px';
      }
    };
      
    // Check on scroll
    const checkTagVisibility = () => {
      const rect = recommendedTag.getBoundingClientRect();
      
      if (rect.top < 0) {
        recommendedTag.classList.add('tag-sticky');
      } else {
        recommendedTag.classList.remove('tag-sticky');
      }
    };
    
    // Check on resize and scroll
    window.addEventListener('resize', ensureTagAlignment, { passive: true });
    window.addEventListener('scroll', checkTagVisibility, { passive: true });
    
    // Initial checks
    ensureTagAlignment();
    checkTagVisibility();
  }
  
  // Handle responsive adjustments
  const handleResize = () => {
    // Adjust for different devices
    if (window.innerWidth < 768 && featuredCard) {
      featuredCard.style.transform = 'none';
    }
  };
  
  // Listen for resize events
  window.addEventListener('resize', handleResize, { passive: true });
  
  // Initial setup
  handleResize();
  
  // Add subtle parallax effect on mouse move (desktop only)
  if (window.innerWidth >= 992 && pricingSection) {
    pricingSection.addEventListener('mousemove', (e) => {
      // Only execute on devices that likely support hover
      if (window.matchMedia('(hover: hover)').matches) {
        const { offsetX, offsetY, target } = e;
        const isCard = target.closest('.pricing-card');
        
        if (isCard) {
          const card = isCard;
          const cardRect = card.getBoundingClientRect();
          
          // Calculate mouse position relative to the card center
          const cardCenterX = cardRect.width / 2;
          const cardCenterY = cardRect.height / 2;
          
          // Calculate the distance from center (normalized -1 to 1)
          const moveX = (offsetX - cardCenterX) / cardCenterX;
          const moveY = (offsetY - cardCenterY) / cardCenterY;
          
          // Apply subtle rotation based on mouse position
          card.style.transform = `perspective(1000px) rotateX(${moveY * 2}deg) rotateY(${moveX * -2}deg) translateZ(10px)`;
          
          // Reset card position when mouse leaves
          card.addEventListener('mouseleave', () => {
            card.style.transform = '';
          }, { once: true });
        }
      }
    });
  }
  
  // Honor reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  }
});
