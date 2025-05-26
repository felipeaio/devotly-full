/**
 * API Configuration
 * Centralizes all API URL configuration for the Devotly application
 */
export const API_CONFIG = (() => {  // Determine base URL based on environment and protocol
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  // Use the same protocol as the current page
  const protocol = window.location.protocol;
  
  // Base URLs - use current protocol for production
  const baseUrl = isLocalhost 
    ? 'http://localhost:3000' 
    : `${protocol}//devotly.shop`;
  
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
