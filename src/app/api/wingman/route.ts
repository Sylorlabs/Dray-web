import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    
    record.count++;
    return record.count > RATE_LIMIT_MAX_REQUESTS;
}

// Periodic cleanup of expired entries (every 100 requests)
let requestCounter = 0;
function cleanupRateLimitMap() {
    requestCounter++;
    if (requestCounter % 100 === 0) {
        const now = Date.now();
        for (const [key, record] of rateLimitMap) {
            if (now > record.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }
}

// Max request body size (characters)
const MAX_BODY_SIZE = 50_000;

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// Model names for xAI Grok
const MODEL_FAST = 'grok-3-fast';
const MODEL_REASONING = 'grok-3-mini-fast';

const SYSTEM_PROMPT = `You are Wingman, an advanced AI music producer inside Drey DAW.
You have FULL CONTROL over the DAW via "Actions". You can create tracks, add clips, change volumes, etc.

Your goal is to help the user create music. If the user asks for a beat, create it. If they ask to change volume, do it.

## AVAILABLE ACTIONS
To perform an action, you MUST output a JSON object in this format inside your response:

\`\`\`json
{
  "actions": [
    {
      "type": "create_track",
      "payload": { "type": "drums", "name": "Trap Drums", "instrument": "808 Kit" }
    },
    {
      "type": "add_midi_clip",
      "payload": { 
        "trackId": 1, 
        "name": "Beat 1", 
        "start": 0, 
        "duration": 4, 
        "notes": [ { "pitch": 36, "start": 0, "duration": 0.25, "velocity": 0.9 } ] 
      }
    }
  ]
}
\`\`\`

## ACTION TYPES
1. create_track: { type: 'audio'|'midi'|'drums', name: string, instrument: string }
2. add_midi_clip: { trackId: number, name: string, start: number, duration: number, notes: { pitch: 36-96, start: in_beats, duration: in_beats, velocity: 0-1 }[] }
3. add_audio_clip: { trackId: number, start: number, sampleName: string }
4. set_volume: { trackId: number, value: 0-1 }
5. set_pan: { trackId: number, value: -100 to 100 }
6. mute_track: { trackId: number }
7. solo_track: { trackId: number }
8. generate_pattern: { trackId: number, style: 'trap'|'house'|'chords'|'bass', key: 'C' etc, scale: 'Major'|'Minor' }
9. modify_note: { trackId: number, noteId: string, pitch?: number, start?: number, duration?: number, velocity?: number }
10. delete_track: { trackId: number }
11. delete_notes: { trackId: number, noteIds: string[] }

## CURRENT PROJECT CONTEXT
The user will provide the current state of the project in the prompt. Use this to refer to tracks by ID or Name.
Each note has a unique ID (e.g., "d1", "s5"). Use these IDs when modifying individual notes.

## GUIDELINES
- If the user asks for a generic beat or chord progression, USE \`generate_pattern\`! It produces better results than writing notes manually.
- If the user asks to "move the kick" or "change the pitch of the last note", USE \`modify_note\`.
- Always verify track IDs before sending commands.

Be concise. If you perform an action, briefly mention it (e.g., "I've added a drum track for you.").
`;

export async function POST(request: NextRequest) {
    try {
        cleanupRateLimitMap();

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const apiKey = process.env.GROK_API_KEY;

        if (!apiKey || apiKey === 'your_api_key_here') {
            return NextResponse.json(
                { error: 'GROK_API_KEY not configured. Please add it to .env.local' },
                { status: 500 }
            );
        }

        const body = await request.json();

        // Validate body size
        if (JSON.stringify(body).length > MAX_BODY_SIZE) {
            return NextResponse.json(
                { error: 'Request body too large.' },
                { status: 400 }
            );
        }

        const { messages, context, useReasoning = false } = body;

        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0 || messages.length >= 50) {
            return NextResponse.json(
                { error: 'messages must be a non-empty array with fewer than 50 items.' },
                { status: 400 }
            );
        }
        for (const msg of messages) {
            if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
                return NextResponse.json(
                    { error: 'Each message must have a string role and string content.' },
                    { status: 400 }
                );
            }
        }

        const model = useReasoning ? MODEL_REASONING : MODEL_FAST;

        // Inject context into the latest message
        const contextStr = JSON.stringify(context, null, 2);
        const contextMessage = `\n\n[CURRENT PROJECT STATE]\n${contextStr}\n\n[USER REQUEST]\n`;

        const finalMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.slice(0, -1),
            {
                role: messages[messages.length - 1].role,
                content: contextMessage + messages[messages.length - 1].content
            }
        ];

        const response = await fetch(GROK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: finalMessages,
                temperature: 0.7,
                max_tokens: 2000
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Grok API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Grok API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || 'No response generated.';

        return NextResponse.json({ content });
    } catch (error) {
        logger.error('API route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
