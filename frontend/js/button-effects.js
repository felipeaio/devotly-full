// Enhanced button interactions
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effect for create button
    const createBtn = document.querySelector('.btn--create');
    if (createBtn) {
        // Add subtle particle effect on hover
        createBtn.addEventListener('mouseenter', function() {
            // Only run on devices that support hover
            if (window.matchMedia('(hover: hover)').matches) {
                // Create subtle sparkle effect
                for (let i = 0; i < 5; i++) {
                    createSparkle(this);
                }
            }
        });
    }
    
    // Function to create sparkle effect
    function createSparkle(element) {
        const sparkle = document.createElement('span');
        sparkle.className = 'sparkle';
        
        // Random position within the button
        const size = Math.random() * 8 + 4; // 4-12px
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        
        // Add sparkle to button
        element.appendChild(sparkle);
        
        // Remove sparkle after animation completes
        setTimeout(() => {
            if (element.contains(sparkle)) {
                element.removeChild(sparkle);
            }
        }, 600);
    }
    
    // Add subtle hover effect for demo button
    const demoBtn = document.querySelector('.btn--demo');
    if (demoBtn) {
        demoBtn.addEventListener('mouseenter', function() {
            if (window.matchMedia('(hover: hover)').matches) {
                this.querySelector('.btn-icon').classList.add('pulsing');
                
                setTimeout(() => {
                    const icon = this.querySelector('.btn-icon');
                    if (icon) {
                        icon.classList.remove('pulsing');
                    }
                }, 800);
            }
        });
    }
    
    // Add dynamic ripple effect on click for both buttons
    document.querySelectorAll('.btn--create, .btn--demo').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                if (this.contains(ripple)) {
                    this.removeChild(ripple);
                }
            }, 600);
        });
    });
});
