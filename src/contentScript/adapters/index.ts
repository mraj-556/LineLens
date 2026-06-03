export type { PlatformAdapter } from './base';
export { ChatGPTAdapter } from './chatgpt';

import type { PlatformAdapter } from './base';
import { ChatGPTAdapter } from './chatgpt';

/**
 * Registry of all available platform adapters.
 * Add new adapters here when supporting additional platforms.
 */
const adapters: PlatformAdapter[] = [
    new ChatGPTAdapter(),
    // new ClaudeAdapter(),
    // new GroqAdapter(),
];

/**
 * Detect and return the adapter matching the current page URL.
 */
export function detectPlatform(url: string): PlatformAdapter | null {
    return adapters.find((a) => a.matches(url)) ?? null;
}
