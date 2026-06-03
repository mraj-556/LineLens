import type { SubChat, SubChatMessage, UserSettings } from './types';
import { uid } from './utils';

/* ── Keys ──────────────────────────────────────────── */

const SETTINGS_KEY = 'linelens:settings';

function subChatKey(chatId: string, contentHash: string): string {
    return `subchat:${chatId}:${contentHash}`;
}

/* ── Settings ──────────────────────────────────────── */

export async function getSettings(): Promise<UserSettings | null> {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] ?? null;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

/* ── SubChat CRUD ──────────────────────────────────── */

export async function getSubChat(chatId: string, contentHash: string): Promise<SubChat | null> {
    const key = subChatKey(chatId, contentHash);
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
}

export async function saveSubChat(subChat: SubChat): Promise<void> {
    const key = subChatKey(subChat.chatId, subChat.contentHash);
    await chrome.storage.local.set({ [key]: { ...subChat, updatedAt: Date.now() } });
}

export async function deleteSubChat(chatId: string, contentHash: string): Promise<void> {
    const key = subChatKey(chatId, contentHash);
    await chrome.storage.local.remove(key);
}

export function createSubChat(chatId: string, contentHash: string, lineText: string, contextSummary: string = ''): SubChat {
    return {
        chatId,
        contentHash,
        lineText,
        messages: [],
        contextSummary,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

export function addMessage(
    subChat: SubChat,
    role: 'user' | 'assistant',
    content: string
): SubChat {
    const msg: SubChatMessage = {
        id: uid(),
        role,
        content,
        timestamp: Date.now(),
    };
    return {
        ...subChat,
        messages: [...subChat.messages, msg],
        updatedAt: Date.now(),
    };
}

export function editMessage(subChat: SubChat, messageId: string, newContent: string): SubChat {
    return {
        ...subChat,
        messages: subChat.messages.map((m) =>
            m.id === messageId ? { ...m, content: newContent, timestamp: Date.now() } : m
        ),
        updatedAt: Date.now(),
    };
}

export function deleteMessage(subChat: SubChat, messageId: string): SubChat {
    return {
        ...subChat,
        messages: subChat.messages.filter((m) => m.id !== messageId),
        updatedAt: Date.now(),
    };
}

/* ── Bulk queries for a chat page ──────────────────── */

export async function getAllSubChatsForChat(chatId: string): Promise<SubChat[]> {
    const all = await chrome.storage.local.get(null);
    const prefix = `subchat:${chatId}:`;
    return Object.entries(all)
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value as SubChat);
}
