/* Image Studio — image bots, the "painting" state, and the image canvas.
 *
 * Loaded after script.js and relies on its globals (getApiKey, saveMessage,
 * getStoredConversationMessages, normalizeHex, createBotFaceAvatar, …).
 * Everything here is exposed through window.ImageStudio.
 */
;(function () {
"use strict";

// =============================================
// SETTINGS (persisted in localStorage)
// =============================================
const SETTINGS_KEY = 'tldream-image-settings';

const DEFAULT_STYLES = [
    'Loose watercolour painting with soft bleeding edges',
    'Bold flat vector illustration with a limited palette',
    'Moody black-and-white film-noir photograph',
    'Traditional ukiyo-e woodblock print',
    'Low-poly 3D render with soft studio lighting',
    'Rough charcoal sketch on textured paper',
    'Retro 1980s synthwave poster',
    'Cosy Studio Ghibli style animation frame'
];

const DEFAULT_SETTINGS = {
    temperature: 1,
    topP: 0.95,
    seed: '',
    aspectRatio: 'auto',
    imageSize: 'auto',
    variations: 3,
    stylePrompt: 'Recreate this exact image as: {style}. Keep the same subject, composition and framing; only change the art style.',
    styles: DEFAULT_STYLES.slice()
};

let settings = loadSettings();

function loadSettings() {
    try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
        if (stored && typeof stored === 'object') {
            const merged = { ...DEFAULT_SETTINGS, ...stored };
            if (!Array.isArray(merged.styles)) merged.styles = DEFAULT_STYLES.slice();
            return merged;
        }
    } catch (error) { /* corrupt or unavailable storage: fall back to defaults */ }
    return { ...DEFAULT_SETTINGS, styles: DEFAULT_STYLES.slice() };
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) { /* storage full or unavailable */ }
}

function getSettings() {
    return settings;
}

function resetSettings() {
    settings = { ...DEFAULT_SETTINGS, styles: DEFAULT_STYLES.slice() };
    saveSettings();
}

// =============================================
// IMAGE MODELS
// =============================================
const GEMINI_IMAGE_MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Nano Banana)' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image (Nano Banana Pro)' }
];

const IMAGE_MODEL_DEFAULTS = {
    google: 'gemini-2.5-flash-image',
    openrouter: 'google/gemini-2.5-flash-image'
};

const IMAGE_PROVIDERS = {
    google: 'Gemini',
    openrouter: 'OpenRouter'
};

const OPENROUTER_IMAGE_NAMES = {
    'google/gemini-2.5-flash-image': 'Gemini 2.5 Flash Image',
    'google/gemini-2.5-flash-image-preview': 'Gemini 2.5 Flash Image',
    'google/gemini-3-pro-image-preview': 'Gemini 3 Pro Image'
};

function imageModelLabel(bot) {
    if (bot.provider === 'google') {
        const preset = GEMINI_IMAGE_MODELS.find(m => m.id === bot.modelId);
        return preset ? preset.name : bot.modelId;
    }
    return OPENROUTER_IMAGE_NAMES[bot.modelId] || bot.modelId;
}

// ---- validation ----
let openRouterModelsPromise = null;

function fetchOpenRouterModels() {
    if (!openRouterModelsPromise) {
        openRouterModelsPromise = fetch('https://openrouter.ai/api/v1/models')
            .then(res => {
                if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);
                return res.json();
            })
            .then(body => body.data || [])
            .catch(error => {
                openRouterModelsPromise = null;
                throw error;
            });
    }
    return openRouterModelsPromise;
}

/* Resolves to { ok, reason, uncertain }. `uncertain` means the model could not
   be checked (network, missing key) and the caller should ask before saving. */
async function validateImageModel(provider, modelId) {
    if (provider === 'openrouter') {
        let models;
        try {
            models = await fetchOpenRouterModels();
        } catch (error) {
            return { ok: true, uncertain: true, reason: 'OpenRouter could not be reached to verify this slug.' };
        }
        const model = models.find(m => m.id === modelId);
        if (!model) return { ok: false, reason: `"${modelId}" is not listed on openrouter.ai/models. Check the slug.` };
        const outputs = model.architecture?.output_modalities || [];
        if (!outputs.includes('image')) {
            return { ok: false, reason: `${model.name || modelId} outputs ${outputs.join(', ') || 'text'} only. Pick a model that outputs images.` };
        }
        return { ok: true };
    }

    if (provider === 'google') {
        const apiKey = await getApiKey('google');
        if (!apiKey) return { ok: true, uncertain: true, reason: 'There is no Google API key to verify this model with.' };
        let res;
        try {
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}?key=${apiKey}`);
        } catch (error) {
            return { ok: true, uncertain: true, reason: 'Google could not be reached to verify this model.' };
        }
        if (res.status === 404) return { ok: false, reason: `"${modelId}" was not found on the Gemini API.` };
        if (!res.ok) return { ok: true, uncertain: true, reason: `Google responded ${res.status} while verifying the model.` };
        const info = await res.json();
        const methods = info.supportedGenerationMethods || [];
        if (methods.length && !methods.includes('generateContent')) {
            return { ok: false, reason: `"${modelId}" does not support generateContent, so it cannot paint.` };
        }
        if (!/image/i.test(modelId)) {
            return { ok: true, uncertain: true, reason: `"${modelId}" does not look like an image model (no "image" in its name).` };
        }
        return { ok: true };
    }

    return { ok: false, reason: 'Image bots can only use Gemini or OpenRouter.' };
}

// =============================================
// GENERATION
// =============================================
function stripDataUrl(dataUrl) {
    const comma = dataUrl.indexOf(',');
    return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

function mimeFromDataUrl(dataUrl) {
    const match = /^data:([^;,]+)/.exec(dataUrl || '');
    return match ? match[1] : 'image/png';
}

function finiteOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

async function readError(res, label) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
        const body = await res.json();
        const message = body?.error?.message || body?.error || body?.message;
        if (message) detail = typeof message === 'string' ? message : JSON.stringify(message);
    } catch (parseErr) { /* keep the status text */ }
    return new Error(`${label} error: ${detail}`);
}

async function callGeminiImage(apiKey, model, prompt, sources) {
    const parts = sources.map(src => ({
        inlineData: { mimeType: src.mime || mimeFromDataUrl(src.dataUrl), data: stripDataUrl(src.dataUrl) }
    }));
    parts.push({ text: prompt });

    const generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    generationConfig.temperature = finiteOr(settings.temperature, 1);
    generationConfig.topP = finiteOr(settings.topP, 0.95);
    if (settings.seed !== '' && settings.seed != null && Number.isFinite(Number(settings.seed))) {
        generationConfig.seed = Number(settings.seed);
    }
    const imageConfig = {};
    if (settings.aspectRatio && settings.aspectRatio !== 'auto') imageConfig.aspectRatio = settings.aspectRatio;
    if (settings.imageSize && settings.imageSize !== 'auto') imageConfig.imageSize = settings.imageSize;
    if (Object.keys(imageConfig).length) generationConfig.imageConfig = imageConfig;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig })
    });
    if (!res.ok) throw await readError(res, 'Gemini');

    const data = await res.json();
    if (data.promptFeedback?.blockReason) {
        throw new Error(`Gemini declined to paint this (${data.promptFeedback.blockReason}).`);
    }
    const candidate = data.candidates?.[0];
    const outParts = candidate?.content?.parts || [];
    const imagePart = outParts.find(p => p.inlineData?.data);
    const text = outParts.filter(p => typeof p.text === 'string').map(p => p.text).join('\n').trim();
    if (!imagePart) {
        if (text) throw new Error(`The model replied with text instead of an image: ${text}`);
        throw new Error(`No image came back${candidate?.finishReason ? ` (${candidate.finishReason})` : ''}.`);
    }
    const mime = imagePart.inlineData.mimeType || 'image/png';
    return { dataUrl: `data:${mime};base64,${imagePart.inlineData.data}`, mime, text };
}

async function callOpenRouterImage(apiKey, model, prompt, sources) {
    const content = [{ type: 'text', text: prompt }];
    for (const src of sources) {
        content.push({ type: 'image_url', image_url: { url: src.dataUrl } });
    }

    const body = {
        model,
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
        temperature: finiteOr(settings.temperature, 1),
        top_p: finiteOr(settings.topP, 0.95)
    };
    if (settings.seed !== '' && settings.seed != null && Number.isFinite(Number(settings.seed))) {
        body.seed = Number(settings.seed);
    }
    const imageConfig = {};
    if (settings.aspectRatio && settings.aspectRatio !== 'auto') imageConfig.aspect_ratio = settings.aspectRatio;
    if (settings.imageSize && settings.imageSize !== 'auto') imageConfig.image_size = settings.imageSize;
    if (Object.keys(imageConfig).length) body.image_config = imageConfig;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': document.title || 'AI Messaging App'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw await readError(res, 'OpenRouter');

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const image = (message?.images || []).find(img => img?.image_url?.url);
    const text = typeof message?.content === 'string' ? message.content.trim() : '';
    if (!image) {
        if (text) throw new Error(`The model replied with text instead of an image: ${text}`);
        throw new Error('No image came back from OpenRouter. Is this slug an image model?');
    }
    const url = image.image_url.url;
    return { dataUrl: url, mime: mimeFromDataUrl(url), text };
}

/* Generates one image for `bot`. `sources` are reference images
   ({ dataUrl, mime }) — the image being edited, or the user's attachments. */
async function generateImage(bot, prompt, sources = []) {
    const apiKey = await getApiKey(bot.provider);
    if (!apiKey) {
        throw new Error(`${bot.name} needs ${IMAGE_PROVIDERS[bot.provider] || bot.provider} API key. Add one in Settings → API Keys.`);
    }
    let fullPrompt = prompt;
    const notes = (bot.systemPrompt || '').trim();
    if (notes) fullPrompt += `\n\nStyle notes: ${notes}`;

    if (bot.provider === 'google') return callGeminiImage(apiKey, bot.modelId, fullPrompt, sources);
    if (bot.provider === 'openrouter') return callOpenRouterImage(apiKey, bot.modelId, fullPrompt, sources);
    throw new Error(`${bot.name} is set to ${bot.provider}, which cannot generate images.`);
}

// =============================================
// HELPERS
// =============================================
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('The image could not be decoded.'));
        img.src = src;
    });
}

// Display size for an image in the chat: fits inside 360×360, never tiny.
function fitSize(naturalWidth, naturalHeight, maxW = 360, maxH = 360, minW = 140) {
    if (!naturalWidth || !naturalHeight) return { w: 320, h: 240 };
    let scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
    let w = naturalWidth * scale;
    let h = naturalHeight * scale;
    if (w < minW) {
        const k = minW / w;
        w = minW;
        h *= k;
    }
    return { w: Math.round(w), h: Math.round(h) };
}

async function makeThumb(dataUrl, size = 96) {
    try {
        const img = await loadImage(dataUrl);
        const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.82);
    } catch (error) {
        return dataUrl;
    }
}

function scrollChatToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function truncate(text, max) {
    const value = String(text || '');
    return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

function cleanPrompt(text) {
    return String(text || '').replace(/(^|\s)@[a-z0-9_]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

// =============================================
// PAINTBRUSH (held by every image bot's avatar)
// =============================================
const BRUSH_SVG = `<svg class="avatar-brush" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="10" y="1.5" width="4" height="12" rx="2" fill="#e0b27a"/>
    <rect x="9.5" y="12.5" width="5" height="3.2" rx="0.6" fill="#d5d8de"/>
    <path d="M9.6 15.7h4.8l-1.1 5.6a1.4 1.4 0 0 1-2.6 0z" fill="#ff5ea8"/>
    <circle cx="16.4" cy="20.4" r="1.3" fill="#ff5ea8" opacity="0.9"/>
</svg>`;

function brushMarkup() {
    return BRUSH_SVG;
}

// =============================================
// BOT KIND POPOVER (New bot → Image / Conversation)
// =============================================
let kindPopover = null;

function closeBotKindPopover() {
    if (!kindPopover) return;
    const el = kindPopover;
    kindPopover = null;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 180);
    document.removeEventListener('mousedown', onKindPopoverOutside, true);
    document.removeEventListener('keydown', onKindPopoverKey, true);
}

function onKindPopoverOutside(event) {
    if (kindPopover && !kindPopover.contains(event.target)) closeBotKindPopover();
}

function onKindPopoverKey(event) {
    if (event.key === 'Escape') closeBotKindPopover();
}

function openBotKindPopover(anchor, onPick) {
    if (kindPopover) {
        closeBotKindPopover();
        return;
    }
    const popover = document.createElement('div');
    popover.className = 'bot-kind-popover';
    popover.setAttribute('role', 'menu');
    popover.innerHTML = `
        <button type="button" class="bot-kind-option" data-kind="image" role="menuitem">
            <span class="bot-kind-icon image">
                <i data-lucide="image"></i>
                ${BRUSH_SVG}
            </span>
            <span class="bot-kind-text">
                <span class="bot-kind-title">Image Bot</span>
                <span class="bot-kind-desc">Paints and edits images with Gemini or an OpenRouter image model.</span>
            </span>
        </button>
        <button type="button" class="bot-kind-option" data-kind="conversation" role="menuitem">
            <span class="bot-kind-icon">
                <i data-lucide="message-square"></i>
            </span>
            <span class="bot-kind-text">
                <span class="bot-kind-title">Conversation Bot</span>
                <span class="bot-kind-desc">Chats with a text model and its own persona.</span>
            </span>
        </button>
    `;
    document.body.appendChild(popover);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const rect = anchor.getBoundingClientRect();
    const width = popover.offsetWidth;
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    if (top + popover.offsetHeight > window.innerHeight - 8) top = rect.top - popover.offsetHeight - 8;
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;

    popover.querySelectorAll('.bot-kind-option').forEach(option => {
        option.addEventListener('click', () => {
            const kind = option.dataset.kind;
            closeBotKindPopover();
            onPick(kind);
        });
    });

    kindPopover = popover;
    requestAnimationFrame(() => popover.classList.add('show'));
    document.addEventListener('mousedown', onKindPopoverOutside, true);
    document.addEventListener('keydown', onKindPopoverKey, true);
}

// =============================================
// CHAT: thinking state, reveal, image frames
// =============================================
function thinkingMarkup(label) {
    const letters = label.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`).join('');
    return `
        <div class="image-gen-thinking">
            <svg class="spring-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path class="spring-path" d="M 5,20 Q 8,12 12,14 T 16,20 T 20,14 T 24,20 T 28,14 T 32,20 Q 35,22 35,20" />
            </svg>
            <div class="thinking-text">${letters}</div>
        </div>`;
}

