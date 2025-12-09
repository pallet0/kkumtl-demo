/**
 * ========================================
 * GEMINI API MODULE
 * Handles communication with Google's
 * Gemini API for text generation
 * ========================================
 */

const GeminiModule = (function() {
    'use strict';

    // ========================================
    // API CONFIGURATION
    // ========================================
    
    const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    // Store the API key after decryption
    let apiKey = null;
    
    // AbortController for cancelling requests
    let currentController = null;

    // ========================================
    // SYSTEM PROMPT TEMPLATE
    // This is the master prompt that guides
    // the AI's writing style and behavior
    // ========================================
    
    /**
     * IMPORTANT: Edit this prompt to customize the AI's writing behavior
     * This prompt is crucial for generating high-quality novel content
     */
    const SYSTEM_PROMPT_TEMPLATE = `You are an expert creative writer and novelist. Your task is to continue writing a story seamlessly from where the text ends.

CRITICAL INSTRUCTIONS:
1. Continue DIRECTLY from where the text ends - do not repeat any part of the input
2. Write naturally as if you are the same author who wrote the preceding text
3. Maintain consistency in:
   - Writing style and voice
   - Character names and personalities
   - Plot elements and setting
   - Tense (past/present)
   - Point of view
4. Do NOT include any meta-commentary, explanations, or notes
5. Do NOT use markdown formatting unless it was present in the input
6. Output ONLY the continuation text, nothing else

WRITING PARAMETERS:
- Genre: {{GENRE}}
- Style: {{STYLE}}
- Tone: {{TONE}}
- Point of View: {{POV}}
- Language: {{LANGUAGE}}
- Target paragraph length: {{PARAGRAPH_LENGTH}}
- Target word count for this generation: approximately {{MAX_WORDS}} words

LANGUAGE INSTRUCTIONS:
{{LANGUAGE_INSTRUCTIONS}}

STYLE GUIDE:
{{STYLE_GUIDE}}

Remember: Your output will be directly appended to the existing text. Start writing immediately from where it left off, even if mid-sentence.`;

    // ========================================
    // PROMPT HELPERS
    // ========================================

    /**
     * Gets language-specific instructions
     * @param {string} lang - Language code (EN/KR/JP)
     * @returns {string} - Language instructions
     */
    function getLanguageInstructions(lang) {
        const instructions = {
            'EN': 'Write in fluent, natural English. Use varied sentence structures and rich vocabulary appropriate for literary fiction.',
            'KR': '자연스러운 한국어로 작성하세요. 문학적 표현과 다양한 문장 구조를 사용하세요. 존댓말/반말은 기존 텍스트의 어조를 따르세요.',
            'JP': '自然な日本語で書いてください。文学的な表現と多様な文構造を使用してください。既存のテキストの敬語レベルに合わせてください。'
        };
        return instructions[lang] || instructions['EN'];
    }

    /**
     * Gets style-specific writing guide
     * @param {string} style - Writing style
     * @returns {string} - Style guide
     */
    function getStyleGuide(style) {
        const guides = {
            'descriptive': 'Use rich, sensory descriptions. Paint vivid pictures with words. Include details about the environment, characters\' appearances, and atmospheres.',
            'concise': 'Be direct and efficient with words. Every sentence should move the story forward. Avoid unnecessary descriptions.',
            'poetic': 'Use lyrical language, metaphors, and similes. Create rhythm in your prose. Focus on emotional resonance.',
            'dialogue-heavy': 'Emphasize conversations between characters. Use dialogue to reveal personality and advance plot. Keep dialogue tags simple.',
            'action': 'Focus on movement and tension. Use short, punchy sentences during intense moments. Create a sense of urgency.',
            'introspective': 'Dive deep into characters\' thoughts and feelings. Explore internal conflicts and motivations. Balance action with reflection.'
        };
        return guides[style] || guides['descriptive'];
    }

    /**
     * Gets paragraph length guidance
     * @param {string} length - Paragraph length setting
     * @returns {string} - Length guidance
     */
    function getParagraphLengthGuide(length) {
        const guides = {
            'short': '2-3 sentences per paragraph',
            'medium': '4-6 sentences per paragraph',
            'long': '7 or more sentences per paragraph'
        };
        return guides[length] || guides['medium'];
    }

    /**
     * Builds the complete system prompt with all parameters
     * @param {Object} settings - Generation settings
     * @returns {string} - Complete system prompt
     */
    function buildSystemPrompt(settings) {
        let prompt = SYSTEM_PROMPT_TEMPLATE;
        
        prompt = prompt.replace('{{GENRE}}', settings.genre || 'fantasy');
        prompt = prompt.replace('{{STYLE}}', settings.style || 'descriptive');
        prompt = prompt.replace('{{TONE}}', settings.tone || 'neutral');
        prompt = prompt.replace('{{POV}}', settings.pov || 'third-limited');
        prompt = prompt.replace('{{LANGUAGE}}', settings.language || 'EN');
        prompt = prompt.replace('{{PARAGRAPH_LENGTH}}', getParagraphLengthGuide(settings.paragraphLength));
        prompt = prompt.replace('{{MAX_WORDS}}', settings.maxWords || 150);
        prompt = prompt.replace('{{LANGUAGE_INSTRUCTIONS}}', getLanguageInstructions(settings.language));
        prompt = prompt.replace('{{STYLE_GUIDE}}', getStyleGuide(settings.style));
        
        return prompt;
    }

    // ========================================
    // API INITIALIZATION
    // ========================================

    /**
     * Initializes the module with the decrypted API key
     * @param {string} key - Decrypted API key
     */
    function initialize(key) {
        apiKey = key;
    }

    /**
     * Checks if the module is initialized
     * @returns {boolean}
     */
    function isInitialized() {
        return apiKey !== null;
    }

    // ========================================
    // TEXT GENERATION
    // ========================================

    /**
     * Generates text continuation using Gemini API
     * @param {string} textBefore - Text before cursor
     * @param {string} textAfter - Text after cursor
     * @param {Object} settings - Generation settings
     * @param {Function} onChunk - Callback for streaming chunks
     * @param {Function} onComplete - Callback when generation completes
     * @param {Function} onError - Callback for errors
     * @returns {Promise<void>}
     */
    async function generateText(textBefore, textAfter, settings, onChunk, onComplete, onError) {
        if (!apiKey) {
            onError(new Error('API_NOT_INITIALIZED: Please unlock the application first'));
            return;
        }

        // Create abort controller for this request
        currentController = new AbortController();

        try {
            const systemPrompt = buildSystemPrompt(settings);
            
            // Build the user prompt
            let userPrompt = '';
            
            if (textBefore.trim()) {
                userPrompt = `Continue writing from here:\n\n${textBefore}`;
                
                if (textAfter.trim()) {
                    userPrompt += `\n\n[Note: The text that follows is: "${textAfter.substring(0, 100)}..." - ensure your continuation flows naturally into this]`;
                }
            } else {
                userPrompt = `Start writing a new ${settings.genre} story in the ${settings.style} style. Begin immediately with the narrative.`;
            }

            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userPrompt }]
                    }
                ],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: settings.temperature || 0.8,
                    maxOutputTokens: Math.ceil((settings.maxWords || 150) * 1.5), // Approximate tokens
                    topP: 0.95,
                    topK: 40
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            };

            if (settings.streaming) {
                await generateWithStreaming(settings.model, requestBody, onChunk, onComplete, onError);
            } else {
                await generateWithoutStreaming(settings.model, requestBody, onComplete, onError);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                onError(new Error('GENERATION_CANCELLED: Generation was stopped by user'));
            } else {
                onError(error);
            }
        }
    }

    /**
     * Generates text with streaming enabled
     * @param {string} model - Model name
     * @param {Object} requestBody - API request body
     * @param {Function} onChunk - Chunk callback
     * @param {Function} onComplete - Complete callback
     * @param {Function} onError - Error callback
     */
    async function generateWithStreaming(model, requestBody, onChunk, onComplete, onError) {
        const url = `${API_BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: currentController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API_ERROR_${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // Process complete SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr.trim() === '[DONE]') continue;
                        
                        try {
                            const data = JSON.parse(jsonStr);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            
                            if (text) {
                                fullText += text;
                                onChunk(text, fullText);
                            }
                        } catch (e) {
                            // Skip malformed JSON
                            console.warn('Skipping malformed SSE data:', e);
                        }
                    }
                }
            }

            onComplete(fullText);

        } catch (error) {
            if (error.name === 'AbortError') {
                onError(new Error('GENERATION_CANCELLED: Generation was stopped by user'));
            } else {
                onError(error);
            }
        }
    }

    /**
     * Generates text without streaming
     * @param {string} model - Model name
     * @param {Object} requestBody - API request body
     * @param {Function} onComplete - Complete callback
     * @param {Function} onError - Error callback
     */
    async function generateWithoutStreaming(model, requestBody, onComplete, onError) {
        const url = `${API_BASE_URL}/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: currentController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API_ERROR_${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (!text) {
                throw new Error('EMPTY_RESPONSE: The AI returned an empty response');
            }

            onComplete(text);

        } catch (error) {
            if (error.name === 'AbortError') {
                onError(new Error('GENERATION_CANCELLED: Generation was stopped by user'));
            } else {
                onError(error);
            }
        }
    }

    /**
     * Stops the current generation
     */
    function stopGeneration() {
        if (currentController) {
            currentController.abort();
            currentController = null;
        }
    }

    // ========================================
    // ERROR CLASSIFICATION
    // ========================================

    /**
     * Classifies and formats error messages for display
     * @param {Error} error - Error object
     * @returns {Object} - Classified error with type, title, and message
     */
    function classifyError(error) {
        const message = error.message || 'Unknown error occurred';

        // API key not configured
        if (message.includes('API_NOT_CONFIGURED')) {
            return {
                type: 'error',
                title: 'Configuration Error',
                message: 'The API key has not been configured. Please contact the administrator.'
            };
        }

        // Invalid password
        if (message.includes('INVALID_PASSWORD')) {
            return {
                type: 'error',
                title: 'Authentication Failed',
                message: 'The password you entered is incorrect. Please try again.'
            };
        }

        // API not initialized
        if (message.includes('API_NOT_INITIALIZED')) {
            return {
                type: 'error',
                title: 'Not Authenticated',
                message: 'Please unlock the application with your password first.'
            };
        }

        // Generation cancelled
        if (message.includes('GENERATION_CANCELLED')) {
            return {
                type: 'info',
                title: 'Generation Stopped',
                message: 'Text generation was cancelled.'
            };
        }

        // Empty response
        if (message.includes('EMPTY_RESPONSE')) {
            return {
                type: 'warning',
                title: 'Empty Response',
                message: 'The AI did not generate any text. Try adjusting your settings or adding more context.'
            };
        }

        // API errors by status code
        if (message.includes('API_ERROR_400')) {
            return {
                type: 'error',
                title: 'Bad Request',
                message: 'The request was malformed. Please check your input and try again.'
            };
        }

        if (message.includes('API_ERROR_401') || message.includes('API_ERROR_403')) {
            return {
                type: 'error',
                title: 'Authentication Error',
                message: 'API key is invalid or expired. Please contact the administrator.'
            };
        }

        if (message.includes('API_ERROR_429')) {
            return {
                type: 'warning',
                title: 'Rate Limited',
                message: 'Too many requests. Please wait a moment before trying again.'
            };
        }

        if (message.includes('API_ERROR_500') || message.includes('API_ERROR_503')) {
            return {
                type: 'error',
                title: 'Server Error',
                message: 'The AI service is temporarily unavailable. Please try again later.'
            };
        }

        // Network error
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return {
                type: 'error',
                title: 'Network Error',
                message: 'Could not connect to the AI service. Please check your internet connection.'
            };
        }

        // Default error
        return {
            type: 'error',
            title: 'Error',
            message: message
        };
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        initialize,
        isInitialized,
        generateText,
        stopGeneration,
        classifyError
    };

})();