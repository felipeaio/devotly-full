// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : '/api'; // Sempre usar /api que será redirecionado pelo Nginx para o backend correto

export { API_BASE_URL };