class NovelWriter {
    constructor() {
        this.apiKey = '';
        this.history = [];
        this.currentContent = '';
        this.isWriting = false;
        this.abortController = null;
        this.protectedContent = ''; // Content that should never be modified
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    // Protect the current content from being modified
    protectContent(content) {
        this.protectedContent = content;
        this.currentContent = content;
    }

    // Add content to history for undo functionality
    addToHistory(content) {
        this.history.push(content);
        if (this.history.length > CONFIG.HISTORY_LIMIT) {
            this.history.shift();
        }
    }

    // Undo last AI generation
    undo() {
        if (this.history.length > 1) {
            this.history.pop();
            return this.history[this.history.length - 1];
        }
        return null;
    }

    // Build the prompt for the AI
    buildPrompt(content, params) {
        const genre = params.genre || 'general';
        const style = params.writingStyle || 'neutral';
        
        let prompt = GENRE_PROMPTS[genre] + '\n\n';
        prompt += 'Previous content:\n"""\n' + content + '\n"""\n\n';
        prompt += 'Continue writing from where it left off. ';
        prompt += STYLE_MODIFIERS[style] + ' ';
        prompt += `Write approximately ${params.maxWords} words. `;
        prompt += 'Do not repeat or modify the previous content. ';
        prompt += 'Start immediately from where the story ended.';
        
        return prompt;
    }

    // Stream generate content with the Gemini API
    async generateContent(content, params, onChunk, onComplete, onError) {
        if (!this.apiKey) {
            onError('API key is required');
            return;
        }

        if (this.isWriting) {
            onError('Already writing. Please wait.');
            return;
        }

        this.isWriting = true;
        this.abortController = new AbortController();
        this.protectContent(content); // Protect the existing content

        const prompt = this.buildPrompt(content, params);

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: params.temperature,
                topK: params.topK,
                maxOutputTokens: Math.floor(params.maxWords * 1.5), // Approximate tokens
                stopSequences: []
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };

        try {
            const response = await fetch(`${CONFIG.API_ENDPOINT}?key=${this.apiKey}&alt=sse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let generatedText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.candidates && json.candidates[0].content) {
                                const text = json.candidates[0].content.parts[0].text;
                                if (text) {
                                    generatedText = text;
                                    // Stream each character with a delay
                                    for (let i = 0; i < text.length; i++) {
                                        if (this.abortController.signal.aborted) break;
                                        onChunk(text[i]);
                                        await new Promise(resolve => setTimeout(resolve, CONFIG.STREAM_DELAY));
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }

            // Ensure we only add new content, never modify existing
            const finalContent = this.protectedContent + generatedText;
            this.currentContent = finalContent;
            this.addToHistory(finalContent);
            onComplete(generatedText);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation aborted');
            } else {
                onError(error.message);
            }
        } finally {
            this.isWriting = false;
            this.abortController = null;
        }
    }

    // Abort current generation
    abort() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    // Export novel as text file
    exportNovel(content, filename = 'novel.txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Save to localStorage
    saveToLocalStorage(content) {
        localStorage.setItem('novel_content', content);
        localStorage.setItem('novel_saved_at', new Date().toISOString());
    }

    // Load from localStorage
    loadFromLocalStorage() {
        return localStorage.getItem('novel_content') || '';
    }
}