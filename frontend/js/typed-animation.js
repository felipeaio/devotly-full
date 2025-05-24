/**
 * Text Typing Animation for Hero Section
 * Modern typewriter effect for changing text dynamically
 */

document.addEventListener('DOMContentLoaded', () => {
    const typedTextElement = document.querySelector('.typed-text');
    const cursorElement = document.querySelector('.cursor');
    
    // Words to display in the animation
    const words = ['de Fé', 'Inspiradores', 'Cristãos', 'Eternos', 'de Esperança'];
    
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isEnd = false;
    
    // Timing variables
    const typingDelay = 150; // Delay between each character when typing
    const erasingDelay = 100; // Delay between each character when erasing
    const newWordDelay = 2000; // Delay before starting to erase a complete word
    
    function type() {
        // Get current word
        const currentWord = words[wordIndex];
        
        // Set typing speed based on whether we are deleting or adding characters
        const delay = isDeleting ? erasingDelay : typingDelay;
        
        // Check if we've completed typing or deleting the current word
        if (!isDeleting && charIndex === currentWord.length) {
            // Delay before starting to delete
            isEnd = true;
            setTimeout(() => {
                isDeleting = true;
                isEnd = false;
                type();
            }, newWordDelay);
            return;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            setTimeout(type, 500);
            return;
        }
        
        // Update text content
        charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
        typedTextElement.textContent = currentWord.substring(0, charIndex);
        
        // Add blinking cursor at end if word is completely typed
        if (isEnd) {
            cursorElement.classList.add('blink');
        } else {
            cursorElement.classList.remove('blink');
        }
        
        // Schedule next update
        setTimeout(type, delay);
    }
    
    // Start the typing animation if the element exists
    if (typedTextElement && cursorElement) {
        // Set initial text
        typedTextElement.textContent = '';
        // Start typing effect
        setTimeout(type, newWordDelay);
    }
});
