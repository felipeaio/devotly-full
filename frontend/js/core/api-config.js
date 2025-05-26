/**
 * API Configuration
 * Centralizes all API URL configuration for the Devotly application
 */
export const API_CONFIG = (() => {
  // Determine base URL based on environment
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  // Base URLs
  const baseUrl = isLocalhost 
    ? 'http://localhost:3000' 
    : window.location.origin;
    
  return {
    // Base URLs
    baseUrl,
    
    // Card endpoints
    cards: {
      create: `${baseUrl}/api/cards`,
      get: (id) => `${baseUrl}/api/cards/${id}`,
      search: (email) => `${baseUrl}/api/cards/search?email=${encodeURIComponent(email)}`,
      edit: (id) => `${baseUrl}/api/cards/${id}/edit`,
    },
    
    // Image upload
    upload: `${baseUrl}/api/upload`,
    
    // Checkout
    checkout: {
      createPreference: `${baseUrl}/api/checkout/create-preference`,
    },
    
    // Webhooks
    webhook: {
      mercadoPago: `${baseUrl}/api/webhook/mercadopago`,
    },
  };
})();
