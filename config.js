// Configuration and Constants
const CONFIG = {
    API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent',
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_TOP_K: 40,
    DEFAULT_MAX_WORDS: 500,
    STREAM_DELAY: 10, // milliseconds between character additions for smooth streaming
    AUTO_SAVE_INTERVAL: 30000, // auto-save every 30 seconds
    HISTORY_LIMIT: 10 // number of undo states to keep
};

// Genre-specific prompts
const GENRE_PROMPTS = {
    general: "Continue this story in a compelling and engaging way:",
    fantasy: "Continue this fantasy story with magical elements and vivid world-building:",
    scifi: "Continue this science fiction story with futuristic concepts and technology:",
    mystery: "Continue this mystery story with suspense and intrigue:",
    romance: "Continue this romance story with emotional depth and character development:",
    thriller: "Continue this thriller with tension and fast-paced action:",
    historical: "Continue this historical fiction with period-appropriate details and atmosphere:"
};

// Writing style modifiers
const STYLE_MODIFIERS = {
    neutral: "",
    descriptive: "Use rich, detailed descriptions and vivid imagery.",
    concise: "Write in a clear, concise manner without unnecessary elaboration.",
    poetic: "Use lyrical, poetic language with metaphors and beautiful prose.",
    dramatic: "Write with dramatic flair, emphasizing emotions and conflict.",
    humorous: "Include humor and wit while maintaining the story's flow."
};