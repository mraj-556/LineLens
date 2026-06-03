/**
 * Platform Adapter Interface
 *
 * Each supported platform (ChatGPT, Claude, etc.) implements this interface
 * to abstract away DOM structure differences.
 */
export interface PlatformAdapter {
    /** Unique platform identifier */
    readonly platformId: string;

    /** Check if this adapter matches the current page */
    matches(url: string): boolean;

    /** Extract the conversation/chat ID from the URL */
    extractChatId(url: string): string | null;

    /** Get all assistant message containers currently in the DOM */
    getAssistantMessageElements(): HTMLElement[];

    /** Get injectable text blocks from a specific assistant message element */
    getTextBlocks(messageEl: HTMLElement): HTMLElement[];

    /** Get the text content from a text block element */
    getBlockText(blockEl: HTMLElement): string;

    /** The DOM element to observe for new messages (for MutationObserver) */
    getObservationTarget(): HTMLElement | null;
}
