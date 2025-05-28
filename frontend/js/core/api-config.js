// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.hostname.includes('railway.app')
        ? `https://${window.location.hostname}`
        : 'https://api.devotly.shop';

export { API_BASE_URL };