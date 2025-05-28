// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.hostname.includes('railway.app')
        ? 'https://devotly-full-production.up.railway.app'
        : window.location.hostname.includes('devotly.shop')
            ? 'https://devotly-full-production.up.railway.app'
            : 'https://devotly-full-production.up.railway.app';

export { API_BASE_URL };