function createThinkingIndicator(bot) {
    const container = document.createElement('div');
    container.className = 'message-container bot image-generating';
    container.appendChild(createBotFaceAvatar(bot.color, 'image'));

    const messageElem = document.createElement('div');
    messageElem.className = 'message bot image-message';
    messageElem.innerHTML = `<div class="image-gen-frame">${thinkingMarkup('painting...')}</div>`;
    container.appendChild(messageElem);

    document.getElementById('chat-messages').appendChild(container);
    scrollChatToBottom();
    return container;
}

/* Morphs the thinking pill into a 6px-radius rectangle of the image's display
   size, shimmers while the image decodes, then fades the image in. */
async function revealImage(container, dataUrl, size) {
    const frame = container.querySelector('.image-gen-frame');
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    frame.style.width = `${rect.width}px`;
    frame.style.height = `${rect.height}px`;
    frame.classList.add('morphing');
    void frame.offsetWidth;

    frame.style.width = `${size.w}px`;
    frame.style.height = `${size.h}px`;
    frame.classList.add('rect');
    scrollChatToBottom();
    await wait(560);

    const shimmer = document.createElement('div');
    shimmer.className = 'image-gen-shimmer';
    frame.appendChild(shimmer);

    const img = document.createElement('img');
    img.className = 'image-gen-preview';
    img.alt = '';
    img.draggable = false;
    img.src = dataUrl;
    frame.appendChild(img);
    scrollChatToBottom();

    await wait(720);
    img.classList.add('in');
    shimmer.classList.add('out');
    await wait(420);
}

function imageFrameMarkup(message) {
    const size = fitSize(message.imageWidth, message.imageHeight);
    const alt = escapeHtml(message.imagePrompt || 'Generated image');
    return `<div class="chat-image-frame" style="width:${size.w}px;height:${size.h}px" title="Open on the canvas">
        <img src="${message.image}" alt="${alt}" draggable="false">
    </div>`;
}

function bindImageFrame(messageElem, message) {
    const frame = messageElem.querySelector('.chat-image-frame');
    if (!frame) return;
    frame.addEventListener('click', event => {
        event.stopPropagation();
        openCanvasFromMessage(message, frame);
    });
}

// The quote on a sent reply: a thumbnail when the reply was to an image,
// otherwise just the quoted text, tinted with the original sender's colour.
function replyChipMarkup(message) {
    if (message.replyTo == null && !message.replyToText) return '';
    const label = message.replyToText || (message.replyToThumb ? 'image' : 'message');
    if (message.replyToThumb) {
        return `<div class="reply-chip">
            <img src="${message.replyToThumb}" alt="" draggable="false">
            <span>${escapeHtml(truncate(label, 40))}</span>
        </div>`;
    }
    const accent = /^#[0-9a-f]{6}$/i.test(message.replyToBotColor || '') ? message.replyToBotColor : '';
    return `<div class="reply-chip text-only"${accent ? ` style="--chip-accent: ${accent}"` : ''}>
        <span>${escapeHtml(truncate(label, 80))}</span>
    </div>`;
}

async function collectSources(conversationId, userMessage) {
    const sources = [];
    if (userMessage?.replyTo != null) {
        const messages = await getStoredConversationMessages(conversationId);
        const replied = messages.find(m => String(m.id) === String(userMessage.replyTo));
        if (replied?.image) sources.push({ dataUrl: replied.image, mime: replied.imageMime });
    }
    for (const att of userMessage?.attachments || []) {
        if (att.type?.startsWith('image/') && att.data) sources.push({ dataUrl: att.data, mime: att.type });
    }
    return sources;
}

function buildImageMessage(conversationId, bot, result, dims, prompt, extra = {}) {
    return {
        conversationId,
        sender: 'bot',
        text: result.text || '',
        image: result.dataUrl,
        imageMime: result.mime,
        imageWidth: dims.w,
        imageHeight: dims.h,
        imagePrompt: prompt,
        botColor: normalizeHex(bot.color) || getRandomPaletteColor(),
        botId: bot.id,
        botName: bot.name,
        botKind: 'image',
        timestamp: Date.now(),
        ...extra
    };
}

/* The image bot's turn in a conversation: paint the prompt, or edit the
   image the user replied to. */
