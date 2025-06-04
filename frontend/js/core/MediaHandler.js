/**
 * MediaHandler.js
 * Enhanced media handling for both YouTube and Spotify embeds in Devotly app
 * Provides utilities for embedding, loading, and interacting with media content
 */

class MediaHandler {
    /**
     * Process a media URL and return appropriate embed information
     * @param {string} url - The URL to process (YouTube or Spotify)
     * @returns {Object|null} - Object containing embed URL and media type, or null if invalid
     */
    static getEmbedInfo(url) {
        if (!url) return null;
        
        // Process YouTube URLs
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (youtubeMatch) {
            return {
                url: `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1&rel=0`,
                type: 'youtube',
                id: youtubeMatch[1]
            };
        }

        // Process Spotify URLs with improved type detection
        const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|artist)\/([\w]+)/);
        if (spotifyMatch) {
            const embedPath = `${spotifyMatch[1]}/${spotifyMatch[2]}`;
            const mediaType = spotifyMatch[1] === 'playlist' ? 'spotify-playlist' : 'spotify';
            
            return {
                url: `https://open.spotify.com/embed/${embedPath}?utm_source=generator`,
                type: mediaType,
                id: spotifyMatch[2],
                category: spotifyMatch[1]
            };
        }

        return null;
    }

    /**
     * Create YouTube thumbnail preview with click-to-play functionality
     * @param {string} videoId - YouTube video ID
     * @param {Function} onPlay - Callback function when play is clicked
     * @returns {HTMLElement} - The preview element
     */
    static createYouTubePreview(videoId, onPlay) {
        // Use high-quality thumbnail
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        // Create preview element
        const previewDiv = document.createElement('div');
        previewDiv.className = 'youtube-preview';
        previewDiv.style.backgroundImage = `url(${thumbnailUrl})`;
        previewDiv.innerHTML = `
            <div class="youtube-play-button">
                <i class="fas fa-play"></i>
            </div>
        `;
        
        // Add click event
        if (typeof onPlay === 'function') {
            previewDiv.addEventListener('click', onPlay);
        }
        
        return previewDiv;
    }

    /**
     * Render media content in a container
     * @param {HTMLElement} container - The container to render media in
     * @param {string} mediaUrl - URL of the media to embed
     * @param {Object} options - Additional options
     */
    static renderMedia(container, mediaUrl, options = {}) {
        if (!container) return;
        
        // Default options
        const settings = {
            autoplay: false,
            showLoadingIndicator: true,
            onLoad: null,
            useThumbnailPreview: true,
            ...options
        };

        // Reset container
        container.innerHTML = '';
        container.removeAttribute('data-media-type');
        container.classList.remove('loaded');

        // Show "no media" if URL is empty
        if (!mediaUrl) {
            container.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-music"></i>
                    <p>Sem mídia</p>
                </div>
            `;
            return;
        }

        // Process the URL
        const mediaInfo = this.getEmbedInfo(mediaUrl);
        if (!mediaInfo) {
            container.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Formato de mídia não suportado</p>
                </div>
            `;
            return;
        }

        // Set container type for styling
        container.setAttribute('data-media-type', mediaInfo.type);

        // Show loading indicator if needed
        if (settings.showLoadingIndicator) {
            container.classList.add('loading');
            container.innerHTML = `
                <div class="media-loading-overlay">
                    <div class="media-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </div>
            `;
        }

        // Handle YouTube videos
        if (mediaInfo.type === 'youtube') {
            if (settings.useThumbnailPreview) {
                // Create and show thumbnail
                const preview = this.createYouTubePreview(mediaInfo.id, () => {
                    // When clicked, replace with iframe
                    const autoplayParam = settings.autoplay ? '1' : '0';
                    container.innerHTML = `
                        <iframe 
                            src="https://www.youtube.com/embed/${mediaInfo.id}?rel=0&showinfo=0&autoplay=${autoplayParam}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            title="YouTube video player"
                            loading="lazy"
                            onload="this.parentElement.classList.add('loaded')">
                        </iframe>
                    `;
                    
                    // Execute callback if provided
                    if (typeof settings.onLoad === 'function') {
                        settings.onLoad(container);
                    }
                });
                
                container.innerHTML = '';
                container.appendChild(preview);
            } else {
                // Direct iframe without preview
                const autoplayParam = settings.autoplay ? '1' : '0';
                container.innerHTML = `
                    <iframe 
                        src="https://www.youtube.com/embed/${mediaInfo.id}?rel=0&showinfo=0&autoplay=${autoplayParam}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        title="YouTube video player"
                        loading="lazy"
                        onload="this.parentElement.classList.add('loaded')">
                    </iframe>
                `;
            }
        } 
        // Handle Spotify embeds
        else if (mediaInfo.type === 'spotify' || mediaInfo.type === 'spotify-playlist') {
            container.innerHTML = `
                <iframe 
                    src="${mediaInfo.url}" 
                    frameborder="0" 
                    allowtransparency="true"
                    allow="encrypted-media"
                    loading="lazy"
                    onload="this.parentElement.classList.add('loaded')">
                </iframe>
            `;
            
            // Add load event listener
            const iframe = container.querySelector('iframe');
            if (iframe) {
                iframe.addEventListener('load', () => {
                    container.classList.add('loaded');
                    if (typeof settings.onLoad === 'function') {
                        settings.onLoad(container);
                    }
                });
            }
        }
    }

    /**
     * Setup visibility observer for media sections
     * This helps with performance by only loading media when visible
     * @param {string} selector - Selector for the media container
     */
    static setupVisibilityObserver(selector = '.media-container') {
        // Return if Intersection Observer is not supported
        if (!('IntersectionObserver' in window)) return;
        
        const mediaContainers = document.querySelectorAll(selector);
        if (mediaContainers.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('media-visible');
                    
                    // If it has data-lazy-media, load it now
                    const lazyMediaUrl = entry.target.getAttribute('data-lazy-media');
                    if (lazyMediaUrl) {
                        this.renderMedia(entry.target, lazyMediaUrl, {
                            useThumbnailPreview: true,
                            autoplay: false
                        });
                        
                        // Remove attribute to prevent reloading
                        entry.target.removeAttribute('data-lazy-media');
                    }
                    
                    // Unobserve after first visibility
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        // Observe each container
        mediaContainers.forEach(container => {
            observer.observe(container);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaHandler;
}
