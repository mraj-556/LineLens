import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { detectPlatform, type PlatformAdapter } from './adapters';
import LinePopover from '@/components/LinePopover';
import { hashString } from '@/lib/utils';
import { getAllSubChatsForChat } from '@/lib/storage';

/* ── State ─────────────────────────────────────────── */

const WRAPPER_ATTR = 'data-ll-wrapped';
const ROOT_ATTR = 'data-ll-root';
const mountedRoots = new Map<string, Root>();
let currentAdapter: PlatformAdapter | null = null;
let observer: MutationObserver | null = null;

/* ── Core injection logic ──────────────────────────── */

function injectIntoBlock(blockEl: HTMLElement, messageEl: HTMLElement, chatId: string, adapter: PlatformAdapter) {
    if (blockEl.getAttribute(WRAPPER_ATTR)) return;

    const text = adapter.getBlockText(blockEl);
    if (!text || text.length < 5) return; // skip trivially short blocks

    const contentHash = hashString(text);
    const rootId = `ll-${chatId}-${contentHash}`;

    const parentQuestion = adapter.getParentQuestion(messageEl);
    const fullResponse = adapter.getFullResponse(messageEl);

    // Mark the block as processed
    blockEl.setAttribute(WRAPPER_ATTR, 'true');
    blockEl.style.position = 'relative';
    blockEl.classList.add('ll-block-wrapper');

    // Create the React root container
    const container = document.createElement('div');
    container.setAttribute(ROOT_ATTR, rootId);
    container.className = 'linelens-root';
    container.style.cssText = 'position:absolute;right:-28px;top:0;bottom:0;width:0;height:0;pointer-events:none;z-index:9999;';

    // Create an inner div that receives pointer events
    const inner = document.createElement('div');
    inner.style.cssText = 'pointer-events:auto;';
    container.appendChild(inner);

    blockEl.appendChild(container);

    // Mount React
    const root = createRoot(inner);
    root.render(
        <React.StrictMode>
            <LinePopover
                chatId={chatId}
                contentHash={contentHash}
                lineText={text}
                parentQuestion={parentQuestion}
                fullResponse={fullResponse}
            />
        </React.StrictMode>
    );
    mountedRoots.set(rootId, root);
}

function processPage(adapter: PlatformAdapter, chatId: string) {
    const messageEls = adapter.getAssistantMessageElements();
    for (const msgEl of messageEls) {
        const blocks = adapter.getTextBlocks(msgEl);
        for (const block of blocks) {
            injectIntoBlock(block, msgEl, chatId, adapter);
        }
    }
}

/* ── Re-inject existing chats on page load ─────────── */

async function restoreExistingChats(adapter: PlatformAdapter, chatId: string) {
    const existingChats = await getAllSubChatsForChat(chatId);
    if (existingChats.length === 0) return;

    // Build a set of contentHashes that have chats
    const hashesWithChats = new Set(existingChats.map((c) => c.contentHash));

    // Process all blocks and check if any match
    const messageEls = adapter.getAssistantMessageElements();
    for (const msgEl of messageEls) {
        const blocks = adapter.getTextBlocks(msgEl);
        for (const block of blocks) {
            const text = adapter.getBlockText(block);
            if (!text) continue;
            const hash = hashString(text);
            if (hashesWithChats.has(hash)) {
                injectIntoBlock(block, msgEl, chatId, adapter);
            }
        }
    }
}

/* ── Setup observer ────────────────────────────────── */

function setupObserver(adapter: PlatformAdapter, chatId: string) {
    if (observer) observer.disconnect();

    const target = adapter.getObservationTarget();
    if (!target) {
        // Retry after a delay (ChatGPT lazy-loads)
        setTimeout(() => setupObserver(adapter, chatId), 1000);
        return;
    }

    observer = new MutationObserver(() => {
        processPage(adapter, chatId);
    });

    observer.observe(target, {
        childList: true,
        subtree: true,
    });

    // Initial scan
    processPage(adapter, chatId);
    restoreExistingChats(adapter, chatId);
}

/* ── URL change handling (SPA navigation) ──────────── */

function handleUrlChange() {
    const adapter = detectPlatform(window.location.href);
    if (!adapter) return;

    const chatId = adapter.extractChatId(window.location.href);
    if (!chatId) return;

    currentAdapter = adapter;

    // Clean up old roots
    for (const [, root] of mountedRoots) {
        root.unmount();
    }
    mountedRoots.clear();

    // Remove old wrappers
    document.querySelectorAll(`[${WRAPPER_ATTR}]`).forEach((el) => {
        el.removeAttribute(WRAPPER_ATTR);
    });
    document.querySelectorAll(`[${ROOT_ATTR}]`).forEach((el) => {
        el.remove();
    });

    // Setup for new page
    setupObserver(adapter, chatId);
}

/* ── Init ──────────────────────────────────────────── */

function init() {
    const adapter = detectPlatform(window.location.href);
    if (!adapter) return;

    currentAdapter = adapter;

    const chatId = adapter.extractChatId(window.location.href);
    if (chatId) {
        setupObserver(adapter, chatId);
    }

    // Listen for SPA navigation changes
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            handleUrlChange();
        }
    });

    urlObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Also handle popstate for back/forward
    window.addEventListener('popstate', handleUrlChange);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // Small delay to let ChatGPT render its initial content
    setTimeout(init, 500);
}