async function respond(bot, conversationId, userMessage) {
    lastInvokedBot = bot;
    const container = createThinkingIndicator(bot);

    try {
        const prompt = cleanPrompt(userMessage?.text);
        const sources = await collectSources(conversationId, userMessage);
        if (!prompt && !sources.length) throw new Error(`Tell ${bot.name} what to paint.`);
        const finalPrompt = prompt || 'Recreate this image faithfully.';

        const result = await generateImage(bot, finalPrompt, sources);
        const decoded = await loadImage(result.dataUrl);
        const dims = { w: decoded.naturalWidth, h: decoded.naturalHeight };
        await revealImage(container, result.dataUrl, fitSize(dims.w, dims.h));

        const message = buildImageMessage(conversationId, bot, result, dims, finalPrompt, {
            sourceMessageId: userMessage?.replyTo ?? null
        });
        await saveMessage(message, container);
        await updateConversationPreview(conversationId, `${bot.name}: 🖼 ${truncate(finalPrompt, 50)}`);
        updateContextPill();
    } catch (error) {
        console.error('Image generation failed:', error);
        container.remove();
        await saveMessage({
            conversationId,
            text: `Error: ${error.message}`,
            sender: 'bot',
            timestamp: Date.now(),
            botColor: '#EA4335'
        });
    }
}

// =============================================
// ICONS
// Lucide is rendered once into a hidden template; nodes clone the markup so
// mounting a node never rescans the whole document.
// =============================================
const ICON_NAMES = ['x', 'settings-2', 'shuffle', 'pen-tool', 'download', 'message-square-share', 'check', 'pencil-line', 'pencil', 'type', 'redo-2'];
const iconCache = new Map();

function primeIcons() {
    if (iconCache.size || typeof lucide === 'undefined') return;
    const tpl = document.createElement('div');
    tpl.style.display = 'none';
    tpl.innerHTML = ICON_NAMES.map(name => `<span data-icon="${name}"><i data-lucide="${name}"></i></span>`).join('');
    document.body.appendChild(tpl);
    lucide.createIcons();
    tpl.querySelectorAll('[data-icon]').forEach(span => {
        const svg = span.querySelector('svg');
        if (svg) iconCache.set(span.dataset.icon, svg.outerHTML);
    });
    tpl.remove();
}

function iconHtml(name) {
    if (!iconCache.has(name) && typeof lucide !== 'undefined') primeIcons();
    return iconCache.get(name) || `<i data-lucide="${name}"></i>`;
}

// =============================================
// CANVAS
// =============================================
const NODE_ROOT_WIDTH = 320;
const NODE_CHILD_WIDTH = 256;
const NODE_GAP_X = 150;
const NODE_GAP_Y = 30;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;

const canvas = {
    built: false,
    open: false,
    panel: null,
    viewport: null,
    world: null,
    edgesSvg: null,
    nodesLayer: null,
    settingsPanel: null,
    toast: null,
    conversationId: null,
    states: new Map(),
    state: null,
    liftedFrame: null,
    zTop: 1,
    nextId: 1
};

function getState(conversationId) {
    const key = String(conversationId);
    if (!canvas.states.has(key)) {
        canvas.states.set(key, { nodes: new Map(), edges: new Map(), pan: { x: 0, y: 0 }, zoom: 1 });
    }
    return canvas.states.get(key);
}

function buildCanvas() {
    if (canvas.built) return;
    canvas.built = true;

    const panel = document.createElement('div');
    panel.className = 'image-canvas-panel';
    panel.id = 'image-canvas-panel';
    primeIcons();
    panel.innerHTML = `
        <button type="button" class="canvas-close" title="Close canvas" aria-label="Close canvas">${iconHtml('x')}</button>
        <button type="button" class="canvas-settings-btn" title="Image settings" aria-label="Image settings">${iconHtml('settings-2')}</button>
        <div class="canvas-hint">Drag to pan · ⌘/Ctrl + scroll to zoom · Hover an image for tools</div>
        <div class="canvas-viewport">
            <div class="canvas-grid">
                <div class="canvas-grid-dots"></div>
                <div class="canvas-grid-dots canvas-grid-glow"></div>
            </div>
            <div class="canvas-world">
                <svg class="canvas-edges" viewBox="-50000 -50000 100000 100000" aria-hidden="true"></svg>
                <div class="canvas-nodes"></div>
            </div>
        </div>
        <div class="studio-toast" aria-live="polite"></div>
    `;
    document.body.appendChild(panel);

    canvas.panel = panel;
    canvas.viewport = panel.querySelector('.canvas-viewport');
    canvas.world = panel.querySelector('.canvas-world');
    canvas.edgesSvg = panel.querySelector('.canvas-edges');
    canvas.nodesLayer = panel.querySelector('.canvas-nodes');
    canvas.toast = panel.querySelector('.studio-toast');
    canvas.gridDots = panel.querySelectorAll('.canvas-grid-dots');
    canvas.gridGlow = panel.querySelector('.canvas-grid-glow');
    bindGridGlow();

    panel.querySelector('.canvas-close').addEventListener('click', closeCanvas);
    panel.querySelector('.canvas-settings-btn').addEventListener('click', () => toggleSettingsPanel());
    buildSettingsPanel(panel);
    bindViewport();

    document.addEventListener('keydown', event => {
        if (!canvas.open) return;
        if (annotate.active) {
            handleAnnotateKey(event);
            return;
        }
        if (event.key !== 'Escape') return;
        // typing in the chat keeps its own Escape (mention popup, rename)
        const typingOutside = event.target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]');
        if (typingOutside && !panel.contains(typingOutside)) return;
        const openPrompt = panel.querySelector('.canvas-node.prompt-open');
        if (promptPopover.node) {
            closePromptPopover();
        } else if (openPrompt) {
            closePromptBox(openPrompt);
        } else if (canvas.settingsPanel.classList.contains('open')) {
            toggleSettingsPanel(false);
        } else {
            closeCanvas();
        }
    });
}

function applyTransform() {
    const { pan, zoom } = canvas.state;
    canvas.world.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;
    // toolbars and prompt boxes keep their on-screen size at any zoom
    canvas.world.style.setProperty('--inv-zoom', String(1 / zoom));
    // the grid only ever moves within one cell (a transform, so it stays on
    // the compositor); the cell size follows the zoom
    const cell = 24 * zoom;
    const gx = ((pan.x % cell) + cell) % cell;
    const gy = ((pan.y % cell) + cell) % cell;
    canvas.gridShift = { x: gx - cell * 2, y: gy - cell * 2 };
    canvas.gridDots.forEach(el => {
        el.style.transform = `translate3d(${gx - cell * 2}px, ${gy - cell * 2}px, 0)`;
        el.style.backgroundSize = `${cell}px ${cell}px`;
    });
}

// A faint glow trails the pointer across the dot grid.
function bindGridGlow() {
    const viewport = canvas.viewport;
    const glow = canvas.gridGlow;
    const target = { x: -1000, y: -1000 };
    const current = { x: -1000, y: -1000 };
    let raf = 0;
    let visible = false;

    const tick = () => {
        raf = 0;
        // ease towards the pointer: the lag is what makes it whoosh
        current.x += (target.x - current.x) * 0.14;
        current.y += (target.y - current.y) * 0.14;
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const speed = Math.hypot(dx, dy);
        // the glow stretches along its direction of travel
        const angle = Math.atan2(dy, dx);
        const stretch = 1 + Math.min(speed / 140, 1.4);
        // the layer itself is shifted by the grid transform, so undo that
        const shift = canvas.gridShift || { x: 0, y: 0 };
        glow.style.setProperty('--glow-x', `${current.x - shift.x}px`);
        glow.style.setProperty('--glow-y', `${current.y - shift.y}px`);
        glow.style.setProperty('--glow-angle', `${angle}rad`);
        glow.style.setProperty('--glow-stretch', String(stretch));
        if (speed > 0.4 || visible !== glow.classList.contains('on')) raf = requestAnimationFrame(tick);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

    viewport.addEventListener('pointermove', event => {
        const rect = viewport.getBoundingClientRect();
        target.x = event.clientX - rect.left;
        target.y = event.clientY - rect.top;
        if (!visible) {
            visible = true;
            current.x = target.x;
            current.y = target.y;
            glow.classList.add('on');
        }
        schedule();
    });
    viewport.addEventListener('pointerleave', () => {
        visible = false;
        glow.classList.remove('on');
    });
}

function bindViewport() {
    const viewport = canvas.viewport;
    let panning = null;

    viewport.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        if (event.target.closest('.canvas-node, .canvas-close, .canvas-settings')) return;
        panning = { x: event.clientX, y: event.clientY, panX: canvas.state.pan.x, panY: canvas.state.pan.y };
        viewport.classList.add('panning');
        viewport.setPointerCapture(event.pointerId);
        panel_closeAnyPrompt();
        closePromptPopover();
    });
    viewport.addEventListener('pointermove', event => {
        if (!panning) return;
        canvas.state.pan.x = panning.panX + (event.clientX - panning.x);
        canvas.state.pan.y = panning.panY + (event.clientY - panning.y);
        applyTransform();
    });
    const endPan = () => {
        panning = null;
        viewport.classList.remove('panning');
    };
    viewport.addEventListener('pointerup', endPan);
    viewport.addEventListener('pointercancel', endPan);

    viewport.addEventListener('wheel', event => {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
            zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.01));
        } else {
            canvas.state.pan.x -= event.deltaX;
            canvas.state.pan.y -= event.deltaY;
            applyTransform();
        }
    }, { passive: false });
}

function panel_closeAnyPrompt() {
    canvas.panel.querySelectorAll('.canvas-node.prompt-open').forEach(closePromptBox);
}

function zoomAt(clientX, clientY, factor) {
    const state = canvas.state;
    const rect = canvas.viewport.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom * factor));
    const k = next / state.zoom;
    state.pan.x = sx - (sx - state.pan.x) * k;
    state.pan.y = sy - (sy - state.pan.y) * k;
    state.zoom = next;
    applyTransform();
}

let panAnimation = 0;

