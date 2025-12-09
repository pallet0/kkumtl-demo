/**
 * ========================================
 * STORAGE MODULE
 * Handles local storage operations for
 * saving/loading documents and settings
 * ========================================
 */

const StorageModule = (function() {
    'use strict';

    // ========================================
    // STORAGE KEYS
    // ========================================
    const KEYS = {
        DOCUMENT: 'novelWriter_document',
        SETTINGS: 'novelWriter_settings',
        FORMATTING: 'novelWriter_formatting',
        HISTORY: 'novelWriter_history',
        AUTOSAVE: 'novelWriter_autosave'
    };

    // ========================================
    // DEFAULT VALUES
    // ========================================
    const DEFAULT_SETTINGS = {
        model: 'gemini-1.5-pro',
        temperature: 0.8,
        maxWords: 150,
        paragraphLength: 'medium',
        language: 'EN',
        genre: 'fantasy',
        style: 'descriptive',
        tone: 'neutral',
        pov: 'third-limited',
        streaming: true
    };

    const DEFAULT_FORMATTING = {
        fontFamily: "'Merriweather', serif",
        fontSize: 18,
        lineHeight: 1.8,
        paragraphSpacing: 1.5,
        dialogueColor: '#e67e22',
        thoughtsColor: '#3498db',
        emphasisColor: '#9b59b6',
        textColor: '#2c3e50',
        bgColor: '#fdf6e3'
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Safely parses JSON with error handling
     * @param {string} json - JSON string to parse
     * @param {*} defaultValue - Default value if parsing fails
     * @returns {*} - Parsed object or default value
     */
    function safeJsonParse(json, defaultValue) {
        try {
            return json ? JSON.parse(json) : defaultValue;
        } catch (error) {
            console.warn('Failed to parse JSON from storage:', error);
            return defaultValue;
        }
    }

    /**
     * Safely stringifies object to JSON
     * @param {*} obj - Object to stringify
     * @returns {string} - JSON string
     */
    function safeJsonStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.error('Failed to stringify object:', error);
            return '';
        }
    }

    // ========================================
    // DOCUMENT OPERATIONS
    // ========================================

    /**
     * Saves the current document content
     * @param {string} content - Document content to save
     * @returns {boolean} - Success status
     */
    function saveDocument(content) {
        try {
            const data = {
                content: content,
                timestamp: Date.now(),
                wordCount: content.split(/\s+/).filter(w => w.length > 0).length
            };
            localStorage.setItem(KEYS.DOCUMENT, safeJsonStringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save document:', error);
            return false;
        }
    }

    /**
     * Loads the saved document
     * @returns {Object|null} - Document data or null
     */
    function loadDocument() {
        const data = localStorage.getItem(KEYS.DOCUMENT);
        return safeJsonParse(data, null);
    }

    /**
     * Clears the saved document
     */
    function clearDocument() {
        localStorage.removeItem(KEYS.DOCUMENT);
    }

    // ========================================
    // SETTINGS OPERATIONS
    // ========================================

    /**
     * Saves generation settings
     * @param {Object} settings - Settings object
     * @returns {boolean} - Success status
     */
    function saveSettings(settings) {
        try {
            const merged = { ...DEFAULT_SETTINGS, ...settings };
            localStorage.setItem(KEYS.SETTINGS, safeJsonStringify(merged));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Loads generation settings
     * @returns {Object} - Settings object with defaults applied
     */
    function loadSettings() {
        const data = localStorage.getItem(KEYS.SETTINGS);
        const saved = safeJsonParse(data, {});
        return { ...DEFAULT_SETTINGS, ...saved };
    }

    /**
     * Resets settings to defaults
     */
    function resetSettings() {
        localStorage.setItem(KEYS.SETTINGS, safeJsonStringify(DEFAULT_SETTINGS));
    }

    // ========================================
    // FORMATTING OPERATIONS
    // ========================================

    /**
     * Saves formatting preferences
     * @param {Object} formatting - Formatting object
     * @returns {boolean} - Success status
     */
    function saveFormatting(formatting) {
        try {
            const merged = { ...DEFAULT_FORMATTING, ...formatting };
            localStorage.setItem(KEYS.FORMATTING, safeJsonStringify(merged));
            return true;
        } catch (error) {
            console.error('Failed to save formatting:', error);
            return false;
        }
    }

    /**
     * Loads formatting preferences
     * @returns {Object} - Formatting object with defaults applied
     */
    function loadFormatting() {
        const data = localStorage.getItem(KEYS.FORMATTING);
        const saved = safeJsonParse(data, {});
        return { ...DEFAULT_FORMATTING, ...saved };
    }

    /**
     * Resets formatting to defaults
     */
    function resetFormatting() {
        localStorage.setItem(KEYS.FORMATTING, safeJsonStringify(DEFAULT_FORMATTING));
    }

    // ========================================
    // HISTORY OPERATIONS (Undo/Redo)
    // ========================================

    const MAX_HISTORY_SIZE = 50;
    let undoStack = [];
    let redoStack = [];

    /**
     * Pushes a new state to the undo stack
     * @param {string} content - Content state to save
     */
    function pushHistory(content) {
        // Don't push if same as last state
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === content) {
            return;
        }

        undoStack.push(content);
        
        // Limit stack size
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift();
        }
        
        // Clear redo stack on new action
        redoStack = [];
    }

    /**
     * Undoes the last action
     * @param {string} currentContent - Current content before undo
     * @returns {string|null} - Previous content or null if nothing to undo
     */
    function undo(currentContent) {
        if (undoStack.length === 0) {
            return null;
        }

        redoStack.push(currentContent);
        return undoStack.pop();
    }

    /**
     * Redoes the last undone action
     * @param {string} currentContent - Current content before redo
     * @returns {string|null} - Next content or null if nothing to redo
     */
    function redo(currentContent) {
        if (redoStack.length === 0) {
            return null;
        }

        undoStack.push(currentContent);
        return redoStack.pop();
    }

    /**
     * Checks if undo is available
     * @returns {boolean}
     */
    function canUndo() {
        return undoStack.length > 0;
    }

    /**
     * Checks if redo is available
     * @returns {boolean}
     */
    function canRedo() {
        return redoStack.length > 0;
    }

    /**
     * Clears all history
     */
    function clearHistory() {
        undoStack = [];
        redoStack = [];
    }

    // ========================================
    // EXPORT OPERATIONS
    // ========================================

    /**
     * Exports document as plain text file
     * @param {string} content - Content to export
     * @param {string} filename - Filename without extension
     */
    function exportAsText(content, filename = 'novel') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `${filename}.txt`);
    }

    /**
     * Exports document as formatted HTML file
     * @param {string} content - Content to export
     * @param {Object} formatting - Formatting settings
     * @param {string} filename - Filename without extension
     */
    function exportAsHtml(content, formatting, filename = 'novel') {
        const html = generateHtmlDocument(content, formatting);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, `${filename}.html`);
    }

    /**
     * Generates a complete HTML document from content
     * @param {string} content - Raw text content
     * @param {Object} formatting - Formatting settings
     * @returns {string} - Complete HTML document
     */
    function generateHtmlDocument(content, formatting) {
        // Split content into paragraphs
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
        
        // Format each paragraph with dialogue/thoughts highlighting
        const formattedParagraphs = paragraphs.map(p => {
            let html = escapeHtml(p);
            
            // Apply formatting
            html = html.replace(/"([^"]+)"/g, `<span style="color: ${formatting.dialogueColor}">"$1"</span>`);
            html = html.replace(/'([^']+)'/g, `<span style="color: ${formatting.thoughtsColor}; font-style: italic;">'$1'</span>`);
            html = html.replace(/\*([^*]+)\*/g, `<span style="color: ${formatting.emphasisColor}; font-style: italic;">$1</span>`);
            
            return `<p>${html}</p>`;
        }).join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Novel</title>
    <style>
        body {
            font-family: ${formatting.fontFamily};
            font-size: ${formatting.fontSize}px;
            line-height: ${formatting.lineHeight};
            color: ${formatting.textColor};
            background-color: ${formatting.bgColor};
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            text-align: justify;
        }
        p {
            margin-bottom: ${formatting.paragraphSpacing}em;
        }
    </style>
</head>
<body>
${formattedParagraphs}
</body>
</html>`;
    }

    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Downloads a blob as a file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Reads a file and returns its content
     * @param {File} file - File to read
     * @returns {Promise<string>} - File content
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        // Document
        saveDocument,
        loadDocument,
        clearDocument,
        
        // Settings
        saveSettings,
        loadSettings,
        resetSettings,
        DEFAULT_SETTINGS,
        
        // Formatting
        saveFormatting,
        loadFormatting,
        resetFormatting,
        DEFAULT_FORMATTING,
        
        // History
        pushHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
        
        // Export
        exportAsText,
        exportAsHtml,
        readFile
    };

})();