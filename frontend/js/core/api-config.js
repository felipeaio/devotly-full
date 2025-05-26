/**
 * Configuração de API para o frontend Devotly
 * Este arquivo centraliza todos os endpoints utilizados pelo frontend
 */

const ApiConfig = {  // Base URL para API - automaticamente detecta a URL atual ou usa o domínio de produção
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://devotly.shop/api',
  
  // Endpoints para cartões
  cards: {
    create: '/cards',
    get: (id) => `/cards/${id}`,
    search: '/cards/search',
    edit: (id) => `/cards/${id}/edit`
  },
  
  // Endpoint para upload de imagens
  upload: '/upload-image',
  
  // Endpoint para checkout
  checkout: '/checkout/create-preference',
  
  // Método para criar URLs completas
  url: function(endpoint) {
    return `${this.baseUrl}${endpoint}`;
  }
};

// Exporta para uso global
window.ApiConfig = ApiConfig;
