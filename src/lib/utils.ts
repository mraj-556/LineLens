/**
 * Deterministic hash for a string using a simple djb2 algorithm.
 * This is NOT for security – just a fast, consistent content fingerprint.
 */
export function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}

/**
 * Extract the ChatGPT conversation ID from the current URL.
 * Returns null if unable to parse.
 */
export function extractChatId(url: string): string | null {
    try {
        const match = url.match(/chatgpt\.com\/c\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Generate a unique ID (UUID v4-ish).
 */
export function uid(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Truncate text to a max length, appending an ellipsis if needed.
 */
export function truncate(text: string, max = 120): string {
    return text.length <= max ? text : text.slice(0, max) + '…';
}
