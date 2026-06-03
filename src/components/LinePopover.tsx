import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SubChat, SubChatMessage, UserSettings } from '@/lib/types';
import { MAX_FOLLOWUPS } from '@/lib/types';
import {
    getSubChat,
    saveSubChat,
    deleteSubChat,
    createSubChat,
    addMessage,
    editMessage,
    deleteMessage as deleteMsg,
    getSettings,
} from '@/lib/storage';

/* ── SVG Icons (inline to avoid dependencies) ──────── */

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const MinimizeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const EditIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const SendIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

const ChatIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const KeyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

/* ── Loading dots component ────────────────────────── */

const LoadingDots: React.FC = () => (
    <div className="ll-loading">
        <div className="ll-dot" />
        <div className="ll-dot" />
        <div className="ll-dot" />
    </div>
);

/* ── Message Bubble ────────────────────────────────── */

interface MessageBubbleProps {
    msg: SubChatMessage;
    onEdit: (id: string, content: string) => void;
    onDelete: (id: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, onEdit, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(msg.content);

    const handleSave = () => {
        if (editValue.trim()) {
            onEdit(msg.id, editValue.trim());
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className={`ll-msg ll-msg-${msg.role}`}>
                <textarea
                    className="ll-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                        if (e.key === 'Escape') setEditing(false);
                    }}
                />
                <div className="ll-edit-actions">
                    <button className="ll-edit-btn ll-edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="ll-edit-btn ll-edit-save" onClick={handleSave}>Save</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`ll-msg ll-msg-${msg.role}`}>
            {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
                <span>{msg.content}</span>
            )}
            <div className="ll-msg-actions">
                {msg.role === 'user' && (
                    <button className="ll-msg-action-btn" onClick={() => setEditing(true)} title="Edit">
                        <EditIcon />
                    </button>
                )}
                <button className="ll-msg-action-btn ll-danger" onClick={() => onDelete(msg.id)} title="Delete">
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

/* ── Main LinePopover Component ────────────────────── */

interface LinePopoverProps {
    chatId: string;
    contentHash: string;
    lineText: string;
    parentQuestion?: string;
    fullResponse?: string;
}

const LinePopover: React.FC<LinePopoverProps> = ({ chatId, contentHash, lineText, parentQuestion, fullResponse }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [subChat, setSubChat] = useState<SubChat | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [initialLoad, setInitialLoad] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load existing data
    useEffect(() => {
        (async () => {
            const [existingChat, userSettings] = await Promise.all([
                getSubChat(chatId, contentHash),
                getSettings(),
            ]);
            setSubChat(existingChat);
            setSettings(userSettings);
            setInitialLoad(false);
        })();
    }, [chatId, contentHash]);

    const hasChat = subChat !== null && subChat.messages.length > 0;
    const userMessageCount = subChat?.messages.filter((m) => m.role === 'user').length ?? 0;
    const limitReached = userMessageCount >= MAX_FOLLOWUPS;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [subChat?.messages.length]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setIsMinimized(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSend = useCallback(async () => {
        if (!input.trim() || loading || limitReached) return;

        const currentSettings = settings ?? (await getSettings());
        if (!currentSettings) {
            setError('Please configure your API key in the LineLens popup first.');
            return;
        }
        setSettings(currentSettings);

        setError(null);
        setLoading(true);

        let chat = subChat;
        if (!chat) {
            const initialContext = parentQuestion
                ? `### [Original Question to AI]:\n${parentQuestion}\n\n### [Full AI Response]:\n${fullResponse}`
                : '';
            chat = createSubChat(chatId, contentHash, lineText, initialContext);
        }
        chat = addMessage(chat, 'user', input.trim());
        setSubChat(chat);
        setInput('');

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'LLM_PROMPT',
                settings: currentSettings,
                lineText,
                messages: chat.messages,
                contextSummary: chat.contextSummary,
            });

            if (response.success) {
                chat = addMessage(chat, 'assistant', response.content);
            } else {
                setError(response.error ?? 'Failed to get response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection error');
        }

        setSubChat(chat);
        await saveSubChat(chat);
        setLoading(false);
    }, [input, loading, limitReached, settings, subChat, chatId, contentHash, lineText]);

    const handleEdit = useCallback(async (messageId: string, newContent: string) => {
        if (!subChat) return;
        const updated = editMessage(subChat, messageId, newContent);
        setSubChat(updated);
        await saveSubChat(updated);
    }, [subChat]);

    const handleDeleteMessage = useCallback(async (messageId: string) => {
        if (!subChat) return;
        const updated = deleteMsg(subChat, messageId);
        setSubChat(updated);
        await saveSubChat(updated);
    }, [subChat]);

    const handleDeleteAll = useCallback(async () => {
        await deleteSubChat(chatId, contentHash);
        setSubChat(null);
        setIsOpen(false);
        setIsMinimized(false);
    }, [chatId, contentHash]);

    // Don't render anything during initial loading
    if (initialLoad) return null;

    // Minimized state
    if (isMinimized && hasChat) {
        return (
            <div className="ll-minimized-badge" onClick={handleOpen} title="Expand sub-chat">
                <ChatIcon />
            </div>
        );
    }

    // Closed state: show the + trigger button
    if (!isOpen) {
        return (
            <button
                className={`ll-trigger-btn ${hasChat ? 'll-has-chat' : ''}`}
                onClick={handleOpen}
                title={hasChat ? 'View sub-chat' : 'Ask about this line'}
            >
                {hasChat ? <ChatIcon /> : <PlusIcon />}
            </button>
        );
    }

    // Open popover state
    return (
        <div className="ll-popover linelens-root">
            {/* Header */}
            <div className="ll-popover-header">
                <div className="ll-popover-title">
                    <ChatIcon /> LineLens
                </div>
                <div className="ll-popover-actions">
                    <button className="ll-icon-btn" onClick={() => { setIsMinimized(true); setIsOpen(false); }} title="Minimize">
                        <MinimizeIcon />
                    </button>
                    {hasChat && (
                        <button className="ll-icon-btn ll-danger" onClick={handleDeleteAll} title="Delete chat">
                            <TrashIcon />
                        </button>
                    )}
                    <button className="ll-icon-btn" onClick={() => setIsOpen(false)} title="Close">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* No settings warning */}
            {!settings ? (
                <div className="ll-no-settings">
                    <div className="ll-no-settings-icon"><KeyIcon /></div>
                    <p>API key not configured.</p>
                    <span className="ll-settings-link" onClick={() => chrome.runtime.sendMessage({ action: 'OPEN_POPUP' })}>
                        Open LineLens settings →
                    </span>
                </div>
            ) : (
                <>
                    {/* Messages */}
                    <div className="ll-messages">
                        {subChat?.messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                onEdit={handleEdit}
                                onDelete={handleDeleteMessage}
                            />
                        ))}
                        {loading && <LoadingDots />}
                        {error && <div className="ll-error">⚠ {error}</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Limit indicator */}
                    {limitReached && (
                        <div className="ll-limit-badge">
                            ✦ {MAX_FOLLOWUPS}/{MAX_FOLLOWUPS} questions used
                        </div>
                    )}

                    {/* Input */}
                    {!limitReached && (
                        <div className="ll-input-area">
                            <div className="ll-input-wrap">
                                <textarea
                                    ref={inputRef}
                                    className="ll-input"
                                    placeholder="Ask about this line..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    rows={1}
                                />
                                <button
                                    className="ll-send-btn"
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    title="Send"
                                >
                                    <SendIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LinePopover;
