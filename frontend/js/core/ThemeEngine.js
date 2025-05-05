class ThemeEngine {
    constructor({ themeSelect, previewContainer }) {
        this.themeSelect = document.getElementById(themeSelect);
        this.previewContainer = document.getElementById(previewContainer);
        this.availableThemes = {
            'stars': 'Tema Estrelado',
            'clouds': 'Tema Nuvens',
            'solid': 'Tema Sólido',
            'gradient': 'Tema Gradiente'
        };

        this.initThemeSelector();
        this.setupEventListeners();
    }

    initThemeSelector() {
        // Populate select options
        Object.entries(this.availableThemes).forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            this.themeSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        this.themeSelect.addEventListener('change', () => {
            this.applyTheme(this.themeSelect.value);
        });

        // Apply default theme
        this.applyTheme(this.themeSelect.value || 'stars');
    }

    applyTheme(themeName) {
        // Remove all theme classes
        this.previewContainer.classList.remove(...Object.keys(this.availableThemes));

        // Add selected theme class
        this.previewContainer.classList.add(themeName);

        // Apply theme-specific styles
        switch (themeName) {
            case 'stars':
                this.previewContainer.style.background = 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)';
                break;
            case 'clouds':
                this.previewContainer.style.background = 'linear-gradient(to bottom, #6e7f80, #536872)';
                break;
            case 'gradient':
                this.previewContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                break;
            default:
                this.previewContainer.style.background = '#1e293b';
        }
    }

    getCurrentTheme() {
        return this.themeSelect.value;
    }
}

export { ThemeEngine };