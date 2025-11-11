// ============================================
// GLOBAL API CONFIGURATION
// Centralized API URL management for deployment
// ============================================

/**
 * API Configuration
 * Automatically detects environment and sets appropriate API URL
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Set VITE_API_URL environment variable in Vercel to your Render backend URL
 * 2. Or update PRODUCTION_API_URL below with your Render backend URL
 */

const ENV_CONFIG = {
    // Development (localhost)
    DEVELOPMENT: {
        API_URL: 'http://localhost:5000',
        ENV_NAME: 'development'
    },
    
    // Production (Vercel + Render)
    PRODUCTION: {
        // IMPORTANT: Replace this with your actual Render backend URL
        API_URL: import.meta?.env?.VITE_API_URL || 'https://gym-wale.onrender.com',
        ENV_NAME: 'production'
    }
};

/**
 * Detect current environment
 */
function detectEnvironment() {
    // Check if running on localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';
    
    // Check for explicit environment variable (Vite/Webpack)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.MODE === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
    }
    
    // Fallback to hostname detection
    return isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION';
}

/**
 * Get current configuration based on environment
 */
const currentEnv = detectEnvironment();
const config = ENV_CONFIG[currentEnv];

/**
 * Global API Configuration Object
 */
window.API_CONFIG = {
    // Base API URL (automatically set based on environment)
    BASE_URL: config.API_URL,
    
    // Environment info
    ENVIRONMENT: config.ENV_NAME,
    IS_PRODUCTION: currentEnv === 'PRODUCTION',
    IS_DEVELOPMENT: currentEnv === 'DEVELOPMENT',
    
    // API Endpoints (common across all environments)
    ENDPOINTS: {
        // Auth endpoints
        AUTH: {
            LOGIN: '/api/users/login',
            REGISTER: '/api/users/register',
            VERIFY: '/api/users/verify',
            FORGOT_PASSWORD: '/api/users/forgot-password',
            RESET_PASSWORD: '/api/users/reset-password'
        },
        
        // User endpoints
        USER: {
            PROFILE: '/api/users/profile',
            UPDATE_PROFILE: '/api/users/profile',
            UPLOAD_PICTURE: '/api/users/upload-picture',
            PREFERENCES: '/api/user-preferences'
        },
        
        // Gym endpoints
        GYM: {
            LIST: '/api/gyms',
            DETAILS: '/api/gyms',
            SEARCH: '/api/gyms/search',
            PROFILE: '/api/gyms/profile/me',
            LOGIN: '/api/gyms/login',
            REGISTER: '/api/gyms/register'
        },
        
        // Admin endpoints
        ADMIN: {
            LOGIN: '/api/admin/auth/login',
            PROFILE: '/api/admin/profile',
            DASHBOARD: '/api/admin/dashboard',
            NOTIFICATIONS: '/api/admin/notifications',
            COMMUNICATION: '/api/admin/communication'
        },
        
        // Trainer endpoints
        TRAINER: {
            LIST: '/api/trainers',
            DETAILS: '/api/trainers',
            SESSIONS: '/api/trainers/sessions'
        },
        
        // Booking endpoints
        BOOKING: {
            CREATE: '/api/bookings',
            LIST: '/api/bookings',
            TRIAL: '/api/trial-bookings'
        },
        
        // Review endpoints
        REVIEW: {
            CREATE: '/api/reviews',
            LIST: '/api/reviews',
            GYM_REVIEWS: '/api/reviews/gym'
        },
        
        // Payment endpoints
        PAYMENT: {
            CREATE_SESSION: '/api/payment/create-session',
            VERIFY: '/api/payment/verify',
            STATUS: '/api/payment/status'
        },
        
        // Communication endpoints
        COMMUNICATION: {
            GRIEVANCES: '/api/communications/grievances',
            CONTACT: '/api/admin/communication/public/contact',
            GYM_GRIEVANCES: '/api/gym/communication/grievances',
            CHAT: '/api/chat'
        },
        
        // Subscription endpoints
        SUBSCRIPTION: {
            CREATE: '/api/subscriptions',
            LIST: '/api/subscriptions',
            CANCEL: '/api/subscriptions/cancel'
        },
        
        // Notification endpoints
        NOTIFICATION: {
            LIST: '/api/notifications',
            READ: '/api/notifications/read',
            MARK_ALL_READ: '/api/notifications/mark-all-read'
        },
        
        // Diet endpoints
        DIET: {
            PLANS: '/api/diet',
            USER_MEALS: '/api/diet/user-meals'
        },
        
        // Offer endpoints
        OFFER: {
            LIST: '/api/offers',
            VALIDATE_COUPON: '/api/offers/coupon',
            GYM_OFFERS: '/api/offers/gym'
        }
    },
    
    /**
     * Helper function to build full API URL
     * @param {string} endpoint - API endpoint path
     * @returns {string} - Full API URL
     */
    buildUrl(endpoint) {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        return this.BASE_URL + cleanEndpoint;
    },
    
    /**
     * Helper function to build asset URL (images, uploads, etc.)
     * @param {string} path - Asset path
     * @returns {string} - Full asset URL
     */
    assetUrl(path) {
        if (!path) return this.BASE_URL + '/uploads/default.png';
        
        // If path already has BASE_URL, return as is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        // If path starts with /, prepend BASE_URL
        if (path.startsWith('/')) {
            return this.BASE_URL + path;
        }
        
        // Otherwise, add / and prepend BASE_URL
        return this.BASE_URL + '/' + path;
    },
    
    /**
     * Helper function for fetch requests with automatic URL building
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise} - Fetch promise
     */
    async fetch(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        
        // Add default headers
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        // Merge headers
        options.headers = {
            ...defaultHeaders,
            ...(options.headers || {})
        };
        
        // Add token if available
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('gymAdminToken') || 
                     localStorage.getItem('gymAuthToken') ||
                     localStorage.getItem('adminToken');
        
        if (token && !options.headers.Authorization) {
            options.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`[API] ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${url}`, error);
            throw error;
        }
    }
};

// Legacy support - set global BASE_URL for backward compatibility
window.BASE_URL = window.API_CONFIG.BASE_URL;

// Log configuration on load
console.log('🌍 API Configuration Loaded');
console.log('Environment:', window.API_CONFIG.ENVIRONMENT);
console.log('API Base URL:', window.API_CONFIG.BASE_URL);
console.log('Is Production:', window.API_CONFIG.IS_PRODUCTION);

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.API_CONFIG;
}
