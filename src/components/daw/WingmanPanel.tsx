'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Send, ChevronLeft } from 'lucide-react';
import { grokService } from '../../lib/grokService';
import { getProjectContext, parseWingmanResponse } from '../../lib/wingmanBridge';
import type { Track, Project, WingmanMessage } from '../../lib/types';
import { SOUND_LIBRARY } from '../../lib/constants';
import { usePlaybackTimeRef } from '../../hooks/usePlaybackTime';
import { logger } from '../../lib/logger';
import styles from './wingman.module.css';

// SVG Icons
const BeatIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="4" height="12" rx="1" />
        <rect x="10" y="3" width="4" height="18" rx="1" />
        <rect x="18" y="8" width="4" height="8" rx="1" />
    </svg>
);

const MelodyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

const MixIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="12" cy="10" r="2" />
        <circle cx="20" cy="14" r="2" />
    </svg>
);

interface WingmanPanelProps {
    project: Project | null;
    tracks: Track[];
    selectedTrackId: number | null;
    isPlaying: boolean;
    onExecuteActions: (actions: any[]) => void;
}

function WingmanPanelInner({
    project,
    tracks,
    selectedTrackId,
    isPlaying,
    onExecuteActions
}: WingmanPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const timeRef = usePlaybackTimeRef();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<WingmanMessage[]>([
        { role: 'ai', text: "Hey! I'm Wingman, your AI producer. What would you like to create today?" }
    ]);

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: WingmanMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const context = getProjectContext(
                project,
                tracks,
                isPlaying,
                timeRef.current,
                selectedTrackId,
                SOUND_LIBRARY,
                false,
                false,
                null
            );

            const chatHistory = messages.map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            })) as { role: 'system' | 'user' | 'assistant'; content: string }[];

            chatHistory.push({ role: 'user', content: userMsg.text });

            const rawResponse = await grokService.chat(chatHistory, context, false);
            const { text, actions } = parseWingmanResponse(rawResponse);

            setMessages(prev => [...prev, { role: 'ai', text }]);

            if (actions.length > 0) {
                logger.debug('Executing Wingman Actions:', actions);
                onExecuteActions(actions);
            }
        } catch (err) {
            logger.error(err);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: "Sorry, I encountered an issue connecting to my brain."
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, project, tracks, isPlaying, selectedTrackId, onExecuteActions]);

    const handleSuggestionClick = (type: string) => {
        const prompts: Record<string, string> = {
            beat: 'Generate a hard-hitting trap beat at 140 BPM',
            melody: 'Create a catchy melody for my track',
            mix: 'Help me mix and master this track'
        };
        setInput(prompts[type] || '');
    };

    return (
        <aside className={`${styles.panel} ${isOpen ? styles.open : styles.closed}`}>
            <button className={styles.toggle} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <ChevronLeft size={16} /> : <Sparkles size={16} />}
            </button>

            {isOpen && (
                <>
                    <div className={styles.header}>
                        <Sparkles size={16} className={styles.icon} />
                        <span>Wingman AI</span>
                    </div>

                    <div className={styles.chat}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                                {msg.role === 'ai' && <Sparkles size={14} className={styles.avatar} />}
                                <p>{msg.text}</p>
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`${styles.message} ${styles.ai}`}>
                                <Sparkles size={14} className={`${styles.avatar} ${styles.spinning}`} />
                                <p>Thinking...</p>
                            </div>
                        )}
                        {/* Scroll anchor */}
                        <div ref={chatEndRef} />
                    </div>

                    <div className={styles.suggestions}>
                        <button className={styles.chip} onClick={() => handleSuggestionClick('beat')}>
                            <BeatIcon /> Beat
                        </button>
                        <button className={styles.chip} onClick={() => handleSuggestionClick('melody')}>
                            <MelodyIcon /> Melody
                        </button>
                        <button className={styles.chip} onClick={() => handleSuggestionClick('mix')}>
                            <MixIcon /> Mix
                        </button>
                    </div>

                    <div className={styles.inputArea}>
                        <input
                            type="text"
                            placeholder="Ask Wingman..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={isLoading}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}

const WingmanPanel = memo(WingmanPanelInner);
export default WingmanPanel;
