/**
 * Configuração de API para o frontend Devotly
 * Este arquivo centraliza todos os endpoints utilizados pelo frontend
 */

const ApiConfig = {  // Base URL para API - automaticamente detecta a URL atual ou usa o domínio de produção
  baseUrl: (function() {
    // Verificar se estamos em ambiente de desenvolvimento local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // Em ambiente de produção, usar o mesmo protocolo e host da página atual
    // Isso resolve problemas de CORS e conexões recusadas
    return `${window.location.protocol}//${window.location.host}/api`;
  })(),
  
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
