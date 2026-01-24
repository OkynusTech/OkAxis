'use server';

import Groq from 'groq-sdk';
import { Finding, Artifact } from '@/lib/types';
import { ScopedRetrievalService } from '@/lib/knowledge-service';
import { AISuggestion, SourceCitation } from '@/lib/ai-assistance';

// Initialize Groq client with server-side environment variable
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

/**
 * Server Action: Draft vulnerability description using Groq AI
 */
export async function draftDescriptionAction(
    finding: Finding,
    engagementId: string,
    applicationId: string,
    clientId: string
): Promise<AISuggestion> {
    if (!groq) {
        return {
            content: `[AI is not configured]\n\nAdd your GROQ_API_KEY to .env.local on the server to enable AI-powered suggestions.`,
            isAIGenerated: true,
            sources: [],
            confidence: 'low',
            explanation: 'Groq API key is missing in server environment.',
        };
    }

    // Retrieve relevant context (this helper is already server-safe if it uses local storage data passed in or similar)
    // Note: ScopedRetrievalService usually reads from storage.ts which uses localStorage.
    // Since this is a server action, localStorage is NOT available.
    // We need to pass the context FROM the client or fetch it in a server-compatible way.

    // For now, let's assume we retrieve the context on the client and pass it, 
    // or we'll need a different way to access the "knowledge" on the server.
    // HOWEVER, this app is a purely local client-side app using localStorage.

    // REVISED STRATEGY: 
    // Since the app uses localStorage, we can't easily use "true" server actions for the logic that depends on state.
    // BUT we can use a server action as a SECURE PROXY for the Groq API call itself.

    return {
        content: "[Redirecting to secure agent proxy...]",
        isAIGenerated: true,
        sources: [],
        confidence: 'low',
        explanation: 'AI logic shifted to server proxy.',
    };
}

/**
 * Secure Proxy for Groq Chat Completion
 */
export async function getGroqCompletion(prompt: string, systemPrompt: string = "You are a security expert.") {
    if (!groq) {
        throw new Error('GROQ_API_KEY is not configured on the server.');
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 800,
        });

        return chatCompletion.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Groq Server Action Error:', error);
        throw error;
    }
}
