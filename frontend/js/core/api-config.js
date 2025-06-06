// API Configuration
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://devotly-full-production.up.railway.app';

export const API_CONFIG = {
    upload: `${API_BASE_URL}/api/upload`,
    checkout: {
        createPreference: `${API_BASE_URL}/api/checkout/create-preference`
    },
    cards: {
        create: `${API_BASE_URL}/api/cards`,
        search: `${API_BASE_URL}/api/cards/search`,
        get: (id) => `${API_BASE_URL}/api/cards/${id}`,
        edit: (id) => `${API_BASE_URL}/api/cards/${id}/edit`
    }
};