/**
 * AI Provider Abstraction Layer
 *
 * Supports multiple LLM backends (Groq, Gemini) with a unified interface.
 * Provider selection is driven by client-side preference stored in localStorage,
 * passed to server actions as a parameter.
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Types ────────────────────────────────────────────────────────────────────

export type AIProvider = 'groq' | 'gemini';

export interface AIProviderConfig {
    provider: AIProvider;
    model: string;
    displayName: string;
    maxTokens: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CompletionOptions {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
}

export interface CompletionResult {
    content: string;
    provider: AIProvider;
    model: string;
}

// ── Provider Configurations ──────────────────────────────────────────────────

export const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
    groq: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        displayName: 'Groq (Llama 3.3 70B)',
        maxTokens: 2000,
    },
    gemini: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        maxTokens: 4000, // Gemini supports larger context
    },
};

// ── Client Singletons ────────────────────────────────────────────────────────

const getGroqClient = (): Groq | null => {
    if (!process.env.GROQ_API_KEY) return null;
    return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const getGeminiClient = (): GoogleGenerativeAI | null => {
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ── Provider Availability ────────────────────────────────────────────────────

export async function getAvailableProviders(): Promise<{ provider: AIProvider; available: boolean; displayName: string }[]> {
    return [
        {
            provider: 'groq',
            available: !!process.env.GROQ_API_KEY,
            displayName: PROVIDER_CONFIGS.groq.displayName,
        },
        {
            provider: 'gemini',
            available: !!process.env.GEMINI_API_KEY,
            displayName: PROVIDER_CONFIGS.gemini.displayName,
        },
    ];
}

// ── Unified Completion ───────────────────────────────────────────────────────

export async function getCompletion(
    provider: AIProvider,
    options: CompletionOptions
): Promise<CompletionResult> {
    const config = PROVIDER_CONFIGS[provider];

    if (provider === 'gemini') {
        return getGeminiCompletion(config, options);
    }
    // Default to Groq
    return getGroqCompletion(config, options);
}

// ── Groq Implementation ─────────────────────────────────────────────────────

async function getGroqCompletion(
    config: AIProviderConfig,
    options: CompletionOptions
): Promise<CompletionResult> {
    const client = getGroqClient();
    if (!client) {
        throw new Error('GROQ_API_KEY is not configured. Add it to your .env.local file.');
    }

    const chatCompletion = await client.chat.completions.create({
        messages: options.messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
        })),
        model: config.model,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? config.maxTokens,
    });

    return {
        content: chatCompletion.choices[0]?.message?.content || '',
        provider: 'groq',
        model: config.model,
    };
}

// ── Gemini Implementation ────────────────────────────────────────────────────

async function getGeminiCompletion(
    config: AIProviderConfig,
    options: CompletionOptions
): Promise<CompletionResult> {
    const client = getGeminiClient();
    if (!client) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to your .env.local file.');
    }

    // Separate system prompt from conversation messages
    const systemMessage = options.messages.find(m => m.role === 'system');
    const chatMessages = options.messages.filter(m => m.role !== 'system');

    const model = client.getGenerativeModel({
        model: config.model,
        systemInstruction: systemMessage?.content,
        generationConfig: {
            temperature: options.temperature ?? 0.5,
            maxOutputTokens: options.maxTokens ?? config.maxTokens,
        },
    });

    // Convert to Gemini's chat format
    const history = chatMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
        content: response.text(),
        provider: 'gemini',
        model: config.model,
    };
}
