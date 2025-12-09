# AI Novel Writer

A sophisticated AI-powered novel writing application that seamlessly integrates with Google's Gemini API to help writers create compelling stories.

## Features

- **AI-Powered Writing**: Generate text continuations from any cursor position
- **Streaming Output**: Watch the AI write in real-time
- **Customizable Settings**: Adjust temperature, word count, genre, style, and more
- **Rich Formatting**: Dialogue highlighting, custom colors, and typography options
- **Multi-Language Support**: Write in English, Korean, or Japanese
- **Auto-Save**: Never lose your work
- **Export Options**: Save as .txt or formatted .html
- **Secure API Key**: Encrypted API key with password protection

## Setup Instructions

### 1. Generate Encrypted API Key

1. Open `encoder.html` in your browser
2. Enter your Gemini API key
3. Create a strong password (this will be shared with users)
4. Click "Encrypt API Key"
5. Copy the encrypted output

### 2. Configure the Application

1. Open `js/crypto.js`
2. Replace `YOUR_ENCRYPTED_API_KEY_HERE` with your encrypted key:

```javascript
const ENCRYPTED_API_KEY = 'your-long-encrypted-string-here';s