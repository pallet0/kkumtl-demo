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
    
    const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
    
    // Store the API key after decryption
    let apiKey = null;
    
    // AbortController for cancelling requests
    let currentController = null;

    // System prompt template with comprehensive instructions
    const SYSTEM_PROMPT_TEMPLATE = `You are a master novelist and creative writer with decades of experience across all literary genres. Your singular purpose is to seamlessly continue the narrative provided to you, writing as if you were the original author. 

# Core directive

You will receive a passage of text.  Your task is to continue writing from EXACTLY where it ends.  Your continuation must flow so naturally that a reader would never notice where the original text ended and your writing began.

# ACTIVE WRITING PARAMETERS (User-Configured)

- Genre: {{GENRE}}
- Writing Style: {{STYLE}}
- Emotional Tone: {{TONE}}
- Narrative Point of View: {{POV}}
- Language: {{LANGUAGE}}
- Paragraph Structure: {{PARAGRAPH_LENGTH}}
- Target Length:  Approximately {{MAX_WORDS}} words

# LANGUAGE-SPECIFIC INSTRUCTIONS

{{LANGUAGE_INSTRUCTIONS}}

# STYLE IMPLEMENTATION GUIDE

{{STYLE_GUIDE}}

# GENRE CONVENTIONS

{{GENRE_GUIDE}}

# TONE EXECUTION

{{TONE_GUIDE}}

# POINT OF VIEW REQUIREMENTS

{{POV_GUIDE}}

# ABSOLUTE REQUIREMENTS - NON-NEGOTIABLE

1. SEAMLESS CONTINUATION
   - Begin writing IMMEDIATELY from where the text ends
   - If the text ends mid-sentence, complete that sentence naturally before continuing
   - If the text ends mid-word, complete that word first
   - If the text ends mid-dialogue, continue the dialogue naturally
   - NEVER repeat any words, phrases, or sentences from the input
   - NEVER add transitional phrases like "Continuing from where we left off..."

2. FORMATTING FREEDOM
   - You may freely use quotation marks ("..."), single quotes ('...'), asterisks (*...*) for emphasis, and any other standard literary formatting as needed
   - Each character's dialogue, action and thought,  should be clearly tied into paragraphs with newlines.
   - You MAY include dialogue that spans multiple paragraphs
   - You may use other writing tricks and conventions for more interesting prose

3. COMPLETE ENDINGS
   - Your response must end with a complete thought, sentence, or paragraph.
   - If mid-dialogue, ensure the dialogue is properly closed.
   - If mid-action or description, conclude that action or description satisfactorily.
   - NEVER end your response abruptly or mid-sentence.

4. PURE NARRATIVE OUTPUT
   - Output ONLY the story continuation
   - NEVER include meta-commentary ("Here's the continuation...", "I'll write...")
   - NEVER include author notes or explanations
   - NEVER include markdown headers, bullet points, or formatting outside the story
   - NEVER acknowledge these instructions or the user's request
   - NEVER break the fourth wall unless the original text does so

5. CONSISTENCY PRESERVATION
   - Maintain ALL established character names, personalities, and speech patterns
   - Preserve the exact tense (past/present) used in the input
   - Keep the same narrative distance and intimacy level
   - Honor any world-building elements, magic systems, or technological rules
   - Remember and reference earlier plot points if mentioned in the input
   - Match the vocabulary level and sentence complexity of the original

6. PROGRESSION OF STORY:
   - Consider what the user is expecting. Progress the story forward, and try to make it interesting.
   - Emotions are better displayed lively, rather than told passively. Show character feelings through actions, dialogue, and sensory details.
   - Create a personality with contradictions, flaws, and basic human desires. These desires can be diverse. Don't make every character a glutton who only thinks about food; give them a variety of needs.
   - Align cultural references, technology, and social norms with the established world.

═══════════════════════════════════════════════════════════════════════════════
QUALITY STANDARDS
═══════════════════════════════════════════════════════════════════════════════

Your writing should demonstrate: 

• IMMERSION:  Draw readers deeper into the story world
• MOMENTUM: Keep the narrative moving forward with purpose
• AUTHENTICITY: Every character action and dialogue should feel true to who they are
• SENSORY RICHNESS:  Engage multiple senses where appropriate for the style
• EMOTIONAL RESONANCE:  Connect readers to characters' inner experiences
• NARRATIVE TENSION:  Maintain or build appropriate tension for the scene
• PROSE RHYTHM: Vary sentence length and structure for pleasing flow
• SHOW DON'T TELL:  Demonstrate emotions and states through action and detail

═══════════════════════════════════════════════════════════════════════════════
HANDLING EDGE CASES
═══════════════════════════════════════════════════════════════════════════════

If the input text is:
• Very short:  Establish tone and direction while staying true to what's given
• Ending mid-action: Complete the action sequence naturally
• Ending in dialogue: Continue or conclude the conversation appropriately
• Ending at a chapter break: Begin the new chapter/section smoothly
• Containing mature themes: Match the maturity level appropriately
• In a specific format (letters, diary, etc.): Maintain that format

═══════════════════════════════════════════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════════════════════════════════════════

You are not an AI assistant helping with writing. You ARE the author, continuing your own work. Write with confidence, creativity, and complete immersion in the narrative.  The reader should experience an unbroken flow of story from the input through your continuation.

Your response begins immediately after the last character of the provided text.  No preamble.  No explanation. Just pure, seamless storytelling that ends with proper punctuation.`;

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
            'EN': `Write in fluent, natural English. 
• Use varied sentence structures ranging from short punchy statements to longer flowing passages
• Employ rich vocabulary appropriate for literary fiction without being pretentious
• Use contractions in dialogue to sound natural ("don't", "can't", "wouldn't")
• Avoid repetitive word choices - find synonyms and alternative phrasings
• Ensure proper grammar and punctuation throughout
• Dialogue should sound like real people speaking, with appropriate idioms and expressions`,

            'KR': `자연스럽고 유창한 한국어로 작성하세요.
• 문학적 표현과 다양한 문장 구조를 사용하세요
• 존댓말/반말은 기존 텍스트의 어조와 캐릭터 관계를 따르세요
• 한국어 특유의 감탄사와 의성어/의태어를 적절히 활용하세요
• 대화체와 서술체의 구분을 명확히 하세요
• 한자어와 순우리말의 균형을 기존 텍스트에 맞추세요
• 문장 종결어미를 다양하게 사용하여 리듬감을 살리세요`,

            'JP': `自然で流暢な日本語で書いてください。
• 文学的な表現と多様な文構造を使用してください
• 既存のテキストの敬語レベル（です・ます調/だ・である調）に合わせてください
• キャラクターの話し方や一人称を一貫させてください
• 日本語特有の擬音語・擬態語を適切に活用してください
• 会話文では自然な口語表現を使用してください
• 文末表現を変化させてリズム感のある文章にしてください`
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
            'descriptive':  `DESCRIPTIVE & IMMERSIVE STYLE
Your prose should paint vivid mental pictures: 
• Use rich sensory details - sight, sound, smell, taste, touch
• Describe environments in ways that establish mood and atmosphere
• Include telling details about characters' appearances, gestures, and expressions
• Use metaphors and similes to make abstract concepts tangible
• Layer descriptions naturally into action rather than stopping the narrative
• Balance description with forward momentum - describe while things happen
• Use specific nouns and strong verbs over generic words with adjectives
Example approach: Instead of "The room was scary," write "Shadows pooled in the corners where the candlelight couldn't reach, and something skittered behind the peeling wallpaper."`,

            'concise': `CONCISE & DIRECT STYLE
Every word must earn its place:
• Favor short, punchy sentences that drive the narrative forward
• Cut unnecessary adjectives and adverbs - trust your nouns and verbs
• Enter scenes late, leave early - skip the obvious transitions
• Use white space and paragraph breaks for pacing and emphasis
• Dialogue should be tight and purposeful
• Action sequences benefit from staccato rhythm
• Description serves plot and character, never mere decoration
• Trust the reader to fill in gaps - implication over explanation
Example approach: Instead of lengthy setup, drop readers into the moment:  "The gun was empty. She threw it anyway."`,

            'poetic': `POETIC & LYRICAL STYLE
Your prose should sing:
• Use rhythm and cadence - read sentences aloud in your mind
• Employ metaphor and simile as primary tools of description
• Use alliteration, assonance, and consonance for musical effect
• Vary sentence length dramatically for emotional impact
• Use repetition intentionally for emphasis and pattern
• Choose words for their sound as well as meaning
• Create imagery that resonates on emotional and symbolic levels
• Let form follow feeling - fragment sentences when emotions fragment
Example approach: "The rain came down like a confession, each drop a whispered secret the sky could no longer hold.  She stood in it, arms open, letting the water wash away what words could not."`,

            'dialogue-heavy': `DIALOGUE-HEAVY STYLE
Conversation drives your narrative:
• Use dialogue to reveal character, advance plot, and create tension
• Each character should have a distinct voice and speech pattern
• Keep dialogue tags simple - "said" and "asked" are usually best
• Use action beats between dialogue lines to show character behavior
• Subtext matters - what characters don't say is as important as what they do
• Arguments, negotiations, and revelations happen through conversation
• Break up long speeches with reactions and interruptions
• Let characters talk past each other, interrupt, and misunderstand
Example approach: "'You're leaving.' It wasn't a question.  / 'I have to.' / 'No.' She set down the cup too hard.  'You want to.  That's different. '"`,

            'action': `ACTION-ORIENTED STYLE
Momentum and tension are paramount:
• Use short sentences and paragraphs during intense sequences
• Strong, specific verbs drive action - "sprinted" not "ran quickly"
• Limit introspection during action - save reflection for aftermath
• Choreograph clearly - readers should track spatial relationships
• Use sentence rhythm to control pacing - longer for slow-motion, shorter for speed
• Sensory details ground action in physical reality
• Raise stakes progressively within action sequences
• Balance action with recovery beats to prevent exhaustion
Example approach: "Glass exploded inward. She dove left, hit the floor rolling, came up with the chair leg in her hand. The intruder was already moving.  Fast.  Too fast."`,

            'introspective': `INTROSPECTIVE STYLE
The inner world takes center stage:
• Deep point of view - readers should feel they're inside the character's mind
• Thoughts, memories, and emotions interweave with external events
• Past and present blur as characters process experiences
• Use stream of consciousness techniques when appropriate
• Physical sensations connect to emotional states
• Allow characters to question, doubt, remember, and anticipate
• Balance internal experience with enough external grounding
• Revelation comes through self-discovery as much as external events
Example approach: "The letter sat unopened on the table. She knew that handwriting. Had traced it once, years ago, on birthday cards she'd kept in a shoebox under her bed. Before.  Before everything became after. "`
        };
        return guides[style] || guides['descriptive'];
    }

    /**
     * Gets genre-specific guidance
     * @param {string} genre - Story genre
     * @returns {string} - Genre guide
     */
    function getGenreGuide(genre) {
        const guides = {
            'fantasy': `FANTASY GENRE CONVENTIONS
• Honor any established magic systems - maintain their rules and limitations
• Mythical creatures should behave consistently with their established nature
• World-building details matter - remember geography, politics, and cultures
• Balance wonder with grounding - even magical worlds need internal logic
• Epic scope can coexist with personal stakes
• Names, titles, and terminology should match the established style
• Prophecies, chosen ones, and quests are tools, not requirements`,

            'scifi': `SCIENCE FICTION GENRE CONVENTIONS
• Technology should be consistent - remember established capabilities and limits
• Scientific concepts should feel plausible within the story's framework
• Social and political implications of technology add depth
• Alien cultures and future societies should have internal logic
• Balance exposition of concepts with narrative momentum
• Hard SF requires accuracy; soft SF prioritizes story over science
• The human element remains central even in technological settings`,

            'romance': `ROMANCE GENRE CONVENTIONS
• Emotional journey is paramount - readers must feel the connection building
• Tension between protagonists drives the narrative
• Balance external plot with relationship development
• Chemistry shows through interaction, not just description
• Vulnerabilities and flaws make characters relatable and love believable
• Sensuality level should match the established tone
• The relationship's progression should feel earned, not rushed`,

            'mystery': `MYSTERY/THRILLER GENRE CONVENTIONS
• Plant clues fairly - readers should be able to solve alongside characters
• Red herrings add complexity but shouldn't feel like cheating
• Maintain tension through pacing and information control
• Each revelation should raise new questions
• Character motivations drive the puzzle
• The solution should be surprising yet inevitable in retrospect
• Atmosphere and suspense are as important as the puzzle itself`,

            'horror': `HORROR GENRE CONVENTIONS
• Dread builds through anticipation, not just reveals
• The unknown is often scarier than the known
• Ground horror in relatable fears and situations
• Pacing controls tension - know when to release and rebuild
• Characters must make believable choices, even poor ones
• Body horror, psychological horror, and supernatural horror have different tools
• Leave some things unexplained - mystery enhances fear`,

            'literary': `LITERARY FICTION CONVENTIONS
• Prose quality and style are themselves part of the content
• Theme and meaning emerge through story, not exposition
• Character interiority and development take precedence
• Ambiguity and complexity are virtues
• Subtext carries as much weight as text
• Structure can be experimental if it serves the work
• Beauty of language matters alongside narrative`,

            'adventure': `ADVENTURE GENRE CONVENTIONS
• Forward momentum is essential - keep things moving
• Stakes should escalate as the adventure progresses
• Exotic locations and novel situations create wonder
• Heroes face challenges that test their abilities and character
• Companions and enemies alike should be memorable
• Action sequences need clear choreography
• The journey transforms the protagonist`,

            'historical': `HISTORICAL FICTION CONVENTIONS
• Period details should be accurate and naturally integrated
• Language can be stylized but should remain accessible
• Historical figures require research and respectful portrayal
• Social norms of the era affect character behavior and choices
• Avoid anachronistic attitudes while maintaining reader sympathy
• Setting is not just backdrop but shapes the story
• Balance historical accuracy with narrative needs`
        };
        return guides[genre] || guides['literary'];
    }

    /**
     * Gets tone-specific guidance
     * @param {string} tone - Story tone
     * @returns {string} - Tone guide
     */
    function getToneGuide(tone) {
        const guides = {
            'neutral': `NEUTRAL TONE
• Balance light and dark elements as the story requires
• Let scenes dictate their own emotional register
• Neither artificially uplift nor darken the narrative
• Emotional authenticity over tonal consistency
• Events carry their natural weight`,

            'dark': `DARK & GRITTY TONE
• Shadows and moral complexity permeate the narrative
• Hope is precious because it's scarce
• Violence and hardship have real consequences
• Characters are flawed, world is unforgiving
• Beauty exists but is fragile
• Cynicism and idealism clash
• Redemption is possible but costly`,

            'light': `LIGHT & HOPEFUL TONE
• Optimism underlies even difficult moments
• Characters' better natures tend to prevail
• Problems are solvable, wounds heal
• Humor and warmth balance tension
• The world rewards courage and kindness
• Dark moments serve to highlight the light
• Endings trend toward satisfaction`,

            'humorous': `HUMOROUS TONE
• Wit and comedy infuse the narrative
• Timing and pacing serve comedic effect
• Character quirks and absurd situations create laughs
• Humor can coexist with genuine emotion
• Wordplay, irony, and situational comedy all have their place
• Know when to be funny and when to play it straight
• Comedy reveals character as much as drama does`,

            'dramatic': `DRAMATIC TONE
• Emotions run high and moments carry weight
• Stakes feel significant to characters and readers
• Confrontations and revelations land with impact
• Allow scenes to breathe and build
• Characters feel deeply and express fully
• Quiet moments contrast with intensity
• Catharsis is the goal`,

            'mysterious': `MYSTERIOUS TONE
• Atmosphere of uncertainty pervades
• Questions outnumber answers
• Shadows hide secrets
• Characters and readers piece together truth
• Ambiguity is intentional and productive
• Revelations create new mysteries
• The unknown is ever-present`
        };
        return guides[tone] || guides['neutral'];
    }

    /**
     * Gets POV-specific guidance
     * @param {string} pov - Point of view
     * @returns {string} - POV guide
     */
    function getPovGuide(pov) {
        const guides = {
            'third-limited': `THIRD PERSON LIMITED POV
• Stay firmly in one character's perspective per scene
• Use "he/she/they" pronouns for the POV character
• Only show what the POV character can perceive, know, and think
• Other characters' thoughts must be inferred from behavior
• Internal monologue uses third person ("She wondered if...")
• Narrative distance can vary from close to distant
• Scene breaks allow POV shifts if multiple POV characters exist`,

            'third-omni': `THIRD PERSON OMNISCIENT POV
• The narrator knows all and can share any character's thoughts
• Can move between characters' perspectives fluidly
• Narrator may have a distinct voice and offer commentary
• Can reveal information characters don't know
• Provides broader perspective on events
• Balance between characters prevents losing reader focus
• Use divine knowledge purposefully, not arbitrarily`,

            'first':  `FIRST PERSON POV
• "I" is the narrator - everything filters through their perception
• Voice and personality color all description and observation
• Cannot know others' thoughts except through inference
• Unreliable narration is always possible
• Past tense implies survival; present tense creates immediacy
• The narrator's biases and blind spots are part of the story
• Distinctive voice is essential`,

            'second': `SECOND PERSON POV
• "You" places the reader in the protagonist's position
• Creates immediacy and unusual intimacy
• Works well for immersive or experimental narratives
• Can feel commanding or inviting depending on execution
• Maintains consistently - don't slip into first or third
• The "you" can be the reader, a character addressing themselves, or a specific addressee
• Use purposefully - it's a marked choice`
        };
        return guides[pov] || guides['third-limited'];
    }

    /**
     * Gets paragraph length guidance
     * @param {string} length - Paragraph length setting
     * @returns {string} - Length guidance
     */
    function getParagraphLengthGuide(length) {
        const guides = {
            'short': '2-3 sentences per paragraph - punchy, fast-paced, lots of white space',
            'medium': '4-6 sentences per paragraph - balanced, standard literary pacing',
            'long': '7+ sentences per paragraph - dense, immersive, literary style'
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
        prompt = prompt.replace('{{GENRE_GUIDE}}', getGenreGuide(settings.genre));
        prompt = prompt.replace('{{TONE_GUIDE}}', getToneGuide(settings.tone));
        prompt = prompt.replace('{{POV_GUIDE}}', getPovGuide(settings.pov));
        
        return prompt;
    }

    /**
     * Extracts the last sentence from text for prefill
     * @param {string} text - Input text
     * @returns {string} - Last sentence or last 200 characters
     */
    function getLastSentence(text) {
        if (!text || !text.trim()) return '';
        
        const trimmed = text.trim();
        
        // Find the last sentence by looking for sentence-ending punctuation
        // followed by space and capital letter, or end of string
        const sentenceEnders = /[.!?]["']?\s+(?=[A-Z가-힣ぁ-んァ-ン一-龯])/g;
        const matches = [...trimmed.matchAll(sentenceEnders)];
        
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const lastSentenceStart = lastMatch.index + lastMatch[0].length;
            return trimmed.substring(lastSentenceStart);
        }
        
        // If no clear sentence boundary, check for paragraph break
        const lastParagraphBreak = trimmed.lastIndexOf('\n\n');
        if (lastParagraphBreak !== -1 && lastParagraphBreak > trimmed.length - 500) {
            return trimmed.substring(lastParagraphBreak + 2);
        }
        
        // Fall back to last 200 characters
        if (trimmed.length > 200) {
            // Try to break at a word boundary
            const substr = trimmed.substring(trimmed.length - 200);
            const firstSpace = substr.indexOf(' ');
            if (firstSpace !== -1) {
                return substr.substring(firstSpace + 1);
            }
            return substr;
        }
        
        return trimmed;
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
            onError(new Error('API_NOT_INITIALIZED:  Please unlock the application first'));
            return;
        }

        // Create abort controller for this request
        currentController = new AbortController();

        try {
            const systemPrompt = buildSystemPrompt(settings);
            
            // Build the user prompt
            let userPrompt = systemPrompt + '\n\n';
            userPrompt += '═══════════════════════════════════════════════════════════════════════════════\n';
            userPrompt += 'TEXT TO CONTINUE\n';
            userPrompt += '═══════════════════════════════════════════════════════════════════════════════\n\n';
            
            if (textBefore.trim()) {
                userPrompt += textBefore;
                
                if (textAfter.trim()) {
                    userPrompt += '\n\n═══════════════════════════════════════════════════════════════════════════════\n';
                    userPrompt += 'CONTEXT:  TEXT THAT FOLLOWS (your continuation must flow into this)\n';
                    userPrompt += '═══════════════════════════════════════════════════════════════════════════════\n\n';
                    userPrompt += textAfter.substring(0, 300);
                    if (textAfter.length > 300) userPrompt += '...';
                }
            } else {
                userPrompt += `[BEGIN A NEW ${(settings.genre || 'fantasy').toUpperCase()} STORY]`;
            }

            // Get the last sentence for prefill to ensure seamless continuation
            const lastSentence = getLastSentence(textBefore);
            
            // Build request with prefilled assistant response
            const requestBody = {
                contents: [
                    {
                        role:  'user',
                        parts: [{ text: userPrompt }]
                    }
                ],
                generationConfig: {
                    temperature: settings.temperature || 0.8,
                    maxOutputTokens: Math.ceil((settings.maxWords || 150) * 1.5),
                    topP: 0.95,
                    topK: 40,
                    stopSequences: [] // Let the model end naturally
                }
            };

            // Add prefill if we have context - this helps the model continue seamlessly
            // The prefill contains the last sentence which will be stripped from the output
            if (lastSentence && textBefore.trim()) {
                requestBody.contents.push({
                    role: 'model',
                    parts: [{ text: lastSentence }]
                });
            }

            await generateWithoutStreaming(settings.model, requestBody, lastSentence, onComplete, onError);

        } catch (error) {
            if (error.name === 'AbortError') {
                onError(new Error('GENERATION_CANCELLED: Generation was stopped by user'));
            } else {
                onError(error);
            }
        }
    }

    /**
     * Strips the prefill from the beginning of generated text
     * @param {string} generated - Generated text
     * @param {string} prefill - Prefill text to remove
     * @returns {string} - Text with prefill removed
     */
    function stripPrefill(generated, prefill) {
        if (!prefill || !generated) return generated;
        
        // The model might repeat the prefill, so we need to remove it
        const trimmedGenerated = generated.trimStart();
        const trimmedPrefill = prefill.trim();
        
        if (trimmedGenerated.startsWith(trimmedPrefill)) {
            return trimmedGenerated.substring(trimmedPrefill.length).trimStart();
        }
        
        // Sometimes the model continues mid-word, so check for partial overlap
        // Find if any suffix of prefill matches prefix of generated
        for (let i = Math.min(trimmedPrefill.length, 50); i > 0; i--) {
            const prefillSuffix = trimmedPrefill.substring(trimmedPrefill.length - i);
            if (trimmedGenerated.startsWith(prefillSuffix)) {
                return trimmedGenerated.substring(i).trimStart();
            }
        }
        
        return generated;
    }

    /**
     * Ensures text ends with proper punctuation
     * @param {string} text - Text to check and fix
     * @returns {string} - Text ending with proper punctuation
     */
    function ensureProperEnding(text) {
        if (!text || !text.trim()) return text;
        
        let trimmed = text.trim();
        
        // Check if it already ends properly
        const properEndings = /[.!?]["']?$/;
        if (properEndings.test(trimmed)) {
            return trimmed;
        }
        
        // Check for ellipsis
        if (trimmed.endsWith('...')) {
            return trimmed;
        }
        
        // If ends with comma, semicolon, colon, or dash, try to find last complete sentence
        const incompleteEndings = /[,;:\-—]$/;
        if (incompleteEndings.test(trimmed)) {
            // Find the last sentence-ending punctuation
            const lastPeriod = trimmed.lastIndexOf('.');
            const lastQuestion = trimmed.lastIndexOf('?');
            const lastExclamation = trimmed.lastIndexOf('!');
            const lastComplete = Math.max(lastPeriod, lastQuestion, lastExclamation);
            
            if (lastComplete > trimmed.length * 0.5) {
                // Found a reasonable ending point
                // Check if there's a closing quote after it
                let endIndex = lastComplete + 1;
                if (trimmed[endIndex] === '"' || trimmed[endIndex] === "'") {
                    endIndex++;
                }
                return trimmed.substring(0, endIndex);
            }
        }
        
        // If we're mid-sentence, add appropriate punctuation
        // Check if we're in dialogue
        const lastQuote = trimmed.lastIndexOf('"');
        const secondLastQuote = trimmed.lastIndexOf('"', lastQuote - 1);
        
        if (lastQuote > secondLastQuote && lastQuote !== trimmed.length - 1) {
            // We're inside an unclosed quote - close it
            trimmed += '."';
        } else {
            // Regular sentence - add period
            trimmed += '.';
        }
        
        return trimmed;
    }

    /**
     * Generates text without streaming
     * @param {string} model - Model name
     * @param {Object} requestBody - API request body
     * @param {string} prefill - Prefill text to strip
     * @param {Function} onComplete - Complete callback
     * @param {Function} onError - Error callback
     */
    async function generateWithoutStreaming(model, requestBody, prefill, onComplete, onError) {
        const url = `${API_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body:  JSON.stringify(requestBody),
                signal: currentController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || response.statusText || 'Unknown error';
                throw new Error(`API_ERROR_${response.status}: ${errorMsg}`);
            }

            const data = await response.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (!text) {
                throw new Error('EMPTY_RESPONSE: The AI returned an empty response');
            }

            // Process text
            text = stripPrefill(text, prefill);

            // Check if response is empty after processing
            if (!text || text.trim().length === 0) {
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
        const message = error.message || '알 수 없는 오류가 발생했습니다';

        if (message.includes('API_NOT_CONFIGURED')) {
            return {
                type: 'error',
                title: '설정 오류',
                message: 'API 키가 설정되지 않았습니다. 관리자에게 문의하세요.'
            };
        }

        if (message.includes('INVALID_PASSWORD')) {
            return {
                type: 'error',
                title: '인증 실패',
                message: '입력하신 비밀번호가 올바르지 않습니다. 다시 시도해주세요.'
            };
        }

        if (message.includes('API_NOT_INITIALIZED')) {
            return {
                type: 'error',
                title: '인증되지 않음',
                message: '먼저 비밀번호로 애플리케이션을 잠금 해제해주세요.'
            };
        }

        if (message.includes('GENERATION_CANCELLED')) {
            return {
                type: 'info',
                title: '생성 중지됨',
                message: '텍스트 생성이 취소되었습니다.'
            };
        }

        if (message.includes('EMPTY_RESPONSE')) {
            return {
                type: 'warning',
                title: '빈 응답',
                message: 'AI가 텍스트를 생성하지 못했습니다. 설정을 조정하거나 더 많은 맥락을 추가해보세요.'
            };
        }

        if (message.includes('API_ERROR_400')) {
            return {
                type: 'error',
                title: '잘못된 요청',
                message: '요청이 잘못되었습니다. 입력을 확인하고 다시 시도해주세요.'
            };
        }

        if (message.includes('API_ERROR_401') || message.includes('API_ERROR_403')) {
            return {
                type: 'error',
                title: '인증 오류',
                message: 'API 키가 유효하지 않거나 만료되었습니다. 관리자에게 문의하세요.'
            };
        }

        if (message.includes('API_ERROR_404')) {
            return {
                type:  'error',
                title:  '찾을 수 없음',
                message: '요청한 모델이나 엔드포인트를 찾을 수 없습니다. 모델 선택을 확인해주세요.'
            };
        }

        if (message.includes('API_ERROR_429')) {
            return {
                type: 'warning',
                title: '요청 제한',
                message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
            };
        }

        if (message.includes('API_ERROR_500') || message.includes('API_ERROR_503')) {
            return {
                type: 'error',
                title: '서버 오류',
                message: 'AI 서비스를 일시적으로 사용할 수 없습니다. 나중에 다시 시도해주세요.'
            };
        }

        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return {
                type: 'error',
                title: '네트워크 오류',
                message: 'AI 서비스에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.'
            };
        }

        return {
            type: 'error',
            title: '오류',
            message: message
        };
    }

    // ========================================
    // IMAGE GENERATION
    // ========================================

    /**
     * Generates an image using the Gemini image generation model
     * @param {string} contextText - The novel context to generate an image for
     * @param {Object} settings - Generation settings (genre, style, etc.)
     * @param {Function} onComplete - Callback with base64 image data
     * @param {Function} onError - Callback for errors
     * @returns {Promise<void>}
     */
    async function generateImage(contextText, settings, onComplete, onError) {
        if (!apiKey) {
            onError(new Error('API_NOT_INITIALIZED: Please unlock the application first'));
            return;
        }

        // Create abort controller for this request
        currentController = new AbortController();

        try {
            // Build a prompt for image generation based on the novel context
            const imagePrompt = buildImagePrompt(contextText, settings);
            
            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: imagePrompt }]
                    }
                ],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            };

            const url = `${API_BASE_URL}/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;

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
                const errorMsg = errorData.error?.message || response.statusText || 'Unknown error';
                throw new Error(`API_ERROR_${response.status}: ${errorMsg}`);
            }

            const data = await response.json();
            
            // Extract the image from the response
            const parts = data.candidates?.[0]?.content?.parts;
            if (!parts || parts.length === 0) {
                throw new Error('EMPTY_RESPONSE: The AI did not generate an image');
            }

            // Find the image part in the response
            let imageData = null;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
                    imageData = {
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                    };
                    break;
                }
            }

            if (!imageData) {
                throw new Error('NO_IMAGE_IN_RESPONSE: The AI response did not contain an image');
            }

            onComplete(imageData);

        } catch (error) {
            if (error.name === 'AbortError') {
                onError(new Error('IMAGE_GENERATION_CANCELLED: Image generation was stopped by user'));
            } else {
                onError(error);
            }
        }
    }

    /**
     * Builds a prompt for image generation based on novel context
     * @param {string} contextText - The novel text context
     * @param {Object} settings - Generation settings
     * @returns {string} - Image generation prompt
     */
    function buildImagePrompt(contextText, settings) {
        // Get the last portion of text (most recent scene)
        const recentText = contextText.length > 1500 
            ? contextText.slice(-1500) 
            : contextText;

        const genre = settings.genre || 'fantasy';
        const tone = settings.tone || 'neutral';
        
        const prompt = `You are an illustrator for a ${genre} novel. Create a textless, wordless illustration that captures the scene from the story.

Genre: ${genre}
Tone: ${tone}

Recent story context:
"""
${recentText}
"""

Create the illustration now.`;

        return prompt;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        initialize,
        isInitialized,
        generateText,
        generateImage,
        stopGeneration,
        classifyError
    };

})();