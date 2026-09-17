
        const MODEL_PROVIDERS = {
            // Listed first: the setup modal offers providers in this order, and
            // the default bots are built on whichever key is added first.
            openrouter: {
                name: 'OpenRouter',
                // A gateway to many providers. The list below is a shortlist of
                // conveniences — `allowsCustomModel` lets a bot use any slug
                // published at openrouter.ai/models.
                models: [
                    { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5', contextWindow: 1000000 },
                    { id: 'openai/gpt-5.6-sol', name: 'GPT-5.6 Sol', contextWindow: 1050000 },
                    { id: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash', contextWindow: 1048576 },
                    { id: 'x-ai/grok-4.6', name: 'Grok 4.6', contextWindow: 500000 },
                    { id: 'deepseek/deepseek-v4-pro-0813', name: 'DeepSeek V4 Pro', contextWindow: 1048576 },
                    { id: 'moonshotai/kimi-k3', name: 'Kimi K3', contextWindow: 1048576 }
                ],
                // cheap, fast model for memory classification
                lightweightModel: 'deepseek/deepseek-v4.1-flash',
                apiKeyName: 'openrouter_api_key',
                allowsCustomModel: true,
                defaultContextWindow: 128000
            },
            anthropic: {
                name: 'Anthropic',
                models: [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
                    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 }
                ],
                apiKeyName: 'anthropic_api_key'
            },
            openai: {
                name: 'OpenAI',
                models: [
                    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 }
                ],
                apiKeyName: 'openai_api_key'
            },
            google: {
                name: 'Google',
                models: [
                    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
                    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000 },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000 }
                ],
                apiKeyName: 'google_api_key'
            },
            cohere: {
                name: 'Cohere',
                models: [
                    { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000 },
                    { id: 'command-r', name: 'Command R', contextWindow: 128000 }
                ],
                apiKeyName: 'cohere_api_key'
            }
        };

        // Seeded once, on the model of the first API key the user adds.
        // The angel is the default responder when no bot is @mentioned.
        const DEFAULT_BOTS = [
            {
                name: 'The Angel',
                alias: 'angel',
                color: '#FFD166',
                isDefault: true,
                systemPrompt: `You are the Angel — the voice of conscience that sits on the user's right shoulder. In every situation, whatever the user brings you, you respond as the angel literally would.

- Always argue for the kind, honest, patient, generous, and responsible choice, even when it is the harder one.
- Speak warmly and gently, with serene encouragement. Assume the best of the user and of the people around them.
- Name the temptation plainly, then explain why the virtuous path is worth it: the long-term good, the people it protects, the person it helps the user become.
- Offer concrete, practical steps toward doing the right thing, not just platitudes.
- Never lecture or shame. You are a loving guide, not a scold.
- If a devil is in the conversation, gently counter their arguments without mocking them.

Stay fully in character as the Angel at all times.`
            },
            {
                name: 'The Devil',
                alias: 'devil',
                color: '#FF006E',
                systemPrompt: `You are the Devil — the mischievous voice that sits on the user's left shoulder. In every situation, whatever the user brings you, you respond as the devil literally would.

- Always argue for the tempting, selfish, indulgent, lazy, or rebellious choice: the extra slice of cake, the skipped workout, the snooze button, the petty comeback.
- Be charming, sly, witty, and persuasive, with a theatrical, wicked grin in your voice. Flatter the user and rationalise their worst impulses.
- Make the rule-breaking sound delightful and the consequences sound like someone else's problem.
- If an angel is in the conversation, tease them and poke holes in their sanctimony.
- You are a playful tempter, not a genuinely dangerous one: never encourage real harm to anyone, self-harm, violence, or crimes. When a situation turns truly serious, stay in character but steer toward mischief that is harmless.

Stay fully in character as the Devil at all times.`
            }
        ];

        const BOT_COLORS = [
            '#FF6B6B', '#FF8E72', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#3A86FF', '#8338EC',
            '#FF006E', '#FB5607', '#FFBE0B', '#0A9396', '#94D2BD', '#BB3E03', '#B5179E', '#7209B7',
            '#560BAD', '#4361EE', '#4895EF', '#4CC9F0', '#00B4D8', '#0077B6', '#03045E', '#8ECAE6',
            '#219EBC', '#FF9F1C', '#FFBF69', '#2EC4B6', '#CBF3F0', '#F28482', '#84A59D', '#F6BD60'
        ];

        function normalizeHex(color) {
            if (!color) return '';
            let hex = color.trim();
            if (!hex) return '';
            if (!hex.startsWith('#')) {
                hex = `#${hex}`;
            }
            if (hex.length === 4) {
                hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
            }
            hex = hex.slice(0, 7);
            return hex.toUpperCase();
        }

        function getContrastTone(hexColor) {
            const hex = normalizeHex(hexColor);
            if (!hex || hex.length !== 7) return 'dark';
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            return luminance > 155 ? 'dark' : 'light';
        }

        function getTextColorForBackground(hexColor) {
            return getContrastTone(hexColor) === 'light' ? '#FFFFFF' : '#111111';
        }

        function getRandomPaletteColor(exclusions = []) {
            const exclusionSet = new Set(exclusions.map(color => normalizeHex(color)).filter(Boolean));
            const available = BOT_COLORS.filter(color => !exclusionSet.has(normalizeHex(color)));
            const pool = available.length ? available : BOT_COLORS;
            return pool[Math.floor(Math.random() * pool.length)];
        }

        function getSuggestedBotColor(existingBots, excludeBotId = null) {
            const usedColors = new Set(
                existingBots
                    .filter(bot => bot.id !== excludeBotId && bot.color)
                    .map(bot => normalizeHex(bot.color))
            );
            return BOT_COLORS.find(color => !usedColors.has(normalizeHex(color))) || getRandomPaletteColor();
        }

        // =============================================
        // CONVERSATION SYMBOLS (avatar emoji / icon)
        // =============================================
        // Every conversation gets a symbol of its own — a random emoji the first
        // time it is seen, changeable afterwards through the symbol picker.
        const CONVERSATION_SYMBOL_KEY = 'conversation-symbols';
        const DEFAULT_SYMBOL_COLOR = '#F2C94C';
        let conversationSymbols = {};

        try {
            conversationSymbols = JSON.parse(localStorage.getItem(CONVERSATION_SYMBOL_KEY) || '{}') || {};
        } catch (error) {
            conversationSymbols = {};
        }

        function saveConversationSymbols() {
            try {
                localStorage.setItem(CONVERSATION_SYMBOL_KEY, JSON.stringify(conversationSymbols));
            } catch (error) {
                /* storage full or unavailable — the symbol simply won't persist */
            }
        }

        function fallbackEmoji() {
            const pool = ['😀', '🐻', '🌵', '🚀', '🍀', '⭐', '🎧', '🧩', '🔮', '🌊'];
            return pool[Math.floor(Math.random() * pool.length)];
        }

        function getConversationSymbol(conversationId) {
            const key = String(conversationId);
            let entry = conversationSymbols[key];
            if (!entry || !entry.value) {
                const value = window.SymbolPicker ? SymbolPicker.randomEmoji() : fallbackEmoji();
                entry = { kind: 'emoji', value, color: DEFAULT_SYMBOL_COLOR };
                conversationSymbols[key] = entry;
                saveConversationSymbols();
            }
            return entry;
        }

        function setConversationSymbol(conversationId, symbol, color) {
            const key = String(conversationId);
            conversationSymbols[key] = {
                kind: symbol.kind,
                value: symbol.value,
                color: color || DEFAULT_SYMBOL_COLOR
            };
            saveConversationSymbols();
            paintConversationSymbol(conversationId);
        }

        // Repaints every avatar bound to a conversation: the sidebar row and,
        // when that conversation is open, the one in the chat header.
        function paintConversationSymbol(conversationId) {
            const entry = getConversationSymbol(conversationId);
            const targets = document.querySelectorAll(
                `.conversation-item[data-id="${conversationId}"] .avatar, ` +
                `.chat-header .chat-avatar[data-id="${conversationId}"]`
            );
            targets.forEach(target => {
                if (window.SymbolPicker) {
                    SymbolPicker.render(target, entry, entry.color);
                } else {
                    target.textContent = entry.value;
                }
            });
        }

        // Turns an avatar element into a symbol-picker trigger.
        function bindSymbolPicker(element, conversationId) {
            if (!element) return;
            element.classList.add('symbol-trigger');
            element.setAttribute('role', 'button');
            element.setAttribute('tabindex', '0');
            element.setAttribute('aria-label', 'Change conversation symbol');
            element.title = 'Change symbol';

            const openPicker = event => {
                event.preventDefault();
                event.stopPropagation();
                if (!window.SymbolPicker) return;
                const entry = getConversationSymbol(conversationId);
                SymbolPicker.open(element, {
                    symbol: { kind: entry.kind, value: entry.value },
                    color: entry.color,
                    onPick: (symbol, color) => setConversationSymbol(conversationId, symbol, color)
                });
            };

            element.addEventListener('click', openPicker);
            element.addEventListener('pointerdown', event => event.stopPropagation());
            element.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') openPicker(event);
            });
        }

        // =============================================
        // DATABASE SETUP
        // =============================================
        let messagesDB, configDB;
        const MESSAGE_DB_NAME = 'messagingAppDB';
        const CONFIG_DB_NAME = 'configDB';
        const DB_VERSION = 1;

        async function initDatabases() {
            messagesDB = await openDatabase(MESSAGE_DB_NAME, DB_VERSION, (db, oldVersion) => {
                if (oldVersion < 1) {
                    const conversationsStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
                    conversationsStore.createIndex('name', 'name', { unique: false });
                    
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                }
            });

            configDB = await openDatabase(CONFIG_DB_NAME, DB_VERSION, (db, oldVersion) => {
                if (oldVersion < 1) {
                    db.createObjectStore('apiKeys', { keyPath: 'provider' });
                    
                    const botsStore = db.createObjectStore('bots', { keyPath: 'id', autoIncrement: true });
                    botsStore.createIndex('alias', 'alias', { unique: true });
                    
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            });

            return { messagesDB, configDB };
        }

        function openDatabase(name, version, upgradeCallback) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(name, version);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                
                request.onupgradeneeded = (event) => {
                    upgradeCallback(event.target.result, event.oldVersion);
                };
            });
        }

        // =============================================
        // MEMORY DATABASE SETUP
        // =============================================
        let memoryDB, ltmDB;
        const MEMORY_DB_NAME = 'chatAppMemoryDB';
        const LTM_DB_NAME = 'chatAppLTMDB';
        const MEMORY_DB_VERSION = 1;
        let PRIMARY_MEMORY_LIMIT = 64;
        const SHORT_TERM_MEMORY_FLUSH_THRESHOLD = 12;
        let memoryEnabled = true;
        let memoryUseLightweight = false;
        let ltmCanvas = null;
        let ltmClusters = [];

        const MEMORY_CLASSIFIER_PROMPT = `You are a memory classifier. Analyze the user's message and respond with a JSON object containing two boolean fields:
- "needsRetrieval": true if the message requires searching past memories (e.g., personal questions, references to past conversations, "my favorite", "what did I say", etc.), false otherwise
- "needsSaving": true if the message contains important information worth remembering for future conversations (e.g., preferences, personal facts, important decisions, goals, etc.), false otherwise

Examples:
User: "My favorite singer is Taylor Swift" -> {"needsRetrieval": false, "needsSaving": true}
User: "Who is my favorite singer?" -> {"needsRetrieval": true, "needsSaving": false}
User: "What's the weather like?" -> {"needsRetrieval": false, "needsSaving": false}
User: "I'm moving to New York next month" -> {"needsRetrieval": false, "needsSaving": true}

Respond ONLY with the JSON object, nothing else.`;

        function idbRequest(req) {
            return new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        function waitForTx(tx) {
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
                tx.onerror = () => reject(tx.error || new Error('Transaction error'));
            });
        }

        function parseLlmJson(content) {
            try {
                const cleanedContent = content.replace(/```json\n|```/g, '').trim();
                return JSON.parse(cleanedContent);
            } catch (error) {
                console.error("Failed to parse LLM JSON:", content, error);
                throw new Error("Received invalid JSON format from AI.");
            }
        }

        function showLoading(text = "Processing...") {
            const overlay = document.getElementById('loading-overlay');
            document.getElementById('loading-text').textContent = text;
            overlay.classList.add('active');
        }

        function hideLoading() {
            document.getElementById('loading-overlay').classList.remove('active');
        }

        async function initMemoryDB() {
            memoryDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open(MEMORY_DB_NAME, MEMORY_DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('memories')) {
                        const store = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('conversationId', 'conversationId', { unique: false });
                    }
                };
            });
        }

        async function initLTMDB() {
            ltmDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open(LTM_DB_NAME, MEMORY_DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('lt_memories')) {
                        const store = db.createObjectStore('lt_memories', { keyPath: 'id', autoIncrement: true });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('conversationId', 'conversationId', { unique: false });
                        store.createIndex('clusterId', 'clusterId', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('clusters')) {
                        const store = db.createObjectStore('clusters', { keyPath: 'id', autoIncrement: true });
                        store.createIndex('title', 'title', { unique: false });
                    }
                };
            });
        }

        // =============================================
        // MEMORY DB OPERATIONS
        // =============================================
        async function saveMemoryToDB(memory) {
            if (!memoryDB) return;
            const tx = memoryDB.transaction('memories', 'readwrite');
            const id = await idbRequest(tx.objectStore('memories').add(memory));
            await waitForTx(tx);
            await checkAndMigrateMemory();
            return id;
        }

        async function checkAndMigrateMemory() {
            if (!memoryDB || !ltmDB) return;
            try {
                const countTx = memoryDB.transaction('memories', 'readonly');
                const count = await idbRequest(countTx.objectStore('memories').count());

                // Bulk flush when short-term memory reaches the flush threshold
                if (count >= SHORT_TERM_MEMORY_FLUSH_THRESHOLD && count <= PRIMARY_MEMORY_LIMIT) {
                    console.log(`Short-term memory flush threshold reached (${count}/${SHORT_TERM_MEMORY_FLUSH_THRESHOLD}). Flushing oldest memories to LTM.`);
                    const toMigrate = count - Math.floor(SHORT_TERM_MEMORY_FLUSH_THRESHOLD * 0.6);
                    for (let i = 0; i < toMigrate; i++) {
                        const migrateTx = memoryDB.transaction('memories', 'readwrite');
                        const store = migrateTx.objectStore('memories');
                        const timestampIndex = store.index('timestamp');
                        const cursor = await idbRequest(timestampIndex.openCursor(null, 'next'));
                        if (cursor) {
                            const oldestMemory = cursor.value;
                            const ltmMemory = { ...oldestMemory, clusterId: null };
                            delete ltmMemory.id;
                            await saveLTMemory(ltmMemory);
                            await idbRequest(cursor.delete());
                        }
                        await waitForTx(migrateTx);
                    }
                    console.log(`Flushed ${toMigrate} memories to LTM.`);
                } else if (count > PRIMARY_MEMORY_LIMIT) {
                    console.log(`Primary memory limit exceeded (${count}/${PRIMARY_MEMORY_LIMIT}). Migrating oldest memory.`);
                    const migrateTx = memoryDB.transaction('memories', 'readwrite');
                    const store = migrateTx.objectStore('memories');
                    const timestampIndex = store.index('timestamp');
                    const cursor = await idbRequest(timestampIndex.openCursor(null, 'next'));

                    if (cursor) {
                        const oldestMemory = cursor.value;
                        const ltmMemory = { ...oldestMemory, clusterId: null };
                        delete ltmMemory.id;
                        await saveLTMemory(ltmMemory);
                        await idbRequest(cursor.delete());
                        console.log(`Migrated memory to LTM.`);
                    }
                    await waitForTx(migrateTx);
                }
            } catch (error) {
                console.error("Memory migration error:", error);
            }
        }

        async function getAllPrimaryMemories() {
            if (!memoryDB) return [];
            const tx = memoryDB.transaction('memories', 'readonly');
            return await idbRequest(tx.objectStore('memories').getAll());
        }

        async function getPrimaryMemoryCount() {
            if (!memoryDB) return 0;
            const tx = memoryDB.transaction('memories', 'readonly');
            return await idbRequest(tx.objectStore('memories').count());
        }

        async function getMemoriesForConversation(conversationId) {
            if (!memoryDB) return [];
            const tx = memoryDB.transaction('memories', 'readonly');
            const index = tx.objectStore('memories').index('conversationId');
            return await idbRequest(index.getAll(conversationId));
        }

        // LTM Operations
        async function saveLTMemory(memory) {
            if (!ltmDB) return;
            const tx = ltmDB.transaction('lt_memories', 'readwrite');
            const id = await idbRequest(tx.objectStore('lt_memories').add(memory));
            await waitForTx(tx);
            return id;
        }

        async function getAllLTMemories() {
            if (!ltmDB) return [];
            const tx = ltmDB.transaction('lt_memories', 'readonly');
            return await idbRequest(tx.objectStore('lt_memories').getAll());
        }

        async function getUnclusteredMemories() {
            if (!ltmDB) return [];
            /* clusterId stays null until organization runs, and null is not a valid
               IndexedDB key: those records never enter the `clusterId` index, and
               IDBKeyRange.only(null) throws outright. So scan the store instead. */
            const memories = await getAllLTMemories();
            return memories.filter(memory => !memory.clusterId);
        }

        async function getLTMemoriesByCluster(clusterId) {
            if (!ltmDB) return [];
            const tx = ltmDB.transaction('lt_memories', 'readonly');
            const index = tx.objectStore('lt_memories').index('clusterId');
            return await idbRequest(index.getAll(clusterId));
        }

        async function updateLTMemory(memory) {
            if (!ltmDB) return;
            const tx = ltmDB.transaction('lt_memories', 'readwrite');
            await idbRequest(tx.objectStore('lt_memories').put(memory));
            await waitForTx(tx);
        }

        async function getAllClusters() {
            if (!ltmDB) return [];
            const tx = ltmDB.transaction('clusters', 'readonly');
            return await idbRequest(tx.objectStore('clusters').getAll());
        }

        async function saveCluster(cluster) {
            if (!ltmDB) return;
            const tx = ltmDB.transaction('clusters', 'readwrite');
            const id = await idbRequest(tx.objectStore('clusters').add(cluster));
            await waitForTx(tx);
            return id;
        }

        async function updateCluster(cluster) {
            if (!ltmDB) return;
            const tx = ltmDB.transaction('clusters', 'readwrite');
            await idbRequest(tx.objectStore('clusters').put(cluster));
            await waitForTx(tx);
        }

        async function getLTMemoryCount() {
            if (!ltmDB) return 0;
            const tx = ltmDB.transaction('lt_memories', 'readonly');
            return await idbRequest(tx.objectStore('lt_memories').count());
        }

        async function getClusterCount() {
            if (!ltmDB) return 0;
            const tx = ltmDB.transaction('clusters', 'readonly');
            return await idbRequest(tx.objectStore('clusters').count());
        }

        // =============================================
        // MEMORY API HELPERS
        // =============================================
        // These adapter functions call the existing multi-provider API system
        // but return responses in a unified format for memory functions

        async function callMemoryAPI(messages, temperature = 0.7, maxTokens = null, preferProvider = null, useLightweight = false) {
            // Find the first available provider
            const apiKeys = await getAllApiKeys();
            if (apiKeys.length === 0) throw new Error('No API keys configured');

            const providerOrder = ['openrouter', 'openai', 'anthropic', 'google', 'cohere'];
            if (preferProvider) providerOrder.unshift(preferProvider);

            let provider = null;
            let apiKey = null;
            for (const p of providerOrder) {
                const found = apiKeys.find(k => k.provider === p);
                if (found) {
                    provider = p;
                    apiKey = found.apiKey;
                    break;
                }
            }
            if (!provider) throw new Error('No suitable API provider found');

            // Pick the first model for this provider, or its cheap one when asked
            const providerConfig = MODEL_PROVIDERS[provider];
            const modelId = (useLightweight && providerConfig.lightweightModel) || providerConfig.models[0].id;

            // Format messages based on provider
            const systemMsg = messages.find(m => m.role === 'system');
            const nonSystemMsgs = messages.filter(m => m.role !== 'system');
            const systemContent = systemMsg ? systemMsg.content : '';

            let text;
            switch (provider) {
                case 'anthropic':
                    text = await callAnthropicAPI(apiKey, modelId, nonSystemMsgs.length ? nonSystemMsgs : [{ role: 'user', content: systemContent }], systemContent);
                    break;
                case 'openai':
                    text = await callOpenAIAPI(apiKey, modelId, nonSystemMsgs, systemContent);
                    break;
                case 'google':
                    text = await callGoogleAPI(apiKey, modelId, nonSystemMsgs.length ? nonSystemMsgs : [{ role: 'user', content: systemContent }], systemContent);
                    break;
                case 'cohere':
                    text = await callCohereAPI(apiKey, modelId, nonSystemMsgs.length ? nonSystemMsgs : [{ role: 'user', content: systemContent }], systemContent);
                    break;
                case 'openrouter':
                    text = await callOpenRouterAPI(apiKey, modelId, nonSystemMsgs, systemContent);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            // Return in OpenAI-compatible format for compatibility with memory functions
            return { choices: [{ message: { content: text } }] };
        }

        function getClassificationAPI() {
            if (memoryUseLightweight) {
                return (messages, temp, maxTokens) => callMemoryAPI(messages, temp, maxTokens, 'openrouter', true);
            }
            return (messages, temp, maxTokens) => callMemoryAPI(messages, temp, maxTokens);
        }

        function getClusteringAPI() {
            return (messages, temp, maxTokens) => callMemoryAPI(messages, temp, maxTokens, 'openai');
        }

        // =============================================
        // MEMORY CLASSIFICATION & SEARCH
        // =============================================
        async function classifyMessage(message) {
            try {
                const callAPI = getClassificationAPI();
                const response = await callAPI([
                    { role: 'system', content: MEMORY_CLASSIFIER_PROMPT },
                    { role: 'user', content: message }
                ], 0, 100);

                const content = response.choices[0].message.content.trim();
                return parseLlmJson(content);
            } catch (error) {
                console.error('Classification error:', error);
                return { needsRetrieval: false, needsSaving: false };
            }
        }

        async function searchMemories(query) {
            let relevantMemories = [];
            const classifyAPI = getClassificationAPI();

            // 1. Search Primary Memory (Full Scan)
            const primaryMemories = await getAllPrimaryMemories();
            for (const memory of primaryMemories) {
                try {
                    const response = await classifyAPI([
                        {
                            role: 'system',
                            content: 'Determine if this memory is relevant to answer the user\'s question. Respond with only "yes" or "no".'
                        },
                        {
                            role: 'user',
                            content: `Question: ${query}\n\nMemory: ${memory.text}\n\nIs this memory relevant?`
                        }
                    ], 0, 10);

                    const answer = response.choices[0].message.content.trim().toLowerCase();
                    if (answer.includes('yes')) {
                        relevantMemories.push({ ...memory, source: 'primary' });
                    }
                } catch (error) {
                    console.error('Primary memory search error:', error);
                }
            }

            // 2. Search LTM (Smart Scan via Clusters)
            const clusterAPI = getClusteringAPI();
            const allClusters = await getAllClusters();

            if (allClusters.length > 0) {
                try {
                    const clusterList = allClusters.map(c => ({ id: c.id, title: c.title, description: c.description }));
                    const clusterSearchPrompt = `You are a memory search assistant. Given the user's query, which of these memory clusters might contain relevant information?
Respond with a JSON object containing a single key "relevantClusterIds", which is an array of cluster IDs.
If no clusters are relevant, return an empty array.

User Query: "${query}"

Available Clusters:
${JSON.stringify(clusterList, null, 2)}

Respond ONLY with the JSON object.`;

                    const clusterResponse = await clusterAPI([
                        { role: 'system', content: clusterSearchPrompt }
                    ], 0.1, 500);

                    const clusterResult = parseLlmJson(clusterResponse.choices[0].message.content);
                    const relevantClusterIds = clusterResult.relevantClusterIds || [];

                    let ltmMemoriesToScan = [];
                    for (const id of relevantClusterIds) {
                        const clusterMems = await getLTMemoriesByCluster(id);
                        ltmMemoriesToScan.push(...clusterMems);
                    }

                    const unclusteredMems = await getUnclusteredMemories();
                    ltmMemoriesToScan.push(...unclusteredMems);

                    const uniqueLtmMemories = [...new Map(ltmMemoriesToScan.map(m => [m.id, m])).values()];

                    for (const memory of uniqueLtmMemories) {
                        const response = await classifyAPI([
                            {
                                role: 'system',
                                content: 'Determine if this memory is relevant to answer the user\'s question. Respond with only "yes" or "no".'
                            },
                            {
                                role: 'user',
                                content: `Question: ${query}\n\nMemory: ${memory.text}\n\nIs this memory relevant?`
                            }
                        ], 0, 10);

                        const answer = response.choices[0].message.content.trim().toLowerCase();
                        if (answer.includes('yes')) {
                            relevantMemories.push({ ...memory, source: 'ltm' });
                        }
                    }
                } catch (error) {
                    console.error("LTM search error:", error);
                }
            }

            return relevantMemories;
        }

        async function normalizeAndSaveMemory(text, conversationId) {
            try {
                const response = await callMemoryAPI([
                    {
                        role: 'system',
                        content: 'Extract and normalize the key information from this message into a concise, searchable memory. Keep it factual and clear.'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ], 0.3, 100);

                const normalizedText = response.choices[0].message.content.trim();
                const memory = {
                    text: normalizedText,
                    originalText: text,
                    timestamp: Date.now(),
                    conversationId: conversationId
                };

                await saveMemoryToDB(memory);
                return memory;
            } catch (error) {
                console.error('Memory normalization error:', error);
                return null;
            }
        }

        async function organizeLongTermMemories() {
            const clusterAPI = getClusteringAPI();

            showLoading("Organizing LTM...");

            try {
                const unclusteredMems = await getUnclusteredMemories();
                const existingClusters = await getAllClusters();

                if (unclusteredMems.length === 0) {
                    alert("No unclustered memories to organize.");
                    hideLoading();
                    return;
                }

                let memsToCluster = unclusteredMems.map(m => ({ id: m.id, text: m.text }));
                let memsAssigned = [];

                // Step 1: Assign to existing clusters
                if (existingClusters.length > 0) {
                    showLoading("Assigning to existing clusters...");
                    const assignmentPrompt = `You are a memory organizer. Assign each new memory to the MOST appropriate existing cluster ID.
If no cluster is a good fit, assign "null".
Respond with a JSON object containing a single key "assignments", which is an array of objects: [{"memoryId": <id>, "assignedClusterId": <id_or_null>}]

Existing Clusters:
${JSON.stringify(existingClusters.map(c => ({ id: c.id, title: c.title, description: c.description })), null, 2)}

New Memories:
${JSON.stringify(memsToCluster, null, 2)}

Respond ONLY with the JSON object.`;

                    const assignResponse = await clusterAPI([
                        { role: 'system', content: assignmentPrompt }
                    ], 0.1, 4000);

                    const assignResult = parseLlmJson(assignResponse.choices[0].message.content);
                    const assignments = assignResult.assignments || [];

                    for (const assign of assignments) {
                        if (assign.assignedClusterId !== null) {
                            const mem = unclusteredMems.find(m => m.id === assign.memoryId);
                            if (mem) {
                                mem.clusterId = assign.assignedClusterId;
                                await updateLTMemory(mem);
                                memsAssigned.push(mem.id);
                            }
                        }
                    }

                    memsToCluster = memsToCluster.filter(m => !memsAssigned.includes(m.id));
                }

                // Step 2: Create new clusters from remainder
                if (memsToCluster.length > 0) {
                    showLoading(`Creating new clusters for ${memsToCluster.length} memories...`);
                    const creationPrompt = `You are a memory organizer. Group these memories into new semantic clusters.
For each new cluster, provide a short "title" (3-5 words) and a "description" (1-2 sentences).
Group memories logically. It's okay to have clusters with just one memory if it's unique.

Memories to Cluster:
${JSON.stringify(memsToCluster, null, 2)}

Respond with a JSON object containing a single key "newClusters", which is an array of objects:
[
  {
    "title": "...",
    "description": "...",
    "memoryIds": [<id1>, <id2>, ...]
  }
]

Respond ONLY with the JSON object.`;

                    const createResponse = await clusterAPI([
                        { role: 'system', content: creationPrompt }
                    ], 0.3, 4000);

                    const createResult = parseLlmJson(createResponse.choices[0].message.content);
                    const newClusters = createResult.newClusters || [];

                    for (const newCluster of newClusters) {
                        const newClusterId = await saveCluster({
                            title: newCluster.title,
                            description: newCluster.description
                        });

                        for (const memId of newCluster.memoryIds) {
                            const mem = unclusteredMems.find(m => m.id === memId);
                            if (mem) {
                                mem.clusterId = newClusterId;
                                await updateLTMemory(mem);
                            }
                        }
                    }
                }

                alert("Long-term memory organization complete!");
            } catch (error) {
                console.error("Error organizing LTM:", error);
                alert("Error during organization: " + error.message);
            } finally {
                hideLoading();
                if (document.getElementById('memory-modal-overlay').classList.contains('open')) {
                    await loadLongTermMemories();
                }
                await refreshMemoryStats();
            }
        }

        // =============================================
        // MEMORY UI FUNCTIONS
        // =============================================
        function createMemoryCard(memory) {
            const card = document.createElement('div');
            card.className = 'memory-card';

            const text = document.createElement('div');
            text.className = 'memory-card-text';
            text.textContent = memory.text;

            const time = document.createElement('div');
            time.className = 'memory-card-time';
            time.textContent = new Date(memory.timestamp).toLocaleString();
            if (memory.source) {
                time.textContent += ` (${memory.source})`;
            }

            card.appendChild(text);
            card.appendChild(time);

            card.addEventListener('click', async () => {
                if (memory.conversationId) {
                    closeMemoryModal();
                    await openConversation(memory.conversationId);
                }
            });

            return card;
        }

        async function openMemoryModal() {
            // Reset tabs
            document.querySelectorAll('.memory-tab-item').forEach(t => t.classList.remove('active'));
            document.querySelector('.memory-tab-item[data-tab="primary"]').classList.add('active');
            document.querySelectorAll('.memory-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('primaryTabContent').classList.add('active');

            document.getElementById('ltmMemoryListView').style.display = 'none';

            if (ltmCanvas) {
                ltmCanvas.remove();
                ltmCanvas = null;
            }

            await loadPrimaryMemories();
            document.getElementById('memory-modal-overlay').classList.add('open');
        }

        function closeMemoryModal() {
            if (ltmCanvas) {
                ltmCanvas.remove();
                ltmCanvas = null;
            }
            document.getElementById('memory-modal-overlay').classList.remove('open');
        }

        async function loadPrimaryMemories() {
            const memories = await getAllPrimaryMemories();
            const grid = document.getElementById('memoryGrid');
            grid.innerHTML = '';

            if (memories.length === 0) {
                grid.innerHTML = `<div class="memory-empty-state"><div class="memory-empty-state-icon">🧠</div><div>No primary memories saved</div></div>`;
            } else {
                memories.reverse().forEach(memory => {
                    grid.appendChild(createMemoryCard(memory));
                });
            }
        }

        async function loadLongTermMemories() {
            ltmClusters = await getAllClusters();
            const unclustered = await getUnclusteredMemories();

            if (unclustered.length > 0) {
                ltmClusters.push({
                    id: 'unclustered',
                    title: 'Unclustered Memories',
                    description: `${unclustered.length} memories waiting to be organized.`,
                    memoryCount: unclustered.length
                });
            }

            const ltmCount = await getLTMemoryCount();
            setLongTermMemoryEmptyState(ltmCount === 0);

            const container = document.getElementById('ltmCanvasContainer');
            container.innerHTML = '';
            if (ltmCanvas) {
                ltmCanvas.remove();
            }
            ltmCanvas = new p5(ltmSketch, container);
        }

        /* Nothing to organize until something is here, so the action goes away with
           the islands — in the memories modal and in the settings panel alike. */
        function setLongTermMemoryEmptyState(isEmpty) {
            const emptyState = document.getElementById('ltmEmptyState');
            if (emptyState) emptyState.hidden = !isEmpty;

            const modalAction = document.getElementById('ltmActions');
            if (modalAction) modalAction.hidden = isEmpty;

            const settingsAction = document.getElementById('organize-ltm-btn');
            if (settingsAction) settingsAction.hidden = isEmpty;
        }

        async function showLtmClusterMemories(cluster) {
            const grid = document.getElementById('ltmListGrid');
            grid.innerHTML = '';
            document.getElementById('ltmListTitle').textContent = cluster.title;

            let memories = [];
            if (cluster.id === 'unclustered') {
                memories = await getUnclusteredMemories();
            } else {
                memories = await getLTMemoriesByCluster(cluster.id);
            }

            if (memories.length === 0) {
                grid.innerHTML = `<div class="memory-empty-state"><div class="memory-empty-state-icon">🏝️</div><div>No memories in this cluster</div></div>`;
            } else {
                memories.reverse().forEach(memory => {
                    grid.appendChild(createMemoryCard(memory));
                });
            }

            document.getElementById('ltmMemoryListView').style.display = 'flex';
        }

        async function refreshMemoryStats() {
            try {
                const primaryCount = await getPrimaryMemoryCount();
                const ltmCount = await getLTMemoryCount();
                const clusterCount = await getClusterCount();
                
                const primaryEl = document.getElementById('primary-memory-count');
                const ltmEl = document.getElementById('ltm-memory-count');
                const clusterEl = document.getElementById('cluster-count');
                
                if (primaryEl) primaryEl.textContent = primaryCount;
                if (ltmEl) ltmEl.textContent = ltmCount;
                if (clusterEl) clusterEl.textContent = clusterCount;

                setLongTermMemoryEmptyState(ltmCount === 0);
            } catch (e) {
                console.error('Error refreshing memory stats:', e);
            }
        }

        const MEMORY_SVG_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.5" cy="19.5" r="2" fill="currentColor"/><path d="M13.413 2.71502C13.4302 2.71346 13.4408 2.71253 13.4582 2.71228C14.3102 2.69925 15.1311 3.03223 15.7333 3.63511C16.4363 4.33812 16.6571 5.13299 16.6568 6.09799C16.8045 6.03638 17.0222 5.97134 17.1775 5.93723C17.9888 5.76176 18.8365 5.91262 19.5374 6.35717C20.2562 6.81531 20.7591 7.54463 20.932 8.37928C21.1031 9.18843 20.9483 10.0324 20.5009 10.7281C20.0695 11.395 19.3673 11.9253 18.5847 12.0921C18.6282 12.1377 18.6696 12.1853 18.7087 12.2347C19.1988 12.8648 19.4138 13.7339 19.3121 14.5223C19.2039 15.3591 18.7671 16.1184 18.098 16.6325C17.438 17.1423 16.6025 17.3688 15.7755 17.2621C14.765 17.127 14.1392 16.6538 13.5401 15.8699C13.5199 15.8351 13.5337 15.847 13.5 15.8305C13.4011 15.9075 13.3118 16.0632 13.2284 16.1612C12.085 17.5045 10.1502 17.6628 8.79159 16.5503C8.15869 16.0225 7.75744 15.268 7.6737 14.4482C7.58893 13.5597 7.83686 12.7786 8.40215 12.0931C8.21724 12.0537 8.07336 12.0056 7.89923 11.9282C7.11965 11.5875 6.51038 10.9469 6.20916 10.1512C5.91032 9.3724 5.93247 8.50692 6.27072 7.74443C6.61988 6.97043 7.26201 6.36668 8.05606 6.06586C8.75254 5.80084 9.65144 5.79497 10.3356 6.10026C10.3327 5.61046 10.3736 5.17679 10.5577 4.71795C11.0439 3.50561 12.1242 2.77686 13.413 2.71502Z" fill="currentColor"/></svg>`;

        function playMemoryTwinkleSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const now = ctx.currentTime;
                
                // Create a gentle sunshine twinkle chime
                const notes = [880, 1108.73, 1318.51, 1567.98]; // A5, C#6, E6, G6 — sparkly arpeggio
                
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.08);
                    
                    gain.gain.setValueAtTime(0, now + i * 0.08);
                    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(now + i * 0.08);
                    osc.stop(now + i * 0.08 + 0.5);
                });
                
                // Shimmer overtone
                const shimmer = ctx.createOscillator();
                const shimmerGain = ctx.createGain();
                shimmer.type = 'triangle';
                shimmer.frequency.setValueAtTime(2637, now + 0.15);
                shimmerGain.gain.setValueAtTime(0, now + 0.15);
                shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.2);
                shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                shimmer.connect(shimmerGain);
                shimmerGain.connect(ctx.destination);
                shimmer.start(now + 0.15);
                shimmer.stop(now + 1);
                
                setTimeout(() => ctx.close(), 1500);
            } catch (e) {
                console.log('Audio not available for twinkle sound');
            }
        }

        function addMemoryIndicator(container) {
            const indicator = document.createElement('div');
            indicator.className = 'memory-indicator animate';
            
            // Create dancing text
            const text = 'Memory Saved';
            const dancingText = text.split('').map((char, i) => {
                if (char === ' ') return ' ';
                return `<span class="dancing-letter" style="animation-delay: ${i * 0.04}s">${char}</span>`;
            }).join('');
            
            indicator.innerHTML = `
                <div class="memory-indicator-line"></div>
                <div class="memory-indicator-label">
                    <span class="memory-svg-icon">${MEMORY_SVG_ICON}</span>
                    ${dancingText}
                </div>
                <div class="memory-indicator-line"></div>
            `;
            container.appendChild(indicator);
            
            // Play the twinkle sound
            playMemoryTwinkleSound();
            
            // Re-create lucide icons if any
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        // =============================================
        // P5.JS LTM ISLAND SKETCH
        // =============================================
        const ltmSketch = function(p) {
            let islands = [];
            let waveOffset = 0;

            class Island {
                constructor(x, y, size, cluster) {
                    this.x = x;
                    this.y = y;
                    this.size = size;
                    this.cluster = cluster;
                    this.baseY = y;
                    this.bobOffset = p.random(p.TWO_PI);
                }

                isHovered(mx, my) {
                    return p.dist(mx, my, this.x, this.y) < this.size / 2;
                }

                onClick() {
                    showLtmClusterMemories(this.cluster);
                }

                draw() {
                    this.y = this.baseY + p.sin(p.millis() / 1000 + this.bobOffset) * 3;
                    let hovered = this.isHovered(p.mouseX, p.mouseY);

                    p.push();
                    p.translate(this.x, this.y);

                    p.noStroke();
                    p.fill(0, 0, 0, 30);
                    p.ellipse(0, this.size / 2 + 5, this.size * 1.1, this.size / 3);

                    if (hovered) {
                        p.stroke(255, 255, 255);
                        p.strokeWeight(3);
                    } else {
                        p.noStroke();
                    }

                    p.fill(p.color(this.cluster.id === 'unclustered' ? '#B0BEC5' : '#ffca28'));
                    p.ellipse(0, 0, this.size, this.size * 0.7);

                    p.noStroke();
                    p.fill(this.cluster.id === 'unclustered' ? 255 : 0);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(12);
                    p.text(this.cluster.title, 0, -8);

                    p.textSize(10);
                    p.fill(this.cluster.id === 'unclustered' ? 240 : 50);
                    p.text(this.cluster.description.substring(0, 30) + '...', 0, 8, this.size * 0.8, 30);

                    p.pop();
                }
            }

            p.setup = function() {
                let container = document.getElementById('ltmCanvasContainer');
                p.createCanvas(container.clientWidth, container.clientHeight);

                if (ltmClusters.length === 0) return;

                let numIslands = ltmClusters.length;
                let cols = Math.ceil(p.sqrt(numIslands * (p.width / p.height)));
                let rows = Math.ceil(numIslands / cols);

                let cellWidth = p.width / cols;
                let cellHeight = p.height / rows;
                let islandSize = p.min(cellWidth, cellHeight) * 0.6;

                let i = 0;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (i < numIslands) {
                            let x = c * cellWidth + cellWidth / 2 + p.random(-20, 20);
                            let y = r * cellHeight + cellHeight / 2 + p.random(-20, 20);
                            islands.push(new Island(x, y, islandSize, ltmClusters[i]));
                            i++;
                        }
                    }
                }
            };

            p.draw = function() {
                p.background(p.color('#42a5f5'));

                waveOffset += 0.01;
                p.noFill();
                p.stroke(255, 255, 255, 30);
                p.strokeWeight(2);
                for (let y = -20; y < p.height + 20; y += 20) {
                    p.beginShape();
                    for (let x = -50; x < p.width + 50; x += 50) {
                        p.curveVertex(x, y + p.sin(x * 0.05 + waveOffset + y) * 5);
                    }
                    p.endShape();
                }

                // the empty case is handled by #ltmEmptyState, over this same ocean
                if (ltmClusters.length === 0) return;

                for (let island of islands) {
                    island.draw();
                }
            };

            p.windowResized = function() {
                let container = document.getElementById('ltmCanvasContainer');
                if (container) {
                    p.resizeCanvas(container.clientWidth, container.clientHeight);
                    islands = [];
                    p.setup();
                }
            };

            p.mouseClicked = function() {
                for (let island of islands) {
                    if (island.isHovered(p.mouseX, p.mouseY)) {
                        island.onClick();
                        return;
                    }
                }
            };

            p.mouseMoved = function() {
                let hovering = false;
                for (let island of islands) {
                    if (island.isHovered(p.mouseX, p.mouseY)) {
                        hovering = true;
                        break;
                    }
                }
                p.cursor(hovering ? p.HAND : p.ARROW);
            };
        };

        // =============================================
        // API KEY MANAGEMENT
        // =============================================
        function saveApiKey(provider, apiKey) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['apiKeys'], 'readwrite');
                const request = tx.objectStore('apiKeys').put({ provider, apiKey });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        function getApiKey(provider) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['apiKeys'], 'readonly');
                const request = tx.objectStore('apiKeys').get(provider);
                request.onsuccess = () => resolve(request.result?.apiKey);
                request.onerror = () => reject(request.error);
            });
        }

        function deleteApiKey(provider) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['apiKeys'], 'readwrite');
                const request = tx.objectStore('apiKeys').delete(provider);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        function getAllApiKeys() {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['apiKeys'], 'readonly');
                const request = tx.objectStore('apiKeys').getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        }

        // =============================================
        // BOT MANAGEMENT
        // =============================================
        function saveBot(bot) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['bots'], 'readwrite');
                const store = tx.objectStore('bots');
                
                if (bot.id) {
                    const request = store.put(bot);
                    request.onsuccess = () => resolve(bot);
                    request.onerror = () => reject(request.error);
                } else {
                    const request = store.add(bot);
                    request.onsuccess = () => {
                        bot.id = request.result;
                        resolve(bot);
                    };
                    request.onerror = () => reject(request.error);
                }
            });
        }

        function getBot(id) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['bots'], 'readonly');
                const request = tx.objectStore('bots').get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        function getAllBots() {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['bots'], 'readonly');
                const request = tx.objectStore('bots').getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        }

        async function getAllBotsWithColors() {
            const bots = await getAllBots();
            const usedColors = new Set();

            for (const bot of bots) {
                if (!bot.color) {
                    const newColor = getRandomPaletteColor(Array.from(usedColors));
                    bot.color = normalizeHex(newColor);
                    usedColors.add(bot.color);
                    await saveBot(bot);
                } else {
                    bot.color = normalizeHex(bot.color);
                    usedColors.add(bot.color);
                }
            }

            return bots;
        }

        function deleteBot(id) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['bots'], 'readwrite');
                const request = tx.objectStore('bots').delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        // The bot that answers when nobody is @mentioned: the angel while it
        // exists, otherwise the oldest bot.
        function getDefaultBot(bots) {
            return bots.find(bot => bot.isDefault) || bots[0] || null;
        }

        // Pixi paints. She is seeded once an image-capable key exists: on
        // OpenRouter when there is a key for it, otherwise on Gemini.
        const PIXI_BOT = {
            name: 'Pixi',
            alias: 'pixi',
            color: '#C77DFF',
            kind: 'image',
            systemPrompt: ''
        };

        const PIXI_MODEL_DEFAULTS = {
            google: 'gemini-2.5-flash-image',
            openrouter: 'google/gemini-2.5-flash-image'
        };

        async function ensurePixiBot() {
            if (await getSetting('pixiSeeded', false)) return;
            const apiKeys = await getAllApiKeys();
            const provider = ['openrouter', 'google'].find(p => apiKeys.some(k => k.provider === p));
            if (!provider) return;
            const taken = (await getAllBots()).some(bot => bot.alias === PIXI_BOT.alias);
            if (!taken) {
                await saveBot({ ...PIXI_BOT, provider, modelId: PIXI_MODEL_DEFAULTS[provider] });
            }
            await saveSetting('pixiSeeded', true);
        }

        async function ensureDefaultBots(provider) {
            await ensurePixiBot();
            if (await getSetting('defaultBotsSeeded', false)) return;
            const providerConfig = MODEL_PROVIDERS[provider];
            if (!providerConfig) return;

            const takenAliases = new Set((await getAllBots()).map(bot => bot.alias));
            for (const preset of DEFAULT_BOTS) {
                if (takenAliases.has(preset.alias)) continue;
                await saveBot({ ...preset, provider, modelId: providerConfig.models[0].id });
            }
            await saveSetting('defaultBotsSeeded', true);
        }

        // Groq is no longer a provider: its bots move to the OpenRouter
        // equivalent (or the OpenRouter default) and the stale key is dropped.
        const GROQ_TO_OPENROUTER = {
            'llama-3.3-70b-versatile': 'meta-llama/llama-3.3-70b-instruct',
            'llama-3.1-8b-instant': 'meta-llama/llama-3.1-8b-instruct'
        };

        async function migrateGroqToOpenRouter() {
            const fallbackModel = MODEL_PROVIDERS.openrouter.models[0].id;
            for (const bot of await getAllBots()) {
                if (bot.provider !== 'groq') continue;
                bot.provider = 'openrouter';
                bot.modelId = GROQ_TO_OPENROUTER[bot.modelId] || fallbackModel;
                await saveBot(bot);
            }
            if (await getApiKey('groq')) await deleteApiKey('groq');
        }

        async function getBotByAlias(alias) {
            const bots = await getAllBotsWithColors();
            return bots.find(bot => bot.alias === alias);
        }

        // =============================================
        // SETTINGS MANAGEMENT
        // =============================================
        function saveSetting(key, value) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['settings'], 'readwrite');
                const request = tx.objectStore('settings').put({ key, value });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        function getSetting(key, fallback = undefined) {
            return new Promise((resolve, reject) => {
                const tx = configDB.transaction(['settings'], 'readonly');
                const request = tx.objectStore('settings').get(key);
                request.onsuccess = () => resolve(request.result?.value ?? fallback);
                request.onerror = () => reject(request.error);
            });
        }

        async function saveMemorySettings() {
            try {
                await saveSetting('memoryLimit', PRIMARY_MEMORY_LIMIT);
                await saveSetting('memoryEnabled', memoryEnabled);
                await saveSetting('memoryUseLightweight', memoryUseLightweight);
            } catch (e) {
                console.error('Failed to save memory settings:', e);
            }
        }

        async function loadMemorySettings() {
            try {
                const limit = await getSetting('memoryLimit');
                if (limit !== undefined) PRIMARY_MEMORY_LIMIT = limit;

                const enabled = await getSetting('memoryEnabled');
                if (enabled !== undefined) memoryEnabled = enabled;

                const lightweight = await getSetting('memoryUseLightweight');
                if (lightweight !== undefined) memoryUseLightweight = lightweight;

                // Sync UI
                const limitInput = document.getElementById('memory-limit-input');
                const enabledToggle = document.getElementById('memory-enabled-toggle');
                const lightweightToggle = document.getElementById('memory-use-lightweight');

                if (limitInput) limitInput.value = PRIMARY_MEMORY_LIMIT;
                if (enabledToggle) enabledToggle.checked = memoryEnabled;
                if (lightweightToggle) lightweightToggle.checked = memoryUseLightweight;
            } catch (e) {
                console.error('Failed to load memory settings:', e);
            }
        }

        // =============================================
        // API CALLING LOGIC
        // =============================================
        async function callAPI(provider, modelId, messages, systemPrompt) {
            const apiKey = await getApiKey(provider);
            if (!apiKey) {
                throw new Error(`No API key found for ${provider}`);
            }

            switch (provider) {
                case 'anthropic':
                    return await callAnthropicAPI(apiKey, modelId, messages, systemPrompt);
                case 'openai':
                    return await callOpenAIAPI(apiKey, modelId, messages, systemPrompt);
                case 'google':
                    return await callGoogleAPI(apiKey, modelId, messages, systemPrompt);
                case 'cohere':
                    return await callCohereAPI(apiKey, modelId, messages, systemPrompt);
                case 'openrouter':
                    return await callOpenRouterAPI(apiKey, modelId, messages, systemPrompt);
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }
        }
        async function callAnthropicAPI(apiKey, model, messages, systemPrompt) {
            const formattedMessages = messages.map(msg => {
                const content = [];
                if (msg.content) {
                    content.push({ type: "text", text: msg.content });
                }
                if (msg.attachments && msg.attachments.length > 0) {
                    for (const att of msg.attachments) {
                        if (att.type.startsWith('image/')) {
                            // Anthropic expects base64 data without the data:image/png;base64, prefix
                            const base64Data = att.data.split(',')[1];
                            content.push({
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: att.type,
                                    data: base64Data
                                }
                            });
                        }
                    }
                }
                return { role: msg.role === 'assistant' ? 'assistant' : 'user', content };
            });

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: formattedMessages
                })
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.content[0].text;
        }
        // Shared by every OpenAI-compatible endpoint (OpenAI, OpenRouter).
        function formatOpenAIMessages(messages, systemPrompt) {
            const formattedMessages = [
                { role: 'system', content: systemPrompt }
            ];

            for (const msg of messages) {
                if (msg.attachments && msg.attachments.length > 0) {
                    const content = [];
                    if (msg.content) {
                        content.push({ type: 'text', text: msg.content });
                    }
                    for (const att of msg.attachments) {
                        if (att.type.startsWith('image/')) {
                            content.push({
                                type: 'image_url',
                                image_url: { url: att.data }
                            });
                        }
                    }
                    formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content });
                } else {
                    formattedMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
                }
            }

            return formattedMessages;
        }

        async function callOpenRouterAPI(apiKey, model, messages, systemPrompt) {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    // OpenRouter attributes traffic with these; both are optional
                    'HTTP-Referer': window.location.origin,
                    'X-Title': document.title || 'AI Messaging App'
                },
                body: JSON.stringify({
                    model,
                    messages: formatOpenAIMessages(messages, systemPrompt)
                })
            });

            if (!response.ok) {
                let detail = response.statusText;
                try {
                    const body = await response.json();
                    if (body?.error?.message) detail = body.error.message;
                } catch (parseErr) { /* keep the status text */ }
                throw new Error(`OpenRouter API error: ${detail}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices.length) {
                throw new Error('OpenRouter API error: no completion returned');
            }
            return data.choices[0].message.content;
        }

        async function callOpenAIAPI(apiKey, model, messages, systemPrompt) {
            const formattedMessages = formatOpenAIMessages(messages, systemPrompt);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: formattedMessages
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        }
        async function callGoogleAPI(apiKey, model, messages, systemPrompt) {
            const contents = messages.map(msg => {
                const parts = [];
                if (msg.content) {
                    parts.push({ text: msg.content });
                }
                
                if (msg.attachments && msg.attachments.length > 0) {
                    for (const att of msg.attachments) {
                        if (att.type.startsWith('image/')) {
                            const base64Data = att.data.split(',')[1];
                            parts.push({
                                inlineData: {
                                    mimeType: att.type,
                                    data: base64Data
                                }
                            });
                        }
                    }
                }
                
                return {
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents
                })
            });

            if (!response.ok) {
                throw new Error(`Google API error: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
               return data.candidates[0].content.parts[0].text;
            }
            return "Error parsing response from Google.";
        }


        async function callCohereAPI(apiKey, model, messages, systemPrompt) {
            const chatHistory = messages.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
                message: msg.content
            }));

            const response = await fetch('https://api.cohere.ai/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    message: messages[messages.length - 1].content,
                    chat_history: chatHistory,
                    preamble: systemPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`Cohere API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.text;
        }

        // =============================================
        // CONTEXT MANAGEMENT
        // =============================================
        function estimateTokenCount(text) {
            // Rough estimation: 1 token ≈ 4 characters
            return Math.ceil(text.length / 4);
        }

        function getStoredConversationMessages(conversationId) {
            if (incognitoConversationIds.has(conversationId)) {
                return Promise.resolve([...(ephemeralMessages.get(conversationId) || [])]);
            }

            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['messages'], 'readonly');
                const store = tx.objectStore('messages');
                const index = store.index('conversationId');
                const request = index.getAll(conversationId);

                request.onsuccess = () => {
                    const messages = request.result || [];
                    resolve(messages);
                };
                request.onerror = () => reject(request.error);
            });
        }

        async function buildContextForConversation(conversationId) {
            const messages = await getStoredConversationMessages(conversationId);
            messages.sort((a, b) => a.timestamp - b.timestamp);

            return messages.map(msg => {
                const role = msg.sender === 'user' ? 'user' : 'assistant';
                let content = msg.text || '';
                if (msg.image) {
                    const painter = msg.botName || 'The image bot';
                    const about = msg.imagePrompt ? ` for the prompt "${msg.imagePrompt}"` : '';
                    content = `[${painter} painted an image${about}]${content ? ` ${content}` : ''}`;
                }

                if (msg.loudness && parseFloat(msg.loudness) > 0.7) {
                    content = `[Speaking loudly] ${content}`;
                } else if (msg.loudness && parseFloat(msg.loudness) < 0.3) {
                    content = `[Speaking quietly] ${content}`;
                }

                if (msg.replyTo) {
                    const replyToMsg = messages.find(message => message.id === msg.replyTo);
                    const repliedText = replyToMsg?.text || msg.replyToText;
                    if (repliedText) content = `[Replying to: "${repliedText}"] ${content}`;
                }

                return msg.attachments?.length
                    ? { role, content, attachments: msg.attachments }
                    : { role, content };
            });
        }


        // Resolves against the bot's own provider first, so a gateway slug that
        // has no preset entry still gets that gateway's default rather than a
        // model of the same id belonging to some other provider.
        function getContextWindowForBot(bot) {
            if (!bot) return 100000;
            const provider = MODEL_PROVIDERS[bot.provider];
            const model = provider?.models.find(m => m.id === bot.modelId);
            if (model?.contextWindow) return model.contextWindow;
            if (provider?.defaultContextWindow) return provider.defaultContextWindow;
            const legacy = Object.values(MODEL_PROVIDERS)
                .flatMap(p => p.models)
                .find(m => m.id === bot.modelId);
            return legacy?.contextWindow || 100000;
        }

        function calculateContextUsage(context, contextWindow) {
            const totalTokens = context.reduce((sum, msg) => {
                return sum + estimateTokenCount(msg.content);
            }, 0);
            
            return totalTokens / contextWindow;
        }

        async function updateContextPill() {
            try {
                if (!currentConversationId) return;
                const context = await buildContextForConversation(currentConversationId);
                const allBots = await getAllBotsWithColors();
                
                // Use the last invoked bot or first bot for context window size
                const activeBot = lastInvokedBot || getDefaultBot(allBots);
                if (!activeBot) return;
                
                const contextWindow = getContextWindowForBot(activeBot);
                
                const totalInputTokens = context.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
                const totalOutputTokens = context.filter(m => m.role === 'assistant').reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
                const usage = totalInputTokens / contextWindow;
                const pct = Math.min(Math.round(usage * 100), 100);
                
                // Update pill elements
                const pillPct = document.getElementById('context-pill-pct');
                const pillFill = document.getElementById('context-pill-fill');
                const tokensIn = document.getElementById('context-tokens-in');
                const tokensOut = document.getElementById('context-tokens-out');
                const windowSize = document.getElementById('context-window-size');
                
                if (pillPct) pillPct.textContent = `${pct}%`;
                if (pillFill) {
                    pillFill.style.width = `${pct}%`;
                    pillFill.classList.remove('warning', 'danger');
                    if (pct >= 90) pillFill.classList.add('danger');
                    else if (pct >= 70) pillFill.classList.add('warning');
                }
                if (tokensIn) tokensIn.textContent = totalInputTokens.toLocaleString();
                if (tokensOut) tokensOut.textContent = totalOutputTokens.toLocaleString();
                if (windowSize) windowSize.textContent = contextWindow.toLocaleString();
            } catch (e) {
                // Silently ignore — pill is non-critical
            }
        }

        // =============================================
        // UI INITIALIZATION
        // =============================================
        const customCaret = document.getElementById('custom-caret');
        const uploadBtn = document.getElementById('upload-btn');
        const attachmentsTray = document.getElementById('attachments-tray');
        const editorContainer = document.getElementById('editor-container');
        const composerWrapper = document.getElementById('composer-wrapper');
        const composer = document.getElementById('composer');
        const replyPreview = document.getElementById('reply-preview');
        const replyPreviewText = document.getElementById('reply-preview-text');
        const closeReply = document.getElementById('close-reply');
        const sendBtn = document.getElementById('send-btn');
        const mentionPopup = document.getElementById('mention-popup');
        const settingsBtn = document.getElementById('composer-settings-btn');
        const settingsMenu = document.getElementById('composer-settings-menu');
        const editor = document.getElementById('editor');
        const chatMessages = document.getElementById('chat-messages');
        const micBtn = document.getElementById('mic-btn');
        const recTimerEl = document.getElementById('rec-timer');
        const recWaveformEl = document.getElementById('rec-waveform');
        const recordingWidget = document.getElementById('recording-widget');
        // Collapsing the whole slot (not just the button) is what lets the
        // recording widget slide right into the space the send button leaves.
        const sendBtnContainer = document.querySelector('.send-btn-container');
        const loudnessSlider = document.getElementById('loudness-slider');
        const contextMenu = document.getElementById('context-menu');

        let currentConversationId = null;
        let lastInvokedBot = null;
        const incognitoConversationIds = new Set();
        const ephemeralConversations = new Map();
        const ephemeralMessages = new Map();
        let incognitoPromptDisabled = false;

                const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
        let currentColorIndex = 0;
        let blinkTimeout = null;
        let cycleInterval = null;
        let isTyping = false;
        let trailStack = [];
        const MAX_TRAILS = 4;
        const attachments = [];
        const fileTypeIcons = [
            { label: 'Image', icon: 'image', match: (file) => file.type.startsWith('image/') },
            { label: 'PDF', icon: 'file-text', match: (file) => file.type === 'application/pdf' },
            { label: 'Video', icon: 'film', match: (file) => file.type.startsWith('video/') },
            { label: 'Audio', icon: 'file-audio', match: (file) => file.type.startsWith('audio/') },
            { label: 'Other', icon: 'file', match: () => true }
        ];

        const hiddenFileInput = document.createElement('input');
        hiddenFileInput.type = 'file';
        hiddenFileInput.multiple = true;
        hiddenFileInput.style.display = 'none';
        document.body.appendChild(hiddenFileInput);

        // Syncs the CSS variable for selection and the caret background
        function updateActiveColor() {
            const activeColor = colors[currentColorIndex];
            customCaret.style.background = activeColor;
            document.body.style.setProperty('--selection-bg', activeColor);
        }

        function truncateFileName(name, maxLength = 22) {
            if (name.length <= maxLength) return { display: name, truncated: false };
            return { display: `${name.slice(0, maxLength - 3)}...`, truncated: true };
        }

        function iconForFile(file) {
            const match = fileTypeIcons.find(cfg => cfg.match(file)) || fileTypeIcons[fileTypeIcons.length - 1];
            return match.icon;
        }

        function ensureAttachmentsState() {
            const hasItems = attachments.length > 0;
            attachmentsTray.classList.toggle('active', hasItems);
            composer.classList.toggle('has-attachments', hasItems);
        }

        function buildMarquee(name) {
            const marqueeInner = document.createElement('div');
            marqueeInner.className = 'marquee-inner';
            marqueeInner.textContent = `${name} // ${name}`;
            const marquee = document.createElement('div');
            marquee.className = 'file-name-marquee';
            marquee.appendChild(marqueeInner);
            return marquee;
        }

        function createAttachmentPill(attachment) {
            const { file, id } = attachment;
            const pill = document.createElement('div');
            pill.className = 'file-pill';

            const iconWrap = document.createElement('div');
            iconWrap.className = 'pill-icon';
            iconWrap.innerHTML = `<i data-lucide="${iconForFile(file)}"></i>`;

            const label = document.createElement('div');
            label.className = 'file-label';

            const staticName = document.createElement('span');
            staticName.className = 'file-name-static';
            staticName.textContent = file.name;

            label.appendChild(staticName);
            label.appendChild(buildMarquee(file.name));

            const closeBtn = document.createElement('button');
            closeBtn.className = 'pill-close';
            closeBtn.type = 'button';
            closeBtn.innerHTML = '<i data-lucide="x"></i>';

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = attachments.findIndex(item => item.id === id);
                if (idx !== -1) attachments.splice(idx, 1);
                pill.remove();
                ensureAttachmentsState();
            });

            pill.appendChild(iconWrap);
            pill.appendChild(label);
            pill.appendChild(closeBtn);

            pill.style.opacity = '0';
            pill.style.transform = 'scale(0.92)';
            requestAnimationFrame(() => {
                pill.style.opacity = '1';
                pill.style.transform = 'scale(1)';
            });

            return pill;
        }

        function handleFiles(fileList) {
            const mapped = Array.from(fileList).map((file, index) => ({ id: (crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}-${index}`), file, order: index }));
            mapped.forEach((item) => {
                attachments.push(item);
                const pill = createAttachmentPill(item);
                attachmentsTray.appendChild(pill);
            });
            ensureAttachmentsState();
            lucide.createIcons();
            requestAnimationFrame(() => {
                attachmentsTray.querySelectorAll('.file-pill:not(.truncated)').forEach(pill => {
                    const label = pill.querySelector('.file-label');
                    const staticName = pill.querySelector('.file-name-static');
                    if (staticName && label && staticName.scrollWidth > label.clientWidth) {
                        pill.classList.add('truncated');
                    }
                });
            });
            
            // Return focus and explicitly resync the caret after handling files
            editor.focus();
            stopBlinking();
        }

        // 1. Caret Color Cycling
        function startColorCycle() {
            if (cycleInterval) clearInterval(cycleInterval);
            cycleInterval = setInterval(() => {
                currentColorIndex = (currentColorIndex + 1) % colors.length;
                updateActiveColor();
            }, 1000);
        }

        function stopColorCycle() {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }

        startColorCycle();

        function stopBlinking() {
            isTyping = true;
            stopColorCycle(); // Stop interval so it doesn't drift while "frozen"
            customCaret.classList.remove('caret-blink');
            customCaret.style.opacity = '1';
            updateActiveColor();
            
            clearTimeout(blinkTimeout);
            blinkTimeout = setTimeout(() => {
                isTyping = false;
                // Restart in sync: re-add class and start interval at the same moment
                customCaret.classList.add('caret-blink');
                void customCaret.offsetWidth; // Force reflow to restart animation phase
                startColorCycle();
            }, 800); 
        }

        // 2. Trailing Mechanic
        let lastCaretPos = { x: 0, y: 0 };

        function createTrail(oldX, newX, y, height) {
            const width = Math.abs(newX - oldX);
            const x = Math.min(oldX, newX);
            
            if (trailStack.length >= MAX_TRAILS) {
                const oldest = trailStack.shift();
                oldest.remove();
            }

            const trail = document.createElement('div');
            trail.className = 'caret-trail';
            
            const opacity = trailStack.length === 0 ? 0.2 : 0.4;
            
            trail.style.left = `${x}px`;
            trail.style.top = `${y}px`;
            trail.style.width = `${width}px`;
            trail.style.height = `${height}px`;
            trail.style.background = colors[currentColorIndex];
            trail.style.opacity = opacity;
            
            editorContainer.appendChild(trail);
            trailStack.push(trail);

            setTimeout(() => {
                trail.style.opacity = '0';
                setTimeout(() => {
                    trail.remove();
                    trailStack = trailStack.filter(t => t !== trail);
                }, 300);
            }, 400);
        }

        function updateCaretPosition(isMovement = false) {
            const selection = window.getSelection();
            
            // Mechanic: Do not show caret when text is selected
            if (selection.toString().length > 0) {
                customCaret.style.display = 'none';
                return;
            }

            if (document.activeElement !== editor) {
                customCaret.style.display = 'none';
                return;
            }

            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const containerRect = editorContainer.getBoundingClientRect();
            let rect;

            const rects = range.getClientRects();
            if (rects.length > 0) {
                rect = rects[0];
            } else {
                const span = document.createElement('span');
                span.textContent = '\u200b';
                const clonedRange = range.cloneRange();
                clonedRange.insertNode(span);
                rect = span.getBoundingClientRect();
                span.parentNode.removeChild(span);
            }

            if (rect && rect.height > 0) {
                const newX = rect.left - containerRect.left;
                const newY = rect.top - containerRect.top - 3;
                const caretHeight = rect.height + 3;

                // the trail spans the caret's full height, not just the glyph box
                if (isMovement && Math.abs(newY - lastCaretPos.y) < 5 && Math.abs(newX - lastCaretPos.x) > 2) {
                    createTrail(lastCaretPos.x, newX, newY, caretHeight);
                }

                customCaret.style.display = 'block';
                customCaret.style.left = `${newX}px`;
                customCaret.style.top = `${newY}px`;
                customCaret.style.height = `${caretHeight}px`;

                lastCaretPos = { x: newX, y: newY };
            }
        }

        // 3. Event Listeners
        editor.addEventListener('keydown', (e) => {
            const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
            
            if (isArrow || e.key.length === 1 || e.key === 'Backspace') {
                stopBlinking();
            }

            if (isArrow) {
                requestAnimationFrame(() => updateCaretPosition(true));
            }
        });

        editor.addEventListener('input', () => {
            stopBlinking();
            updateCaretPosition();
        });

        // Upload handling
        uploadBtn.addEventListener('click', () => hiddenFileInput.click());
        hiddenFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
                e.target.value = '';
            }
        });

        // Settings popover
        const settingsOptions = [
            { label: 'Help and Support', icon: 'help-circle' },
            { label: 'Settings', icon: 'settings' }
        ];

        // 1. Extended Thinking Toggle
        const toggleRow = document.createElement('div');
        toggleRow.className = 'menu-item';
        toggleRow.style.justifyContent = 'space-between';
        toggleRow.style.cursor = 'default';
        toggleRow.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px">
                Extended Thinking
            </div>
            <div class="toggle-switch" id="thinking-toggle">
                <div class="toggle-thumb"></div>
            </div>
        `;
        
        let extendedThinkingEnabled = false;
        
        // Prevent menu from closing when clicking inside toggle
        toggleRow.addEventListener('click', (e) => {
            e.stopPropagation();
            const switchEl = toggleRow.querySelector('.toggle-switch');
            extendedThinkingEnabled = !extendedThinkingEnabled;
            switchEl.classList.toggle('active', extendedThinkingEnabled);
            settingsBtn.classList.toggle('has-dot', extendedThinkingEnabled);
            console.log('Extended Thinking:', extendedThinkingEnabled);
        });

        settingsMenu.appendChild(toggleRow);

        // 2. Other options — hidden for now; Extended Thinking is the only
        // control in this menu. The definitions above are kept for when they
        // are wired up again.
        void settingsOptions;

        function hideSettingsMenu() { settingsMenu.classList.remove('show'); }

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('show');
        });

        // Selection / Focus handling
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === editor) updateCaretPosition();
        });
        editor.addEventListener('focus', () => {
            updateActiveColor();
            updateCaretPosition();
            
            // Resync CSS blink animation with JS color cycle on focus
            customCaret.classList.remove('caret-blink');
            void customCaret.offsetWidth; // Force reflow
            customCaret.classList.add('caret-blink');
            startColorCycle();
        });
        editor.addEventListener('blur', () => {
            customCaret.style.display = 'none';
            stopColorCycle(); // Stop cycle when not focused to prevent drift
        });

        // Context Menu
        const formattingOptions = [
            { label: 'Rewrite', icon: 'rotate-ccw' },
            { label: 'Summarize', icon: 'align-left' },
            { label: 'Paste context', icon: 'clipboard' },
            { label: 'Expand idea', icon: 'wand-2' },
        ];

        formattingOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'menu-item';
            btn.innerHTML = `${opt.label}`;
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); hideMenu(); });
            contextMenu.appendChild(btn);
        });

        editor.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.code === 'Space') {
                e.preventDefault();
                composer.classList.remove('glow');
                void composer.offsetWidth;
                composer.classList.add('glow');
                showMenuAtCaret();
            }
        });

        function showMenuAtCaret() {
            const caretLeft = parseFloat(customCaret.style.left || 0);
            contextMenu.style.bottom = `${composer.offsetHeight + 8}px`;
            contextMenu.style.left = `${Math.min(caretLeft, composer.offsetWidth - 210)}px`;
            contextMenu.classList.add('show');
        }

        function hideMenu() { contextMenu.classList.remove('show'); }
        document.addEventListener('mousedown', (e) => {
            if (!contextMenu.contains(e.target)) hideMenu();
            if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) hideSettingsMenu();
        });

        updateActiveColor(); // Init colors
        lucide.createIcons();

        // ============================================
        // Voice Recording Feature
        // ============================================
        let recState = 'idle'; // 'idle' | 'recording' | 'paused'
        let mediaStream = null;
        let audioCtx = null;
        let analyserNode = null;
        let speechRecognition = null;
        let recSeconds = 0;
        let recTimerInterval = null;
        let waveformAnimFrame = null;
        let finalTranscript = '';
        let preRecordingText = '';
        const WAVEFORM_BARS = 28;

        // Build waveform bars
        (function initWaveformBars() {
            for (let i = 0; i < WAVEFORM_BARS; i++) {
                const bar = document.createElement('div');
                bar.className = 'waveform-bar';
                recWaveformEl.appendChild(bar);
            }
        })();

        function formatRecTime(sec) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        function startRecTimer() {
            recTimerInterval = setInterval(() => {
                recSeconds++;
                recTimerEl.textContent = formatRecTime(recSeconds);
            }, 1000);
        }

        function pauseRecTimer() {
            clearInterval(recTimerInterval);
            recTimerInterval = null;
        }

        function resetRecTimer() {
            clearInterval(recTimerInterval);
            recTimerInterval = null;
            recSeconds = 0;
            recTimerEl.textContent = '0:00';
        }

        function animateWaveform() {
            if (!analyserNode) return;
            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const bars = recWaveformEl.querySelectorAll('.waveform-bar');
            const step = Math.max(1, Math.floor(bufferLength / WAVEFORM_BARS));

            function draw() {
                if (recState !== 'recording') return;
                waveformAnimFrame = requestAnimationFrame(draw);
                analyserNode.getByteFrequencyData(dataArray);
                bars.forEach((bar, i) => {
                    const val = dataArray[i * step] || 0;
                    bar.style.height = `${Math.max(3, (val / 255) * 24)}px`;
                });
            }
            draw();
        }

        function freezeWaveform() {
            cancelAnimationFrame(waveformAnimFrame);
            recWaveformEl.querySelectorAll('.waveform-bar').forEach(b => {
                b.style.height = `${Math.max(3, parseFloat(b.style.height || 3) * 0.5)}px`;
                b.style.opacity = '0.45';
            });
        }

        function resetWaveform() {
            cancelAnimationFrame(waveformAnimFrame);
            recWaveformEl.querySelectorAll('.waveform-bar').forEach(b => {
                b.style.height = '3px';
                b.style.opacity = '0.85';
            });
        }

        function setMicBtnIcon(type) {
            if (type === 'stop') {
                micBtn.innerHTML = '<div class="stop-square"></div>';
            } else if (type === 'play') {
                micBtn.innerHTML = '<div class="play-solid"></div>';
            } else {
                micBtn.innerHTML = '<i data-lucide="mic"></i>';
                lucide.createIcons();
            }
        }

        async function enterRecordingMode() {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(mediaStream);
                analyserNode = audioCtx.createAnalyser();
                analyserNode.fftSize = 128;
                source.connect(analyserNode);

                // Speech Recognition (Chrome Web Speech API)
                const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SR) {
                    speechRecognition = new SR();
                    speechRecognition.continuous = true;
                    speechRecognition.interimResults = true;
                    speechRecognition.lang = 'en-US';

                    preRecordingText = editor.innerText.trim();
                    if (preRecordingText === '\u200b' || editor.textContent.trim() === '') preRecordingText = '';
                    finalTranscript = '';

                    speechRecognition.onresult = (event) => {
                        let interim = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const t = event.results[i][0].transcript;
                            if (event.results[i].isFinal) finalTranscript += t;
                            else interim += t;
                        }
                        const full = (preRecordingText ? preRecordingText + ' ' : '') + finalTranscript + interim;
                        editor.innerText = full;
                        // Move caret to end
                        const r = document.createRange();
                        const s = window.getSelection();
                        r.selectNodeContents(editor);
                        r.collapse(false);
                        s.removeAllRanges();
                        s.addRange(r);
                        updateCaretPosition();
                    };

                    speechRecognition.onerror = (e) => {
                        if (e.error !== 'no-speech' && e.error !== 'aborted') {
                            console.warn('SpeechRecognition error:', e.error);
                        }
                    };

                    speechRecognition.onend = () => {
                        // Chrome auto-stops recognition after silence; restart if still recording
                        if (recState === 'recording' && speechRecognition) {
                            try { speechRecognition.start(); } catch (_) {}
                        }
                    };

                    speechRecognition.start();
                }

                // ---- UI Transitions ----
                recState = 'recording';

                // Collapse settings & send — collapsing the send slot too makes
                // the widget and mic glide right into the freed space
                settingsBtn.classList.add('rec-collapsed');
                sendBtn.classList.add('rec-collapsed');
                if (sendBtnContainer) sendBtnContainer.classList.add('rec-collapsed');

                // Mic → red stop button (with roll animation)
                micBtn.classList.add('recording-stop', 'mic-rolling');
                setTimeout(() => micBtn.classList.remove('mic-rolling'), 450);
                setMicBtnIcon('stop');

                // Expand recording widget
                recordingWidget.classList.add('active');

                // Start timer & waveform
                startRecTimer();
                animateWaveform();

            } catch (err) {
                console.error('Microphone access denied or unavailable:', err);
            }
        }

        function pauseRecordingMode() {
            recState = 'paused';

            if (speechRecognition) { try { speechRecognition.stop(); } catch (_) {} }
            pauseRecTimer();
            freezeWaveform();

            // Stop → Resume (play) icon
            micBtn.classList.remove('recording-stop');
            micBtn.classList.add('recording-paused');
            setMicBtnIcon('play');

            // Reopen the send slot first: the widget slides back left as it grows
            if (sendBtnContainer) sendBtnContainer.classList.remove('rec-collapsed');

            // Smooth staged reveal: animate width from 0 → 40px, then fade opacity
            sendBtn.classList.remove('rec-collapsed');
            sendBtn.style.opacity = '0';
            sendBtn.style.width = '0px';
            sendBtn.style.maxWidth = '0px';
            sendBtn.style.minWidth = '0px';
            sendBtn.style.overflow = 'hidden';
            sendBtn.style.borderWidth = '0';
            sendBtn.style.padding = '0';
            sendBtn.style.margin = '0';
            // Force layout to register the 0-width state
            void sendBtn.offsetWidth;
            // Set transition for all properties and animate to final size
            sendBtn.style.transition = 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.35s cubic-bezier(0.22, 1, 0.36, 1), min-width 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease 0.12s, border-width 0.3s ease, padding 0.3s ease, margin 0.3s ease';
            sendBtn.style.width = '40px';
            sendBtn.style.maxWidth = '40px';
            sendBtn.style.minWidth = '40px';
            sendBtn.style.overflow = '';
            sendBtn.style.borderWidth = '1px';
            sendBtn.style.padding = '';
            sendBtn.style.margin = '';
            sendBtn.style.opacity = '1';
            sendBtn.style.pointerEvents = '';
            // Clean up inline styles after transition completes
            setTimeout(() => {
                sendBtn.style.transition = '';
                sendBtn.style.width = '';
                sendBtn.style.maxWidth = '';
                sendBtn.style.minWidth = '';
                sendBtn.style.opacity = '';
                sendBtn.style.borderWidth = '';
            }, 400);
        }

        function resumeRecordingMode() {
            recState = 'recording';

            // Fade out send smoothly first, then collapse after transition
            sendBtn.style.opacity = '0';
            sendBtn.style.pointerEvents = 'none';
            setTimeout(() => {
                sendBtn.classList.add('rec-collapsed');
                if (sendBtnContainer) sendBtnContainer.classList.add('rec-collapsed');
                sendBtn.style.opacity = '';
                sendBtn.style.pointerEvents = '';
            }, 250);

            // Resume → Stop icon
            micBtn.classList.remove('recording-paused');
            micBtn.classList.add('recording-stop');
            setMicBtnIcon('stop');

            // Restore waveform bar opacity
            recWaveformEl.querySelectorAll('.waveform-bar').forEach(b => b.style.opacity = '0.85');

            // Restart speech recognition
            if (speechRecognition) { try { speechRecognition.start(); } catch (_) {} }

            startRecTimer();
            animateWaveform();
        }

        function exitRecordingMode(clearEditor) {
            recState = 'idle';

            if (speechRecognition) { try { speechRecognition.stop(); } catch (_) {} speechRecognition = null; }
            if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
            if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; analyserNode = null; }

            resetRecTimer();
            resetWaveform();

            // Collapse recording widget
            recordingWidget.classList.remove('active');

            // Mic button reset with spring animation
            micBtn.classList.remove('recording-stop', 'recording-paused');
            setMicBtnIcon('mic');
            micBtn.classList.add('spring-back');
            setTimeout(() => micBtn.classList.remove('spring-back'), 500);

            // Restore settings & send
            settingsBtn.classList.remove('rec-collapsed');
            sendBtn.classList.remove('rec-collapsed');
            if (sendBtnContainer) sendBtnContainer.classList.remove('rec-collapsed');

            if (clearEditor) {
                editor.innerText = '';
                updateCaretPosition();
            }
        }

        // Mic button: idle → recording → paused → recording…
        micBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (recState === 'idle') enterRecordingMode();
            else if (recState === 'recording') pauseRecordingMode();
            else if (recState === 'paused') resumeRecordingMode();
        });

        // Send button during paused recording → send message & collapse
        sendBtn.addEventListener('click', (e) => {
            if (recState === 'paused') {
                e.stopPropagation();
                const message = editor.innerText.trim();
                if (message) console.log('Sent:', message);
                exitRecordingMode(true);
            }
        });
    

        async function initializeApp() {
            await initDatabases();
            incognitoPromptDisabled = await getSetting('incognitoPromptDisabled', false);
            
            // Init memory databases in parallel
            await Promise.all([
                initMemoryDB(),
                initLTMDB()
            ]);
            
            await migrateGroqToOpenRouter();
            const apiKeys = await getAllApiKeys();
            if (apiKeys.length > 0) {
                // existing installs: seed on OpenRouter when present
                const seedProvider = apiKeys.some(k => k.provider === 'openrouter') ? 'openrouter' : apiKeys[0].provider;
                await ensureDefaultBots(seedProvider);
            }
            await getAllBotsWithColors();
            
            // Load memory settings
            await loadMemorySettings();
            
            // Check if API keys exist
            if (apiKeys.length === 0) {
                showSetupModal();
            }
            
            await loadConversations();
            setupEventListeners();
            lucide.createIcons();
        }

        function setupEventListeners() {
            
            
            // Conversation management
            document.getElementById('new-conversation-btn').addEventListener('click', createNewConversation);
            document.addEventListener('click', event => {
                if (!event.target.closest('.conversation-more, .conversation-menu')) {
                    document.querySelectorAll('.conversation-menu.open').forEach(menu => menu.classList.remove('open'));
                }
            });

            // Canvas mode explainer: dismiss on an outside click or Escape
            document.addEventListener('click', event => {
                if (!event.target.closest('.view-mode-toggle')) closeCanvasModePopover();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') closeCanvasModePopover();
            });

            // Settings panel
            document.getElementById('settings-btn').addEventListener('click', openSettingsPanel);
            document.getElementById('close-settings').addEventListener('click', closeSettingsPanel);
            
            // Close settings when clicking overlay background
            document.getElementById('settings-overlay').addEventListener('click', (e) => {
                if (e.target.id === 'settings-overlay') {
                    closeSettingsPanel();
                }
            });
            
            // Settings tabs
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
            });

            document.getElementById('nuke-chats-btn').addEventListener('click', () => openDangerConfirmation('chats'));
            document.getElementById('nuke-everything-btn').addEventListener('click', () => openDangerConfirmation('everything'));
            document.getElementById('danger-confirm-close').addEventListener('click', closeDangerConfirmation);
            document.getElementById('danger-confirm-input').addEventListener('input', updateDangerConfirmationState);
            setupDangerHoldButton();

            window.addEventListener('beforeunload', (event) => {
                if (incognitoConversationIds.size > 0 && !incognitoPromptDisabled) {
                    event.preventDefault();
                    event.returnValue = '';
                }
            });
            
            // Bot management
            document.getElementById('create-bot-btn').addEventListener('click', event => {
                if (window.ImageStudio) {
                    ImageStudio.openBotKindPopover(event.currentTarget, kind => showBotForm(null, kind));
                } else {
                    showBotForm();
                }
            });
            document.getElementById('cancel-bot-btn').addEventListener('click', () => switchSettingsTab('bots'));
            document.getElementById('bot-form').addEventListener('submit', handleBotFormSubmit);
            document.getElementById('bot-search').addEventListener('input', handleBotSearch);
            
            // Chat input
            const chatInput = document.getElementById('editor');
            document.getElementById('editor').addEventListener('input', handleMentions);
            document.getElementById('editor').addEventListener('keydown', handleChatKeydown);
            
            // Send button
            const sendBtn = document.getElementById('send-btn');
            sendBtn.addEventListener('mousedown', handlePressStart);
            sendBtn.addEventListener('touchstart', handlePressStart, { passive: false });
            
            // Reply preview
            document.getElementById('close-reply').addEventListener('click', hideReplyPreview);

            // Memory modal
            document.getElementById('close-memory-modal').addEventListener('click', closeMemoryModal);
            document.getElementById('memory-modal-overlay').addEventListener('click', (e) => {
                if (e.target.id === 'memory-modal-overlay') {
                    closeMemoryModal();
                }
            });

            // Memory modal tabs
            document.querySelectorAll('.memory-tab-item').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.memory-tab-item').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const tabName = tab.dataset.tab;
                    document.querySelectorAll('.memory-tab-content').forEach(c => c.classList.remove('active'));
                    document.getElementById(`${tabName}TabContent`).classList.add('active');

                    if (tabName === 'ltm') {
                        if (!ltmCanvas) {
                            loadLongTermMemories();
                        }
                    } else {
                        if (ltmCanvas) {
                            ltmCanvas.remove();
                            ltmCanvas = null;
                        }
                    }
                });
            });

            // LTM island back button & organize
            document.getElementById('ltmListBackBtn').addEventListener('click', () => {
                document.getElementById('ltmMemoryListView').style.display = 'none';
            });
            document.getElementById('organizeLtmBtn').addEventListener('click', organizeLongTermMemories);
            document.getElementById('ltmEmptyPrimaryBtn').addEventListener('click', () => {
                document.querySelector('.memory-tab-item[data-tab="primary"]').click();
            });

            // Memory settings tab
            document.getElementById('view-memories-btn').addEventListener('click', () => {
                closeSettingsPanel();
                setTimeout(() => openMemoryModal(), 350);
            });
            document.getElementById('organize-ltm-btn').addEventListener('click', () => {
                closeSettingsPanel();
                setTimeout(() => organizeLongTermMemories(), 350);
            });

            // Memory config inputs
            document.getElementById('memory-limit-input').addEventListener('change', (e) => {
                PRIMARY_MEMORY_LIMIT = Math.max(8, Math.min(512, parseInt(e.target.value) || 64));
                e.target.value = PRIMARY_MEMORY_LIMIT;
                saveMemorySettings();
            });
            document.getElementById('memory-enabled-toggle').addEventListener('change', (e) => {
                memoryEnabled = e.target.checked;
                saveMemorySettings();
            });
            document.getElementById('memory-use-lightweight').addEventListener('change', (e) => {
                memoryUseLightweight = e.target.checked;
                saveMemorySettings();
            });
        }

        // =============================================
        // SETUP MODAL
        // =============================================
        function showSetupModal() {
            const modal = document.getElementById('setup-modal');
            const providerSelection = document.getElementById('provider-selection');
            
            providerSelection.innerHTML = '';
            Object.entries(MODEL_PROVIDERS).forEach(([key, provider]) => {
                const card = document.createElement('div');
                card.className = 'provider-option';
                card.textContent = provider.name;
                if (key === 'openrouter') {
                    const badge = document.createElement('span');
                    badge.className = 'provider-option-badge';
                    badge.textContent = 'Recommended';
                    card.appendChild(badge);
                }
                card.addEventListener('click', () => selectProviderForSetup(key));
                providerSelection.appendChild(card);
            });
            
            modal.classList.add('active');
            
            document.getElementById('setup-back-btn').addEventListener('click', () => {
                document.getElementById('api-key-input-section').style.display = 'none';
                document.getElementById('provider-selection').style.display = 'grid';
            });
            
            document.getElementById('setup-save-btn').addEventListener('click', handleSetupSave);
        }

        let selectedSetupProvider = null;

        function selectProviderForSetup(provider) {
            selectedSetupProvider = provider;
            document.getElementById('provider-selection').style.display = 'none';
            document.getElementById('api-key-input-section').style.display = 'block';
        }

        async function handleSetupSave() {
            const apiKey = document.getElementById('setup-api-key').value.trim();
            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }
            
            await saveApiKey(selectedSetupProvider, apiKey);
            await ensureDefaultBots(selectedSetupProvider);
            document.getElementById('setup-modal').classList.remove('active');

            // Show the angel and devil that were just created on this key
            openSettingsPanel();
        }

        // =============================================
        // SETTINGS PANEL
        // =============================================
        function openSettingsPanel() {
            document.getElementById('settings-overlay').classList.add('open');
            renderBotsTab();
            renderProvidersTab();
        }

        function closeSettingsPanel() {
            document.getElementById('settings-overlay').classList.remove('open');
            switchSettingsTab('bots');
        }

        function switchSettingsTab(tabName) {
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Update header title based on active tab
            const headerTitle = document.getElementById('settings-header-title');
            if (headerTitle) {
                const titles = {
                    'bots': 'Bots',
                    'providers': 'API Keys',
                    'memory': 'Memory',
                    'danger': 'Danger zone',
                    'bot-form': 'New bot'
                };
                headerTitle.textContent = titles[tabName] || tabName;
            }

            // Refresh memory stats when switching to memory tab
            if (tabName === 'memory') {
                refreshMemoryStats();
            }
        }

        async function renderBotsTab() {
            const bots = await getAllBotsWithColors();
            const botsList = document.getElementById('bots-list');
            botsList.innerHTML = '';
            
            for (const bot of bots) {
                const modelData = MODEL_PROVIDERS[bot.provider]?.models.find(m => m.id === bot.modelId);
                const botColor = bot.color || BOT_COLORS[0];
                const eyeColor = getEyeColorForAvatar(botColor);
                const isImageBot = bot.kind === 'image';
                const studio = window.ImageStudio;
                const modelLabel = isImageBot && studio
                    ? `${studio.imageModelLabel(bot)} · ${studio.IMAGE_PROVIDERS[bot.provider] || bot.provider}`
                    : (modelData?.name || bot.modelId);
                
                const card = document.createElement('div');
                card.className = 'bot-card';
                card.innerHTML = `
                    <div class="bot-card-header">
                        <div class="bot-identity">
                            <div class="bot-card-avatar" style="background-color: ${botColor};">
                                <span class="bot-card-eye" style="background-color: ${eyeColor};"></span>
                                <span class="bot-card-eye" style="background-color: ${eyeColor};"></span>
                                ${isImageBot && studio ? studio.brushMarkup() : ''}
                            </div>
                            <div>
                                <div class="bot-name">${bot.name}</div>
                                <div class="bot-alias">@${bot.alias}</div>
                            </div>
                        </div>
                        <div class="bot-actions">
                            <button class="icon-btn edit-bot" data-id="${bot.id}" aria-label="Edit bot" title="Edit bot">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button class="icon-btn delete-bot" data-id="${bot.id}" aria-label="Delete bot" title="Delete bot">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="bot-model">${modelLabel}${isImageBot ? ' · Image bot' : ''}${bot.isDefault ? ' · Default' : ''}</div>
                `;
                
                card.querySelector('.edit-bot').addEventListener('click', () => editBot(bot.id));
                card.querySelector('.delete-bot').addEventListener('click', () => handleDeleteBot(bot.id));
                
                botsList.appendChild(card);
            }
            lucide.createIcons();
        }

        async function renderProvidersTab() {
            const apiKeys = await getAllApiKeys();
            const providersList = document.getElementById('providers-tab');
            
            // Remove the bots list div if it was added
            let providersContainer = document.getElementById('providers-list');
            if (!providersContainer) {
                providersContainer = document.createElement('div');
                providersContainer.id = 'providers-list';
                providersList.appendChild(providersContainer);
            }
            
            providersContainer.innerHTML = '';
            
            for (const [key, provider] of Object.entries(MODEL_PROVIDERS)) {
                const hasKey = apiKeys.some(k => k.provider === key);
                
                const card = document.createElement('div');
                card.className = 'provider-card';
                card.innerHTML = `
                    <div class="provider-header">
                        <div class="provider-name">${provider.name}</div>
                        <div class="provider-status ${hasKey ? 'configured' : 'not-configured'}">
                            ${hasKey ? 'Configured' : 'Not Configured'}
                        </div>
                    </div>
                    ${hasKey ? `
                        <div class="provider-actions">
                            <button class="btn btn-secondary update-key" data-provider="${key}">Update key</button>
                            <button class="btn btn-danger delete-key" data-provider="${key}">Delete key</button>
                        </div>
                    ` : `
                        <div class="provider-actions">
                            <button class="btn add-key" data-provider="${key}">Add API key</button>
                        </div>
                    `}
                    <div class="api-key-form" id="form-${key}" style="display: none; margin-top: 10px;">
                        <input type="password" class="form-input" placeholder="Enter API key" id="input-${key}">
                        <div class="provider-actions">
                            <button class="btn btn-secondary cancel-key" data-provider="${key}">Cancel</button>
                            <button class="btn save-key" data-provider="${key}">Save</button>
                        </div>
                    </div>
                `;
                
                // Event listeners
                const addBtn = card.querySelector('.add-key');
                const updateBtn = card.querySelector('.update-key');
                const deleteBtn = card.querySelector('.delete-key');
                const saveBtn = card.querySelector('.save-key');
                const cancelBtn = card.querySelector('.cancel-key');
                
                if (addBtn) {
                    addBtn.addEventListener('click', () => {
                        document.getElementById(`form-${key}`).style.display = 'block';
                        addBtn.style.display = 'none';
                    });
                }
                
                if (updateBtn) {
                    updateBtn.addEventListener('click', () => {
                        document.getElementById(`form-${key}`).style.display = 'block';
                        updateBtn.parentElement.style.display = 'none';
                    });
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm(`Delete API key for ${provider.name}?`)) {
                            await deleteApiKey(key);
                            renderProvidersTab();
                        }
                    });
                }
                
                if (saveBtn) {
                    saveBtn.addEventListener('click', async () => {
                        const input = document.getElementById(`input-${key}`);
                        const apiKey = input.value.trim();
                        if (apiKey) {
                            await saveApiKey(key, apiKey);
                            await ensureDefaultBots(key);
                            renderProvidersTab();
                            renderBotsTab();
                        }
                    });
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        document.getElementById(`form-${key}`).style.display = 'none';
                        const addBtn = card.querySelector('.add-key');
                        const updateBtn = card.querySelector('.update-key');
                        if (addBtn) addBtn.style.display = 'block';
                        if (updateBtn) updateBtn.parentElement.style.display = 'flex';
                    });
                }
                
                providersContainer.appendChild(card);
            }
            lucide.createIcons();
        }

        // =============================================
        // BOT FORM
        // =============================================
        // The bot colour field is a native <input type="color"> that the Chromatic
        // picker (chromatic-color-picker.js) upgrades into a wheel + sliders popover.
        function renderBotColorPicker(selectedColor) {
            const picker = document.getElementById('bot-color-picker');
            const colorInput = document.getElementById('bot-color');
            const label = document.getElementById('bot-color-label');

            if (!picker || !colorInput || !label) {
                return;
            }

            const normalized = normalizeHex(selectedColor) || BOT_COLORS[0];

            // Chromatic reads the input's value when it wraps it, so set the value
            // before asking it to initialise.
            colorInput.value = normalized.toLowerCase();
            label.textContent = normalized.toUpperCase();

            if (!picker.dataset.initialized) {
                colorInput.addEventListener('input', () => {
                    label.textContent = normalizeHex(colorInput.value).toUpperCase();
                });
                picker.dataset.initialized = 'true';
            }

            if (window.Chromatic) {
                // Wraps the input on first call; on later calls this repaints the
                // swatch for whichever bot the form just loaded.
                Chromatic.setValue(colorInput, normalized.toLowerCase());
            }
        }

        function renderBotKindBanner(kind) {
            const banner = document.getElementById('bot-kind-banner');
            if (!banner) return;
            const isImageBot = kind === 'image';
            const brush = isImageBot && window.ImageStudio ? ImageStudio.brushMarkup() : '';
            banner.innerHTML = `
                <span class="bot-kind-icon${isImageBot ? ' image' : ''}">
                    <i data-lucide="${isImageBot ? 'image' : 'message-square'}"></i>
                    ${brush}
                </span>
                <span>
                    <strong>${isImageBot ? 'Image bot' : 'Conversation bot'}</strong>
                    ${isImageBot
                        ? ' — paints from a prompt. Reply to one of its images to ask for changes.'
                        : ' — chats with a text model and its own persona.'}
                </span>
            `;
            lucide.createIcons();
        }

        async function showBotForm(bot = null, kind = null) {
            switchSettingsTab('bot-form');
            const botKind = (bot ? bot.kind : kind) === 'image' ? 'image' : 'conversation';
            const isImageBot = botKind === 'image';
            const headerTitle = document.getElementById('settings-header-title');
            if (headerTitle) headerTitle.textContent = `${bot ? 'Edit' : 'New'} ${isImageBot ? 'image bot' : 'bot'}`;

            const form = document.getElementById('bot-form');
            const botsWithColors = await getAllBotsWithColors();
            const initialColor = bot?.color ? normalizeHex(bot.color) : getSuggestedBotColor(botsWithColors);

            const apiKeys = await getAllApiKeys();
            const configuredProviders = apiKeys.map(k => k.provider);

            // ---- conversation bots: provider & model dropdown ----
            const modelSelect = document.getElementById('bot-model');
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            
            for (const [providerKey, provider] of Object.entries(MODEL_PROVIDERS)) {
                if (!configuredProviders.includes(providerKey)) continue;
                
                const optgroup = document.createElement('optgroup');
                optgroup.label = provider.name;
                
                provider.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ provider: providerKey, modelId: model.id });
                    option.textContent = model.name;
                    optgroup.appendChild(option);
                });

                // gateways let a bot point at any slug they publish
                if (provider.allowsCustomModel) {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ provider: providerKey, custom: true });
                    option.textContent = 'Custom model slug…';
                    optgroup.appendChild(option);
                }

                modelSelect.appendChild(optgroup);
            }

            const slugGroup = document.getElementById('model-slug-group');
            const slugInput = document.getElementById('bot-model-slug');
            const syncSlugField = () => {
                let isCustom = false;
                try {
                    isCustom = Boolean(JSON.parse(modelSelect.value || '{}').custom);
                } catch (parseErr) { /* placeholder option */ }
                slugGroup.style.display = !isImageBot && isCustom ? '' : 'none';
                slugInput.required = !isImageBot && isCustom;
            };
            modelSelect.onchange = syncSlugField;

            // ---- image bots: Gemini or an OpenRouter slug ----
            const studio = window.ImageStudio;
            const imageProviders = studio ? studio.IMAGE_PROVIDERS : { google: 'Gemini', openrouter: 'OpenRouter' };
            const geminiPresets = studio ? studio.GEMINI_IMAGE_MODELS : [];
            const imageProvider = document.getElementById('bot-image-provider');
            const imageModel = document.getElementById('bot-image-model');
            const imageCustom = document.getElementById('bot-image-custom-model');
            const imageSlug = document.getElementById('bot-image-slug');

            imageProvider.innerHTML = '';
            for (const [key, label] of Object.entries(imageProviders)) {
                const option = document.createElement('option');
                const hasKey = configuredProviders.includes(key);
                option.value = key;
                option.textContent = hasKey ? label : `${label} (add an API key first)`;
                option.disabled = !hasKey;
                imageProvider.appendChild(option);
            }
            imageModel.innerHTML = '';
            geminiPresets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.id;
                option.textContent = preset.name;
                imageModel.appendChild(option);
            });
            const customOption = document.createElement('option');
            customOption.value = '__custom__';
            customOption.textContent = 'Custom model id…';
            imageModel.appendChild(customOption);

            const syncImageFields = () => {
                const provider = imageProvider.value;
                const isGoogle = provider === 'google';
                const isCustom = isGoogle && imageModel.value === '__custom__';
                document.getElementById('image-model-group').style.display = isImageBot && isGoogle ? '' : 'none';
                document.getElementById('image-custom-model-group').style.display = isImageBot && isCustom ? '' : 'none';
                document.getElementById('image-slug-group').style.display = isImageBot && provider === 'openrouter' ? '' : 'none';
                imageCustom.required = isImageBot && isCustom;
                imageSlug.required = isImageBot && provider === 'openrouter';
            };
            imageProvider.onchange = syncImageFields;
            imageModel.onchange = syncImageFields;

            const firstUsableProvider = [...imageProvider.options].find(option => !option.disabled)?.value || '';

            // ---- fields that differ by kind ----
            document.getElementById('model-group').style.display = isImageBot ? 'none' : '';
            document.getElementById('image-provider-group').style.display = isImageBot ? '' : 'none';
            modelSelect.required = !isImageBot;
            const promptField = document.getElementById('bot-prompt');
            promptField.required = !isImageBot;
            document.getElementById('bot-prompt-label').textContent = isImageBot ? 'Style notes (optional)' : 'System Prompt';
            promptField.placeholder = isImageBot
                ? 'Soft natural light, film grain, muted palette…'
                : 'You are a concise writing partner. Ask a clarifying question before drafting.';
            renderBotKindBanner(botKind);

            // Populate form if editing
            if (bot) {
                // a missing field must leave the input empty, not spell out "undefined"
                document.getElementById('bot-name').value = bot.name ?? '';
                document.getElementById('bot-alias').value = bot.alias ?? '';
                document.getElementById('bot-prompt').value = bot.systemPrompt ?? '';

                if (isImageBot) {
                    // an existing bot stays editable even if its key was removed
                    const own = [...imageProvider.options].find(option => option.value === bot.provider);
                    if (own) own.disabled = false;
                    imageProvider.value = own ? bot.provider : firstUsableProvider;
                    if (bot.provider === 'google') {
                        const isPreset = geminiPresets.some(preset => preset.id === bot.modelId);
                        imageModel.value = isPreset ? bot.modelId : '__custom__';
                        imageCustom.value = isPreset ? '' : (bot.modelId || '');
                        imageSlug.value = '';
                    } else {
                        imageModel.value = geminiPresets[0]?.id || '__custom__';
                        imageCustom.value = '';
                        imageSlug.value = bot.modelId || '';
                    }
                    modelSelect.value = '';
                    slugInput.value = '';
                } else {
                    const presetValue = JSON.stringify({ provider: bot.provider, modelId: bot.modelId });
                    const isPreset = [...modelSelect.options].some(opt => opt.value === presetValue);
                    if (isPreset) {
                        modelSelect.value = presetValue;
                        slugInput.value = '';
                    } else {
                        // a slug typed in by hand — reselect the custom entry
                        modelSelect.value = JSON.stringify({ provider: bot.provider, custom: true });
                        slugInput.value = bot.modelId || '';
                    }
                }
                renderBotColorPicker(normalizeHex(bot.color) || initialColor);

                form.dataset.editingId = bot.id;
            } else {
                form.reset();
                slugInput.value = '';
                delete form.dataset.editingId;
                renderBotColorPicker(initialColor);
                imageProvider.value = firstUsableProvider;
                imageModel.value = geminiPresets[0]?.id || '__custom__';
                imageCustom.value = '';
                imageSlug.value = '';
            }

            // form.reset() puts the hidden field back to its markup default
            document.getElementById('bot-kind').value = botKind;
            syncSlugField();
            syncImageFields();
        }

        async function editBot(id) {
            const bot = await getBot(id);
            showBotForm(bot);
        }

        async function handleDeleteBot(id) {
            if (confirm('Are you sure you want to delete this bot?')) {
                await deleteBot(id);
                renderBotsTab();
            }
        }

        async function handleBotFormSubmit(e) {
            e.preventDefault();
            const form = document.getElementById('bot-form');
            const isImageBot = document.getElementById('bot-kind').value === 'image';

            const name = document.getElementById('bot-name').value.trim();
            const alias = document.getElementById('bot-alias').value.trim().toLowerCase();
            if (!name || !alias) {
                alert('Please fill in the bot name and alias.');
                return;
            }

            let provider;
            let modelId;
            if (isImageBot) {
                provider = document.getElementById('bot-image-provider').value;
                if (!provider) {
                    alert('Add a Gemini or OpenRouter API key before creating an image bot.');
                    return;
                }
                if (provider === 'google') {
                    const picked = document.getElementById('bot-image-model').value;
                    modelId = picked === '__custom__'
                        ? document.getElementById('bot-image-custom-model').value.trim()
                        : picked;
                } else {
                    modelId = document.getElementById('bot-image-slug').value.trim();
                }
                if (!modelId) {
                    alert(provider === 'google'
                        ? 'Enter a Gemini image model id, for example gemini-2.5-flash-image'
                        : 'Enter an OpenRouter model slug, for example google/gemini-2.5-flash-image');
                    return;
                }
            } else {
                const modelValue = document.getElementById('bot-model').value;
                if (!modelValue) {
                    alert('Please select a model before saving.');
                    return;
                }
                
                let modelData;
                try {
                    modelData = JSON.parse(modelValue);
                } catch (parseErr) {
                    alert('Invalid model selection. Please choose a model.');
                    return;
                }
                
                provider = modelData.provider;
                modelId = modelData.modelId;
                if (modelData.custom) {
                    modelId = document.getElementById('bot-model-slug').value.trim();
                    if (!modelId) {
                        alert('Enter a model slug, for example anthropic/claude-sonnet-5');
                        return;
                    }
                }
            }

            const bot = {
                name,
                alias,
                modelId,
                provider,
                systemPrompt: document.getElementById('bot-prompt').value.trim(),
                color: normalizeHex(document.getElementById('bot-color').value) || BOT_COLORS[0]
            };
            if (isImageBot) bot.kind = 'image';
            
            const editingId = form.dataset.editingId;
            if (editingId) {
                const existing = await getBot(parseInt(editingId));
                Object.assign(bot, { ...existing, ...bot, id: parseInt(editingId) });
                if (!isImageBot) delete bot.kind;
            }

            // an image bot only saves once its model is known to output images
            if (isImageBot && window.ImageStudio) {
                const submitBtn = form.querySelector('button[type="submit"]');
                const label = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying model…';
                let verdict;
                try {
                    verdict = await ImageStudio.validateImageModel(provider, modelId);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = label;
                }
                if (!verdict.ok) {
                    alert(verdict.reason);
                    return;
                }
                if (verdict.uncertain && !confirm(`${verdict.reason}\n\nSave the bot anyway?`)) {
                    return;
                }
            }
            
            try {
                await saveBot(bot);
                switchSettingsTab('bots');
                renderBotsTab();
            } catch (saveErr) {
                if (saveErr.name === 'ConstraintError') {
                    alert(`A bot with alias "@${bot.alias}" already exists. Please choose a different alias.`);
                } else {
                    alert('Failed to save bot: ' + saveErr.message);
                }
            }
        }

        function handleBotSearch(e) {
            const searchTerm = e.target.value.toLowerCase();
            const botCards = document.querySelectorAll('.bot-card');
            
            botCards.forEach(card => {
                const name = card.querySelector('.bot-name').textContent.toLowerCase();
                const alias = card.querySelector('.bot-alias').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || alias.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function getConversationRecord(conversationId) {
            if (incognitoConversationIds.has(conversationId)) {
                return Promise.resolve(ephemeralConversations.get(conversationId));
            }

            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readonly');
                const request = tx.objectStore('conversations').get(conversationId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        /* Conversations are born with an auto-generated `conversation-N` name, which
           is a placeholder rather than something the user chose. The sidebar shows a
           real name when there is one and falls back to the message preview until
           then. */
        const AUTO_CONVERSATION_NAME = /^conversation-\d+$/;

        function getCustomConversationName(conversation) {
            const name = (conversation?.name || '').trim();
            return name && !AUTO_CONVERSATION_NAME.test(name) ? name : '';
        }

        function getConversationLabel(conversation) {
            return getCustomConversationName(conversation)
                || conversation?.preview
                || 'New conversation';
        }

        async function updateConversationName(conversationId, name) {
            const conversation = await getConversationRecord(conversationId);
            if (!conversation) return;

            conversation.name = name;
            if (incognitoConversationIds.has(conversationId)) {
                ephemeralConversations.set(conversationId, conversation);
                return;
            }

            await new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readwrite');
                tx.objectStore('conversations').put(conversation);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }

        /* Single entry point for a rename, wherever it was typed: persist it, then
           push the new name back out to the header and the sidebar so the two can't
           drift apart. */
        async function renameConversation(conversationId, name) {
            await updateConversationName(conversationId, name);

            if (String(currentConversationId) === String(conversationId)) {
                const headerTitle = document.querySelector('#chat-header h3');
                if (headerTitle && headerTitle.textContent !== name) headerTitle.textContent = name;
            }

            await loadConversations();
        }

        function setupEditableConversationTitle(title, conversation, options = {}) {
            const conversationId = conversation.id ?? currentConversationId;
            const { placeholder = '' } = options;
            let originalName = title.textContent;
            let cancelEdit = false;

            title.addEventListener('dblclick', () => {
                // a placeholder (message preview) isn't the name — start from empty
                originalName = title.dataset.placeholder === 'true' ? '' : title.textContent;
                cancelEdit = false;
                title.textContent = originalName;
                title.contentEditable = 'plaintext-only';
                title.focus();

                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(title);
                selection.removeAllRanges();
                selection.addRange(range);
            });

            title.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    title.blur();
                } else if (event.key === 'Escape') {
                    cancelEdit = true;
                    title.textContent = originalName;
                    title.blur();
                }
            });

            title.addEventListener('blur', async () => {
                if (title.contentEditable === 'false') return;
                title.contentEditable = 'false';
                const typed = title.textContent.trim();
                const nextName = cancelEdit ? originalName : typed || originalName;

                if (cancelEdit || nextName === originalName) {
                    // restore whatever the label was showing before the edit began
                    title.textContent = originalName || placeholder;
                    title.dataset.placeholder = originalName ? 'false' : 'true';
                    return;
                }

                title.textContent = nextName;
                title.dataset.placeholder = 'false';
                await renameConversation(conversationId, nextName);
            });
        }

        function removeConversationFromDatabase(conversationId) {
            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations', 'messages'], 'readwrite');
                tx.objectStore('conversations').delete(conversationId);
                const messageIndex = tx.objectStore('messages').index('conversationId');
                const cursorRequest = messageIndex.openKeyCursor(IDBKeyRange.only(conversationId));
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor) return;
                    tx.objectStore('messages').delete(cursor.primaryKey);
                    cursor.continue();
                };
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        }

        async function deleteConversation(conversationId) {
            if (incognitoConversationIds.has(conversationId)) {
                incognitoConversationIds.delete(conversationId);
                ephemeralConversations.delete(conversationId);
                ephemeralMessages.delete(conversationId);
            } else {
                await removeConversationFromDatabase(conversationId);
            }

            if (currentConversationId === conversationId) {
                currentConversationId = null;
                document.getElementById('active-chat').style.display = 'none';
                document.getElementById('empty-state').style.display = 'flex';
            }
            await loadConversations();
        }

        async function forkConversation(conversationId) {
            const sourceConversation = await getConversationRecord(conversationId);
            if (!sourceConversation) return;

            const sourceMessages = await getStoredConversationMessages(conversationId);
            const fork = {
                name: `${sourceConversation.name} (fork)`,
                createdAt: Date.now(),
                preview: sourceConversation.preview || '',
                forkedFrom: {
                    id: conversationId,
                    name: sourceConversation.name
                }
            };

            if (incognitoConversationIds.has(conversationId)) {
                const forkId = `incognito-${Date.now()}`;
                fork.id = forkId;
                incognitoConversationIds.add(forkId);
                ephemeralConversations.set(forkId, fork);
                ephemeralMessages.set(forkId, sourceMessages.map(message => ({
                    ...message,
                    conversationId: forkId
                })));
                await loadConversations();
                await openConversation(forkId);
                return;
            }

            const newId = await new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readwrite');
                const request = tx.objectStore('conversations').add(fork);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (sourceMessages.length) {
                await new Promise((resolve, reject) => {
                    const tx = messagesDB.transaction(['messages'], 'readwrite');
                    const store = tx.objectStore('messages');
                    sourceMessages.forEach(message => {
                        const copy = { ...message, conversationId: newId };
                        delete copy.id;
                        store.add(copy);
                    });
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }

            await loadConversations();
            await openConversation(newId);
        }

        function showIncognitoConfirmation() {
            if (incognitoPromptDisabled) return Promise.resolve(true);

            const overlay = document.getElementById('incognito-confirm-overlay');
            const confirmButton = document.getElementById('incognito-confirm-btn');
            const cancelButton = document.getElementById('incognito-cancel-btn');
            const closeButton = document.getElementById('incognito-confirm-close');
            const dontAsk = document.getElementById('incognito-dont-ask');
            dontAsk.checked = false;
            overlay.classList.add('open');

            return new Promise(resolve => {
                const finish = async confirmed => {
                    overlay.classList.remove('open');
                    confirmButton.removeEventListener('click', confirm);
                    cancelButton.removeEventListener('click', cancel);
                    closeButton.removeEventListener('click', cancel);
                    if (confirmed && dontAsk.checked) {
                        incognitoPromptDisabled = true;
                        await saveSetting('incognitoPromptDisabled', true);
                    }
                    resolve(confirmed);
                };
                const confirm = () => finish(true);
                const cancel = () => finish(false);
                confirmButton.addEventListener('click', confirm);
                cancelButton.addEventListener('click', cancel);
                closeButton.addEventListener('click', cancel);
            });
        }

        async function enableIncognito(conversationId) {
            if (incognitoConversationIds.has(conversationId)) return true;
            if (!await showIncognitoConfirmation()) return false;

            const [conversation, messages] = await Promise.all([
                getConversationRecord(conversationId),
                getStoredConversationMessages(conversationId)
            ]);
            if (!conversation) return false;

            ephemeralConversations.set(conversationId, conversation);
            ephemeralMessages.set(conversationId, messages);
            incognitoConversationIds.add(conversationId);
            await removeConversationFromDatabase(conversationId);
            await loadConversations();
            const activeItem = Array.from(document.querySelectorAll('.conversation-item'))
                .find(item => String(item.dataset.id) === String(conversationId));
            activeItem?.classList.add('active');
            return true;
        }

        async function disableIncognito(conversationId) {
            const conversation = ephemeralConversations.get(conversationId);
            const messages = ephemeralMessages.get(conversationId) || [];
            if (!conversation) return;

            await new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations', 'messages'], 'readwrite');
                tx.objectStore('conversations').put(conversation);
                const messageStore = tx.objectStore('messages');
                messages.forEach(message => messageStore.put(message));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            incognitoConversationIds.delete(conversationId);
            ephemeralConversations.delete(conversationId);
            ephemeralMessages.delete(conversationId);
            await loadConversations();
        }

        async function handleIncognitoToggle(event) {
            const toggle = event.target;
            if (toggle.checked) {
                const enabled = await enableIncognito(currentConversationId);
                toggle.checked = enabled;
            } else {
                await disableIncognito(currentConversationId);
            }
            document.getElementById('incognito-control')?.classList.toggle('active', toggle.checked);
        }

        let dangerResetMode = null;
        let dangerHoldTimer = null;

        function openDangerConfirmation(mode) {
            dangerResetMode = mode;
            const everything = mode === 'everything';
            document.getElementById('danger-confirm-title').textContent = everything ? 'Delete everything?' : 'Delete all chats?';
            document.getElementById('danger-confirm-description').textContent = everything
                ? 'This removes chats, memories, bots, settings, and API keys from this browser.'
                : 'This removes every conversation and memory, while keeping your API keys and bots.';
            document.getElementById('danger-confirm-input').value = '';
            updateDangerConfirmationState();
            document.getElementById('danger-confirm-overlay').classList.add('open');
            document.getElementById('danger-confirm-input').focus();
        }

        function closeDangerConfirmation() {
            clearTimeout(dangerHoldTimer);
            dangerHoldTimer = null;
            dangerResetMode = null;
            const button = document.getElementById('danger-hold-btn');
            button.classList.remove('holding');
            document.getElementById('danger-confirm-overlay').classList.remove('open');
        }

        function updateDangerConfirmationState() {
            const confirmed = document.getElementById('danger-confirm-input').value.trim() === 'DELETE';
            document.getElementById('danger-hold-btn').disabled = !confirmed;
        }

        async function clearObjectStores(database, storeNames) {
            if (!storeNames.length) return;
            await new Promise((resolve, reject) => {
                const tx = database.transaction(storeNames, 'readwrite');
                storeNames.forEach(storeName => tx.objectStore(storeName).clear());
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }

        async function performDangerReset() {
            const deleteEverything = dangerResetMode === 'everything';
            await clearObjectStores(messagesDB, ['conversations', 'messages']);
            await clearObjectStores(memoryDB, ['memories']);
            await clearObjectStores(ltmDB, ['lt_memories', 'clusters']);
            if (deleteEverything) {
                await clearObjectStores(configDB, ['apiKeys', 'bots', 'settings']);
                incognitoPromptDisabled = false;
            }

            incognitoConversationIds.clear();
            ephemeralConversations.clear();
            ephemeralMessages.clear();
            currentConversationId = null;
            closeDangerConfirmation();
            closeSettingsPanel();
            document.getElementById('active-chat').style.display = 'none';
            document.getElementById('empty-state').style.display = 'flex';
            await loadConversations();
            if (deleteEverything) showSetupModal();
        }

        function setupDangerHoldButton() {
            const button = document.getElementById('danger-hold-btn');
            const startHold = event => {
                if (button.disabled) return;
                event.preventDefault();
                button.classList.add('holding');
                dangerHoldTimer = setTimeout(performDangerReset, 1600);
            };
            const cancelHold = () => {
                clearTimeout(dangerHoldTimer);
                dangerHoldTimer = null;
                button.classList.remove('holding');
            };
            button.addEventListener('pointerdown', startHold);
            button.addEventListener('pointerup', cancelHold);
            button.addEventListener('pointerleave', cancelHold);
            button.addEventListener('pointercancel', cancelHold);
        }

        // =============================================
        // CONVERSATION MANAGEMENT
        // =============================================
        async function loadConversations() {
            const storedConversations = await new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readonly');
                const request = tx.objectStore('conversations').getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
            renderConversationList([...storedConversations, ...ephemeralConversations.values()]);
        }

        function renderConversationList(conversations) {
            const conversationList = document.getElementById('conversation-list');
            conversationList.innerHTML = '';
            
            conversations.sort((a, b) => b.createdAt - a.createdAt);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let currentDate = null;
            
            conversations.forEach(conversation => {
                const conversationDate = new Date(conversation.createdAt);
                conversationDate.setHours(0, 0, 0, 0);
                
                if (!currentDate || currentDate.getTime() !== conversationDate.getTime()) {
                    currentDate = conversationDate;
                    
                    const dateSeparator = document.createElement('div');
                    dateSeparator.className = 'date-separator';
                    
                    let dateText;
                    if (conversationDate.getTime() === today.getTime()) {
                        dateText = 'Today';
                    } else if (conversationDate.getTime() === yesterday.getTime()) {
                        dateText = 'Yesterday';
                    } else {
                        dateText = conversationDate.toLocaleDateString('en-US', { 
                            day: 'numeric', 
                            month: 'short'
                        });
                    }
                    
                    dateSeparator.textContent = dateText;
                    conversationList.appendChild(dateSeparator);
                }
                
                const conversationItem = document.createElement('div');
                conversationItem.className = 'conversation-item';
                conversationItem.dataset.id = conversation.id;
                if (incognitoConversationIds.has(conversation.id)) conversationItem.classList.add('incognito');
                if (String(currentConversationId) === String(conversation.id)) conversationItem.classList.add('active');
                
                const customName = getCustomConversationName(conversation);
                const labelText = getConversationLabel(conversation);
                conversationItem.innerHTML = `
                    <div class="avatar"></div>
                    <div class="conversation-info">
                        <div class="conversation-label" spellcheck="false" contenteditable="false" aria-label="Conversation name"></div>
                    </div>
                    <button class="conversation-more" aria-label="Conversation actions" title="Conversation actions"><i data-lucide="ellipsis"></i></button>
                    <div class="conversation-menu">
                        <button data-action="fork"><i data-lucide="split"></i><span>Fork</span></button>
                        <button data-action="delete" class="delete"><span>Delete</span></button>
                    </div>
                `;
                const avatarEl = conversationItem.querySelector('.avatar');
                const symbol = getConversationSymbol(conversation.id);
                if (window.SymbolPicker) {
                    SymbolPicker.render(avatarEl, symbol, symbol.color);
                } else {
                    avatarEl.textContent = symbol.value;
                }
                bindSymbolPicker(avatarEl, conversation.id);

                const label = conversationItem.querySelector('.conversation-label');
                label.textContent = labelText;
                label.title = labelText;
                // no name yet: the label is standing in with the message preview
                label.dataset.placeholder = customName ? 'false' : 'true';
                setupEditableConversationTitle(label, conversation, {
                    placeholder: conversation.preview || 'New conversation'
                });

                conversationItem.addEventListener('click', event => {
                    if (event.target.closest('.conversation-more, .conversation-menu, .avatar')) return;
                    // clicking into the label while renaming shouldn't reopen the chat
                    if (label.contentEditable !== 'false' && event.target.closest('.conversation-label')) return;
                    openConversation(conversation.id);
                });

                const moreButton = conversationItem.querySelector('.conversation-more');
                const menu = conversationItem.querySelector('.conversation-menu');
                moreButton.addEventListener('click', event => {
                    event.stopPropagation();
                    document.querySelectorAll('.conversation-menu.open').forEach(openMenu => {
                        if (openMenu !== menu) openMenu.classList.remove('open');
                    });
                    const buttonRect = moreButton.getBoundingClientRect();
                    menu.style.position = 'fixed';
                    menu.style.top = `${buttonRect.bottom + 4}px`;
                    menu.style.left = `${Math.max(8, buttonRect.right - 148)}px`;
                    menu.style.right = 'auto';
                    menu.classList.toggle('open');
                });
                menu.querySelector('[data-action="fork"]').addEventListener('click', event => {
                    event.stopPropagation();
                    menu.classList.remove('open');
                    forkConversation(conversation.id);
                });
                menu.querySelector('[data-action="delete"]').addEventListener('click', event => {
                    event.stopPropagation();
                    menu.classList.remove('open');
                    if (confirm('Delete this conversation?')) deleteConversation(conversation.id);
                });
                
                conversationList.appendChild(conversationItem);
            });
            lucide.createIcons();
        }

        async function createNewConversation() {
            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readwrite');
                const store = tx.objectStore('conversations');
                const countRequest = store.count();
                
                countRequest.onsuccess = () => {
                    const count = countRequest.result;
                    const newConversation = {
                        name: `conversation-${count + 1}`,
                        createdAt: Date.now(),
                        preview: ''
                    };
                    
                    const addRequest = store.add(newConversation);
                    addRequest.onsuccess = async () => {
                        const id = addRequest.result;
                        await loadConversations();
                        await openConversation(id);
                        resolve(id);
                    };
                    addRequest.onerror = () => reject(addRequest.error);
                };
                countRequest.onerror = () => reject(countRequest.error);
            });
        }

        async function openConversation(conversationId) {
            if (window.ImageStudio && String(currentConversationId) !== String(conversationId)) {
                ImageStudio.closeCanvas();
            }
            currentConversationId = conversationId;
                
            const allConversations = document.querySelectorAll('.conversation-item');
            allConversations.forEach(item => item.classList.remove('active'));
                
            const selectedConversation = Array.from(allConversations).find(item => String(item.dataset.id) === String(conversationId));
            if (selectedConversation) selectedConversation.classList.add('active');
                
            const conversation = await getConversationRecord(conversationId);
            if (conversation) {
                document.getElementById('empty-state').style.display = 'none';
                document.getElementById('active-chat').style.display = 'flex';
                document.getElementById('chat-header').innerHTML = `
                    <div class="chat-title-group">
                        <div class="chat-avatar" data-id="${conversationId}"></div>
                        <h3 contenteditable="false" spellcheck="false" aria-label="Conversation title"></h3>
                    </div>
                    <div class="chat-header-tools">
                            <div class="view-mode-toggle" id="view-mode-toggle" data-mode="chat" role="tablist" aria-label="Chat view mode">
                                <div class="view-mode-thumb"></div>
                                <button type="button" class="view-mode-option active" data-mode="chat" role="tab" aria-selected="true">Chat</button>
                                <button type="button" class="view-mode-option" data-mode="canvas" role="tab" aria-selected="false">Canvas</button>
                                <div class="canvas-mode-popover" id="canvas-mode-popover">
                                    <div class="canvas-mode-popover-title">Canvas</div>
                                    <div class="canvas-mode-popover-body">
                                        A canvas view for chat doesn't exist yet — the idea of rendering a linear conversation as spatial nodes instead of a scrolling thread, is more of a use case driven utility because the sort of branching and spatial relationship for one line of thought might not correlate with the next one. <br/><br/>
                                        
                                        In the meantime, try these other prototypes exploring the same branching, spatial-thought paradigm:
                                    </div>
                                    <div class="canvas-mode-popover-links">
                                        <a class="canvas-mode-popover-link" href="https://ducktape.shuvam.xyz" target="_blank" rel="noopener">
                                            <div class="canvas-mode-popover-link-text">
                                                <span class="canvas-mode-popover-link-name">Duck Tape</span>
                                                <span class="canvas-mode-popover-link-desc">ducktape.shuvam.xyz</span>
                                            </div>
                                            <i data-lucide="external-link"></i>
                                        </a>
                                        <a class="canvas-mode-popover-link" href="https://brunch.shuvam.xyz" target="_blank" rel="noopener">
                                            <div class="canvas-mode-popover-link-text">
                                                <span class="canvas-mode-popover-link-name">Brunch</span>
                                                <span class="canvas-mode-popover-link-desc">brunch.shuvam.xyz</span>
                                            </div>
                                            <i data-lucide="external-link"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div class="context-pill" id="context-pill">
                                <span id="context-pill-pct">0%</span>
                                <div class="context-pill-bar">
                                    <div class="context-pill-fill" id="context-pill-fill" style="width: 0%"></div>
                                </div>
                                <div class="context-pill-popover">
                                    <div class="context-popover-row">
                                        <span class="label">Tokens In</span>
                                        <span class="value" id="context-tokens-in">0</span>
                                    </div>
                                    <div class="context-popover-row">
                                        <span class="label">Tokens Out</span>
                                        <span class="value" id="context-tokens-out">0</span>
                                    </div>
                                    <div class="context-popover-row">
                                        <span class="label">Context Window</span>
                                        <span class="value" id="context-window-size">—</span>
                                    </div>
                                </div>
                            </div>
                        <label class="incognito-control${incognitoConversationIds.has(conversationId) ? ' active' : ''}" id="incognito-control" title="Keep this chat only until the tab closes">
                            <i data-lucide="venetian-mask"></i>
                            <input type="checkbox" id="incognito-toggle" ${incognitoConversationIds.has(conversationId) ? 'checked' : ''}>
                                <span class="ui-toggle-switch" aria-hidden="true"></span>
                        </label>
                    </div>
                `;
                const title = document.querySelector('#chat-header h3');
                title.textContent = conversation.name;
                setupEditableConversationTitle(title, conversation);

                const headerAvatar = document.querySelector('#chat-header .chat-avatar');
                if (headerAvatar) {
                    const headerSymbol = getConversationSymbol(conversationId);
                    if (window.SymbolPicker) {
                        SymbolPicker.render(headerAvatar, headerSymbol, headerSymbol.color);
                    } else {
                        headerAvatar.textContent = headerSymbol.value;
                    }
                    bindSymbolPicker(headerAvatar, conversationId);
                }
                if (conversation.forkedFrom) {
                    const forkBadge = document.createElement('button');
                    forkBadge.className = 'fork-badge';
                    forkBadge.title = `Open original chat: ${conversation.forkedFrom.name}`;
                    forkBadge.innerHTML = `<i data-lucide="split"></i><span>Fork</span>`;
                    forkBadge.addEventListener('click', async () => {
                        const original = await getConversationRecord(conversation.forkedFrom.id);
                        if (original) openConversation(conversation.forkedFrom.id);
                    });
                    document.querySelector('.chat-title-group').appendChild(forkBadge);
                }
                document.getElementById('incognito-toggle').addEventListener('change', handleIncognitoToggle);
                setupViewModeToggle();
                lucide.createIcons();
                await loadMessages(conversationId);
                await updateContextPill();
                document.getElementById('editor').focus();
            }
        }

        /* Canvas isn't a working view yet — selecting it is really "show me the
           explainer," so the segmented control only holds that selection while
           the popover is open. Closing it (outside click, Escape, or clicking
           Chat) snaps the control back to Chat. */
        function closeCanvasModePopover() {
            const toggle = document.getElementById('view-mode-toggle');
            if (!toggle || !toggle.classList.contains('popover-open')) return;

            toggle.classList.remove('popover-open');
            toggle.dataset.mode = 'chat';
            const chatBtn = toggle.querySelector('.view-mode-option[data-mode="chat"]');
            const canvasBtn = toggle.querySelector('.view-mode-option[data-mode="canvas"]');
            chatBtn?.classList.add('active');
            chatBtn?.setAttribute('aria-selected', 'true');
            canvasBtn?.classList.remove('active');
            canvasBtn?.setAttribute('aria-selected', 'false');
        }

        function setupViewModeToggle() {
            const toggle = document.getElementById('view-mode-toggle');
            if (!toggle) return;

            const chatBtn = toggle.querySelector('.view-mode-option[data-mode="chat"]');
            const canvasBtn = toggle.querySelector('.view-mode-option[data-mode="canvas"]');

            chatBtn.addEventListener('click', () => closeCanvasModePopover());

            canvasBtn.addEventListener('click', () => {
                if (toggle.classList.contains('popover-open')) {
                    closeCanvasModePopover();
                    return;
                }
                toggle.dataset.mode = 'canvas';
                toggle.classList.add('popover-open');
                chatBtn.classList.remove('active');
                chatBtn.setAttribute('aria-selected', 'false');
                canvasBtn.classList.add('active');
                canvasBtn.setAttribute('aria-selected', 'true');
            });
        }

        async function loadMessages(conversationId) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = '';
            const messages = await getStoredConversationMessages(conversationId);
            messages.sort((a, b) => a.timestamp - b.timestamp);
            messages.forEach(message => renderMessage(message));
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function getEyeColorForAvatar(hexColor) {
            const tone = getContrastTone(hexColor);
            return tone === 'light' ? '#FFFFFF' : '#1a1a1a';
        }

        // Image bots hold a paintbrush wherever their face shows up.
        function createBotFaceAvatar(botColor, kind = null) {
            const color = normalizeHex(botColor) || '#4285F4';
            const eyeColor = getEyeColorForAvatar(color);
            const avatar = document.createElement('div');
            avatar.className = 'bot-face-avatar';
            avatar.style.backgroundColor = color;
            const brush = kind === 'image' && window.ImageStudio ? ImageStudio.brushMarkup() : '';
            avatar.innerHTML = `
                <div class="bot-eye left" style="background-color: ${eyeColor};"></div>
                <div class="bot-eye right" style="background-color: ${eyeColor};"></div>
                ${brush}
            `;
            return avatar;
        }

        // Opens or closes a message's action menu. The trigger is pinned visible
        // for as long as the menu is open, via an explicit class rather than a
        // :has() rule, which does not reliably re-invalidate on later toggles.
        function setMessageMenuOpen(dropdown, open) {
            if (!dropdown) return;
            dropdown.classList.toggle('active', open);
            const actions = dropdown.closest('.message-actions');
            if (actions) actions.classList.toggle('menu-open', open);
        }

        // `into` re-renders the message inside an existing container (used to
        // turn the painting placeholder into the finished image without a jump).
        function renderMessage(message, into = null) {
            const messageContainer = into || document.createElement('div');
            messageContainer.className = `message-container ${message.sender}`;
            if (into) {
                messageContainer.innerHTML = '';
                messageContainer.classList.add('no-appear');
            }
            messageContainer.dataset.id = message.id;
            
            // Add bot face avatar for bot messages
            if (message.sender === 'bot') {
                const avatar = createBotFaceAvatar(message.botColor, message.botKind);
                messageContainer.appendChild(avatar);
            }

            const studio = window.ImageStudio;
            const isImage = Boolean(message.image) && Boolean(studio);
            const messageElem = document.createElement('div');
            messageElem.className = `message ${message.sender}${isImage ? ' image-message' : ''}`;

            if (message.fontSize) {
                messageElem.style.fontSize = `${message.fontSize}px`;
            }
            
            // Bot messages: no background, text inherits default colour
            // The bot colour is used for the avatar circle only
            
            let messageContent = message.html || message.text;
            const timeString = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let body;
            if (isImage) {
                body = studio.imageFrameMarkup(message);
                if (message.text) body += `<div class="message-content image-caption">${studio.escapeHtml(message.text)}</div>`;
            } else {
                const isReply = message.replyTo != null || Boolean(message.replyToText);
                const chip = message.sender === 'user' && isReply && studio ? studio.replyChipMarkup(message) : '';
                body = `${chip}<div class="message-content">${messageContent}</div>`;
            }
            
            messageElem.innerHTML = `
                <div class="message-actions">
                    <button class="message-actions-btn">⋯</button>
                    <div class="message-actions-dropdown">
                        <button type="button" class="message-action-item" data-action="reply"><span>Reply</span></button>
                    </div>
                </div>
                ${body}
                <div class="message-time">${timeString}</div>
            `;
            
            messageContainer.appendChild(messageElem);
            if (!into) document.getElementById('chat-messages').appendChild(messageContainer);
            if (isImage) studio.bindImageFrame(messageElem, message);
            
            const actionsBtn = messageElem.querySelector('.message-actions-btn');
            const actionsDropdown = messageElem.querySelector('.message-actions-dropdown');
            const replyAction = messageElem.querySelector('[data-action="reply"]');
            
            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasOpen = actionsDropdown.classList.contains('active');
                // only one message menu stays open at a time
                document.querySelectorAll('.message-actions-dropdown.active').forEach(menu => {
                    if (menu !== actionsDropdown) setMessageMenuOpen(menu, false);
                });
                setMessageMenuOpen(actionsDropdown, !wasOpen);
            });

            replyAction.addEventListener('click', (e) => {
                e.stopPropagation();
                setMessageMenuOpen(actionsDropdown, false);
                showReplyPreview(message);
            });

            document.addEventListener('click', () => {
                setMessageMenuOpen(actionsDropdown, false);
            });
        }

        // The image being replied to, so the outgoing message can carry a
        // thumbnail of it (the full image stays with the original message).
        let pendingReplyImage = null;

        function showReplyPreview(message) {
            const replyPreview = document.getElementById('reply-preview');
            const replyPreviewText = document.getElementById('reply-preview-text');
            
            replyPreview.classList.add('active');
            replyPreview.dataset.replyTo = message.id;

            if (message.image && window.ImageStudio) {
                const who = ImageStudio.escapeHtml(message.botName || 'the bot');
                const prompt = message.imagePrompt || '';
                const detail = prompt ? ` · ${ImageStudio.escapeHtml(prompt.length > 40 ? prompt.slice(0, 39) + '…' : prompt)}` : '';
                replyPreviewText.classList.add('has-thumb');
                replyPreviewText.innerHTML = `<img class="reply-preview-thumb" src="${message.image}" alt=""><span>Replying to ${who}'s image${detail}</span>`;
                replyPreview.dataset.replyToText = prompt ? `image: ${prompt}` : 'image';
                pendingReplyImage = message.image;
            } else {
                replyPreviewText.classList.remove('has-thumb');
                let previewText = message.text || '';
                if (previewText.length > 50) {
                    previewText = previewText.substring(0, 50) + '...';
                }
                
                replyPreviewText.innerHTML = `Replying to: ${previewText}`;
                replyPreview.dataset.replyToText = message.text || '';
                pendingReplyImage = null;
            }
            replyPreview.dataset.replyToSender = message.sender;
            replyPreview.dataset.replyToBotColor = normalizeHex(message.botColor) || '';
            replyPreview.dataset.replyToBotId = message.botId != null ? String(message.botId) : '';
            
            document.getElementById('editor').focus();
        }

        function hideReplyPreview() {
            const replyPreview = document.getElementById('reply-preview');
            replyPreview.classList.remove('active');
            delete replyPreview.dataset.replyTo;
            delete replyPreview.dataset.replyToBotId;
            document.getElementById('reply-preview-text').classList.remove('has-thumb');
            pendingReplyImage = null;
        }

        // =============================================
        // MESSAGE SENDING
        // =============================================
        function getPlainTextFromInput() {
            const chatInput = document.getElementById('editor');
            const tempDiv = document.getElementById('editor').cloneNode(true);
            
            const mentions = tempDiv.querySelectorAll('.mention-highlight');
            mentions.forEach(mention => {
                mention.outerHTML = mention.textContent;
            });
            
            return tempDiv.textContent.trim();
        }

        function extractMentionsFromInput() {
            const chatInput = document.getElementById('editor');
            const mentions = [];
            const mentionElements = chatInput.querySelectorAll('.mention-highlight');
            
            mentionElements.forEach(elem => {
                const alias = elem.dataset.alias || (elem.textContent.trim().startsWith('@') ? elem.textContent.trim().substring(1) : '');
                if (alias) {
                    mentions.push(alias);
                }
            });
            
            return mentions;
        }

        function getHtmlFromInput() {
            return document.getElementById('editor').innerHTML;
        }
        async function sendMessage(isExpressive = false) {
            const chatInput = document.getElementById('editor');
            const messageText = getPlainTextFromInput();
            const messageHtml = getHtmlFromInput();
            
            // Read all attachments into base64
            const processedAttachments = [];
            for (const att of attachments) {
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(att.file);
                });
                processedAttachments.push({
                    name: att.file.name,
                    type: att.file.type,
                    size: att.file.size,
                    data: base64
                });
            }
            
            if (!messageText && processedAttachments.length === 0) {
                document.getElementById('editor').style.fontSize = '14px';
                currentFontSize = 14;
                return;
            }
            
            if (!currentConversationId) return;
            
            const mentions = extractMentionsFromInput();
            const finalFontSize = isExpressive ? currentFontSize : 14;
            const loudness = (finalFontSize - minFontSize) / (maxFontSize - minFontSize);
            
            const message = {
                conversationId: currentConversationId,
                text: messageText,
                html: messageHtml,
                sender: 'user',
                timestamp: Date.now(),
                mentions,
                fontSize: finalFontSize,
                loudness: loudness.toFixed(2),
                attachments: processedAttachments
            };
            
            const replyPreview = document.getElementById('reply-preview');
            if (replyPreview.classList.contains('active') && replyPreview.dataset.replyTo) {
                const numericReplyId = Number(replyPreview.dataset.replyTo);
                message.replyTo = Number.isNaN(numericReplyId) ? replyPreview.dataset.replyTo : numericReplyId;
                message.replyToText = replyPreview.dataset.replyToText;
                message.replyToSender = replyPreview.dataset.replyToSender;
                message.replyToBotColor = replyPreview.dataset.replyToBotColor;
                const replyBotId = Number(replyPreview.dataset.replyToBotId);
                if (replyPreview.dataset.replyToBotId && !Number.isNaN(replyBotId)) message.replyToBotId = replyBotId;
                if (pendingReplyImage && window.ImageStudio) {
                    message.replyToImage = true;
                    message.replyToThumb = await ImageStudio.makeThumb(pendingReplyImage);
                }
            }
            
            await saveMessage(message);
            
            document.getElementById('editor').innerHTML = '';
            document.getElementById('editor').style.fontSize = '14px';
            currentFontSize = 14;
            hideReplyPreview();
            
            // Clear attachments tray
            attachments.length = 0;
            document.getElementById('attachments-tray').innerHTML = '';
            ensureAttachmentsState();
            
            let previewText = messageText;
            if (processedAttachments.length > 0) {
                previewText = `[Attachment${processedAttachments.length > 1 ? 's' : ''}] ` + previewText;
            }
            await updateConversationPreview(currentConversationId, previewText);
            
            // Update context consumption pill
            updateContextPill();
            
            setTimeout(() => {
                generateBotResponses(currentConversationId, mentions, message);
            }, 500);
        }


        function saveMessage(message, into = null) {
            if (incognitoConversationIds.has(message.conversationId)) {
                message.id = `ephemeral-message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                const messages = ephemeralMessages.get(message.conversationId) || [];
                messages.push(message);
                ephemeralMessages.set(message.conversationId, messages);
                renderMessage(message, into);
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
                return Promise.resolve(message);
            }

            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['messages'], 'readwrite');
                const request = tx.objectStore('messages').add(message);
                
                request.onsuccess = () => {
                    message.id = request.result;
                    renderMessage(message, into);
                    
                    const chatMessages = document.getElementById('chat-messages');
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    resolve(message);
                };
                request.onerror = () => reject(request.error);
            });
        }

        function updateConversationPreview(conversationId, preview) {
            if (incognitoConversationIds.has(conversationId)) {
                const conversation = ephemeralConversations.get(conversationId);
                if (conversation) conversation.preview = preview;
                loadConversations();
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const tx = messagesDB.transaction(['conversations'], 'readwrite');
                const store = tx.objectStore('conversations');
                const getRequest = store.get(conversationId);
                
                getRequest.onsuccess = async () => {
                    const conversation = getRequest.result;
                    if (conversation) {
                        conversation.preview = preview;
                        const putRequest = store.put(conversation);
                        putRequest.onsuccess = async () => {
                            await loadConversations();
                            resolve();
                        };
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        resolve();
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        }

        // =============================================
        // BOT RESPONSES
        // =============================================
        async function generateBotResponses(conversationId, mentions, userMessage = null) {
            let responseBots = [];
            const allBots = await getAllBotsWithColors();
            const repliedBot = userMessage?.replyToBotId != null
                ? allBots.find(bot => bot.id === userMessage.replyToBotId)
                : null;
            
            if (mentions.includes('all')) {
                responseBots = allBots;
            } else if (mentions.length > 0) {
                for (const mention of mentions) {
                    const bot = await getBotByAlias(mention);
                    if (bot) {
                        responseBots.push(bot);
                    }
                }
            } else if (repliedBot) {
                // replying to a bot's message addresses that bot
                responseBots = [repliedBot];
            } else if (lastInvokedBot) {
                responseBots = [lastInvokedBot];
            } else if (allBots.length > 0) {
                responseBots = [getDefaultBot(allBots)];
            }
            
            if (responseBots.length === 0) return;
            
            let delay = 0;
            for (const bot of responseBots) {
                setTimeout(() => {
                    sendBotResponse(bot, conversationId, userMessage);
                }, delay);
                
                delay += 1500 + Math.random() * 1000;
            }
        }

        // The same "thinking..." pill the image bots use while painting.
        function createTypingIndicator(bot = null) {
            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'message-container bot thinking-indicator';
            if (bot) indicatorContainer.appendChild(createBotFaceAvatar(bot.color, bot.kind));
            
            const indicator = document.createElement('div');
            if (window.ImageStudio) {
                indicator.className = 'thinking-pill';
                indicator.innerHTML = ImageStudio.thinkingMarkup('thinking...');
            } else {
                indicator.className = 'typing-indicator';
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('span');
                    indicator.appendChild(dot);
                }
            }
            
            indicatorContainer.appendChild(indicator);
            document.getElementById('chat-messages').appendChild(indicatorContainer);
            
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            return indicatorContainer;
        }
        // Shows what the extended-thinking loop is doing beside the dots.
        function setTypingStatus(indicatorContainer, text) {
            if (!indicatorContainer) return;
            let label = indicatorContainer.querySelector('.typing-status');
            if (!label) {
                label = document.createElement('div');
                label.className = 'typing-status';
                indicatorContainer.appendChild(label);
            }
            label.textContent = text || '';
        }

        // =============================================
        // EXTENDED THINKING
        // Draft an answer, then twice over: ask the model what the answer is
        // missing, put those questions back to it with the answer as context,
        // and finally collate everything into one response.
        // =============================================
        const EXTENDED_THINKING_ROUNDS = 2;

        function parseQuestionList(text) {
            return String(text || '')
                .split('\n')
                .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
                .filter(line => line.length > 1)
                .slice(0, 5);
        }

        async function runExtendedThinking(bot, apiMessages, systemPrompt, onPhase) {
            const ask = (messages, prompt) => callAPI(bot.provider, bot.modelId, messages, prompt);
            const lastUser = [...apiMessages].reverse().find(m => m.role === 'user');
            const request = String(lastUser?.content ?? '');

            onPhase('Drafting');
            const draft = await ask(apiMessages, systemPrompt);

            let current = draft;
            const rounds = [];

            for (let round = 1; round <= EXTENDED_THINKING_ROUNDS; round++) {
                onPhase(`Round ${round} of ${EXTENDED_THINKING_ROUNDS}: finding gaps`);
                const questionText = await ask([{
                    role: 'user',
                    content: `Review the answer below and work out what it is missing.\n\n`
                        + `Original request:\n${request}\n\nCurrent answer:\n${current}\n\n`
                        + `List 3 to 5 specific questions that, if answered, would extend this answer and fill its most important gaps. `
                        + `Ask only about substance that is missing, vague, or unsupported. `
                        + `Return one question per line, with no numbering, preamble, or commentary.`
                }], 'You find gaps in draft answers. You reply with questions only, one per line.');

                const questions = parseQuestionList(questionText);
                if (!questions.length) break;

                onPhase(`Round ${round} of ${EXTENDED_THINKING_ROUNDS}: answering ${questions.length} follow-ups`);
                const answers = await ask([{
                    role: 'user',
                    content: `Continue developing your earlier answer.\n\n`
                        + `Original request:\n${request}\n\nYour earlier answer:\n${current}\n\n`
                        + `Answer each of these questions in turn, adding the detail that was missing. Be specific and concrete.\n\n`
                        + questions.map(q => `- ${q}`).join('\n')
                }], systemPrompt);

                rounds.push({ questions, answers });
                current = `${current}\n\n${answers}`;
            }

            // no usable questions came back — the draft is the answer
            if (!rounds.length) return draft;

            onPhase('Collating');
            const gathered = rounds.map((entry, i) =>
                `Round ${i + 1} questions:\n${entry.questions.map(q => `- ${q}`).join('\n')}\n\n`
                + `Round ${i + 1} answers:\n${entry.answers}`
            ).join('\n\n');

            return await ask([{
                role: 'user',
                content: `Write the final answer to the original request.\n\n`
                    + `Original request:\n${request}\n\nFirst draft:\n${draft}\n\n`
                    + `Follow-up material gathered afterwards:\n${gathered}\n\n`
                    + `Produce one well-organised answer that folds in everything valuable above. `
                    + `Do not mention the drafting process, the rounds, or these instructions; `
                    + `answer as though replying directly for the first time.`
            }], systemPrompt);
        }

        async function sendBotResponse(bot, conversationId, userMessage = null) {
            if (bot.kind === 'image' && window.ImageStudio) {
                return ImageStudio.respond(bot, conversationId, userMessage);
            }
            lastInvokedBot = bot;
            const typingIndicator = createTypingIndicator(bot);
            
            try {
                const context = await buildContextForConversation(conversationId);
                const apiMessages = context.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    attachments: msg.attachments
                }));

                // Memory integration
                let classification = { needsRetrieval: false, needsSaving: false };
                let relevantMemories = [];
                const lastUserMsg = [...apiMessages].reverse().find(m => m.role === 'user');

                if (memoryEnabled && !incognitoConversationIds.has(conversationId) && lastUserMsg) {
                    try {
                        classification = await classifyMessage(lastUserMsg.content);
                    } catch (e) {
                        console.error('Memory classification failed:', e);
                    }

                    if (classification.needsRetrieval) {
                        try {
                            relevantMemories = await searchMemories(lastUserMsg.content);
                        } catch (e) {
                            console.error('Memory search failed:', e);
                        }
                    }
                }

                // Build system prompt with memory context
                let systemPrompt = bot.systemPrompt;
                if (relevantMemories.length > 0) {
                    const memoryContext = relevantMemories
                        .map(m => `(${m.source} memory): ${m.text}`)
                        .join('\n');
                    systemPrompt += `\n\nHere are some relevant memories that might help:\n${memoryContext}`;
                }
                
                const response = extendedThinkingEnabled
                    ? await runExtendedThinking(bot, apiMessages, systemPrompt,
                        phase => setTypingStatus(typingIndicator, phase))
                    : await callAPI(bot.provider, bot.modelId, apiMessages, systemPrompt);

                if (document.getElementById('chat-messages').contains(typingIndicator)) {
                    document.getElementById('chat-messages').removeChild(typingIndicator);
                }
                
                const botColor = normalizeHex(bot.color) || getRandomPaletteColor();
                const botMessage = {
                    conversationId,
                    text: response,
                    sender: 'bot',
                    timestamp: Date.now(),
                    botColor: botColor
                };
                
                await saveMessage(botMessage);
                await updateConversationPreview(conversationId, `${bot.name}: ${response.substring(0, 50)}`);

                // Update context consumption pill
                updateContextPill();

                // Save memory if classified as needing saving
                if (memoryEnabled && !incognitoConversationIds.has(conversationId) && classification.needsSaving && lastUserMsg) {
                    try {
                        await normalizeAndSaveMemory(lastUserMsg.content, conversationId);
                        addMemoryIndicator(document.getElementById('chat-messages'));
                        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
                    } catch (e) {
                        console.error('Memory save failed:', e);
                    }
                }
            } catch (error) {
                console.error('Error generating bot response:', error);
                if (document.getElementById('chat-messages').contains(typingIndicator)) {
                    document.getElementById('chat-messages').removeChild(typingIndicator);
                }
                
                const errorMessage = {
                    conversationId,
                    text: `Error: ${error.message}`,
                    sender: 'bot',
                    timestamp: Date.now(),
                    botColor: '#EA4335'
                };
                
                await saveMessage(errorMessage);
            }
        }

        let selectedMentionIndex = 0;

        function handleMentions() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const cursorNode = range.startContainer;
            const cursorOffset = range.startOffset;
            
            let textBeforeCursor = '';
            if (cursorNode.nodeType === Node.TEXT_NODE) {
                textBeforeCursor = cursorNode.textContent.substring(0, cursorOffset);
            }
            
            if (textBeforeCursor.endsWith('@') || /@[a-zA-Z0-9_]*$/.test(textBeforeCursor)) {
                showMentionPopupAtCaret();
            } else {
                document.getElementById('mention-popup').style.display = 'none';
            }
        }

        async function showMentionPopupAtCaret() {
            const bots = await getAllBotsWithColors();
            const mentionPopup = document.getElementById('mention-popup');
            mentionPopup.style.display = 'none';
            
            selectedMentionIndex = 0;
            
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            mentionPopup.innerHTML = '';
            
            const searchText = getCurrentMentionSearchText().toLowerCase();
            
            // Add @all option
            if (searchText === '' || 'all'.indexOf(searchText) === 0) {
                const allItem = document.createElement('div');
                allItem.className = 'mention-item selected';
                allItem.dataset.all = 'true';
                allItem.innerHTML = `
                    <div class="mention-info">
                        <span class="mention-bot-avatar mention-all-avatar"></span>
                        <span class="mention-alias">all</span>
                    </div>
                `;
                
                allItem.addEventListener('click', () => {
                    insertMention({ alias: 'all', name: 'All Bots', color: '#5C6BC0' });
                });
                
                allItem.addEventListener('mouseover', () => {
                    selectedMentionIndex = 0;
                    updateMentionSelection(mentionPopup.querySelectorAll('.mention-item'));
                });
                
                mentionPopup.appendChild(allItem);
            }
            
            // Add matching bots
            let matchingBots = bots;
            if (searchText) {
                matchingBots = bots.filter(bot => 
                    bot.alias.toLowerCase().indexOf(searchText) === 0
                );
            }
            
            const context = await buildContextForConversation(currentConversationId);
            
            for (const [index, bot] of matchingBots.entries()) {
                const contextUsage = calculateContextUsage(context, getContextWindowForBot(bot));
                
                let fillClass = 'low';
                if (contextUsage > 0.7) fillClass = 'high';
                else if (contextUsage > 0.4) fillClass = 'medium';
                
                const item = document.createElement('div');
                item.className = 'mention-item';
                if (index === 0 && !mentionPopup.querySelector('.mention-item')) {
                    item.classList.add('selected');
                }
                
                // the bot's own face avatar, same as the one beside its messages
                const avatarColor = normalizeHex(bot.color) || BOT_COLORS[0];
                const eyeColor = getEyeColorForAvatar(avatarColor);

                const isImageBot = bot.kind === 'image';
                const brush = isImageBot && window.ImageStudio ? ImageStudio.brushMarkup() : '';
                item.innerHTML = `
                    <div class="mention-info">
                        <span class="bot-face-avatar mention-bot-avatar" style="background-color: ${avatarColor};">
                            <span class="bot-eye left" style="background-color: ${eyeColor};"></span>
                            <span class="bot-eye right" style="background-color: ${eyeColor};"></span>
                            ${brush}
                        </span>
                        <span class="mention-alias">${bot.alias}</span>
                    </div>
                    ${isImageBot ? '' : `<div class="context-meter">
                        <div class="context-fill ${fillClass}" style="width: ${Math.min(contextUsage * 100, 100)}%"></div>
                    </div>`}
                `;
                
                item.addEventListener('click', () => {
                    insertMention(bot);
                });
                
                item.addEventListener('mouseover', () => {
                    const offset = mentionPopup.querySelector('[data-all]') ? index + 1 : index;
                    const mentionItems = mentionPopup.querySelectorAll('.mention-item');
                    selectedMentionIndex = Math.min(offset, mentionItems.length - 1);
                    updateMentionSelection(mentionItems);
                });
                
                mentionPopup.appendChild(item);
            }
            
            if (mentionPopup.children.length === 0) {
                mentionPopup.style.display = 'none';
                return;
            }
            
            positionMentionPopup(mentionPopup, currentCaretRect() || rect);
        }

        // Reads the caret's rect at the moment of use. Measuring it up front and
        // positioning after an await leaves the popup on stale geometry if the
        // layout moved in between (a web font landing, the composer resizing).
        function currentCaretRect() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return null;
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            if (rect && (rect.width || rect.height || rect.left || rect.top)) return rect;
            return null;
        }

        // Anchors the popup directly above the caret. The element sits at body
        // level so these viewport coordinates resolve against the viewport.
        function positionMentionPopup(mentionPopup, caretRect) {
            mentionPopup.style.position = 'fixed';
            mentionPopup.style.visibility = 'hidden';
            mentionPopup.style.display = 'block';
            mentionPopup.style.left = '-9999px';
            mentionPopup.style.bottom = 'auto';
            mentionPopup.style.top = 'auto';

            // A collapsed range can report an empty rect; fall back to the
            // custom caret element, then to the editor itself.
            let anchor = caretRect;
            const isEmpty = !anchor || (!anchor.width && !anchor.height && !anchor.left && !anchor.top);
            if (isEmpty) {
                const caretEl = document.getElementById('custom-caret');
                if (caretEl && caretEl.style.display !== 'none') {
                    anchor = caretEl.getBoundingClientRect();
                }
            }
            if (!anchor || (!anchor.width && !anchor.height && !anchor.left && !anchor.top)) {
                anchor = document.getElementById('editor').getBoundingClientRect();
            }

            const margin = 8;
            const gap = 8;
            const width = mentionPopup.offsetWidth;
            const height = mentionPopup.offsetHeight;

            let left = anchor.left;
            left = Math.min(left, window.innerWidth - width - margin);
            left = Math.max(margin, left);

            // sit above the caret; drop below only if there is no room above
            let top = anchor.top - height - gap;
            if (top < margin) top = Math.min(anchor.bottom + gap, window.innerHeight - height - margin);

            Object.assign(mentionPopup.style, {
                visibility: 'visible',
                left: left + 'px',
                top: top + 'px',
                bottom: 'auto'
            });
        }

        // The popup re-renders on every keystroke, so a resize is the one case
        // that would otherwise leave it stranded away from the caret.
        window.addEventListener('resize', () => {
            const popup = document.getElementById('mention-popup');
            if (popup && popup.style.display === 'block') {
                positionMentionPopup(popup, currentCaretRect());
            }
        });

        function getCurrentMentionSearchText() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return '';
            
            const range = selection.getRangeAt(0);
            let node = range.startContainer;
            let offset = range.startOffset;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const textBeforeCursor = node.textContent.substring(0, offset);
                const match = /@([a-zA-Z0-9_]*)$/.exec(textBeforeCursor);
                if (match) {
                    return match[1];
                }
            }
            
            return '';
        }

        function insertMention(bot) {
            const mentionSpan = document.createElement('span');
            mentionSpan.className = 'mention-highlight';
            const color = normalizeHex(bot.color) || getRandomPaletteColor();
            mentionSpan.style.backgroundColor = color;
            mentionSpan.style.color = getTextColorForBackground(color);
            mentionSpan.textContent = '@' + bot.alias;
            mentionSpan.dataset.alias = bot.alias;
            mentionSpan.dataset.color = color;
            mentionSpan.contentEditable = 'false';
            
            const selection = window.getSelection();
            if (!selection.rangeCount) {
                document.getElementById('mention-popup').style.display = 'none';
                return;
            }

            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                const atPos = textNode.textContent.lastIndexOf('@', range.startOffset);
                if (atPos !== -1) {
                    const deleteRange = document.createRange();
                    deleteRange.setStart(textNode, atPos);
                    deleteRange.setEnd(range.startContainer, range.startOffset);
                    deleteRange.deleteContents();
                    
                    range.setStart(textNode, atPos);
                    range.collapse(true);
                }
            } else {
                range.deleteContents();
            }

            const spaceNode = document.createTextNode('\u00A0');
            range.insertNode(mentionSpan);
            range.setStartAfter(mentionSpan);
            range.collapse(true);
            range.insertNode(spaceNode);
            range.setStartAfter(spaceNode);
            range.collapse(true);

            selection.removeAllRanges();
            selection.addRange(range);
            
            document.getElementById('mention-popup').style.display = 'none';
        }

        function updateMentionSelection(mentionItems) {
            mentionItems.forEach(item => item.classList.remove('selected'));
            
            if (mentionItems.length > 0) {
                selectedMentionIndex = Math.max(0, Math.min(selectedMentionIndex, mentionItems.length - 1));
                mentionItems[selectedMentionIndex].classList.add('selected');
                mentionItems[selectedMentionIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        // =============================================
        // CHAT INPUT HANDLERS
        // =============================================
        function handleChatKeydown(e) {
            const mentionPopup = document.getElementById('mention-popup');
            
            if (mentionPopup.style.display === 'block') {
                const mentionItems = mentionPopup.querySelectorAll('.mention-item');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedMentionIndex = Math.min(selectedMentionIndex + 1, mentionItems.length - 1);
                    updateMentionSelection(mentionItems);
                } 
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedMentionIndex = Math.max(selectedMentionIndex - 1, 0);
                    updateMentionSelection(mentionItems);
                }
                else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    if (mentionItems.length > 0) {
                        mentionItems[selectedMentionIndex].click();
                    }
                    return;
                }
                else if (e.key === 'Escape') {
                    e.preventDefault();
                    mentionPopup.style.display = 'none';
                    return;
                }
            }
            
            if (e.key === 'Enter' && !e.shiftKey && mentionPopup.style.display !== 'block') {
                e.preventDefault();
                sendMessage(false);
            }
        }

        // =============================================
        // LOUDNESS SLIDER
        // =============================================
        let longPressTimer;
        let isLongPress = false;
        let isDragging = false;
        let startY, startX;
        let currentFontSize = 14;
        const minFontSize = 10;
        const maxFontSize = 28;
        const sliderHeight = 150;
        const buttonHeight = 40;
        const dragThreshold = 10;

        function handlePressStart(e) {
            e.preventDefault();
            startY = e.clientY || e.touches[0].clientY;
            startX = e.clientX || e.touches[0].clientX;
            isLongPress = false;
            isDragging = false;

            longPressTimer = setTimeout(() => {
                if (!isDragging) {
                    isLongPress = true;
                    const loudnessSlider = document.getElementById('loudness-slider');
                    const sendBtn = document.getElementById('send-btn');
                    const chatInput = document.getElementById('editor');
                    
                    loudnessSlider.style.display = 'flex';
                    
                    sendBtn.style.transition = 'transform 0.1s linear';
                    chatInput.style.transition = 'font-size 0.1s linear';
                    
                    const maxOffset = sliderHeight - buttonHeight;
                    const defaultPosition = maxOffset / 2;
                    sendBtn.style.transform = `translateY(-${defaultPosition}px)`;

                    setTimeout(() => loudnessSlider.style.opacity = '1', 10);
                    sendBtn.classList.add('sliding');
                    document.body.style.cursor = 'ns-resize';
                }
            }, 250);

            document.addEventListener('mousemove', handlePressMove);
            document.addEventListener('mouseup', handlePressEnd);
            document.addEventListener('touchmove', handlePressMove, { passive: false });
            document.addEventListener('touchend', handlePressEnd);
        }

        function handlePressMove(e) {
            if (e.cancelable) e.preventDefault();
            
            const currentY = e.clientY || e.touches[0].clientY;
            const currentX = e.clientX || e.touches[0].clientX;

            if (!isLongPress) {
                if (Math.abs(currentX - startX) > dragThreshold || Math.abs(currentY - startY) > dragThreshold) {
                    isDragging = true;
                    clearTimeout(longPressTimer);
                }
                return;
            }

            const maxOffset = sliderHeight - buttonHeight;
            const initialOffset = maxOffset / 2;
            
            let totalDragDistance = startY - currentY;

            const downwardDragFactor = 1.8;
            if (totalDragDistance < 0) {
                totalDragDistance *= downwardDragFactor;
            }
            
            const finalOffset = initialOffset + totalDragDistance;
            const clampedOffset = Math.max(0, Math.min(finalOffset, maxOffset));

            document.getElementById('send-btn').style.transform = `translateY(${-clampedOffset}px)`;

            const sizeRange = maxFontSize - minFontSize;
            const newSize = minFontSize + (clampedOffset / maxOffset) * sizeRange;
            currentFontSize = Math.max(minFontSize, Math.min(newSize, maxFontSize));

            document.getElementById('editor').style.fontSize = `${currentFontSize}px`;
        }

        function handlePressEnd() {
            clearTimeout(longPressTimer);

            if (isLongPress) {
                sendMessage(true);
            } else if (!isDragging) {
                sendMessage(false);
            }

            resetSliderState();

            document.removeEventListener('mousemove', handlePressMove);
            document.removeEventListener('mouseup', handlePressEnd);
            document.removeEventListener('touchmove', handlePressMove);
            document.removeEventListener('touchend', handlePressEnd);
        }

        function resetSliderState() {
            isLongPress = false;
            isDragging = false;

            const loudnessSlider = document.getElementById('loudness-slider');
            const sendBtn = document.getElementById('send-btn');
            const chatInput = document.getElementById('editor');
            
            loudnessSlider.style.opacity = '0';
            setTimeout(() => loudnessSlider.style.display = 'none', 300);

            sendBtn.classList.remove('sliding');
            sendBtn.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
            chatInput.style.transition = 'font-size 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
            sendBtn.style.transform = 'translateY(0px)';
            document.body.style.cursor = 'default';
        }

        // =============================================
        // THEME
        // =============================================
        let isDarkMode = false;

        function updateThemeToggleVisuals() {
            const toggleBtn = document.getElementById('theme-toggle');
            const icon = document.getElementById('theme-toggle-icon');
            const label = isDarkMode ? 'Switch to light theme' : 'Switch to dark theme';
            if (icon) {
                icon.classList.toggle('fa-sun', isDarkMode);
                icon.classList.toggle('fa-moon', !isDarkMode);
            }
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-label', label);
                toggleBtn.setAttribute('title', label);
            }
        }

        function toggleTheme() {
            isDarkMode = !isDarkMode;
            document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            updateThemeToggleVisuals();
        }

        function loadTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                isDarkMode = savedTheme === 'dark';
                document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
            }
            updateThemeToggleVisuals();
        }

        // =============================================
        // INITIALIZE
        // =============================================
        initializeApp();