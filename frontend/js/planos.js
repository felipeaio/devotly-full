class DevotlyPlanos {
    constructor() {
        this.elements = {
            planoAnual: document.getElementById('planoAnual'),
            planoParaSempre: document.getElementById('planoParaSempre'),
            emailInput: document.getElementById('emailInput'),
            loadingState: document.getElementById('loadingState')
        };

        this.initialize();
    }

    initialize() {
        this.elements.planoAnual.addEventListener('click', () => this.handlePlanoSelect('anual'));
        this.elements.planoParaSempre.addEventListener('click', () => this.handlePlanoSelect('para_sempre'));
    }

    async handlePlanoSelect(plano) {
        const email = this.elements.emailInput.value.trim();
        
        if (!email || !this.validateEmail(email)) {
            alert('Por favor, insira um email válido');
            return;
        }

        this.showLoading(true);        try {
            const response = await fetch(window.ApiConfig.url('/checkout/create-preference'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plano, email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar checkout');
            }

            // Redirecionar para o Checkout Pro do Mercado Pago
            window.location.href = data.init_point;

        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar pagamento. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showLoading(show) {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? 'flex' : 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DevotlyPlanos();
});