// Programmatic pans are driven frame by frame so the world and the grid
// glide together instead of the grid snapping while the world eases.
function animatePanTo(pan, zoom, duration = 620) {
    cancelAnimationFrame(panAnimation);
    const state = canvas.state;
    const from = { x: state.pan.x, y: state.pan.y, zoom: state.zoom };
    const to = { x: pan.x, y: pan.y, zoom: zoom || state.zoom };
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);
    const step = now => {
        const t = Math.min(1, (now - start) / duration);
        const k = ease(t);
        state.pan.x = from.x + (to.x - from.x) * k;
        state.pan.y = from.y + (to.y - from.y) * k;
        state.zoom = from.zoom + (to.zoom - from.zoom) * k;
        applyTransform();
        if (t < 1) panAnimation = requestAnimationFrame(step);
    };
    panAnimation = requestAnimationFrame(step);
}

function focusNode(node) {
    const rect = canvas.viewport.getBoundingClientRect();
    const zoom = canvas.state.zoom;
    const targetX = rect.width * 0.24 - node.x * zoom;
    const targetY = rect.height / 2 - (node.y + node.h / 2) * zoom;
    animatePanTo({ x: targetX, y: targetY });
}

// Pans (and zooms out if it must) so that every node in `nodes` sits inside
// the viewport, with room below for the toolbar. No-op when they already do.
function ensureVisible(nodes) {
    if (!nodes.length) return;
    const rect = canvas.viewport.getBoundingClientRect();
    const { pan, zoom } = canvas.state;
    const margin = 48;
    const toolbarRoom = 44;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + n.w));
    const minY = Math.min(...nodes.map(n => n.y - 24));
    const maxY = Math.max(...nodes.map(n => n.y + n.h + toolbarRoom));

    const inside = minX * zoom + pan.x >= margin && maxX * zoom + pan.x <= rect.width - margin
        && minY * zoom + pan.y >= margin && maxY * zoom + pan.y <= rect.height - margin;
    if (inside) return;

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    let nextZoom = Math.min(zoom, (rect.width - margin * 2) / boxW, (rect.height - margin * 2) / boxH);
    nextZoom = Math.max(ZOOM_MIN, Math.min(zoom, nextZoom));
    animatePanTo({
        x: rect.width / 2 - (minX + boxW / 2) * nextZoom,
        y: rect.height / 2 - (minY + boxH / 2) * nextZoom
    }, nextZoom);
}

function showToast(text, isError = false) {
    const toast = canvas.toast;
    toast.textContent = text;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ---- open / close ----
function openCanvasFromMessage(message, frameEl) {
    buildCanvas();
    const conversationId = message.conversationId ?? currentConversationId;
    canvas.conversationId = conversationId;
    canvas.state = getState(conversationId);
    renderState();

    const wasOpen = canvas.open;
    canvas.open = true;
    document.body.classList.add('image-canvas-open');
    if (!wasOpen) {
        // a freshly built panel needs a computed starting style before .open,
        // otherwise the browser skips the slide and it simply appears
        void canvas.panel.offsetWidth;
        requestAnimationFrame(() => canvas.panel.classList.add('open'));
    }

    // the panel slides in first; the image only lands once it has settled
    const delay = wasOpen ? 0 : 720;
    const existing = [...canvas.state.nodes.values()].find(n => n.messageId != null && String(n.messageId) === String(message.id));
    setTimeout(() => {
        if (!canvas.open) return;
        if (existing) {
            focusNode(existing);
            popNode(existing, false);
            return;
        }
        const node = addRootNode(message);
        popNode(node, true);
    }, delay);
}

function closeCanvas() {
    if (!canvas.built || !canvas.open) return;
    canvas.open = false;
    canvas.panel.classList.remove('open');
    document.body.classList.remove('image-canvas-open');
    toggleSettingsPanel(false);
    panel_closeAnyPrompt();
    closePromptPopover();
    if (annotate.active) closeAnnotate();
}

// Rebuilds the DOM for the active conversation's canvas state.
function renderState() {
    promptPopover.el = null;
    promptPopover.node = null;
    canvas.nodesLayer.innerHTML = '';
    canvas.edgesSvg.innerHTML = '';
    for (const node of canvas.state.nodes.values()) {
        node.el = null;
        mountNode(node);
    }
    for (const node of canvas.state.nodes.values()) {
        if (node.parentId != null) ensureEdge(node);
    }
    applyTransform();
}

// ---- nodes ----
function addRootNode(message) {
    const state = canvas.state;
    const dims = fitSize(message.imageWidth, message.imageHeight, NODE_ROOT_WIDTH, 460, NODE_ROOT_WIDTH);
    const rect = canvas.viewport.getBoundingClientRect();

    let x = 0;
    let y = 0;
    if (state.nodes.size) {
        let maxBottom = -Infinity;
        for (const other of state.nodes.values()) maxBottom = Math.max(maxBottom, other.y + other.h);
        y = maxBottom + 120;
    }

    const node = {
        id: `n${canvas.nextId++}`,
        parentId: null,
        x, y,
        w: dims.w,
        h: dims.h,
        dataUrl: message.image,
        mime: message.imageMime || mimeFromDataUrl(message.image),
        natW: message.imageWidth,
        natH: message.imageHeight,
        prompt: message.imagePrompt || '',
        label: message.imagePrompt || 'from chat',
        botId: message.botId ?? null,
        messageId: message.id,
        kind: 'root',
        status: 'ready',
        pinned: false,
        el: null
    };
    state.nodes.set(node.id, node);
    mountNode(node);

    if (state.nodes.size === 1) {
        state.pan = { x: rect.width * 0.24, y: rect.height / 2 - node.h / 2 };
        state.zoom = 1;
        applyTransform();
    } else {
        focusNode(node);
    }
    return node;
}

// `kind` is 'style' for a shuffle variant, 'edit' for one made with a prompt.
function addChildNode(parent, label, prompt, kind = 'style') {
    const state = canvas.state;
    const w = NODE_CHILD_WIDTH;
    const h = Math.round(w * (parent.h / parent.w));
    const node = {
        id: `n${canvas.nextId++}`,
        parentId: parent.id,
        x: parent.x + parent.w + NODE_GAP_X,
        y: parent.y,
        w, h,
        dataUrl: null,
        mime: null,
        natW: null,
        natH: null,
        prompt,
        label,
        botId: parent.botId,
        messageId: null,
        kind,
        status: 'loading',
        pinned: false,
        el: null
    };
    state.nodes.set(node.id, node);
    mountNode(node);
    layoutChildren(parent);
    ensureEdge(node);
    popNode(node, true);
    return node;
}

// Stacks a parent's auto-placed children to its right, centred on it.
function layoutChildren(parent) {
    const kids = [...canvas.state.nodes.values()].filter(n => n.parentId === parent.id && !n.pinned);
    if (!kids.length) return;
    const total = kids.reduce((sum, n) => sum + n.h, 0) + NODE_GAP_Y * (kids.length - 1);
    let y = parent.y + parent.h / 2 - total / 2;
    for (const kid of kids) {
        kid.x = parent.x + parent.w + NODE_GAP_X;
        kid.y = y;
        y += kid.h + NODE_GAP_Y;
        positionNode(kid);
        updateEdge(kid);
        for (const grandkid of canvas.state.nodes.values()) {
            if (grandkid.parentId === kid.id) updateEdge(grandkid);
        }
    }
}

function positionNode(node) {
    if (!node.el) return;
    node.el.style.left = `${node.x}px`;
    node.el.style.top = `${node.y}px`;
    node.el.style.width = `${node.w}px`;
    const frame = node.el.querySelector('.node-frame');
    frame.style.height = `${node.h}px`;
}

function mountNode(node) {
    const el = document.createElement('div');
    el.className = `canvas-node ${node.status}${node.kind === 'edit' ? ' edit' : ''}`;
    el.dataset.id = node.id;
    el.innerHTML = `
        <div class="node-label" title="${escapeHtml(node.prompt || node.label)}">${escapeHtml(truncate(node.label || '', 46))}</div>
        <div class="node-frame">
            ${node.dataUrl ? `<img src="${node.dataUrl}" alt="${escapeHtml(node.prompt)}" draggable="false" decoding="async">` : ''}
            ${node.annotations?.overlayUrl ? `<img class="node-annotation" src="${node.annotations.overlayUrl}" alt="" draggable="false" decoding="async">` : ''}
            <div class="node-shimmer"></div>
            <div class="node-error"></div>
            <div class="node-saved" title="In the chat">${iconHtml('check')}</div>
        </div>
        <div class="node-toolbar">
            <button type="button" data-act="shuffle" title="Make style variants">${iconHtml('shuffle')}</button>
            <button type="button" data-act="pen" title="Edit with a prompt">${iconHtml('pen-tool')}</button>
            <button type="button" data-act="annotate" title="Annotate and edit">${iconHtml('pencil-line')}</button>
            <button type="button" data-act="download" title="Download PNG">${iconHtml('download')}</button>
            <button type="button" data-act="send" title="Send to chat">${iconHtml('message-square-share')}</button>
        </div>
        <div class="node-prompt">
            <textarea rows="3" placeholder="Describe the change…" spellcheck="false"></textarea>
            <div class="node-prompt-actions">
                <button type="button" class="btn btn-secondary" data-act="cancel-prompt">Cancel</button>
                <button type="button" class="btn" data-act="submit-prompt">Paint</button>
            </div>
        </div>
    `;
    node.el = el;
    if (node.messageId != null) el.classList.add('saved');
    canvas.nodesLayer.appendChild(el);
    positionNode(node);
    bindNode(node);
}

function updateNodeAnnotationOverlay(node) {
    const frame = node.el?.querySelector('.node-frame');
    if (!frame) return;
    let overlay = frame.querySelector('.node-annotation');
    if (!node.annotations?.overlayUrl) {
        overlay?.remove();
        return;
    }
    if (!overlay) {
        overlay = document.createElement('img');
        overlay.className = 'node-annotation';
        overlay.alt = '';
        overlay.draggable = false;
        frame.insertBefore(overlay, frame.querySelector('.node-shimmer'));
    }
    overlay.src = node.annotations.overlayUrl;
}

function bindNode(node) {
    const el = node.el;
    const frame = el.querySelector('.node-frame');

    // drag to move
    let drag = null;
    frame.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.stopPropagation();
        drag = { x: event.clientX, y: event.clientY, nx: node.x, ny: node.y, moved: false };
        frame.setPointerCapture(event.pointerId);
        el.style.zIndex = String(++canvas.zTop);
    });
    frame.addEventListener('pointermove', event => {
        if (!drag) return;
        const dx = (event.clientX - drag.x) / canvas.state.zoom;
        const dy = (event.clientY - drag.y) / canvas.state.zoom;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return;
        drag.moved = true;
        el.classList.add('dragging');
        node.x = drag.nx + dx;
        node.y = drag.ny + dy;
        node.pinned = true;
        positionNode(node);
        updateEdge(node);
        for (const other of canvas.state.nodes.values()) {
            if (other.parentId === node.id) updateEdge(other);
        }
    });
    const endDrag = () => {
        if (drag && !drag.moved) {
            // a plain click: prompt-made variants show what they were asked
            if (node.kind === 'edit' && node.status === 'ready') togglePromptPopover(node);
            else closePromptPopover();
        }
        drag = null;
        el.classList.remove('dragging');
    };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    // hover lights the trail back to the root
    el.addEventListener('mouseenter', () => lightChain(node));
    el.addEventListener('mouseleave', () => unlightChain());

    // toolbar
    el.querySelector('.node-toolbar').addEventListener('click', event => {
        const button = event.target.closest('button[data-act]');
        if (!button) return;
        event.stopPropagation();
        const action = button.dataset.act;
        if (action === 'shuffle') shuffleNode(node);
        else if (action === 'pen') openPromptBox(el);
        else if (action === 'annotate') openAnnotate(node);
        else if (action === 'download') downloadNode(node);
        else if (action === 'send') sendNodeToChat(node);
    });
    el.querySelector('.node-toolbar').addEventListener('pointerdown', event => event.stopPropagation());

    // prompt box
    const promptBox = el.querySelector('.node-prompt');
    const textarea = promptBox.querySelector('textarea');
    promptBox.addEventListener('pointerdown', event => event.stopPropagation());
    promptBox.querySelector('[data-act="cancel-prompt"]').addEventListener('click', () => closePromptBox(el));
    promptBox.querySelector('[data-act="submit-prompt"]').addEventListener('click', () => submitPromptBox(node));
    textarea.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submitPromptBox(node);
        }
        event.stopPropagation();
    });

    // error nodes: click to dismiss
    el.querySelector('.node-error').addEventListener('click', event => {
        event.stopPropagation();
        if (node.status === 'error') removeNode(node);
    });
}

