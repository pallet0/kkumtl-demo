/**
 * ========================================
 * MAIN APPLICATION MODULE
 * Orchestrates all modules and handles
 * user interactions for the novel writer
 * ========================================
 */

(function() {
    'use strict';

    // ========================================
    // DOM ELEMENT REFERENCES
    // ========================================
    
    const elements = {
        // Modal
        passwordModal: document.getElementById('password-modal'),
        passwordInput: document.getElementById('password-input'),
        passwordSubmit: document.getElementById('password-submit'),
        passwordError: document.getElementById('password-error'),
        
        // App Container
        appContainer: document.getElementById('app-container'),
        
        // Status
        statusIndicator: document.getElementById('status-indicator'),
        wordCount: document.getElementById('word-count'),
        charCount: document.getElementById('char-count'),
        remainingGenerations: document.getElementById('remaining-generations'),
        remainingCount: document.getElementById('remaining-count'),
        remainingImageGenerations: document.getElementById('remaining-image-generations'),
        remainingImageCount: document.getElementById('remaining-image-count'),
        cursorPosition: document.getElementById('cursor-position'),
        generationInfo: document.getElementById('generation-info'),
        autosaveStatus: document.getElementById('autosave-status'),
        
        // Editor (now contenteditable)
        editorTextarea: document.getElementById('editor-textarea'),
        loadingOverlay: document.getElementById('loading-overlay'),
        
        // Toolbar Buttons
        btnNew: document.getElementById('btn-new'),
        btnSave: document.getElementById('btn-save'),
        btnLoad: document.getElementById('btn-load'),
        btnUndo: document.getElementById('btn-undo'),
        btnRedo: document.getElementById('btn-redo'),
        btnGenerate: document.getElementById('btn-generate'),
        btnGenerateImage: document.getElementById('btn-generate-image'),
        btnStop: document.getElementById('btn-stop'),
        btnFullscreen: document.getElementById('btn-fullscreen'),
        
        // Settings Controls
        modelSelect: document.getElementById('model-select'),
        temperatureSlider: document.getElementById('temperature-slider'),
        temperatureValue: document.getElementById('temperature-value'),
        maxWordsSlider: document.getElementById('max-words-slider'),
        maxWordsValue: document.getElementById('max-words-value'),
        paragraphLength: document.getElementById('paragraph-length'),
        languageSelect: document.getElementById('language-select'),
        genreSelect: document.getElementById('genre-select'),
        styleSelect: document.getElementById('style-select'),
        toneSelect: document.getElementById('tone-select'),
        povSelect: document.getElementById('pov-select'),
        streamingToggle: document.getElementById('streaming-toggle'),
        
        // Formatting Controls
        fontFamily: document.getElementById('font-family'),
        fontSizeSlider: document.getElementById('font-size-slider'),
        fontSizeValue: document.getElementById('font-size-value'),
        lineHeightSlider: document.getElementById('line-height-slider'),
        lineHeightValue: document.getElementById('line-height-value'),
        paragraphSpacingSlider: document.getElementById('paragraph-spacing-slider'),
        paragraphSpacingValue: document.getElementById('paragraph-spacing-value'),
        dialogueColor: document.getElementById('dialogue-color'),
        thoughtsColor: document.getElementById('thoughts-color'),
        emphasisColor: document.getElementById('emphasis-color'),
        textColor: document.getElementById('text-color'),
        bgColor: document.getElementById('bg-color'),
        
        // Action Buttons
        btnExportTxt: document.getElementById('btn-export-txt'),
        btnExportHtml: document.getElementById('btn-export-html'),
        btnResetSettings: document.getElementById('btn-reset-settings'),
        
        // File Input
        fileInput: document.getElementById('file-input'),
        
        // Alert Container
        alertContainer: document.getElementById('alert-container')
    };

    // ========================================
    // APPLICATION STATE
    // ========================================
    
    let state = {
        isGenerating: false,
        isGeneratingImage: false,
        isFullscreen: false,
        lastSaveTime: null,
        autoSaveInterval: null,
        cursorPositionBeforeGeneration: 0
    };

    // ========================================
    // INITIALIZATION
    // ========================================

    /**
     * Initializes the application
     */
    function init() {
        // Set up event listeners
        setupPasswordModal();
        setupToolbarListeners();
        setupEditorListeners();
        setupSettingsListeners();
        setupFormattingListeners();
        setupKeyboardShortcuts();
        setupPresetButtons();
        setupImageDeleteHandlers();
        
        // Load saved data
        loadSavedDocument();
        loadSavedSettings();
        loadSavedFormatting();
        
        // Start auto-save
        startAutoSave();
        
        // Focus password input
        elements.passwordInput.focus();
    }

    // ========================================
    // PASSWORD MODAL
    // ========================================

    /**
     * Sets up password modal event listeners
     */
    function setupPasswordModal() {
        // Submit on button click
        elements.passwordSubmit.addEventListener('click', handlePasswordSubmit);
        
        // Submit on Enter key
        elements.passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handlePasswordSubmit();
            }
        });
    }

    /**
     * Handles password submission
     */
    async function handlePasswordSubmit() {
        const password = elements.passwordInput.value;
        
        if (!CryptoModule.validatePassword(password)) {
            showPasswordError('Please enter a password');
            return;
        }

        elements.passwordSubmit.disabled = true;
        elements.passwordSubmit.textContent = 'Unlocking...';
        
        try {
            const { apiKey, isAdmin } = await CryptoModule.decryptApiKey(password);
            GeminiModule.initialize(apiKey);
            
            // Initialize rate limiting with admin status
            await RateLimitModule.initialize(isAdmin);
            
            // Hide modal and show app
            elements.passwordModal.classList.add('hidden');
            elements.appContainer.classList.remove('hidden');
            
            // Apply user restrictions based on admin status
            applyUserRestrictions();
            
            // Update remaining generations display
            updateRemainingGenerationsDisplay();
            updateRemainingImageGenerationsDisplay();
            
            // Focus editor
            elements.editorTextarea.focus();
            
            // Show appropriate welcome message
            if (isAdmin) {
                showAlert('success', '관리자 권한!', '관리자 권한으로 잠금이 해제되었습니다. 제한이 없습니다.');
            } else {
                const remaining = RateLimitModule.getRemainingGenerations();
                const remainingImages = RateLimitModule.getRemainingImageGenerations();
                showAlert('success', '환영합니다!', `잠금이 해제되었습니다. 텍스트 생성 ${remaining}회, 이미지 생성 ${remainingImages}회가 남았습니다.`);
            }
            
        } catch (error) {
            const classified = GeminiModule.classifyError(error);
            showPasswordError(classified.message);
            elements.passwordInput.value = '';
            elements.passwordInput.focus();
        } finally {
            elements.passwordSubmit.disabled = false;
            elements.passwordSubmit.textContent = 'Unlock';
        }
    }

    /**
     * Shows error message in password modal
     * @param {string} message - Error message
     */
    function showPasswordError(message) {
        elements.passwordError.textContent = message;
        elements.passwordError.classList.remove('hidden');
        
        // Shake animation
        elements.passwordInput.style.animation = 'none';
        elements.passwordInput.offsetHeight; // Trigger reflow
        elements.passwordInput.style.animation = 'shake 0.5s ease';
    }

    /**
     * Updates the remaining generations display in the UI
     */
    function updateRemainingGenerationsDisplay() {
        if (RateLimitModule.isAdmin()) {
            // Hide for admins - they have unlimited generations
            elements.remainingGenerations.classList.add('hidden');
        } else {
            const remaining = RateLimitModule.getRemainingGenerations();
            elements.remainingCount.textContent = remaining;
            elements.remainingGenerations.classList.remove('hidden');
            
            // Add warning style if low on generations
            if (remaining <= 2) {
                elements.remainingGenerations.classList.add('low-count');
            } else {
                elements.remainingGenerations.classList.remove('low-count');
            }
        }
    }

    /**
     * Updates the remaining image generations display in the UI
     */
    function updateRemainingImageGenerationsDisplay() {
        if (RateLimitModule.isAdmin()) {
            // Hide for admins - they have unlimited generations
            elements.remainingImageGenerations.classList.add('hidden');
        } else {
            const remaining = RateLimitModule.getRemainingImageGenerations();
            elements.remainingImageCount.textContent = remaining;
            elements.remainingImageGenerations.classList.remove('hidden');
            
            // Add warning style if low on generations
            if (remaining <= 1) {
                elements.remainingImageGenerations.classList.add('low-count');
            } else {
                elements.remainingImageGenerations.classList.remove('low-count');
            }
        }
    }

    /**
     * Applies restrictions based on user admin status
     * Non-admin users are restricted to Gemini 2.5 Pro only
     */
    function applyUserRestrictions() {
        if (!RateLimitModule.isAdmin()) {
            // Restrict model selection to Gemini 2.5 Pro only for non-admin users
            const modelSelect = elements.modelSelect;
            
            // Set to Gemini 2.5 Pro and disable other options
            modelSelect.value = 'gemini-2.5-pro';
            
            // Disable and style other options (only if not already done)
            for (let option of modelSelect.options) {
                if (option.value !== 'gemini-2.5-pro' && !option.disabled) {
                    option.disabled = true;
                    option.textContent += ' (Admin only)';
                }
            }
        }
    }

    // ========================================
    // TOOLBAR LISTENERS
    // ========================================

    /**
     * Sets up toolbar button event listeners
     */
    function setupToolbarListeners() {
        // New document
        elements.btnNew.addEventListener('click', () => {
            if (FormatterModule.getPlainText(elements.editorTextarea).trim() && 
                !confirm('새 문서를 만드시겠습니까? 저장하지 않은 변경사항은 사라집니다.')) {
                return;
            }
            elements.editorTextarea.textContent = '';
            FormatterModule.applyRealtimeFormatting(elements.editorTextarea);
            StorageModule.clearHistory();
            updateStats();
            showAlert('info', '새 문서', '새 문서를 시작했습니다.');
        });

        // Save document
        elements.btnSave.addEventListener('click', () => {
            saveDocument();
            showAlert('success', '저장됨', '문서가 성공적으로 저장되었습니다.');
        });

        // Load document
        elements.btnLoad.addEventListener('click', () => {
            elements.fileInput.click();
        });

        elements.fileInput.addEventListener('change', handleFileLoad);

        // Undo
        elements.btnUndo.addEventListener('click', handleUndo);

        // Redo
        elements.btnRedo.addEventListener('click', handleRedo);

        // Generate
        elements.btnGenerate.addEventListener('click', handleGenerate);

        // Generate Image
        elements.btnGenerateImage.addEventListener('click', handleGenerateImage);

        // Stop generation
        elements.btnStop.addEventListener('click', handleStopGeneration);

        // Toggle fullscreen
        elements.btnFullscreen.addEventListener('click', toggleFullscreen);

        // Export buttons
        elements.btnExportTxt.addEventListener('click', () => {
            const text = FormatterModule.getPlainText(elements.editorTextarea);
            StorageModule.exportAsText(text);
            showAlert('success', '내보내기 완료', '문서를 텍스트 파일로 내보냈습니다.');
        });

        elements.btnExportHtml.addEventListener('click', () => {
            const text = FormatterModule.getPlainText(elements.editorTextarea);
            const formatting = getFormattingSettings();
            StorageModule.exportAsHtml(text, formatting);
            showAlert('success', '내보내기 완료', '문서를 HTML 파일로 내보냈습니다.');
        });

        // Reset settings
        elements.btnResetSettings.addEventListener('click', () => {
            if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
                StorageModule.resetSettings();
                StorageModule.resetFormatting();
                loadSavedSettings();
                loadSavedFormatting();
                showAlert('info', '초기화됨', '설정이 기본값으로 복원되었습니다.');
            }
        });
    }

    // ========================================
    // EDITOR LISTENERS
    // ========================================

    /**
     * Sets up editor event listeners for contenteditable
     */
    function setupEditorListeners() {
        const editor = elements.editorTextarea;

        // Update stats and apply formatting on input
        editor.addEventListener('input', () => {
            // Apply real-time formatting
            FormatterModule.applyRealtimeFormatting(editor);
            
            updateStats();
            
            // Push to history for undo (debounced)
            debounce(() => {
                StorageModule.pushHistory(FormatterModule.getPlainText(editor));
            }, 500)();
        });

        // Handle Enter key explicitly to ensure it works near non-editable image containers
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;
                
                const range = selection.getRangeAt(0);
                const anchorNode = selection.anchorNode;
                
                // Check if manual line break is needed (cursor at zero-width space near non-editable element)
                const needsManualLineBreak = anchorNode && 
                    anchorNode.nodeType === Node.TEXT_NODE && 
                    anchorNode.textContent && 
                    (/^\u200B+$/.test(anchorNode.textContent) || 
                     (anchorNode.previousSibling?.contentEditable === 'false') ||
                     (anchorNode.nextSibling?.contentEditable === 'false'));
                
                if (needsManualLineBreak) {
                    e.preventDefault();
                    
                    // Insert a line break and a text node for cursor positioning.
                    // insertNode places each node at the current range position,
                    // so after these two calls the DOM will be: [br][textNode]
                    const br = document.createElement('br');
                    const textNode = document.createTextNode('\u200B');
                    
                    range.deleteContents();
                    range.insertNode(textNode);
                    range.insertNode(br);
                    
                    // Move cursor to end of the zero-width space (offset 1)
                    // This is consistent with insertImageIntoEditor cursor positioning
                    const newRange = document.createRange();
                    newRange.setStart(textNode, 1);
                    newRange.setEnd(textNode, 1);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    // Trigger input event for formatting and stats update
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        // Update cursor position
        editor.addEventListener('click', updateCursorDisplay);
        editor.addEventListener('keyup', updateCursorDisplay);
        editor.addEventListener('focus', updateCursorDisplay);
    }

    /**
     * Updates word and character count display
     */
    function updateStats() {
        const text = FormatterModule.getPlainText(elements.editorTextarea);
        elements.wordCount.textContent = FormatterModule.countWords(text);
        elements.charCount.textContent = FormatterModule.countCharacters(text);
    }

    /**
     * Updates cursor position display
     */
    function updateCursorDisplay() {
        const pos = FormatterModule.getCursorPosition(elements.editorTextarea);
        elements.cursorPosition.textContent = `${pos.line}줄, ${pos.column}열`;
    }

    // ========================================
    // SETTINGS LISTENERS
    // ========================================

    /**
     * Sets up settings control event listeners
     */
    function setupSettingsListeners() {
        // Temperature slider
        elements.temperatureSlider.addEventListener('input', (e) => {
            elements.temperatureValue.textContent = e.target.value;
            saveSettings();
        });

        // Max words slider
        elements.maxWordsSlider.addEventListener('input', (e) => {
            elements.maxWordsValue.textContent = e.target.value;
            saveSettings();
        });

        // All select inputs
        const selects = [
            elements.modelSelect,
            elements.paragraphLength,
            elements.languageSelect,
            elements.genreSelect,
            elements.styleSelect,
            elements.toneSelect,
            elements.povSelect
        ];

        selects.forEach(select => {
            select.addEventListener('change', saveSettings);
        });

        // Streaming toggle (if it exists)
        if (elements.streamingToggle) {
            elements.streamingToggle.addEventListener('change', saveSettings);
        }
    }

    // ========================================
    // FORMATTING LISTENERS
    // ========================================

    /**
     * Sets up formatting control event listeners
     */
    function setupFormattingListeners() {
        // Font family
        elements.fontFamily.addEventListener('change', () => {
            applyAndSaveFormatting();
        });

        // Font size slider
        elements.fontSizeSlider.addEventListener('input', (e) => {
            elements.fontSizeValue.textContent = e.target.value;
            applyAndSaveFormatting();
        });

        // Line height slider
        elements.lineHeightSlider.addEventListener('input', (e) => {
            elements.lineHeightValue.textContent = e.target.value;
            applyAndSaveFormatting();
        });

        // Paragraph spacing slider
        elements.paragraphSpacingSlider.addEventListener('input', (e) => {
            elements.paragraphSpacingValue.textContent = e.target.value;
            applyAndSaveFormatting();
        });

        // Color pickers
        const colorPickers = [
            elements.dialogueColor,
            elements.thoughtsColor,
            elements.emphasisColor,
            elements.textColor,
            elements.bgColor
        ];

        colorPickers.forEach(picker => {
            picker.addEventListener('input', () => {
                // Update preview swatch
                const preview = picker.parentElement.querySelector('.color-preview');
                if (preview) {
                    preview.style.backgroundColor = picker.value;
                }
                applyAndSaveFormatting();
            });
        });
    }

    /**
     * Sets up preset button listeners
     */
    function setupPresetButtons() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetName = btn.dataset.preset;
                const preset = FormatterModule.getPreset(presetName);
                
                if (preset) {
                    // Apply preset colors
                    elements.bgColor.value = preset.bgColor;
                    elements.textColor.value = preset.textColor;
                    elements.dialogueColor.value = preset.dialogueColor;
                    elements.thoughtsColor.value = preset.thoughtsColor;
                    elements.emphasisColor.value = preset.emphasisColor;
                    
                    // Update preview swatches
                    updateColorPreviews();
                    
                    // Apply and save
                    applyAndSaveFormatting();
                    
                    const presetNames = {
                        'sepia': '세피아',
                        'dark': '다크',
                        'light': '라이트',
                        'paper': '종이'
                    };
                    showAlert('success', '테마 적용됨', `${presetNames[presetName] || presetName} 테마가 활성화되었습니다.`);
                }
            });
        });
    }

    /**
     * Updates all color preview swatches
     */
    function updateColorPreviews() {
        const pickers = [
            elements.dialogueColor,
            elements.thoughtsColor,
            elements.emphasisColor,
            elements.textColor,
            elements.bgColor
        ];

        pickers.forEach(picker => {
            const preview = picker.parentElement.querySelector('.color-preview');
            if (preview) {
                preview.style.backgroundColor = picker.value;
            }
        });
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================

    /**
     * Sets up keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter: Generate
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (!state.isGenerating) {
                    handleGenerate();
                }
            }

            // Escape: Stop generation
            if (e.key === 'Escape' && state.isGenerating) {
                e.preventDefault();
                handleStopGeneration();
            }

            // Ctrl+Z: Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }

            // Ctrl+Y or Ctrl+Shift+Z: Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                handleRedo();
            }

            // Ctrl+S: Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveDocument();
                showAlert('success', '저장됨', '문서가 저장되었습니다.');
            }
        });
    }

    // ========================================
    // GENERATION HANDLERS
    // ========================================

    /**
     * Handles text generation
     */
    async function handleGenerate() {
        if (state.isGenerating || !GeminiModule.isInitialized()) {
            return;
        }

        // Check rate limits before generating
        const rateLimitCheck = RateLimitModule.canGenerate();
        if (!rateLimitCheck.allowed) {
            showAlert('warning', '생성 한도 도달', rateLimitCheck.reason);
            return;
        }

        const editor = elements.editorTextarea;
        const cursorPos = FormatterModule.getCursorOffset(editor);
        const fullText = FormatterModule.getPlainText(editor);
        const textBefore = fullText.substring(0, cursorPos);
        const textAfter = fullText.substring(cursorPos);

        // Check input token limit before generating
        const inputTokenCheck = RateLimitModule.checkInputTokenLimit(textBefore);
        if (!inputTokenCheck.allowed) {
            showAlert('warning', '입력 토큰 한도 초과', inputTokenCheck.reason);
            return;
        }

        // Save state for undo
        StorageModule.pushHistory(fullText);
        state.cursorPositionBeforeGeneration = cursorPos;

        // Update UI
        setGeneratingState(true);

        const settings = getGenerationSettings();
        
        // Apply rate limit to max words if not admin
        settings.maxWords = RateLimitModule.clampMaxWords(settings.maxWords);

        await GeminiModule.generateText(
            textBefore,
            textAfter,
            settings,
            // onChunk - called for each streaming chunk
            (chunk, generatedText) => {
                const newText = textBefore + generatedText + textAfter;
                FormatterModule.setPlainText(editor, newText);
                
                // Keep cursor at end of generated text
                const newCursorPos = textBefore.length + generatedText.length;
                FormatterModule.setCursorOffset(editor, newCursorPos);
                
                // Scroll to cursor
                scrollToCursor();
                
                // Update stats
                updateStats();
            },
            // onComplete - called when generation finishes
            (generatedText) => {
                const finalText = textBefore + generatedText + textAfter;
                FormatterModule.setPlainText(editor, finalText);
                
                // Position cursor after generated text
                const newCursorPos = textBefore.length + generatedText.length;
                FormatterModule.setCursorOffset(editor, newCursorPos);
                
                setGeneratingState(false);
                updateStats();
                
                // Save to history
                StorageModule.pushHistory(finalText);
                
                // Increment generation count (for rate limiting)
                RateLimitModule.incrementGenerationCount();
                
                // Update remaining generations display in the UI
                updateRemainingGenerationsDisplay();
                
                // Show info with remaining generations
                const wordCount = FormatterModule.countWords(generatedText);
                const remaining = RateLimitModule.getRemainingGenerations();
                if (RateLimitModule.isAdmin()) {
                    elements.generationInfo.textContent = `${wordCount}단어 생성됨 (관리자)`;
                } else {
                    elements.generationInfo.textContent = `${wordCount}단어 생성됨 (${remaining}회 남음)`;
                }
                
                setTimeout(() => {
                    elements.generationInfo.textContent = '';
                }, 3000);
            },
            // onError - called on error
            (error) => {
                setGeneratingState(false);
                const classified = GeminiModule.classifyError(error);
                showAlert(classified.type, classified.title, classified.message);
            }
        );
    }

    /**
     * Handles image generation
     */
    async function handleGenerateImage() {
        if (state.isGenerating || state.isGeneratingImage || !GeminiModule.isInitialized()) {
            return;
        }

        // Check rate limits before generating
        const rateLimitCheck = RateLimitModule.canGenerateImage();
        if (!rateLimitCheck.allowed) {
            showAlert('warning', '이미지 생성 한도 도달', rateLimitCheck.reason);
            return;
        }

        const editor = elements.editorTextarea;
        const fullText = FormatterModule.getPlainText(editor);

        if (!fullText.trim()) {
            showAlert('warning', '내용이 없습니다', '이미지를 생성하기 전에 먼저 텍스트를 작성해주세요. 이미지는 이야기의 맥락을 기반으로 생성됩니다.');
            return;
        }

        // Update UI
        setImageGeneratingState(true);

        const settings = getGenerationSettings();

        await GeminiModule.generateImage(
            fullText,
            settings,
            // onComplete - called when image generation finishes
            (imageData) => {
                setImageGeneratingState(false);
                
                // Insert the image into the editor at the cursor position
                insertImageIntoEditor(imageData);
                
                // Increment image generation count (for rate limiting)
                RateLimitModule.incrementImageGenerationCount();
                
                // Update remaining image generations display in the UI
                updateRemainingImageGenerationsDisplay();
                
                // Show info with remaining generations
                const remaining = RateLimitModule.getRemainingImageGenerations();
                if (RateLimitModule.isAdmin()) {
                    elements.generationInfo.textContent = '이미지 생성됨 (관리자)';
                } else {
                    elements.generationInfo.textContent = `이미지 생성됨 (${remaining}장 남음)`;
                }
                
                setTimeout(() => {
                    elements.generationInfo.textContent = '';
                }, 3000);
                
                showAlert('success', '이미지 생성 완료', '이야기에 삽화가 추가되었습니다.');
            },
            // onError - called on error
            (error) => {
                setImageGeneratingState(false);
                const classified = GeminiModule.classifyError(error);
                showAlert(classified.type, classified.title, classified.message);
            }
        );
    }

    /**
     * Inserts a generated image into the editor at the current cursor position
     * @param {Object} imageData - Object with mimeType and data (base64)
     */
    function insertImageIntoEditor(imageData) {
        const editor = elements.editorTextarea;
        const selection = window.getSelection();
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'novel-image-container';
        imageContainer.contentEditable = 'false';
        
        // Create image element
        const img = document.createElement('img');
        img.className = 'novel-image';
        img.src = `data:${imageData.mimeType};base64,${imageData.data}`;
        img.alt = 'Generated illustration for the novel';
        
        // Create delete button (click handler is set up via event delegation in setupImageDeleteHandlers)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'novel-image-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '이미지 삭제';
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(deleteBtn);
        
        // Insert image at cursor position
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // Add line breaks around the image for proper text flow
            const beforeBr = document.createElement('br');
            const afterBr = document.createElement('br');
            
            // Create a text node with a zero-width space after the image
            // This provides a valid cursor position after the non-editable image container
            const textNodeAfter = document.createTextNode('\u200B');
            
            // Insert nodes: each insertNode inserts at the collapsed range position,
            // so we insert in reverse visual order (last-to-first)
            range.insertNode(textNodeAfter);
            range.insertNode(afterBr);
            range.insertNode(imageContainer);
            range.insertNode(beforeBr);
            
            // Move cursor to the text node after the image
            // Position cursor at the end of the zero-width space (offset 1)
            const newRange = document.createRange();
            newRange.setStart(textNodeAfter, 1);
            newRange.setEnd(textNodeAfter, 1);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            // If no selection, append to end with proper cursor positioning
            editor.appendChild(document.createElement('br'));
            editor.appendChild(imageContainer);
            editor.appendChild(document.createElement('br'));
            
            // Add a text node at the end for cursor positioning
            const textNodeEnd = document.createTextNode('\u200B');
            editor.appendChild(textNodeEnd);
            
            // Place cursor at the end of the text node
            const newRange = document.createRange();
            newRange.setStart(textNodeEnd, 1);
            newRange.setEnd(textNodeEnd, 1);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
        
        // Focus back on editor - this is crucial for keyboard input to work
        editor.focus();
        
        // Use setTimeout(0) to defer cursor recovery to the next event loop tick.
        // This allows the browser to complete DOM updates and layout calculations
        // triggered by insertNode and focus() before we attempt cursor positioning.
        // Without this delay, some browsers may reset or lose the cursor selection.
        setTimeout(() => {
            // Re-focus and ensure cursor is in an editable position
            if (document.activeElement !== editor) {
                editor.focus();
            }
            
            // Try to place cursor at the end of the editor's text content
            // if selection was lost during focus
            const currentSelection = window.getSelection();
            if (!currentSelection.rangeCount || !editor.contains(currentSelection.anchorNode)) {
                // Find the last text node in the editor
                const treeWalker = document.createTreeWalker(
                    editor,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                let lastTextNode = null;
                while (treeWalker.nextNode()) {
                    lastTextNode = treeWalker.currentNode;
                }
                if (lastTextNode) {
                    const recoverRange = document.createRange();
                    recoverRange.setStart(lastTextNode, lastTextNode.length);
                    recoverRange.setEnd(lastTextNode, lastTextNode.length);
                    currentSelection.removeAllRanges();
                    currentSelection.addRange(recoverRange);
                }
            }
        }, 0);
        
        updateStats();
    }

    /**
     * Sets up event delegation for image delete buttons
     */
    function setupImageDeleteHandlers() {
        // Use event delegation for dynamically added delete buttons
        elements.editorTextarea.addEventListener('click', function(e) {
            if (e.target.classList.contains('novel-image-delete')) {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('이 이미지를 삭제하시겠습니까?')) {
                    const container = e.target.closest('.novel-image-container');
                    if (container) {
                        container.remove();
                        updateStats();
                    }
                }
            }
        });
    }

    /**
     * Handles stopping generation
     */
    function handleStopGeneration() {
        GeminiModule.stopGeneration();
        setGeneratingState(false);
        setImageGeneratingState(false);
    }

    /**
     * Sets the UI state during/after generation
     * @param {boolean} isGenerating - Whether generation is in progress
     */
    function setGeneratingState(isGenerating) {
        state.isGenerating = isGenerating;

        // Update status indicator
        const statusIndicator = elements.statusIndicator;
        if (isGenerating) {
            statusIndicator.className = 'status-generating';
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">생성 중...</span>';
        } else {
            statusIndicator.className = 'status-idle';
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">준비됨</span>';
        }

        // Toggle buttons
        elements.btnGenerate.classList.toggle('hidden', isGenerating);
        elements.btnGenerateImage.classList.toggle('hidden', isGenerating);
        elements.btnStop.classList.toggle('hidden', !isGenerating);

        // Toggle loading overlay (only if not streaming)
        const settings = getGenerationSettings();
        if (!settings.streaming) {
            elements.loadingOverlay.classList.toggle('hidden', !isGenerating);
        }

        // Disable/enable contenteditable during non-streaming generation
        if (!settings.streaming) {
            elements.editorTextarea.contentEditable = isGenerating ? 'false' : 'true';
        }
    }

    /**
     * Sets the UI state during/after image generation
     * @param {boolean} isGenerating - Whether image generation is in progress
     */
    function setImageGeneratingState(isGenerating) {
        state.isGeneratingImage = isGenerating;

        // Update status indicator
        const statusIndicator = elements.statusIndicator;
        if (isGenerating) {
            statusIndicator.className = 'status-generating';
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">이미지 생성 중...</span>';
        } else if (!state.isGenerating) {
            statusIndicator.className = 'status-idle';
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">준비됨</span>';
        }

        // Toggle buttons
        elements.btnGenerate.classList.toggle('hidden', isGenerating);
        elements.btnGenerateImage.classList.toggle('hidden', isGenerating);
        elements.btnStop.classList.toggle('hidden', !isGenerating);

        // Toggle loading overlay
        elements.loadingOverlay.classList.toggle('hidden', !isGenerating);
        if (isGenerating) {
            elements.loadingOverlay.querySelector('.loading-text').textContent = '이미지 생성 중...';
        } else {
            elements.loadingOverlay.querySelector('.loading-text').textContent = '생성 중...';
        }

        // Disable/enable contenteditable during generation
        elements.editorTextarea.contentEditable = isGenerating ? 'false' : 'true';
    }

    /**
     * Scrolls the editor to keep cursor visible
     */
    function scrollToCursor() {
        const editor = elements.editorTextarea;
        const selection = window.getSelection();
        
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        
        // Check if cursor is below viewport
        if (rect.bottom > editorRect.bottom - 100) {
            editor.scrollTop += (rect.bottom - editorRect.bottom + 100);
        }
        // Check if cursor is above viewport
        else if (rect.top < editorRect.top + 100) {
            editor.scrollTop -= (editorRect.top - rect.top + 100);
        }
    }

    // ========================================
    // UNDO/REDO HANDLERS
    // ========================================

    /**
     * Handles undo action
     */
    function handleUndo() {
        const currentContent = FormatterModule.getPlainText(elements.editorTextarea);
        const previousContent = StorageModule.undo(currentContent);
        if (previousContent !== null) {
            FormatterModule.setPlainText(elements.editorTextarea, previousContent);
            updateStats();
        }
    }

    /**
     * Handles redo action
     */
    function handleRedo() {
        const currentContent = FormatterModule.getPlainText(elements.editorTextarea);
        const nextContent = StorageModule.redo(currentContent);
        if (nextContent !== null) {
            FormatterModule.setPlainText(elements.editorTextarea, nextContent);
            updateStats();
        }
    }

    // ========================================
    // FILE OPERATIONS
    // ========================================

    /**
     * Handles file loading
     * @param {Event} e - Change event
     */
    async function handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const content = await StorageModule.readFile(file);
            
            if (FormatterModule.getPlainText(elements.editorTextarea).trim() && 
                !confirm('이 파일을 불러오시겠습니까? 현재 내용이 대체됩니다.')) {
                return;
            }

            FormatterModule.setPlainText(elements.editorTextarea, content);
            StorageModule.pushHistory(content);
            updateStats();
            
            showAlert('success', '파일 불러오기 완료', `"${file.name}" 파일을 불러왔습니다.`);
        } catch (error) {
            showAlert('error', '불러오기 실패', '파일을 읽을 수 없습니다. 다시 시도해주세요.');
        }

        // Reset file input
        e.target.value = '';
    }



    // ========================================
    // FULLSCREEN MODE
    // ========================================

    /**
     * Toggles fullscreen/focus mode
     */
    function toggleFullscreen() {
        state.isFullscreen = !state.isFullscreen;
        document.body.classList.toggle('fullscreen-mode', state.isFullscreen);
        
        elements.btnFullscreen.textContent = state.isFullscreen ? '⛶ 나가기' : '⛶ 집중';
    }

    // ========================================
    // SETTINGS & FORMATTING HELPERS
    // ========================================

    /**
     * Gets current generation settings
     * @returns {Object} - Settings object
     */
    function getGenerationSettings() {
        return {
            model: elements.modelSelect.value,
            temperature: parseFloat(elements.temperatureSlider.value),
            maxWords: parseInt(elements.maxWordsSlider.value),
            paragraphLength: elements.paragraphLength.value,
            language: elements.languageSelect.value,
            genre: elements.genreSelect.value,
            style: elements.styleSelect.value,
            tone: elements.toneSelect.value,
            pov: elements.povSelect.value,
            streaming: elements.streamingToggle ? elements.streamingToggle.checked : false
        };
    }

    /**
     * Gets current formatting settings
     * @returns {Object} - Formatting object
     */
    function getFormattingSettings() {
        return {
            fontFamily: elements.fontFamily.value,
            fontSize: parseInt(elements.fontSizeSlider.value),
            lineHeight: parseFloat(elements.lineHeightSlider.value),
            paragraphSpacing: parseFloat(elements.paragraphSpacingSlider.value),
            dialogueColor: elements.dialogueColor.value,
            thoughtsColor: elements.thoughtsColor.value,
            emphasisColor: elements.emphasisColor.value,
            textColor: elements.textColor.value,
            bgColor: elements.bgColor.value
        };
    }

    /**
     * Saves current settings
     */
    function saveSettings() {
        StorageModule.saveSettings(getGenerationSettings());
    }

    /**
     * Applies formatting and saves
     */
    function applyAndSaveFormatting() {
        const formatting = getFormattingSettings();
        FormatterModule.applyFormatting(formatting);
        StorageModule.saveFormatting(formatting);
        
        // Reapply real-time formatting with new colors
        FormatterModule.applyRealtimeFormatting(elements.editorTextarea);
    }

    /**
     * Loads saved settings into UI
     */
    function loadSavedSettings() {
        const settings = StorageModule.loadSettings();
        
        elements.modelSelect.value = settings.model;
        elements.temperatureSlider.value = settings.temperature;
        elements.temperatureValue.textContent = settings.temperature;
        elements.maxWordsSlider.value = settings.maxWords;
        elements.maxWordsValue.textContent = settings.maxWords;
        elements.paragraphLength.value = settings.paragraphLength;
        elements.languageSelect.value = settings.language;
        elements.genreSelect.value = settings.genre;
        elements.styleSelect.value = settings.style;
        elements.toneSelect.value = settings.tone;
        elements.povSelect.value = settings.pov;
        if (elements.streamingToggle) {
            elements.streamingToggle.checked = settings.streaming;
        }
    }

    /**
     * Loads saved formatting into UI
     */
    function loadSavedFormatting() {
        const formatting = StorageModule.loadFormatting();
        
        elements.fontFamily.value = formatting.fontFamily;
        elements.fontSizeSlider.value = formatting.fontSize;
        elements.fontSizeValue.textContent = formatting.fontSize;
        elements.lineHeightSlider.value = formatting.lineHeight;
        elements.lineHeightValue.textContent = formatting.lineHeight;
        elements.paragraphSpacingSlider.value = formatting.paragraphSpacing;
        elements.paragraphSpacingValue.textContent = formatting.paragraphSpacing;
        elements.dialogueColor.value = formatting.dialogueColor;
        elements.thoughtsColor.value = formatting.thoughtsColor;
        elements.emphasisColor.value = formatting.emphasisColor;
        elements.textColor.value = formatting.textColor;
        elements.bgColor.value = formatting.bgColor;
        
        // Update color previews
        updateColorPreviews();
        
        // Apply to CSS
        FormatterModule.applyFormatting(formatting);
    }

    /**
     * Loads saved document
     */
    function loadSavedDocument() {
        const doc = StorageModule.loadDocument();
        if (doc && doc.content) {
            FormatterModule.setPlainText(elements.editorTextarea, doc.content);
            updateStats();
        }
    }

    // ========================================
    // AUTO-SAVE
    // ========================================

    /**
     * Saves the current document
     */
    function saveDocument() {
        const text = FormatterModule.getPlainText(elements.editorTextarea);
        StorageModule.saveDocument(text);
        state.lastSaveTime = Date.now();
        updateAutosaveStatus();
    }

    /**
     * Updates the autosave status display
     */
    function updateAutosaveStatus() {
        if (state.lastSaveTime) {
            const now = Date.now();
            const diff = Math.floor((now - state.lastSaveTime) / 1000);
            
            if (diff < 60) {
                elements.autosaveStatus.textContent = '방금 저장됨';
            } else if (diff < 3600) {
                elements.autosaveStatus.textContent = `${Math.floor(diff / 60)}분 전 저장됨`;
            } else {
                elements.autosaveStatus.textContent = `${Math.floor(diff / 3600)}시간 전 저장됨`;
            }
        }
    }

    /**
     * Starts auto-save interval
     */
    function startAutoSave() {
        // Auto-save every 30 seconds
        state.autoSaveInterval = setInterval(() => {
            const text = FormatterModule.getPlainText(elements.editorTextarea);
            if (text.trim()) {
                saveDocument();
            }
        }, 30000);

        // Update status display every minute
        setInterval(updateAutosaveStatus, 60000);
    }

    // ========================================
    // ALERT SYSTEM
    // ========================================

    /**
     * Shows an alert message
     * @param {string} type - Alert type (success, warning, error, info)
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     */
    function showAlert(type, title, message) {
        const icons = {
            success: '✓',
            warning: '⚠',
            error: '✕',
            info: 'ℹ'
        };

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span class="alert-icon">${icons[type]}</span>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close" aria-label="Close">×</button>
        `;

        // Close button handler
        alert.querySelector('.alert-close').addEventListener('click', () => {
            alert.remove();
        });

        // Add to container
        elements.alertContainer.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.animation = 'alertSlideOut 0.3s ease forwards';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Debounce function to limit execution frequency
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} - Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================
    // INITIALIZE APPLICATION
    // ========================================
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// Add shake animation for password error
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    @keyframes alertSlideOut {
        to {
            opacity: 0;
            transform: translateX(50px);
        }
    }
`;
document.head.appendChild(style);