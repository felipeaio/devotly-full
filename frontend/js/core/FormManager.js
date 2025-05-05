class FormManager {
    constructor({ formId, progressId, steps }) {
        this.form = document.getElementById(formId);
        this.progressContainer = document.getElementById(progressId);
        this.totalSteps = steps;
        this.currentStep = 1;
        this.formData = {};

        this.initProgressSteps();
        this.setupFormListeners();
    }

    initProgressSteps() {
        this.progressContainer.innerHTML = '';

        for (let i = 1; i <= this.totalSteps; i++) {
            const step = document.createElement('li');
            step.className = 'progress-step';
            step.innerHTML = `
          <span class="step-number">${i}</span>
          <span class="step-label">Passo ${i}</span>
        `;
            step.dataset.step = i;
            this.progressContainer.appendChild(step);
        }
    }

    setupFormListeners() {
        // Event delegation for all inputs
        this.form.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.formData[e.target.id] = e.target.value;
            }
        });

        // Handle select changes
        this.form.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') {
                this.formData[e.target.id] = e.target.value;
            }
        });
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
            this.updateUI();
        }
    }

    prevStep() {
        this.currentStep = Math.max(this.currentStep - 1, 1);
        this.updateUI();
    }

    validateCurrentStep() {
        const currentStepEl = this.form.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepEl.querySelectorAll('[required]');

        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showError(field, 'Este campo é obrigatório');
                isValid = false;
            } else if (field.pattern && !new RegExp(field.pattern).test(field.value)) {
                this.showError(field, 'Formato inválido');
                isValid = false;
            }
        });

        return isValid;
    }

    showError(field, message) {
        const feedbackEl = field.closest('.form-control').querySelector('.form-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = message;
            field.classList.add('error');
        }
    }

    updateUI() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.querySelector(`.form-step[data-step="${this.currentStep}"]`).classList.add('active');

        // Update progress
        document.querySelectorAll('.progress-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === this.currentStep);
            step.classList.toggle('completed', stepNum < this.currentStep);
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getFormData() {
        return {
            ...this.formData,
            currentStep: this.currentStep
        };
    }
}

// Export para uso modular
export { FormManager };