function popNode(node, sweep) {
    const el = node.el;
    if (!el) return;
    el.style.zIndex = String(++canvas.zTop);
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    if (sweep) {
        const shimmer = el.querySelector('.node-shimmer');
        shimmer.classList.remove('sweep');
        void shimmer.offsetWidth;
        shimmer.classList.add('sweep');
        setTimeout(() => shimmer.classList.remove('sweep'), 1000);
    }
    setTimeout(() => el.classList.remove('pop'), 800);
}

function fillNode(node, result, decoded) {
    node.dataUrl = result.dataUrl;
    node.mime = result.mime;
    node.natW = decoded.naturalWidth;
    node.natH = decoded.naturalHeight;
    node.h = Math.round(node.w * (node.natH / node.natW));
    node.status = 'ready';

    const el = node.el;
    const frame = el.querySelector('.node-frame');
    frame.style.height = `${node.h}px`;
    const img = document.createElement('img');
    img.src = result.dataUrl;
    img.alt = node.prompt;
    img.draggable = false;
    img.decoding = 'async';
    img.classList.add('fade');
    frame.insertBefore(img, frame.firstChild);
    el.classList.remove('loading');
    el.classList.add('ready');
    requestAnimationFrame(() => img.classList.add('in'));

    const parent = canvas.state.nodes.get(node.parentId);
    if (parent) layoutChildren(parent);
    updateEdge(node);
    popNode(node, true);
}

function failNode(node, error) {
    node.status = 'error';
    node.el.classList.remove('loading');
    node.el.classList.add('error');
    node.el.querySelector('.node-error').textContent = `${error.message}\nClick to dismiss.`;
}

function removeNode(node) {
    const state = canvas.state;
    for (const other of [...state.nodes.values()]) {
        if (other.parentId === node.id) removeNode(other);
    }
    if (promptPopover.node === node) closePromptPopover();
    const edge = state.edges.get(node.id);
    if (edge) {
        edge.group.remove();
        state.edges.delete(node.id);
    }
    node.el?.remove();
    state.nodes.delete(node.id);
}

// ---- edges (orthogonal, rounded corners) ----
function roundedPath(points, radius) {
    const pts = points.filter((p, i) => i === 0 || Math.abs(p.x - points[i - 1].x) > 0.01 || Math.abs(p.y - points[i - 1].y) > 0.01);
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const r = Math.min(radius, d1 / 2, d2 / 2);
        if (r < 0.5) {
            d += ` L ${p1.x} ${p1.y}`;
            continue;
        }
        const a = { x: p1.x + (p0.x - p1.x) / d1 * r, y: p1.y + (p0.y - p1.y) / d1 * r };
        const b = { x: p1.x + (p2.x - p1.x) / d2 * r, y: p1.y + (p2.y - p1.y) / d2 * r };
        d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
}

function routeEdge(parent, child) {
    const x1 = parent.x + parent.w;
    const y1 = parent.y + parent.h / 2;
    const x2 = child.x;
    const y2 = child.y + child.h / 2;
    const r = 16;

    if (x2 - x1 >= r * 2 + 8) {
        const mx = (x1 + x2) / 2;
        return roundedPath([{ x: x1, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: x2, y: y2 }], r);
    }

    // the child sits beside or behind its parent: loop around through a channel
    const out = 28;
    const below = Math.max(parent.y + parent.h, child.y + child.h) + 40;
    const above = Math.min(parent.y, child.y) - 40;
    const my = (y2 >= y1) ? below : above;
    return roundedPath([
        { x: x1, y: y1 }, { x: x1 + out, y: y1 }, { x: x1 + out, y: my },
        { x: x2 - out, y: my }, { x: x2 - out, y: y2 }, { x: x2, y: y2 }
    ], r);
}

function ensureEdge(node) {
    const state = canvas.state;
    if (node.parentId == null || state.edges.has(node.id)) return updateEdge(node);
    const svgNS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(svgNS, 'g');
    group.classList.add('canvas-edge-group');
    const hit = document.createElementNS(svgNS, 'path');
    hit.classList.add('canvas-edge-hit');
    const path = document.createElementNS(svgNS, 'path');
    path.classList.add('canvas-edge');
    path.dataset.child = node.id;
    group.appendChild(hit);
    group.appendChild(path);

    // a prompt-made variant gets a knot on its connector that opens the prompt
    let knot = null;
    if (node.kind === 'edit') {
        group.classList.add('edit');
        knot = document.createElementNS(svgNS, 'circle');
        knot.classList.add('edge-knot');
        knot.setAttribute('r', '9');
        group.appendChild(knot);
        const open = event => {
            event.stopPropagation();
            togglePromptPopover(node);
        };
        for (const target of [hit, knot]) {
            target.addEventListener('click', open);
            target.addEventListener('pointerdown', event => event.stopPropagation());
        }
    }

    canvas.edgesSvg.appendChild(group);
    const edge = { group, path, hit, knot, childId: node.id, d: '', total: 0, knotFrac: 0.5, knotPos: 0, knotTarget: 0, anim: 0, samples: null };
    state.edges.set(node.id, edge);
    updateEdge(node);

    if (knot) {
        // the knot rests halfway along the connector and slides towards the
        // pointer while it hovers anywhere on the connection
        const follow = event => {
            const point = toWorldPoint(event.clientX, event.clientY);
            const nearest = nearestOnEdge(edge, point);
            edge.knotTarget = nearest.l;
            animateKnot(edge);
        };
        group.addEventListener('pointerenter', follow);
        group.addEventListener('pointermove', follow);
        group.addEventListener('pointerleave', () => {
            edge.knotTarget = edge.total / 2;
            animateKnot(edge);
        });
    }

    // draw the new connector in from parent to child
    try {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.transition = 'stroke-dashoffset 0.55s var(--ease-out)';
        requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
        setTimeout(() => {
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
            path.style.transition = '';
        }, 620);
    } catch (error) { /* not attached yet */ }
}

function updateEdge(node) {
    const state = canvas.state;
    const edge = state.edges.get(node.id);
    const parent = state.nodes.get(node.parentId);
    if (!edge || !parent) return;
    const d = routeEdge(parent, node);
    edge.path.setAttribute('d', d);
    edge.hit.setAttribute('d', d);
    if (d !== edge.d) {
        edge.d = d;
        edge.samples = null;
        try { edge.total = edge.path.getTotalLength(); } catch (error) { edge.total = 0; }
    }
    if (edge.knot) {
        // keep the knot at the same fraction of the (re-routed) connector
        placeKnot(edge, edge.total * edge.knotFrac);
        edge.knotTarget = edge.total * edge.knotFrac;
    }
    if (promptPopover.node === node) positionPromptPopover();
}

