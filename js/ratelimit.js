/**
 * ========================================
 * RATE LIMIT MODULE
 * Handles generation count limits per IP
 * and max token restrictions
 * ========================================
 */

const RateLimitModule = (function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    
    const CONFIG = {
        MAX_GENERATIONS_PER_IP: 10,
        MAX_TOKENS_PER_GENERATION: 500,
        STORAGE_KEY: 'novelWriter_rateLimit',
        TOKENS_TO_WORDS_RATIO: 0.75
    };

    // ========================================
    // STATE
    // ========================================
    
    let state = {
        ip: null,
        generationCount: 0,
        isAdmin: false
    };

    // ========================================
    // IP TRACKING
    // ========================================

    /**
     * Fetches the user's IP address
     * @returns {Promise<string>} - IP address or 'unknown'
     */
    async function fetchUserIP() {
        try {
            const response = await fetch('https://jsonip.com?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('Could not fetch IP:', error);
            return 'unknown';
        }
    }

    /**
     * Initializes the rate limit module with IP detection
     * @param {boolean} isAdmin - Whether user has admin privileges
     */
    async function initialize(isAdmin) {
        state.isAdmin = isAdmin;
        state.ip = await fetchUserIP();
        loadGenerationCount();
    }

    // ========================================
    // GENERATION COUNT TRACKING
    // ========================================

    /**
     * Loads generation count from local storage
     */
    function loadGenerationCount() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Check if the stored IP matches current IP
                if (parsed.ip === state.ip) {
                    state.generationCount = parsed.count || 0;
                } else {
                    // Different IP, reset count
                    state.generationCount = 0;
                }
            }
        } catch (error) {
            console.warn('Failed to load rate limit data:', error);
            state.generationCount = 0;
        }
    }

    /**
     * Saves generation count to local storage
     */
    function saveGenerationCount() {
        try {
            const data = {
                ip: state.ip,
                count: state.generationCount,
                timestamp: Date.now()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save rate limit data:', error);
        }
    }

    /**
     * Increments the generation count
     */
    function incrementGenerationCount() {
        state.generationCount++;
        saveGenerationCount();
    }

    /**
     * Gets the current generation count
     * @returns {number} - Current generation count
     */
    function getGenerationCount() {
        return state.generationCount;
    }

    /**
     * Gets the remaining generations allowed
     * @returns {number} - Remaining generations (Infinity for admins)
     */
    function getRemainingGenerations() {
        if (state.isAdmin) {
            return Infinity;
        }
        return Math.max(0, CONFIG.MAX_GENERATIONS_PER_IP - state.generationCount);
    }

    // ========================================
    // LIMIT CHECKING
    // ========================================

    /**
     * Checks if the user can generate more text
     * @returns {Object} - { allowed: boolean, reason: string }
     */
    function canGenerate() {
        // Admins bypass all limits
        if (state.isAdmin) {
            return { allowed: true, reason: '' };
        }

        // Check generation count limit
        if (state.generationCount >= CONFIG.MAX_GENERATIONS_PER_IP) {
            return {
                allowed: false,
                reason: `You have reached the maximum number of generations (${CONFIG.MAX_GENERATIONS_PER_IP}). Please contact an administrator for extended access.`
            };
        }

        return { allowed: true, reason: '' };
    }

    /**
     * Gets the maximum allowed tokens for generation
     * @returns {number} - Max tokens (Infinity for admins)
     */
    function getMaxTokens() {
        if (state.isAdmin) {
            return Infinity;
        }
        return CONFIG.MAX_TOKENS_PER_GENERATION;
    }

    /**
     * Clamps the max words setting based on user permissions
     * @param {number} requestedWords - User's requested max words
     * @returns {number} - Actual max words allowed
     */
    function clampMaxWords(requestedWords) {
        if (state.isAdmin) {
            return requestedWords;
        }
        // Convert max tokens to approximate words using the conversion ratio
        const maxWords = Math.floor(CONFIG.MAX_TOKENS_PER_GENERATION * CONFIG.TOKENS_TO_WORDS_RATIO);
        return Math.min(requestedWords, maxWords);
    }

    /**
     * Checks if user is an admin
     * @returns {boolean} - True if admin
     */
    function isAdmin() {
        return state.isAdmin;
    }

    /**
     * Gets the user's IP address
     * @returns {string} - IP address
     */
    function getIP() {
        return state.ip;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        initialize,
        canGenerate,
        getMaxTokens,
        clampMaxWords,
        incrementGenerationCount,
        getGenerationCount,
        getRemainingGenerations,
        isAdmin,
        getIP,
        CONFIG
    };

})();
