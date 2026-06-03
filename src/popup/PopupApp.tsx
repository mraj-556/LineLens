import React, { useState, useEffect, useCallback } from 'react';
import type { UserSettings, LLMProvider, LLMModel } from '@/lib/types';
import { PROVIDER_MODELS, PROVIDER_LABELS } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/storage';

/* ── Icons ─────────────────────────────────────────── */

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

/* ── Main Popup Component ──────────────────────────── */

const PopupApp: React.FC = () => {
    const [provider, setProvider] = useState<LLMProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [modelId, setModelId] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [models, setModels] = useState<LLMModel[]>([]);

    // Load saved settings
    useEffect(() => {
        (async () => {
            const s = await getSettings();
            if (s) {
                setProvider(s.provider);
                setApiKey(s.apiKey);
                setModelId(s.modelId);
            }
            setLoading(false);
        })();
    }, []);

    // Update models when provider changes
    useEffect(() => {
        const providerModels = PROVIDER_MODELS[provider] ?? [];
        setModels(providerModels);
        if (providerModels.length > 0 && !providerModels.find((m) => m.id === modelId)) {
            setModelId(providerModels[0].id);
        }
    }, [provider]);

    const handleSave = useCallback(async () => {
        if (!apiKey.trim()) return;
        const settings: UserSettings = {
            provider,
            apiKey: apiKey.trim(),
            modelId,
        };
        await saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [provider, apiKey, modelId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[480px]">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-ll-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-ll-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-ll-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[480px] flex flex-col">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-ll-border">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ll-primary to-ll-accent flex items-center justify-center text-white font-bold text-sm shadow-glow">
                        L
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-ll-text tracking-tight">LineLens</h1>
                        <p className="text-[10.5px] text-ll-textDim tracking-wide uppercase">Inline sub-chat for AI responses</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 p-5 space-y-5">
                {/* Provider Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-ll-textMuted uppercase tracking-wider">
                        Provider
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(PROVIDER_LABELS) as LLMProvider[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setProvider(p)}
                                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border
                  ${provider === p
                                        ? 'bg-ll-primary/15 border-ll-primary/40 text-ll-primaryHover shadow-glow'
                                        : 'bg-ll-surface border-ll-border text-ll-textMuted hover:bg-ll-surfaceHover hover:text-ll-text'
                                    }`}
                            >
                                {PROVIDER_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-ll-textMuted uppercase tracking-wider">
                        API Key
                    </label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={`Enter your ${PROVIDER_LABELS[provider]} API key`}
                            className="w-full px-3 py-2.5 pr-9 bg-ll-surface border border-ll-border rounded-lg text-sm text-ll-text placeholder:text-ll-textDim outline-none transition-all duration-150 focus:border-ll-primary/40 focus:shadow-glow font-mono text-xs"
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ll-textDim hover:text-ll-text transition-colors"
                        >
                            {showKey ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-ll-textMuted uppercase tracking-wider">
                        Model
                    </label>
                    <select
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-ll-surface border border-ll-border rounded-lg text-sm text-ll-text outline-none transition-all duration-150 focus:border-ll-primary/40 focus:shadow-glow appearance-none cursor-pointer"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                        }}
                    >
                        {models.map((m) => (
                            <option key={m.id} value={m.id} className="bg-ll-bg">{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!apiKey.trim()}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
            ${saved
                            ? 'bg-ll-success/15 text-ll-success border border-ll-success/30'
                            : 'bg-ll-primary hover:bg-ll-primaryHover text-white shadow-glow hover:shadow-glow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none'
                        }`}
                >
                    {saved ? (
                        <>
                            <CheckIcon /> Saved!
                        </>
                    ) : (
                        'Save Configuration'
                    )}
                </button>
            </div>

            {/* Footer */}
            <div className="p-4 pt-3 border-t border-ll-border">
                <div className="flex items-center justify-between text-[10px] text-ll-textDim">
                    <span>v1.0.0</span>
                    <a
                        href="https://github.com/gllitch/LineLens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ll-primary/60 hover:text-ll-primary transition-colors"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PopupApp;
