'use client';

import React, { useState } from 'react';
import {
    Play, Square, Circle, SkipBack, SkipForward, Settings, Share2, Sparkles
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { audioEngine } from '../../lib/audioEngine';
import { audioScheduler } from '../../lib/scheduler';
import { usePlaybackTime } from '../../hooks/usePlaybackTime';
import type { Project } from '../../lib/types';
import { logger } from '../../lib/logger';
import styles from './transport.module.css';

interface TransportProps {
    project: Project | null;
    onOpenSettings?: () => void;
    onOpenShare?: () => void;
}

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

export default function Transport({ project, onOpenSettings, onOpenShare }: TransportProps) {
    const { isPlaying, togglePlay: storeTogglePlay } = useProjectStore();
    const currentTime = usePlaybackTime();
    const [isRecording, setIsRecording] = useState(false);

    const handleToggleRecord = async () => {
        if (!isRecording) {
            await audioEngine.initialize();
            await audioEngine.startRecording();
            setIsRecording(true);
        } else {
            await audioEngine.stopRecording();
            setIsRecording(false);
        }
    };

    const handleTogglePlay = async () => {
        try {
            if (!isPlaying) {
                // Ensure audio context and scheduler are started before updating store
                await audioEngine.initialize();
                await audioEngine.resume();
                await audioScheduler.start();
                storeTogglePlay();
            } else {
                // Stop scheduler and suspend audio context
                await audioScheduler.stop();
                audioEngine.suspend();
                storeTogglePlay();
            }
        } catch (e) {
            logger.error('Error toggling playback:', e);
        }
    };

    const handleSeekStart = async () => {
        try {
            // Ensure scheduler is running (so visual/time updates occur)
            if (!audioScheduler.isRunning()) {
                await audioEngine.initialize();
                await audioScheduler.start();
            }
            audioScheduler.setTime(0);
        } catch (e) {
            logger.error('Seek error:', e);
        }
    };

    return (
        <header className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
                <div className={styles.logo}>
                    <Sparkles size={20} className={styles.logoIcon} />
                    <span className={styles.logoText}>Drey</span>
                </div>
                <div className={styles.projectName}>{project?.name || 'Untitled'}</div>
            </div>

            <div className={styles.transport} role="toolbar" aria-label="Transport controls">
                <button type="button" className={styles.transportBtn} onClick={handleSeekStart} aria-label="Skip to beginning">
                    <SkipBack size={16} />
                </button>
                <button
                    type="button"
                    className={`${styles.transportBtn} ${styles.play}`}
                    onClick={handleTogglePlay}
                    onDoubleClick={handleSeekStart}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    aria-pressed={isPlaying}
                >
                    {isPlaying ? (
                        <Square size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" />
                    )}
                </button>
                <button
                    type="button"
                    className={`${styles.transportBtn} ${styles.record} ${isRecording ? styles.recording : ''}`}
                    onClick={handleToggleRecord}
                    title={isRecording ? 'Stop Recording' : 'Record from mic'}
                    aria-label={isRecording ? 'Stop recording' : 'Record'}
                    aria-pressed={isRecording}
                >
                    <Circle size={16} fill={isRecording ? 'currentColor' : 'none'} />
                </button>
                <div className={styles.timeDisplay}>
                    <span className={styles.time}>{formatTime(currentTime)}</span>
                </div>

                <div className={styles.tempoDisplay}>
                    <input
                        type="number"
                        className={styles.tempoInput}
                        value={project?.tempo || 120}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 20 && val < 999) {
                                const { updateProject } = useProjectStore.getState();
                                updateProject({ tempo: val });
                            }
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            width: '40px',
                            textAlign: 'right',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            fontFamily: 'inherit'
                        }}
                    />
                    <span className={styles.tempoLabel}>BPM</span>
                </div>
                <div className={styles.signature}>{project?.timeSignature || '4/4'}</div>
            </div>

            <div className={styles.toolbarRight}>
                <button type="button" className={styles.actionBtn} onClick={onOpenSettings} title="Settings" aria-label="Settings"><Settings size={18} /></button>
                <button type="button" className={styles.actionBtn} onClick={onOpenShare} title="Export / Share" aria-label="Export or share project"><Share2 size={18} /></button>
            </div>
        </header>
    );
}
