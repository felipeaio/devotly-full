class CardRenderer {
    constructor({ previewId, formFields }) {
        this.previewContainer = document.getElementById(previewId);
        this.formFields = formFields;
        this.cardElements = {
            title: null,
            message: null,
            verse: null,
            images: []
        };

        this.initPreviewStructure();
    }

    initPreviewStructure() {
        this.previewContainer.innerHTML = `
        <div class="card-inner">
          <div class="card-header" data-element="title"></div>
          <div class="card-body">
            <div class="card-message" data-element="message"></div>
            <div class="card-verse" data-element="verse"></div>
          </div>
          <div class="card-images" data-element="images"></div>
        </div>
      `;

        // Cache DOM elements
        this.cardElements.title = this.previewContainer.querySelector('[data-element="title"]');
        this.cardElements.message = this.previewContainer.querySelector('[data-element="message"]');
        this.cardElements.verse = this.previewContainer.querySelector('[data-element="verse"]');
        this.cardElements.images = this.previewContainer.querySelector('[data-element="images"]');
    }

    updatePreview(data = {}) {
        // Update title
        if (data.title || this.formFields.title) {
            const title = data.title || document.getElementById(this.formFields.title)?.value;
            this.cardElements.title.innerHTML = title ? `<h2>${title}</h2>` : '';
        }

        // Update message
        if (data.message || this.formFields.message) {
            const message = data.message || document.getElementById(this.formFields.message)?.value;
            this.cardElements.message.innerHTML = message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : '';
        }

        // Update verse
        if (data.verse || this.formFields.verse) {
            const verse = data.verse || document.getElementById(this.formFields.verse)?.value;
            this.cardElements.verse.innerHTML = verse ? `<blockquote>${verse}</blockquote>` : '';
        }

        // Update images
        if (data.images || this.formFields.images) {
            const images = data.images || /* lógica para pegar imagens */[];
            this.renderImages(images);
        }
    }

    renderImages(images) {
        this.cardElements.images.innerHTML = '';

        if (images.length === 0) return;

        images.forEach(img => {
            const imgEl = document.createElement('div');
            imgEl.className = 'card-image';
            imgEl.style.backgroundImage = `url(${img.url})`;
            this.cardElements.images.appendChild(imgEl);
        });
    }

    refreshPreview() {
        this.updatePreview();
    }
}

export { CardRenderer };