function toWorldPoint(clientX, clientY) {
    const rect = canvas.viewport.getBoundingClientRect();
    const { pan, zoom } = canvas.state;
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
}

function edgeSamples(edge) {
    if (edge.samples) return edge.samples;
    const samples = [];
    const total = edge.total;
    const step = Math.max(4, total / 160);
    for (let l = 0; l <= total; l += step) {
        const p = edge.path.getPointAtLength(l);
        samples.push({ l, x: p.x, y: p.y });
    }
    const end = edge.path.getPointAtLength(total);
    samples.push({ l: total, x: end.x, y: end.y });
    edge.samples = samples;
    return samples;
}

function nearestOnEdge(edge, point) {
    let best = null;
    let bestDist = Infinity;
    for (const sample of edgeSamples(edge)) {
        const dist = Math.hypot(sample.x - point.x, sample.y - point.y);
        if (dist < bestDist) {
            bestDist = dist;
            best = sample;
        }
    }
    return best || { l: edge.total / 2 };
}

function placeKnot(edge, length) {
    if (!edge.knot || !edge.total) return;
    const clamped = Math.max(0, Math.min(edge.total, length));
    const p = edge.path.getPointAtLength(clamped);
    edge.knot.setAttribute('cx', String(p.x));
    edge.knot.setAttribute('cy', String(p.y));
    edge.knotPos = clamped;
    edge.knotFrac = clamped / edge.total;
    if (promptPopover.node && promptPopover.node.id === edge.childId) positionPromptPopover();
}

function animateKnot(edge) {
    if (edge.anim) return;
    const step = () => {
        edge.anim = 0;
        const diff = edge.knotTarget - edge.knotPos;
        if (Math.abs(diff) < 0.4) {
            placeKnot(edge, edge.knotTarget);
            return;
        }
        placeKnot(edge, edge.knotPos + diff * 0.16);
        edge.anim = requestAnimationFrame(step);
    };
    edge.anim = requestAnimationFrame(step);
}

// ---- prompt popover (read-only) on a prompt-made variant ----
const promptPopover = { el: null, node: null };

function togglePromptPopover(node) {
    if (promptPopover.node === node) closePromptPopover();
    else showPromptPopover(node);
}

function showPromptPopover(node) {
    closePromptPopover();
    const el = document.createElement('div');
    el.className = 'edge-prompt-popover';
    el.innerHTML = `
        <div class="edge-prompt-label">Prompt</div>
        <div class="edge-prompt-text">${escapeHtml(node.prompt)}</div>
    `;
    el.addEventListener('pointerdown', event => event.stopPropagation());
    canvas.nodesLayer.appendChild(el);
    promptPopover.el = el;
    promptPopover.node = node;
    node.el?.classList.add('prompt-showing');
    canvas.state.edges.get(node.id)?.group.classList.add('active');
    positionPromptPopover();
    requestAnimationFrame(() => el.classList.add('show'));
}

function positionPromptPopover() {
    const { el, node } = promptPopover;
    if (!el || !node) return;
    const edge = canvas.state.edges.get(node.id);
    const cx = edge?.knot ? parseFloat(edge.knot.getAttribute('cx')) : node.x;
    const cy = edge?.knot ? parseFloat(edge.knot.getAttribute('cy')) : node.y + node.h / 2;
    el.style.left = `${cx}px`;
    el.style.top = `${cy + 18}px`;
}

function closePromptPopover() {
    const { el, node } = promptPopover;
    if (!el) return;
    promptPopover.el = null;
    promptPopover.node = null;
    node?.el?.classList.remove('prompt-showing');
    canvas.state?.edges.get(node?.id)?.group.classList.remove('active');
    el.remove();
}

let litTimers = [];

function lightChain(node) {
    unlightChain();
    const state = canvas.state;
    let current = node;
    let step = 0;
    while (current && current.parentId != null) {
        const edge = state.edges.get(current.id);
        const parent = state.nodes.get(current.parentId);
        const delay = step * 90;
        litTimers.push(setTimeout(() => {
            edge?.path.classList.add('lit');
            parent?.el?.classList.add('in-chain');
        }, delay));
        current = parent;
        step++;
    }
}

function unlightChain() {
    litTimers.forEach(clearTimeout);
    litTimers = [];
    canvas.edgesSvg.querySelectorAll('.canvas-edge.lit').forEach(edge => edge.classList.remove('lit'));
    canvas.nodesLayer.querySelectorAll('.canvas-node.in-chain').forEach(el => el.classList.remove('in-chain'));
}

// ---- actions ----
async function resolveBot(node) {
    let bot = node.botId != null ? await getBot(node.botId) : null;
    if (!bot || bot.kind !== 'image') {
        const bots = await getAllBotsWithColors();
        bot = bots.find(b => b.kind === 'image') || null;
    }
    if (!bot) throw new Error('No image bot is set up. Create one in Settings → Bots.');
    return bot;
}

// Adds the child straight away (so it can be revealed) and paints it in the
// background; errors land on the node itself.
function paintChild(parent, label, prompt, kind = 'style', source = null) {
    const child = addChildNode(parent, label, prompt, kind);
    paintInto(parent, child, prompt, source);
    return child;
}

async function paintInto(parent, child, prompt, source = null) {
    try {
        const bot = await resolveBot(parent);
        const reference = source || { dataUrl: parent.dataUrl, mime: parent.mime };
        const result = await generateImage(bot, prompt, [reference]);
        const decoded = await loadImage(result.dataUrl);
        if (!canvas.state.nodes.has(child.id)) return; // removed meanwhile
        fillNode(child, result, decoded);
    } catch (error) {
        console.error('Canvas generation failed:', error);
        if (canvas.state.nodes.has(child.id)) failNode(child, error);
    }
}

function shuffleNode(node) {
    if (node.status !== 'ready') return;
    const count = Math.max(1, Math.min(6, parseInt(settings.variations, 10) || 3));
    const styles = (settings.styles || []).map(s => String(s).trim()).filter(Boolean);
    if (!styles.length) {
        showToast('Add at least one art style in settings first.', true);
        toggleSettingsPanel(true);
        return;
    }
    // start from a style this image hasn't been given yet, cycling if needed
    const used = new Set([...canvas.state.nodes.values()].filter(n => n.parentId === node.id).map(n => n.label));
    const fresh = styles.filter(s => !used.has(s));
    const pool = fresh.length >= count ? fresh : styles;
    const picks = [];
    for (let i = 0; i < count; i++) picks.push(pool[i % pool.length]);

    const template = settings.stylePrompt || DEFAULT_SETTINGS.stylePrompt;
    const children = picks.map(style => {
        const prompt = template.includes('{style}') ? template.replace(/\{style\}/g, style) : `${template} ${style}`;
        return paintChild(node, style, prompt, 'style');
    });
    ensureVisible([node, ...children]);
}

function openPromptBox(el) {
    panel_closeAnyPrompt();
    el.classList.add('prompt-open');
    el.style.zIndex = String(++canvas.zTop);
    const textarea = el.querySelector('.node-prompt textarea');
    textarea.value = '';
    setTimeout(() => textarea.focus({ preventScroll: true }), 60);
}

function closePromptBox(el) {
    el.classList.remove('prompt-open');
}

function submitPromptBox(node) {
    const el = node.el;
    const textarea = el.querySelector('.node-prompt textarea');
    const prompt = textarea.value.trim();
    if (!prompt) {
        textarea.focus();
        return;
    }
    closePromptBox(el);
    const child = paintChild(node, prompt, prompt, 'edit');
    ensureVisible([node, child]);
}

function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

