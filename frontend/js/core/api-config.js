/**
 * API Configuration
 * Centralizes all API URL configuration for the Devotly application
 */
export const API_CONFIG = (() => {  // Determine base URL based on environment
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
    // Get the current hostname with protocol
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Use the exact same hostname as the current page to avoid CORS issues
  const baseUrl = isLocalhost 
    ? 'http://localhost:3000' 
    : `${protocol}//${hostname}`;
  
  // Remove trailing slash if present
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    
  return {    // Base URLs
    baseUrl: normalizedBaseUrl,
    
    // Card endpoints
    cards: {
      create: `${normalizedBaseUrl}/api/cards`,      get: (id) => `${normalizedBaseUrl}/api/cards/${id}`,
      search: (email) => `${normalizedBaseUrl}/api/cards/search?email=${encodeURIComponent(email)}`,
      edit: (id) => `${normalizedBaseUrl}/api/cards/${id}/edit`,
    },
    
    // Image upload
    upload: `${normalizedBaseUrl}/api/upload`,
      // Checkout
    checkout: {
      createPreference: `${normalizedBaseUrl}/api/checkout/create-preference`,
    },
    
    // Webhooks
    webhook: {
      mercadoPago: `${normalizedBaseUrl}/api/webhook/mercadopago`,
    },
  };
})();
