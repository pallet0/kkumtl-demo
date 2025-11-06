// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const novelWriter = new NovelWriter();
    
    // DOM Elements
    const elements = {
        novelEditor: document.getElementById('novelEditor'),
        wordCount: document.getElementById('wordCount'),
        apiKey: document.getElementById('apiKey'),
        temperature: document.getElementById('temperature'),
        tempValue: document.getElementById('tempValue'),
        topK: document.getElementById('topK'),
        topKValue: document.getElementById('topKValue'),
        maxWords: document.getElementById('maxWords'),
        maxWordsValue: document.getElementById('maxWordsValue'),
        fontSize: document.getElementById('fontSize'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        fontFamily: document.getElementById('fontFamily'),
        writingStyle: document.getElementById('writingStyle'),
        genre: document.getElementById('genre'),
        writeBtn: document.getElementById('writeBtn'),
        undoBtn: document.getElementById('undoBtn'),
        saveBtn: document.getElementById('saveBtn'),
        clearBtn: document.getElementById('clearBtn'),
        statusMessage: document.getElementById('statusMessage'),
        writingIndicator: document.getElementById('writingIndicator')
    };

    // Initialize from localStorage
    function initialize() {
        const savedContent = novelWriter.loadFromLocalStorage();
        if (savedContent) {
            elements.novelEditor.innerText = savedContent;
            updateWordCount();
            showStatus('Restored from last session', 'info');
        }

        // Load saved API key
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            elements.apiKey.value = savedApiKey;
            novelWriter.setApiKey(savedApiKey);
        }

        // Apply default font settings
        updateFontSettings();
    }

    // Update word count
    function updateWordCount() {
        const text = elements.novelEditor.innerText;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        elements.wordCount.textContent = words;
    }

    // Show status message
    function showStatus(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message ${type}`;
        setTimeout(() => {
            elements.statusMessage.className = 'status-message';
        }, 3000);
    }

    // Update font settings
    function updateFontSettings() {
        elements.novelEditor.style.fontFamily = elements.fontFamily.value;
        elements.novelEditor.style.fontSize = elements.fontSize.value + 'px';
    }

    // Get current parameters
    function getParameters() {
        return {
            temperature: parseFloat(elements.temperature.value),
            topK: parseInt(elements.topK.value),
            maxWords: parseInt(elements.maxWords.value),
            writingStyle: elements.writingStyle.value,
            genre: elements.genre.value
        };
    }

    // Handle write button click
    async function handleWrite() {
        const apiKey = elements.apiKey.value.trim();
        if (!apiKey) {
            showStatus('Please enter your Gemini API key', 'error');
            return;
        }

        novelWriter.setApiKey(apiKey);
        localStorage.setItem('gemini_api_key', apiKey);

        const currentContent = elements.novelEditor.innerText.trim();
        if (!currentContent) {
            showStatus('Please write something to start the novel', 'error');
            return;
        }

        // Disable write button and show indicator
        elements.writeBtn.disabled = true;
        elements.writingIndicator.classList.add('active');
        
        const params = getParameters();
        let newText = '';

        try {
            await novelWriter.generateContent(
                currentContent,
                params,
                // onChunk - handle streaming text
                (chunk) => {
                    newText += chunk;
                    elements.novelEditor.innerText = currentContent + newText;
                    // Scroll to bottom
                    elements.novelEditor.scrollTop = elements.novelEditor.scrollHeight;
                    updateWordCount();
                },
                // onComplete
                (generatedText) => {
                    showStatus('AI writing completed!', 'success');
                    elements.writingIndicator.classList.remove('active');
                    elements.writeBtn.disabled = false;
                    // Auto-save
                    novelWriter.saveToLocalStorage(elements.novelEditor.innerText);
                },
                // onError
                (error) => {
                    showStatus(`Error: ${error}`, 'error');
                    elements.writingIndicator.classList.remove('active');
                    elements.writeBtn.disabled = false;
                }
            );
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
            elements.writingIndicator.classList.remove('active');
            elements.writeBtn.disabled = false;
        }
    }

    // Handle undo
    function handleUndo() {
        const previousContent = novelWriter.undo();
        if (previousContent !== null) {
            elements.novelEditor.innerText = previousContent;
            updateWordCount();
            showStatus('Undone last AI generation', 'info');
        } else {
            showStatus('Nothing to undo', 'error');
        }
    }

    // Handle save
    function handleSave() {
        const content = elements.novelEditor.innerText;
        novelWriter.saveToLocalStorage(content);
        novelWriter.exportNovel(content, `novel_${new Date().getTime()}.txt`);
        showStatus('Novel saved!', 'success');
    }

    // Handle clear
    function handleClear() {
        if (confirm('Are you sure you want to clear all content? This cannot be undone.')) {
            elements.novelEditor.innerText = '';
            updateWordCount();
            novelWriter.history = [];
            localStorage.removeItem('novel_content');
            showStatus('Content cleared', 'info');
        }
    }

    // Event Listeners
    elements.writeBtn.addEventListener('click', handleWrite);
    elements.undoBtn.addEventListener('click', handleUndo);
    elements.saveBtn.addEventListener('click', handleSave);
    elements.clearBtn.addEventListener('click', handleClear);

    // Parameter change listeners
    elements.temperature.addEventListener('input', (e) => {
        elements.tempValue.textContent = e.target.value;
    });

    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });

    elements.maxWords.addEventListener('input', (e) => {
        elements.maxWordsValue.textContent = e.target.value;
    });

    elements.fontSize.addEventListener('input', (e) => {
        elements.fontSizeValue.textContent = e.target.value + 'px';
        updateFontSettings();
    });

    elements.fontFamily.addEventListener('change', updateFontSettings);

    // Monitor editor changes
    elements.novelEditor.addEventListener('input', () => {
        updateWordCount();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to write
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!elements.writeBtn.disabled) {
                handleWrite();
            }
        }
        // Ctrl/Cmd + Z to undo (when not in editor)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && document.activeElement !== elements.novelEditor) {
            e.preventDefault();
            handleUndo();
        }
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
    });

    // Auto-save every 30 seconds
    setInterval(() => {
        const content = elements.novelEditor.innerText;
        if (content) {
            novelWriter.saveToLocalStorage(content);
        }
    }, CONFIG.AUTO_SAVE_INTERVAL);

    // Initialize the app
    initialize();
});