async function downloadNode(node) {
    if (node.status !== 'ready' || !node.dataUrl) return;
    let href = node.dataUrl;
    if (node.mime !== 'image/png') {
        try {
            const img = await loadImage(node.dataUrl);
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            href = c.toDataURL('image/png');
        } catch (error) {
            showToast('Could not convert this image to PNG.', true);
            return;
        }
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = `${slugify(node.prompt) || 'image'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Saved as PNG');
}

async function sendNodeToChat(node) {
    if (node.status !== 'ready' || !node.dataUrl) return;
    if (node.messageId != null) {
        showToast('This image is already in the chat.');
        return;
    }
    const conversationId = canvas.conversationId;
    if (conversationId == null || String(conversationId) !== String(currentConversationId)) {
        showToast('Open the conversation this canvas belongs to first.', true);
        return;
    }
    try {
        const bot = await resolveBot(node);
        const message = buildImageMessage(
            conversationId, bot,
            { dataUrl: node.dataUrl, mime: node.mime, text: '' },
            { w: node.natW, h: node.natH },
            node.prompt,
            { fromCanvas: true }
        );
        await saveMessage(message);
        node.messageId = message.id;
        node.el.classList.add('saved');
        await updateConversationPreview(conversationId, `${bot.name}: 🖼 ${truncate(node.prompt, 50)}`);
        updateContextPill();
        showToast('Sent to chat');
    } catch (error) {
        console.error('Send to chat failed:', error);
        showToast(error.message, true);
    }
}

// ---- settings side panel ----
const ASPECT_RATIOS = ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9'];
const IMAGE_SIZES = ['auto', '1K', '2K', '4K'];

function buildSettingsPanel(panel) {
    const aside = document.createElement('aside');
    aside.className = 'canvas-settings';
    aside.innerHTML = `
        <div class="canvas-settings-header">
            <div>
                <div class="canvas-settings-title">Image settings</div>
                <div class="canvas-settings-sub">Saved on this device</div>
            </div>
            <button type="button" class="canvas-settings-close" aria-label="Close settings">${iconHtml('x')}</button>
        </div>
        <div class="canvas-settings-body">
            <section>
                <h4>Model behaviour</h4>
                <label class="cs-field">
                    <span class="cs-label">Temperature <output data-out="temperature"></output></span>
                    <input type="range" min="0" max="2" step="0.05" data-key="temperature">
                </label>
                <label class="cs-field">
                    <span class="cs-label">Top P <output data-out="topP"></output></span>
                    <input type="range" min="0" max="1" step="0.01" data-key="topP">
                </label>
                <div class="cs-row">
                    <label class="cs-field">
                        <span class="cs-label">Aspect ratio</span>
                        <select class="form-select" data-key="aspectRatio">
                            ${ASPECT_RATIOS.map(r => `<option value="${r}">${r === 'auto' ? 'Auto' : r}</option>`).join('')}
                        </select>
                    </label>
                    <label class="cs-field">
                        <span class="cs-label">Image size</span>
                        <select class="form-select" data-key="imageSize">
                            ${IMAGE_SIZES.map(s => `<option value="${s}">${s === 'auto' ? 'Auto' : s}</option>`).join('')}
                        </select>
                    </label>
                </div>
                <label class="cs-field">
                    <span class="cs-label">Seed <small>blank for random</small></span>
                    <input type="number" class="form-input" data-key="seed" placeholder="Random" step="1">
                </label>
                <div class="form-hint">Image size applies to Gemini 3 Pro Image; other models ignore it.</div>
            </section>
            <section>
                <h4>Style variants</h4>
                <label class="cs-field">
                    <span class="cs-label">Number of variants</span>
                    <input type="number" class="form-input" min="1" max="6" step="1" data-key="variations">
                </label>
                <label class="cs-field">
                    <span class="cs-label">Variant prompt <small>{style} is replaced</small></span>
                    <textarea class="form-textarea" rows="3" data-key="stylePrompt" spellcheck="false"></textarea>
                </label>
                <label class="cs-field">
                    <span class="cs-label">Art styles <small>one per line, used in order</small></span>
                    <textarea class="form-textarea cs-styles" rows="8" data-key="styles" spellcheck="false"></textarea>
                </label>
            </section>
        </div>
        <div class="canvas-settings-footer">
            <span class="cs-saved">Saved</span>
            <button type="button" class="btn btn-secondary" data-act="reset">Reset to defaults</button>
        </div>
    `;
    panel.appendChild(aside);
    canvas.settingsPanel = aside;

    aside.querySelector('.canvas-settings-close').addEventListener('click', () => toggleSettingsPanel(false));
    aside.querySelector('[data-act="reset"]').addEventListener('click', () => {
        resetSettings();
        syncSettingsPanel();
        flashSaved();
    });
    aside.addEventListener('pointerdown', event => event.stopPropagation());
    aside.addEventListener('wheel', event => event.stopPropagation());

    aside.querySelectorAll('[data-key]').forEach(input => {
        const key = input.dataset.key;
        const handler = () => {
            if (key === 'styles') {
                settings.styles = input.value.split('\n').map(s => s.trim()).filter(Boolean);
            } else if (key === 'variations') {
                settings.variations = Math.max(1, Math.min(6, parseInt(input.value, 10) || 3));
            } else if (key === 'seed') {
                settings.seed = input.value.trim() === '' ? '' : parseInt(input.value, 10);
            } else if (input.type === 'range') {
                settings[key] = parseFloat(input.value);
            } else {
                settings[key] = input.value;
            }
            saveSettings();
            syncOutputs();
            flashSaved();
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
    });

    syncSettingsPanel();
}

function syncOutputs() {
    const aside = canvas.settingsPanel;
    aside.querySelector('[data-out="temperature"]').textContent = Number(settings.temperature).toFixed(2);
    aside.querySelector('[data-out="topP"]').textContent = Number(settings.topP).toFixed(2);
}

function syncSettingsPanel() {
    const aside = canvas.settingsPanel;
    aside.querySelectorAll('[data-key]').forEach(input => {
        const key = input.dataset.key;
        if (key === 'styles') input.value = (settings.styles || []).join('\n');
        else if (key === 'seed') input.value = settings.seed === '' || settings.seed == null ? '' : settings.seed;
        else input.value = settings[key];
    });
    syncOutputs();
}

let savedFlashTimer = null;
function flashSaved() {
    const el = canvas.settingsPanel.querySelector('.cs-saved');
    el.classList.add('show');
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => el.classList.remove('show'), 1200);
}

function toggleSettingsPanel(force) {
    if (!canvas.settingsPanel) return;
    const open = typeof force === 'boolean' ? force : !canvas.settingsPanel.classList.contains('open');
    canvas.settingsPanel.classList.toggle('open', open);
    if (open) syncSettingsPanel();
}

// =============================================
// ANNOTATE MODE
// The image floats off the canvas to the centre of the screen; the pen
// scribbles on it and the text tool writes notes over it. "Generate" sends
// the marked-up image to the model and keeps the marks on the source node.
// =============================================
const ANNOTATE_COLOR = '#ff3b5c';

const annotate = {
    built: false,
    active: false,
    node: null,
    root: null,
    stage: null,
    ink: null,
    ctx: null,
    surface: null,
    textsLayer: null,
    tools: null,
    tool: 'pen',
    color: ANNOTATE_COLOR,
    colorInput: null,
    strokes: [],
    texts: [],
    current: null,
    scale: 1,
    raf: 0
};

function buildAnnotate() {
    if (annotate.built) return;
    annotate.built = true;
    primeIcons();

    const root = document.createElement('div');
    root.className = 'annotate-root';
    root.dataset.tool = 'pen';
    root.innerHTML = `
        <div class="annotate-backdrop"></div>
        <button type="button" class="annotate-cancel" title="Discard and go back (Esc)" aria-label="Discard annotations">${iconHtml('x')}</button>
        <div class="annotate-stage">
            <img class="annotate-base" alt="" draggable="false" decoding="async">
            <canvas class="annotate-ink"></canvas>
            <div class="annotate-surface"></div>
            <div class="annotate-texts"></div>
        </div>
        <div class="annotate-tools">
            <div class="annotate-swatch" title="Pen colour">
                <input type="color" class="annotate-color" value="${ANNOTATE_COLOR}" aria-label="Pen colour">
            </div>
            <div class="annotate-toolbar">
                <button type="button" data-tool="pen" class="active" title="Pen (P)" aria-label="Pen">${iconHtml('pencil')}</button>
                <button type="button" data-tool="text" title="Text (T)" aria-label="Text">${iconHtml('type')}</button>
            </div>
            <button type="button" class="annotate-done" title="Generate from these notes" aria-label="Generate from these notes">${iconHtml('redo-2')}</button>
        </div>
        <div class="annotate-hint">Scribble where things should change, add notes with the text tool, then generate</div>
    `;
    document.body.appendChild(root);

    annotate.root = root;
    annotate.stage = root.querySelector('.annotate-stage');
    annotate.ink = root.querySelector('.annotate-ink');
    annotate.ctx = annotate.ink.getContext('2d');
    annotate.surface = root.querySelector('.annotate-surface');
    annotate.textsLayer = root.querySelector('.annotate-texts');
    annotate.tools = root.querySelector('.annotate-tools');

    // the pen colour: a Chromatic picker behind a round swatch
    const colorInput = root.querySelector('.annotate-color');
    annotate.colorInput = colorInput;
    annotate.color = settings.penColor || ANNOTATE_COLOR;
    if (window.Chromatic) Chromatic.setValue(colorInput, annotate.color);
    colorInput.addEventListener('input', () => {
        annotate.color = colorInput.value;
        settings.penColor = colorInput.value;
        saveSettings();
    });
    root.querySelector('.annotate-swatch').addEventListener('pointerdown', event => event.stopPropagation());

    root.querySelector('.annotate-cancel').addEventListener('click', () => closeAnnotate());
    root.querySelector('.annotate-done').addEventListener('click', finishAnnotate);
    root.querySelector('.annotate-backdrop').addEventListener('click', () => closeAnnotate());
    root.querySelectorAll('.annotate-toolbar button').forEach(button => {
        button.addEventListener('click', () => setAnnotateTool(button.dataset.tool));
    });

    // ---- pen ----
    const surface = annotate.surface;
    surface.addEventListener('pointerdown', event => {
        if (annotate.tool !== 'pen' || event.button !== 0) return;
        event.preventDefault();
        surface.setPointerCapture(event.pointerId);
        annotate.current = { color: annotate.color || ANNOTATE_COLOR, width: annotateStrokeWidth(), points: [annotatePoint(event)] };
        annotate.strokes.push(annotate.current);
        scheduleInkRedraw();
    });
    surface.addEventListener('pointermove', event => {
        if (!annotate.current) return;
        const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
        for (const e of events) annotate.current.points.push(annotatePoint(e));
        scheduleInkRedraw();
    });
    const endStroke = () => {
        if (!annotate.current) return;
        if (annotate.current.points.length === 1) annotate.current.points.push({ ...annotate.current.points[0] });
        annotate.current = null;
        scheduleInkRedraw();
    };
    surface.addEventListener('pointerup', endStroke);
    surface.addEventListener('pointercancel', endStroke);

    // ---- text ----
    annotate.textsLayer.addEventListener('pointerdown', event => {
        if (annotate.tool !== 'text' || event.target !== annotate.textsLayer || event.button !== 0) return;
        event.preventDefault();
        const point = annotatePoint(event);
        addAnnotateText({ x: point.x, y: point.y, text: '' }, true);
    });
}

function annotateFontSize(node) {
    return Math.max(14, Math.round(node.natW / 26));
}

function annotateStrokeWidth() {
    const node = annotate.node;
    return Math.max(3, Math.round(node.natW / 220));
}

function annotatePoint(event) {
    const rect = annotate.stage.getBoundingClientRect();
    const node = annotate.node;
    return {
        x: (event.clientX - rect.left) / rect.width * node.natW,
        y: (event.clientY - rect.top) / rect.height * node.natH
    };
}

function scheduleInkRedraw() {
    if (annotate.raf) return;
    annotate.raf = requestAnimationFrame(() => {
        annotate.raf = 0;
        drawStrokes(annotate.ctx, annotate.strokes, annotate.ink.width, annotate.ink.height);
    });
}

function drawStrokes(ctx, strokes, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
        const pts = stroke.points;
        if (!pts.length) continue;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (pts.length < 3) {
            const last = pts[pts.length - 1];
            ctx.lineTo(last.x, last.y);
        } else {
            for (let i = 1; i < pts.length - 1; i++) {
                const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
            }
            const last = pts[pts.length - 1];
            ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
    }
}

function addAnnotateText(entry, focus) {
    const node = annotate.node;
    const box = document.createElement('div');
    box.className = 'annotate-text';
    box.contentEditable = 'plaintext-only';
    box.spellcheck = false;
    box.style.left = `${entry.x / node.natW * 100}%`;
    box.style.top = `${entry.y / node.natH * 100}%`;
    box.style.fontSize = `${annotateFontSize(node) * annotate.scale}px`;
    box.textContent = entry.text || '';
    entry.el = box;
    annotate.texts.push(entry);
    annotate.textsLayer.appendChild(box);

    box.addEventListener('input', () => { entry.text = box.innerText; });
    box.addEventListener('pointerdown', event => event.stopPropagation());
    box.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape') {
            event.preventDefault();
            box.blur();
        }
    });
    box.addEventListener('blur', () => {
        if (!box.innerText.trim()) {
            annotate.texts = annotate.texts.filter(t => t !== entry);
            box.remove();
        }
    });
    if (focus) {
        box.focus({ preventScroll: true });
        // place the caret at the end when re-editing an existing note
        const range = document.createRange();
        range.selectNodeContents(box);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function setAnnotateTool(tool) {
    annotate.tool = tool;
    annotate.root.dataset.tool = tool;
    annotate.root.querySelectorAll('.annotate-toolbar button').forEach(button => {
        button.classList.toggle('active', button.dataset.tool === tool);
    });
    if (tool === 'pen' && document.activeElement?.classList.contains('annotate-text')) {
        document.activeElement.blur();
    }
}

function handleAnnotateKey(event) {
    const typing = event.target.closest('.annotate-text');
    if (typing) return; // the text box handles its own keys
    if (event.key === 'Escape') {
        // an open colour picker takes the first Escape for itself
        if (document.querySelector('.cp-panel.cp-open')) return;
        event.preventDefault();
        closeAnnotate();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        annotate.strokes.pop();
        scheduleInkRedraw();
    } else if (event.key.toLowerCase() === 'p') {
        setAnnotateTool('pen');
    } else if (event.key.toLowerCase() === 't') {
        setAnnotateTool('text');
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        finishAnnotate();
    }
}

// Where the image lands: centred, comfortably large, leaving room for the
// side tools on its right.
function annotateTargetRect(node) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(vw * 0.62, 1100);
    const maxH = vh * 0.76;
    const scale = Math.min(maxW / node.natW, maxH / node.natH);
    const width = node.natW * scale;
    const height = node.natH * scale;
    return { left: (vw - width) / 2 - 28, top: (vh - height) / 2, width, height };
}

function openAnnotate(node) {
    if (node.status !== 'ready' || annotate.active) return;
    buildAnnotate();
    panel_closeAnyPrompt();
    closePromptPopover();

    const a = annotate;
    a.node = node;
    a.active = true;
    a.strokes = (node.annotations?.strokes || []).map(s => ({ ...s, points: s.points.map(p => ({ ...p })) }));
    a.texts = [];
    a.current = null;

    a.root.querySelector('.annotate-base').src = node.dataUrl;
    a.ink.width = node.natW;
    a.ink.height = node.natH;

    const from = node.el.querySelector('.node-frame').getBoundingClientRect();
    const to = annotateTargetRect(node);
    a.scale = to.width / node.natW;
    a.stage.style.transition = 'none';
    Object.assign(a.stage.style, {
        left: `${to.left}px`,
        top: `${to.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        transform: `translate3d(${from.left - to.left}px, ${from.top - to.top}px, 0) scale(${from.width / to.width})`
    });
    a.tools.style.left = `${to.left + to.width + 16}px`;
    a.tools.style.top = `${to.top + to.height / 2}px`;

    a.textsLayer.innerHTML = '';
    (node.annotations?.texts || []).forEach(t => addAnnotateText({ x: t.x, y: t.y, text: t.text }, false));
    drawStrokes(a.ctx, a.strokes, a.ink.width, a.ink.height);
    setAnnotateTool('pen');
    if (window.Chromatic && a.colorInput) Chromatic.setValue(a.colorInput, a.color);

    a.root.classList.add('open');
    node.el.classList.add('annotating');
    void a.stage.offsetWidth;
    a.stage.style.transition = '';
    a.stage.style.transform = 'translate3d(0, 0, 0) scale(1)';
    setTimeout(() => a.root.classList.add('ready'), 380);
}

