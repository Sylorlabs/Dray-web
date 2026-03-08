// Grok API Service for Wingman AI
// Now uses server-side API route to keep API key secure

import { ProjectContext } from './wingmanBridge';
import { logger } from './logger';

export interface GrokMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class GrokService {
    async chat(
        messages: GrokMessage[],
        context: ProjectContext,
        useReasoning: boolean = false
    ): Promise<string> {
        try {
            const response = await fetch('/api/wingman', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages,
                    context,
                    useReasoning
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Wingman API error:', response.status, errorData);
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const data = await response.json();
            return data.content;
        } catch (error) {
            logger.error('Wingman API error:', error);
            return "I'm having trouble connecting to my brain right now. Please try again.";
        }
    }
}

export const grokService = new GrokService();
