import type { PlatformAdapter } from './base';

/**
 * ChatGPT Platform Adapter
 *
 * Targets the chatgpt.com DOM structure using data attributes and semantic
 * elements rather than generated class names for resilience.
 */
export class ChatGPTAdapter implements PlatformAdapter {
    readonly platformId = 'chatgpt';

    matches(url: string): boolean {
        return /chatgpt\.com/.test(url);
    }

    extractChatId(url: string): string | null {
        const match = url.match(/chatgpt\.com\/c\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    getAssistantMessageElements(): HTMLElement[] {
        // ChatGPT uses data-message-author-role on its message wrappers
        const nodes = document.querySelectorAll<HTMLElement>(
            '[data-message-author-role="assistant"]'
        );
        return Array.from(nodes);
    }

    getTextBlocks(messageEl: HTMLElement): HTMLElement[] {
        // Inside an assistant message, the rendered markdown lives inside
        // a .markdown container. We grab <p>, <li>, <pre>, <h1>-<h6>, <blockquote>
        const markdown = messageEl.querySelector('.markdown, .prose');
        if (!markdown) return [];

        const selectors = 'p, li, pre, h1, h2, h3, h4, h5, h6, blockquote';
        const nodes = markdown.querySelectorAll<HTMLElement>(selectors);

        // Filter out nested elements (e.g. <p> inside <li>)
        return Array.from(nodes).filter((el) => {
            const parent = el.parentElement;
            if (!parent) return true;
            // Only keep top-level blocks within the markdown container
            return parent === markdown || parent.tagName === 'OL' || parent.tagName === 'UL';
        });
    }

    getBlockText(blockEl: HTMLElement): string {
        return (blockEl.textContent ?? '').trim();
    }

    getObservationTarget(): HTMLElement | null {
        // The main thread container where messages appear
        return (
            document.querySelector<HTMLElement>('[role="presentation"]') ??
            document.querySelector<HTMLElement>('main')
        );
    }
}
