/**
 * ========================================
 * FORMATTER MODULE
 * Handles real-time text formatting and highlighting
 * for contenteditable elements
 * ========================================
 */

const FormatterModule = (function() {
    'use strict';

    // ========================================
    // FORMATTING PATTERNS
    // ========================================
    
    // Regex patterns for different text elements
    const PATTERNS = {
        // Double-quoted dialogue: "Hello, world!"
        dialogue: /"([^"]+)"/g,
        
        // Single-quoted thoughts/inner monologue: 'I wonder...'
        thoughts: /'([^']+)'/g,
        
        // Asterisk emphasis: *important*
        emphasis: /\*([^*]+)\*/g
    };

    // ========================================
    // CURSOR POSITION MANAGEMENT
    // ========================================

    /**
     * Saves the current cursor position
     * @param {HTMLElement} element - Contenteditable element
     * @returns {Object|null} - Saved position data
     */
    function saveCursorPosition(element) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(element);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        
        const start = preSelectionRange.toString().length;
        
        return {
            start: start,
            end: start + range.toString().length
        };
    }

    /**
     * Restores cursor position
     * @param {HTMLElement} element - Contenteditable element
     * @param {Object} savedPosition - Previously saved position
     */
    function restoreCursorPosition(element, savedPosition) {
        if (!savedPosition) return;

        const selection = window.getSelection();
        const range = document.createRange();
        
        let charIndex = 0;
        let nodeStack = [element];
        let node, foundStart = false, stop = false;
        
        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nextCharIndex = charIndex + node.length;
                if (!foundStart && savedPosition.start >= charIndex && savedPosition.start <= nextCharIndex) {
                    range.setStart(node, savedPosition.start - charIndex);
                    foundStart = true;
                }
                if (foundStart && savedPosition.end >= charIndex && savedPosition.end <= nextCharIndex) {
                    range.setEnd(node, savedPosition.end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // ========================================
    // REAL-TIME FORMATTING
    // ========================================

    /**
     * Applies real-time formatting to contenteditable element
     * @param {HTMLElement} element - Contenteditable element
     */
    function applyRealtimeFormatting(element) {
        // Save cursor position
        const cursorPos = saveCursorPosition(element);
        
        // Get plain text content
        const text = element.textContent;
        
        // Build formatted HTML
        let formattedHtml = escapeHtml(text);
        
        // Apply formatting patterns (in reverse order to handle overlaps properly)
        // We use a placeholder system to avoid nested replacements
        
        // 1. Dialogue (double quotes)
        formattedHtml = formattedHtml.replace(
            /&quot;([^&quot;]+)&quot;/g,
            (match, content) => `<span class="dialogue">"${content}"</span>`
        );
        
        // 2. Thoughts (single quotes) - need to be careful with apostrophes
        formattedHtml = formattedHtml.replace(
            /&#39;([^&#39;]+)&#39;/g,
            (match, content) => `<span class="thoughts">'${content}'</span>`
        );
        
        // 3. Emphasis (asterisks)
        formattedHtml = formattedHtml.replace(
            /\*([^*]+)\*/g,
            (match, content) => `<span class="emphasis">${content}</span>`
        );
        
        // Only update if content changed
        if (element.innerHTML !== formattedHtml) {
            element.innerHTML = formattedHtml;
            
            // Restore cursor position
            restoreCursorPosition(element, cursorPos);
        }
    }

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Gets plain text from contenteditable (without formatting)
     * @param {HTMLElement} element - Contenteditable element
     * @returns {string} - Plain text
     */
    function getPlainText(element) {
        return element.textContent || '';
    }

    /**
     * Sets plain text content in contenteditable
     * @param {HTMLElement} element - Contenteditable element
     * @param {string} text - Text to set
     */
    function setPlainText(element, text) {
        const cursorPos = saveCursorPosition(element);
        element.textContent = text;
        applyRealtimeFormatting(element);
        if (cursorPos) {
            restoreCursorPosition(element, cursorPos);
        }
    }

    /**
     * Inserts text at cursor position
     * @param {HTMLElement} element - Contenteditable element
     * @param {string} text - Text to insert
     */
    function insertTextAtCursor(element, text) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Apply formatting
        applyRealtimeFormatting(element);
    }

    /**
     * Gets cursor offset in plain text
     * @param {HTMLElement} element - Contenteditable element
     * @returns {number} - Cursor offset
     */
    function getCursorOffset(element) {
        const pos = saveCursorPosition(element);
        return pos ? pos.start : 0;
    }

    /**
     * Sets cursor position by offset
     * @param {HTMLElement} element - Contenteditable element
     * @param {number} offset - Character offset
     */
    function setCursorOffset(element, offset) {
        restoreCursorPosition(element, { start: offset, end: offset });
    }

    // ========================================
    // CSS VARIABLE UPDATES
    // ========================================

    /**
     * Applies formatting settings to CSS variables
     * @param {Object} formatting - Formatting settings object
     */
    function applyFormatting(formatting) {
        const root = document.documentElement;

        // Typography
        if (formatting.fontFamily) {
            root.style.setProperty('--font-editor', formatting.fontFamily);
        }
        if (formatting.fontSize) {
            root.style.setProperty('--editor-font-size', `${formatting.fontSize}px`);
        }
        if (formatting.lineHeight) {
            root.style.setProperty('--editor-line-height', formatting.lineHeight);
        }
        if (formatting.paragraphSpacing) {
            root.style.setProperty('--editor-paragraph-spacing', `${formatting.paragraphSpacing}em`);
        }

        // Colors
        if (formatting.dialogueColor) {
            root.style.setProperty('--dialogue-color', formatting.dialogueColor);
        }
        if (formatting.thoughtsColor) {
            root.style.setProperty('--thoughts-color', formatting.thoughtsColor);
        }
        if (formatting.emphasisColor) {
            root.style.setProperty('--emphasis-color', formatting.emphasisColor);
        }
        if (formatting.textColor) {
            root.style.setProperty('--text-primary', formatting.textColor);
        }
        if (formatting.bgColor) {
            root.style.setProperty('--bg-editor', formatting.bgColor);
        }
    }

    // ========================================
    // THEME PRESETS
    // ========================================

    const PRESETS = {
        sepia: {
            bgColor: '#fdf6e3',
            textColor: '#5c4b37',
            dialogueColor: '#b58900',
            thoughtsColor: '#268bd2',
            emphasisColor: '#6c71c4'
        },
        dark: {
            bgColor: '#1e1e2e',
            textColor: '#cdd6f4',
            dialogueColor: '#fab387',
            thoughtsColor: '#89b4fa',
            emphasisColor: '#cba6f7'
        },
        light: {
            bgColor: '#ffffff',
            textColor: '#24292e',
            dialogueColor: '#d73a49',
            thoughtsColor: '#005cc5',
            emphasisColor: '#6f42c1'
        },
        paper: {
            bgColor: '#f5f5dc',
            textColor: '#333333',
            dialogueColor: '#8b4513',
            thoughtsColor: '#4169e1',
            emphasisColor: '#800080'
        }
    };

    /**
     * Gets a theme preset by name
     * @param {string} presetName - Name of the preset
     * @returns {Object|null} - Preset object or null
     */
    function getPreset(presetName) {
        return PRESETS[presetName] || null;
    }

    // ========================================
    // TEXT STATISTICS
    // ========================================

    /**
     * Counts words in text
     * @param {string} text - Text to count
     * @returns {number} - Word count
     */
    function countWords(text) {
        if (!text || !text.trim()) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Counts characters in text
     * @param {string} text - Text to count
     * @returns {number} - Character count
     */
    function countCharacters(text) {
        return text ? text.length : 0;
    }

    /**
     * Counts paragraphs in text
     * @param {string} text - Text to count
     * @returns {number} - Paragraph count
     */
    function countParagraphs(text) {
        if (!text || !text.trim()) return 0;
        return text.split(/\n\n+/).filter(p => p.trim()).length;
    }

    /**
     * Gets cursor position info (line and column) for contenteditable
     * @param {HTMLElement} element - Contenteditable element
     * @returns {Object} - Line and column numbers
     */
    function getCursorPosition(element) {
        const pos = saveCursorPosition(element);
        if (!pos) {
            return { line: 1, column: 1 };
        }
        
        const textBeforeCursor = element.textContent.substring(0, pos.start);
        const lines = textBeforeCursor.split('\n');
        
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        // Real-time formatting functions
        applyRealtimeFormatting,
        saveCursorPosition,
        restoreCursorPosition,
        getPlainText,
        setPlainText,
        insertTextAtCursor,
        getCursorOffset,
        setCursorOffset,
        
        // Utility functions
        escapeHtml,
        applyFormatting,
        getPreset,
        PRESETS,
        countWords,
        countCharacters,
        countParagraphs,
        getCursorPosition
    };

})();