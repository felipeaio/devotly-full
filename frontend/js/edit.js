class DevotlyEditor {
    constructor() {
        this.elements = {
            emailSearch: document.getElementById('emailSearch'),
            searchBtn: document.getElementById('searchBtn'),
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            cardsGrid: document.getElementById('cardsGrid'),
            cardsContainer: document.getElementById('cardsContainer'),
            editModal: document.getElementById('editModal'),
            editForm: document.getElementById('editForm'),
            closeModal: document.getElementById('closeModal'),
            cancelEdit: document.getElementById('cancelEdit'),
            toastNotification: document.getElementById('toastNotification'),
            toastMessage: document.getElementById('toastMessage')
        };

        // Verificar se todos os elementos foram encontrados
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`Elemento ${key} não encontrado`);
            }
        });

        // Load API config
        this.loadApiConfig();
        
        this.currentCardId = null;
        this.initialize();
    }

    // Add API config loading method
    async loadApiConfig() {
        try {
            const { API_CONFIG } = await import('./core/api-config.js');
            this.apiConfig = API_CONFIG;
        } catch (error) {
            console.error('Erro ao carregar configuração da API:', error);
        }
    }
    
    initialize() {
        // Event Listeners
        this.elements.searchBtn.addEventListener('click', () => this.searchCards());
        this.elements.emailSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCards();
        });
        
        this.elements.closeModal.addEventListener('click', () => this.closeModal());
        this.elements.cancelEdit.addEventListener('click', () => this.closeModal());
        this.elements.editForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async searchCards() {
        const email = this.elements.emailSearch.value.trim();
        if (!email) {
            this.showToast('Por favor, digite um e-mail', 'error');
            return;
        }

        this.showState('loadingState');

        try {
            // Ensure API config is loaded
            if (!this.apiConfig) {
                const { API_CONFIG } = await import('./core/api-config.js');
                this.apiConfig = API_CONFIG;
            }
            
            const response = await fetch(this.apiConfig.cards.search(email));
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao buscar cartões');
            }

            if (!data.cards || data.cards.length === 0) {
                this.showState('errorState');
                this.showToast('Nenhum cartão encontrado para este e-mail', 'info');
                return;
            }

            this.renderCards(data.cards);
            this.showState('cardsGrid');
            this.showToast(`${data.cards.length} cartões encontrados`, 'success');

        } catch (error) {
            console.error('Erro na busca:', error);
            this.showState('errorState');
            this.showToast('Erro ao buscar cartões. Tente novamente.', 'error');
        }
    }

    renderCards(cards) {
        this.elements.cardsContainer.innerHTML = '';

        cards.forEach(card => {
            if (card.status_pagamento === 'aprovado') {
                const cardElement = this.createCardElement(card);
                this.elements.cardsContainer.appendChild(cardElement);
            }
        });
    }

    createCardElement(card) {
        const article = document.createElement('article');
        article.className = 'card-thumbnail';
        article.innerHTML = `
            <h3>${card.conteudo.cardTitle}</h3>
            <p>${card.conteudo.cardMessage}</p>
            <div class="card-meta">
                <span>Criado em: ${new Date(card.created_at).toLocaleDateString()}</span>
                <button class="btn btn-small btn-primary edit-btn">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        `;

        article.querySelector('.edit-btn').addEventListener('click', () => {
            this.openEditModal(card);
        });

        return article;
    }

    // Atualizar o método openEditModal
    openEditModal(card) {
        this.currentCardId = card.id;
        
        // Preencher o formulário com os valores atuais
        const form = this.elements.editForm;
        const conteudo = card.conteudo;

        if (form) {
            form.cardTitle.value = conteudo.cardTitle || '';
            form.cardMessage.value = conteudo.cardMessage || '';
            form.finalMessage.value = conteudo.finalMessage || '';
        }

        // Mostrar modal
        const modal = this.elements.editModal;
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            document.body.style.overflow = 'hidden';
        }
    }

    // Atualizar o método closeModal
    closeModal() {
        const modal = this.elements.editModal;
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                this.currentCardId = null;
                this.elements.editForm.reset();
            }, 300);
            document.body.style.overflow = '';
        }
    }

    // Atualizar o método handleSubmit
    async handleSubmit(e) {
        e.preventDefault();

        if (!this.currentCardId) {
            this.showToast('ID do cartão não encontrado', 'error');
            return;
        }

        const formData = {
            cardTitle: this.elements.editForm.cardTitle.value,
            cardMessage: this.elements.editForm.cardMessage.value,
            finalMessage: this.elements.editForm.finalMessage.value
        };

        try {
            // Ensure API config is loaded
            if (!this.apiConfig) {
                const { API_CONFIG } = await import('./core/api-config.js');
                this.apiConfig = API_CONFIG;
            }
            
            const response = await fetch(this.apiConfig.cards.edit(this.currentCardId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conteudo: formData })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao atualizar cartão');
            }

            this.showToast('Cartão atualizado com sucesso!', 'success');
            this.closeModal();
            await this.searchCards(); // Atualizar a lista de cartões

        } catch (error) {
            console.error('Erro ao atualizar:', error);
            this.showToast(error.message || 'Erro ao atualizar cartão', 'error');
        }
    }

    showState(stateId) {
        ['loadingState', 'errorState', 'cardsGrid'].forEach(state => {
            const element = this.elements[state];
            if (element) {
                element.style.display = state === stateId ? 'block' : 'none';
            }
        });
    }

    showToast(message, type = 'success') {
        if (!this.elements.toastNotification || !this.elements.toastMessage) return;

        this.elements.toastMessage.textContent = message;
        this.elements.toastNotification.className = 'toast-notification';
        this.elements.toastNotification.classList.add(`toast-${type}`);
        this.elements.toastNotification.classList.add('visible');

        setTimeout(() => {
            this.elements.toastNotification.classList.remove('visible');
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DevotlyEditor();
});