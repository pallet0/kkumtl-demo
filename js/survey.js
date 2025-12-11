/**
 * ========================================
 * SURVEY MODULE
 * Handles survey modal, visitor tracking,
 * and data submission to Google Sheets
 * ========================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    
    const CONFIG = {
        SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz7JsaF_YeqgWFa2tQipI0ywrQHKDi1iBPXRIQXj80BKPtfx0Tl10JTEex7-zip8E6SBw/exec',
        VISITORS_TABLE: 'beta_visitors',
        DATA_TABLE: 'beta_data',
        COOKIE_EXPIRY_DAYS: 180,
        JSONP_TIMEOUT_MS: 10000
    };

    // ========================================
    // DOM ELEMENT REFERENCES
    // ========================================
    
    const elements = {
        // Survey icons in header
        thumbsUp: document.getElementById('survey-thumbs-up'),
        thumbsDown: document.getElementById('survey-thumbs-down'),
        
        // Survey modal
        surveyModal: document.getElementById('survey-modal'),
        surveyClose: document.getElementById('survey-close'),
        surveySubmit: document.getElementById('survey-submit'),
        surveyError: document.getElementById('survey-error'),
        
        // Survey inputs
        satisfactoryBtn: document.getElementById('survey-satisfactory'),
        unsatisfactoryBtn: document.getElementById('survey-unsatisfactory'),
        likesNovels: document.getElementById('survey-likes-novels'),
        email: document.getElementById('survey-email'),
        suggestions: document.getElementById('survey-suggestions')
    };

    // ========================================
    // STATE
    // ========================================
    
    let state = {
        satisfaction: null, // 'satisfactory' or 'unsatisfactory'
        visitorId: null,
        ip: 'unknown'
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Gets cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|undefined} - Cookie value
     */
    function getCookieValue(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) {
            return parts.pop().split(";").shift();
        }
    }

    /**
     * Sets cookie value
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} days - Expiry in days
     */
    function setCookieValue(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    /**
     * Gets or creates unique visitor ID from cookie
     * @returns {string} - Visitor ID
     */
    function getVisitorId() {
        const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existingHash = getCookieValue("user");
        if (!existingHash) {
            setCookieValue("user", hash, CONFIG.COOKIE_EXPIRY_DAYS);
            return hash;
        }
        return existingHash;
    }

    /**
     * Pads value with leading zero
     * @param {number} value - Value to pad
     * @returns {string} - Padded value
     */
    function padValue(value) {
        return (value < 10) ? "0" + value : String(value);
    }

    /**
     * Gets formatted timestamp
     * @returns {string} - Formatted timestamp
     */
    function getTimeStamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return `${year}-${padValue(month)}-${padValue(day)} ${padValue(hours)}:${padValue(minutes)}:${padValue(seconds)}`;
    }

    /**
     * Gets UTM parameter from URL
     * @returns {string} - UTM value or empty string
     */
    function getUtm() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("utm") || "";
    }

    /**
     * Gets device type
     * @returns {string} - 'mobile' or 'desktop'
     */
    function getDevice() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Fetches user IP address using multiple fallback services
     * @returns {Promise<string>} - IP address
     */
    async function fetchUserIP() {
        // List of IP detection services to try in order
        const ipServices = [
            {
                url: 'https://api.ipify.org?format=json',
                parser: (data) => data.ip
            },
            {
                url: 'https://ipinfo.io/json',
                parser: (data) => data.ip
            },
            {
                url: 'https://jsonip.com/',
                parser: (data) => data.ip
            }
        ];

        for (const service of ipServices) {
            try {
                const response = await fetch(service.url);
                if (!response.ok) {
                    continue;
                }
                const data = await response.json();
                const ip = service.parser(data);
                if (ip && ip !== 'unknown') {
                    return ip;
                }
            } catch (error) {
                console.warn(`IP service ${service.url} failed:`, error);
                // Continue to next service
            }
        }

        console.warn('All IP detection services failed');
        return 'unknown';
    }

    /**
     * Validates email format using a simple, standard pattern
     * @param {string} email - Email to validate
     * @returns {boolean} - Is valid
     */
    function validateEmail(email) {
        // Simple email validation pattern that covers most cases
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ========================================
    // API FUNCTIONS
    // ========================================

    /**
     * Sends data to Google Sheets using JSONP (for cross-origin support)
     * @param {string} table - Table name
     * @param {Object} data - Data to send
     * @returns {Promise} - API response
     */
    function sendToSheet(table, data) {
        return new Promise((resolve, reject) => {
            const dataStr = JSON.stringify(data);
            const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            
            // Create callback function
            window[callbackName] = function(response) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(response);
            };
            
            // Create script element for JSONP
            const script = document.createElement('script');
            script.src = `${CONFIG.SCRIPT_URL}?action=insert&table=${encodeURIComponent(table)}&data=${encodeURIComponent(dataStr)}&callback=${callbackName}`;
            
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Failed to send data'));
            };
            
            // Set timeout for request
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('Request timed out'));
                }
            }, CONFIG.JSONP_TIMEOUT_MS);
            
            document.body.appendChild(script);
        });
    }

    // ========================================
    // VISITOR TRACKING
    // ========================================

    /**
     * Tracks visitor information on page load
     */
    async function trackVisitor() {
        state.visitorId = getVisitorId();
        state.ip = await fetchUserIP();

        const visitorData = {
            id: state.visitorId,
            landingUrl: window.location.href,
            ip: state.ip,
            referer: document.referrer || "",
            time_stamp: getTimeStamp(),
            utm: getUtm(),
            device: getDevice()
        };

        try {
            await sendToSheet(CONFIG.VISITORS_TABLE, visitorData);
            console.log('Visitor tracked successfully');
        } catch (error) {
            console.error('Failed to track visitor:', error);
        }
    }

    // ========================================
    // SURVEY MODAL
    // ========================================

    /**
     * Opens survey modal with pre-selected satisfaction
     * @param {string} satisfaction - 'satisfactory' or 'unsatisfactory'
     */
    function openSurveyModal(satisfaction) {
        state.satisfaction = satisfaction;
        
        // Update satisfaction buttons
        updateSatisfactionButtons();
        
        // Show modal
        elements.surveyModal.classList.remove('hidden');
        
        // Focus first input
        elements.email.focus();
    }

    /**
     * Closes survey modal
     */
    function closeSurveyModal() {
        elements.surveyModal.classList.add('hidden');
        resetSurveyForm();
    }

    /**
     * Updates satisfaction button states
     */
    function updateSatisfactionButtons() {
        elements.satisfactoryBtn.classList.toggle('selected', state.satisfaction === 'satisfactory');
        elements.unsatisfactoryBtn.classList.toggle('selected', state.satisfaction === 'unsatisfactory');
    }

    /**
     * Resets survey form
     */
    function resetSurveyForm() {
        state.satisfaction = null;
        elements.satisfactoryBtn.classList.remove('selected');
        elements.unsatisfactoryBtn.classList.remove('selected');
        elements.likesNovels.checked = false;
        elements.email.value = '';
        elements.suggestions.value = '';
        hideSurveyError();
    }

    /**
     * Shows error message in survey modal
     * @param {string} message - Error message
     */
    function showSurveyError(message) {
        elements.surveyError.textContent = message;
        elements.surveyError.classList.remove('hidden');
    }

    /**
     * Hides survey error message
     */
    function hideSurveyError() {
        elements.surveyError.classList.add('hidden');
    }

    /**
     * Handles survey submission
     */
    async function handleSurveySubmit() {
        hideSurveyError();

        // Validate satisfaction
        if (!state.satisfaction) {
            showSurveyError('Please select whether you find the service satisfactory or not.');
            return;
        }

        // Validate email
        const email = elements.email.value.trim();
        if (!email || !validateEmail(email)) {
            showSurveyError('Please enter a valid email address.');
            return;
        }

        // Prepare data
        const surveyData = {
            id: state.visitorId || getVisitorId(),
            email: email,
            satisfaction: state.satisfaction,
            likes_novels: elements.likesNovels.checked ? 'Yes' : 'No',
            suggestions: elements.suggestions.value.trim() || "",
            time_stamp: getTimeStamp()
        };

        // Disable submit button
        elements.surveySubmit.disabled = true;
        elements.surveySubmit.textContent = 'Submitting...';

        try {
            await sendToSheet(CONFIG.DATA_TABLE, surveyData);
            
            // Show success and close modal
            closeSurveyModal();
            showSuccessAlert();
            
        } catch (error) {
            showSurveyError('Failed to submit feedback. Please try again.');
        } finally {
            elements.surveySubmit.disabled = false;
            elements.surveySubmit.textContent = 'Submit Feedback';
        }
    }

    /**
     * Shows success alert using existing alert system
     */
    function showSuccessAlert() {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `
            <span class="alert-icon">✓</span>
            <div class="alert-content">
                <div class="alert-title">Thank You!</div>
                <div class="alert-message">Your feedback has been submitted successfully.</div>
            </div>
            <button class="alert-close" aria-label="Close">×</button>
        `;

        alert.querySelector('.alert-close').addEventListener('click', () => {
            alert.remove();
        });

        alertContainer.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.animation = 'alertSlideOut 0.3s ease forwards';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    /**
     * Sets up event listeners
     */
    function setupEventListeners() {
        // Thumbs up/down in header
        if (elements.thumbsUp) {
            elements.thumbsUp.addEventListener('click', () => {
                openSurveyModal('satisfactory');
            });
        }

        if (elements.thumbsDown) {
            elements.thumbsDown.addEventListener('click', () => {
                openSurveyModal('unsatisfactory');
            });
        }

        // Close modal button
        if (elements.surveyClose) {
            elements.surveyClose.addEventListener('click', closeSurveyModal);
        }

        // Close modal on backdrop click
        if (elements.surveyModal) {
            elements.surveyModal.addEventListener('click', (e) => {
                if (e.target === elements.surveyModal) {
                    closeSurveyModal();
                }
            });
        }

        // Satisfaction buttons in modal
        if (elements.satisfactoryBtn) {
            elements.satisfactoryBtn.addEventListener('click', () => {
                state.satisfaction = 'satisfactory';
                updateSatisfactionButtons();
            });
        }

        if (elements.unsatisfactoryBtn) {
            elements.unsatisfactoryBtn.addEventListener('click', () => {
                state.satisfaction = 'unsatisfactory';
                updateSatisfactionButtons();
            });
        }

        // Submit button
        if (elements.surveySubmit) {
            elements.surveySubmit.addEventListener('click', handleSurveySubmit);
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !elements.surveyModal.classList.contains('hidden')) {
                closeSurveyModal();
            }
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    /**
     * Initialize survey module
     */
    function init() {
        setupEventListeners();
        
        // Track visitor on page load
        trackVisitor();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
