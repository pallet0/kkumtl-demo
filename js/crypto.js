/**
 * ========================================
 * CRYPTO MODULE
 * Handles API key encryption/decryption
 * using Web Crypto API with AES-GCM
 * ========================================
 */

const CryptoModule = (function() {
    'use strict';

    // ========================================
    // ENCRYPTED API KEY PLACEHOLDER
    // Replace this with your encrypted API key
    // generated using encoder.html
    // ========================================
    const ENCRYPTED_API_KEY = 'UhW5TJ772Dri0IwLxTaLP7cl/YqPajw1ikQzYtbnCuupixbbcrEdoVNLrN26/+RNzgBHamF7YXChrTFr4uOWGDjIqqHiXajoCKtWW4W5osMeFBc=';

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Converts a string to ArrayBuffer using UTF-8 encoding
     * @param {string} str - Input string
     * @returns {Uint8Array} - Encoded buffer
     */
    function stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Converts ArrayBuffer to string using UTF-8 decoding
     * @param {ArrayBuffer} buffer - Input buffer
     * @returns {string} - Decoded string
     */
    function bufferToString(buffer) {
        return new TextDecoder().decode(buffer);
    }

    /**
     * Converts Base64 string to ArrayBuffer
     * @param {string} base64 - Base64 encoded string
     * @returns {Uint8Array} - Decoded buffer
     */
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // ========================================
    // KEY DERIVATION
    // ========================================

    /**
     * Derives an AES-GCM key from a password using PBKDF2
     * Uses high iteration count for brute-force resistance
     * @param {string} password - User password
     * @param {Uint8Array} salt - Random salt from encrypted data
     * @returns {Promise<CryptoKey>} - Derived encryption key
     */
    async function deriveKey(password, salt) {
        // Import password as raw key material for PBKDF2
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            stringToBuffer(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive AES-256-GCM key using PBKDF2 with SHA-256
        // 100,000 iterations provides good security
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { 
                name: 'AES-GCM', 
                length: 256 
            },
            false,
            ['decrypt']
        );
    }

    // ========================================
    // DECRYPTION
    // ========================================

    /**
     * Decrypts the stored API key using the provided password
     * @param {string} password - User password for decryption
     * @returns {Promise<string>} - Decrypted API key
     * @throws {Error} - If decryption fails (wrong password or corrupted data)
     */
    async function decryptApiKey(password) {
        // Check if API key has been configured
        if (ENCRYPTED_API_KEY === 'YOUR_ENCRYPTED_API_KEY_HERE') {
            throw new Error('API_NOT_CONFIGURED: Please configure the encrypted API key in crypto.js');
        }

        try {
            // Decode the base64 encrypted data
            const combined = base64ToBuffer(ENCRYPTED_API_KEY);
            
            // Extract components:
            // - First 16 bytes: Salt for key derivation
            // - Next 12 bytes: IV for AES-GCM
            // - Remaining bytes: Encrypted data + auth tag
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);

            // Derive the decryption key from password
            const key = await deriveKey(password, salt);

            // Decrypt using AES-GCM
            // This will fail with a specific error if password is wrong
            const decrypted = await crypto.subtle.decrypt(
                { 
                    name: 'AES-GCM', 
                    iv: iv 
                },
                key,
                encrypted
            );

            return bufferToString(decrypted);
        } catch (error) {
            // Provide meaningful error messages
            if (error.message.includes('API_NOT_CONFIGURED')) {
                throw error;
            }
            
            if (error.name === 'OperationError') {
                throw new Error('INVALID_PASSWORD: The password you entered is incorrect');
            }
            
            throw new Error('DECRYPTION_FAILED: ' + error.message);
        }
    }

    /**
     * Validates that a password meets minimum requirements
     * @param {string} password - Password to validate
     * @returns {boolean} - True if password is valid
     */
    function validatePassword(password) {
        return password && password.length >= 1;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        decryptApiKey,
        validatePassword
    };

})();