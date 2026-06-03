/* ── Types ─────────────────────────────────────────── */

export type LLMProvider = 'openai' | 'openrouter' | 'claude';

export interface LLMModel {
    id: string;
    name: string;
    provider: LLMProvider;
}

export interface UserSettings {
    provider: LLMProvider;
    apiKey: string;
    modelId: string;
}

export interface SubChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface SubChat {
    chatId: string;        // from the ChatGPT URL
    contentHash: string;   // deterministic hash of the paragraph text
    lineText: string;      // the original line text for context display
    messages: SubChatMessage[];
    contextSummary: string; // summarized context
    createdAt: number;
    updatedAt: number;
}

export interface StorageSchema {
    settings: UserSettings;
    // key format: `subchat:${chatId}:${contentHash}`
    [key: string]: SubChat | UserSettings;
}

/* ── Provider model catalogues ────────────────────── */

export const PROVIDER_MODELS: Record<LLMProvider, LLMModel[]> = {
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai' },
        { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai' },
    ],
    openrouter: [
        { id: 'openai/gpt-oss-120b:free', name: 'gpt-oss-120b:free', provider: 'openrouter' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter' },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'openrouter' },
    ],
    claude: [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude' },
    ],
};

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    claude: 'Anthropic (Claude)',
};

export const MAX_FOLLOWUPS = 3;
