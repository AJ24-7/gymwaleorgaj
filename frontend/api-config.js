/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

const API_CONFIG = {
    // Automatically detect if running in development or production
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000' 
        : window.location.origin,
    
    // API endpoints
    ENDPOINTS: {
        // User endpoints
    USER_PROFILE: '/api/users/profile',
    USER_COUPONS: '/api/users/{userId}/coupons',
        
        // Offers endpoints
        OFFERS_ACTIVE: '/api/offers/active',
        OFFERS_BY_GYM: '/api/offers/gym/{gymId}/active',
        
        // Auth endpoints
        AUTH_LOGIN: '/api/auth/login',
        AUTH_REGISTER: '/api/auth/register',
        
        // Gym endpoints
        GYM_DETAILS: '/api/gym/{gymId}',
        GYM_LIST: '/api/gyms'
    }
};

// Helper function to build full URL
function buildApiUrl(endpoint, params = {}) {
    let url = API_CONFIG.BASE_URL + endpoint;
    
    // Replace parameters in URL
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
}

// Helper function to make API calls with proper error handling
async function apiCall(endpoint, options = {}, params = {}) {
    const url = buildApiUrl(endpoint, params);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        console.log(`🔌 API Call: ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorData);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API Success: ${url}`, data);
        return data;
        
    } catch (error) {
        console.error(`🚫 API Call Failed: ${url}`, error);
        throw error;
    }
}

// Export for global use
window.API_CONFIG = API_CONFIG;
window.buildApiUrl = buildApiUrl;
window.apiCall = apiCall;

// For debugging
window.testApiConfig = function() {
    console.log('🔧 API Configuration Test');
    console.log('Base URL:', API_CONFIG.BASE_URL);
    console.log('Sample URLs:');
    console.log('  User Profile:', buildApiUrl(API_CONFIG.ENDPOINTS.USER_PROFILE));
    console.log('  User Coupons:', buildApiUrl(API_CONFIG.ENDPOINTS.USER_COUPONS, { userId: '123' }));
    console.log('  Gym Offers:', buildApiUrl(API_CONFIG.ENDPOINTS.OFFERS_BY_GYM, { gymId: '456' }));
};