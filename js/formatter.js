/**
 * ========================================
 * FORMATTER MODULE
 * Handles text formatting and highlighting
 * for the novel preview
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
        emphasis: /\*([^*]+)\*/g,
        
        // Paragraph breaks (2+ newlines)
        paragraph: /\n\n+/g
    };

    // ========================================
    // TEXT FORMATTING
    // ========================================

    /**
     * Formats plain text into HTML with highlighting
     * @param {string} text - Plain text content
     * @param {Object} colors - Color settings for formatting
     * @returns {string} - HTML formatted text
     */
    function formatText(text, colors) {
        if (!text) return '';

        // Split into paragraphs first
        const paragraphs = text.split(/\n\n+/);

        // Format each paragraph
        const formattedParagraphs = paragraphs.map(paragraph => {
            if (!paragraph.trim()) return '';

            let formatted = paragraph;

            // Apply dialogue formatting (double quotes) - BEFORE escaping HTML
            formatted = formatted.replace(
                /"([^"]+)"/g,
                (match, content) => `<span class="dialogue" style="color: ${colors.dialogueColor}">"${escapeHtml(content)}"</span>`
            );

            // Apply thoughts formatting (single quotes) - BEFORE escaping HTML
            formatted = formatted.replace(
                /'([^']+)'/g,
                (match, content) => `<span class="thoughts" style="color: ${colors.thoughtsColor}">'${escapeHtml(content)}'</span>`
            );

            // Apply emphasis formatting (asterisks) - BEFORE escaping HTML
            formatted = formatted.replace(
                /\*([^*]+)\*/g,
                (match, content) => `<span class="emphasis" style="color: ${colors.emphasisColor}">${escapeHtml(content)}</span>`
            );

            // Escape any remaining unformatted HTML
            formatted = formatted.replace(/(<span class="(?:dialogue|thoughts|emphasis)"[^>]*>.*?<\/span>)|([^<]+)/g, (match, span, text) => {
                if (span) return span; // Already processed
                return escapeHtml(text); // Escape remaining text
            });

            return `<p>${formatted}</p>`;
        });

        return formattedParagraphs.join('');
    }

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHtml(text) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };
        return text.replace(/[&<>]/g, char => escapeMap[char]);
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
     * Gets cursor position info (line and column)
     * @param {HTMLTextAreaElement} textarea - Textarea element
     * @returns {Object} - Line and column numbers
     */
    function getCursorPosition(textarea) {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
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
        formatText,
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