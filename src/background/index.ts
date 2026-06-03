import type { UserSettings, SubChatMessage } from '@/lib/types';
import { MAX_FOLLOWUPS } from '@/lib/types';

/**
 * Background Service Worker
 *
 * Handles LLM API calls proxied from the content script to avoid CORS.
 * Communicates via chrome.runtime messages.
 */

interface LLMRequest {
    action: 'LLM_PROMPT';
    settings: UserSettings;
    lineText: string;
    messages: SubChatMessage[];
    contextSummary: string;
}

interface LLMResponse {
    success: boolean;
    content?: string;
    error?: string;
}

function getProviderEndpoint(provider: UserSettings['provider']): string {
    switch (provider) {
        case 'openai':
            return 'https://api.openai.com/v1/chat/completions';
        case 'openrouter':
            return 'https://openrouter.ai/api/v1/chat/completions';
        case 'claude':
            return 'https://api.anthropic.com/v1/messages';
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

function buildSystemPrompt(lineText: string, contextSummary: string, isFirstMessage: boolean): string {
    return `You are LineLens, a concise clarification assistant. The user is reading an AI-generated response and has a question about a specific line or concept.

### CONTEXT LINE:
"${lineText}"

${isFirstMessage && contextSummary ? `${contextSummary}\n` : ''}
### RULES:
- Be concise, clear and directly address the user's latest question.
- Keep your response brief (2-4 sentences max) unless the question requires a detailed explanation.
- The user's question, the AI's full response, and the selected context line (if this is the first turn) have been provided above.
- The conversation history provided represents the "sub chat" regarding the selected line.
- Stay context-aware: your answer should relate to the CONTEXT LINE above.`;
}

async function callOpenAICompatible(
    endpoint: string,
    apiKey: string,
    modelId: string,
    systemPrompt: string,
    messages: SubChatMessage[],
    provider: string,
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://linelens.dev';
        headers['X-Title'] = 'LineLens';
    }

    const body = {
        model: modelId,
        messages: [
            { role: 'system' as const, content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 500,
        temperature: 0.5,
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? 'No response generated.';
}

async function callClaude(
    apiKey: string,
    modelId: string,
    systemPrompt: string,
    messages: SubChatMessage[],
): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: modelId,
            max_tokens: 500,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? 'No response generated.';
}

async function handleLLMRequest(req: LLMRequest): Promise<LLMResponse> {
    try {
        const { settings, lineText, messages, contextSummary } = req;

        // Count user messages to enforce limit
        const userMsgCount = messages.filter((m) => m.role === 'user').length;
        if (userMsgCount > MAX_FOLLOWUPS) {
            return {
                success: false,
                error: `Maximum ${MAX_FOLLOWUPS} questions reached for this line.`,
            };
        }

        const isFirstMessage = userMsgCount === 1;
        const systemPrompt = buildSystemPrompt(lineText, contextSummary, isFirstMessage);

        let content: string;

        if (settings.provider === 'claude') {
            content = await callClaude(settings.apiKey, settings.modelId, systemPrompt, messages);
        } else {
            const endpoint = getProviderEndpoint(settings.provider);
            content = await callOpenAICompatible(
                endpoint, settings.apiKey, settings.modelId, systemPrompt, messages, settings.provider
            );
        }

        return { success: true, content };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: message };
    }
}

/* ── Listener ──────────────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'LLM_PROMPT') {
        handleLLMRequest(message as LLMRequest)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true; // keep the message channel open for async response
    }

    if (message.action === 'PING') {
        sendResponse({ pong: true });
        return false;
    }
});