// Flies the image back onto its node and takes the overlay down.
function closeAnnotate() {
    const a = annotate;
    if (!a.active) return Promise.resolve();
    a.active = false;
    a.current = null;
    const node = a.node;
    a.root.classList.remove('ready');
    a.root.classList.remove('open');
    if (document.activeElement?.classList.contains('annotate-text')) document.activeElement.blur();
    if (window.Chromatic && a.colorInput) Chromatic.get(a.colorInput)?.close();

    const to = a.stage.getBoundingClientRect();
    const frame = node.el?.querySelector('.node-frame');
    const from = frame ? frame.getBoundingClientRect() : to;
    a.stage.style.transform = `translate3d(${from.left - to.left}px, ${from.top - to.top}px, 0) scale(${from.width / to.width})`;

    return new Promise(resolve => {
        setTimeout(() => {
            node.el?.classList.remove('annotating');
            a.root.classList.add('parked');
            a.stage.style.transition = 'none';
            a.stage.style.transform = '';
            a.textsLayer.innerHTML = '';
            a.texts = [];
            a.node = null;
            setTimeout(() => a.root.classList.remove('parked'), 30);
            resolve();
        }, 600);
    });
}

async function renderAnnotationLayers(node, strokes, texts) {
    const base = await loadImage(node.dataUrl);
    const w = node.natW;
    const h = node.natH;
    const font = annotateFontSize(node);

    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const ctx = layer.getContext('2d');
    drawStrokes(ctx, strokes, w, h);
    ctx.font = `600 ${font}px Satoshi, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const t of texts) {
        const lines = t.text.split('\n');
        lines.forEach((line, i) => {
            const x = t.x + font * 0.3;
            const y = t.y + font * 0.1 + i * font * 1.25;
            ctx.lineWidth = font * 0.18;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.strokeText(line, x, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(line, x, y);
        });
    }

    const composite = document.createElement('canvas');
    composite.width = w;
    composite.height = h;
    const cctx = composite.getContext('2d');
    cctx.drawImage(base, 0, 0, w, h);
    cctx.drawImage(layer, 0, 0);

    return { overlayUrl: layer.toDataURL('image/png'), compositeUrl: composite.toDataURL('image/png') };
}

async function finishAnnotate() {
    const a = annotate;
    if (!a.active) return;
    const node = a.node;
    if (document.activeElement?.classList.contains('annotate-text')) document.activeElement.blur();
    const texts = a.texts.filter(t => t.text.trim()).map(t => ({ x: t.x, y: t.y, text: t.text.trim() }));
    const strokes = a.strokes.filter(s => s.points.length).map(s => ({ color: s.color, width: s.width, points: s.points.map(p => ({ x: p.x, y: p.y })) }));

    if (!strokes.length && !texts.length) {
        showToast('Draw or write something first.', true);
        return;
    }

    let layers;
    try {
        layers = await renderAnnotationLayers(node, strokes, texts);
    } catch (error) {
        showToast('Could not render the annotations.', true);
        return;
    }
    node.annotations = { strokes, texts, overlayUrl: layers.overlayUrl };
    updateNodeAnnotationOverlay(node);

    const notes = texts.map(t => `"${t.text}"`).join('; ');
    const prompt = 'Edit this image according to the annotations drawn on it. '
        + 'The coloured scribbles mark where the changes go'
        + (notes ? ` and the handwritten notes say what to do: ${notes}.` : '.')
        + ' Apply those changes faithfully and return a clean image with none of the annotation marks or note text left in it.';

    await closeAnnotate();
    const child = paintChild(node, notes ? `annotated: ${texts[0].text}` : 'annotated edit', prompt, 'edit', { dataUrl: layers.compositeUrl, mime: 'image/png' });
    ensureVisible([node, child]);
}

// =============================================
// PUBLIC API
// =============================================
window.ImageStudio = {
    GEMINI_IMAGE_MODELS,
    IMAGE_MODEL_DEFAULTS,
    IMAGE_PROVIDERS,
    imageModelLabel,
    validateImageModel,
    generateImage,
    getSettings,
    brushMarkup,
    openBotKindPopover,
    closeBotKindPopover,
    respond,
    imageFrameMarkup,
    bindImageFrame,
    thinkingMarkup,
    replyChipMarkup,
    makeThumb,
    fitSize,
    escapeHtml,
    openCanvasFromMessage,
    closeCanvas
};
})();
