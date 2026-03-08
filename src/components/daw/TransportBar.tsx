'use client';

import React, { memo } from 'react';
import {
    Play, Square, Circle, SkipBack,
    Sparkles, Settings, Share2,
    Undo2, Redo2, Repeat, Users, Wand2
} from 'lucide-react';
import TimeDisplay from './TimeDisplay';
import nextDynamic from 'next/dynamic';
const ThemeToggle = nextDynamic(() => import('../ThemeToggle'), { ssr: false });

interface TransportBarProps {
    projectName: string;
    tempo: number;
    timeSignature: string;
    isPlaying: boolean;
    isRecording: boolean;
    metronomeOn: boolean;
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    canUndo: boolean;
    canRedo: boolean;
    gridDivision: number;
    onTogglePlay: () => void;
    onStop: () => void;
    onToggleRecord: () => void;
    onToggleMetronome: () => void;
    onToggleLoop: () => void;
    onTapTempo: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onGridDivisionChange: (div: number) => void;
    onOpenSettings: () => void;
    onOpenExport: () => void;
    onOpenMastering?: () => void;
    onOpenCollab?: () => void;
}

function TransportBarInner({
    projectName, tempo, timeSignature,
    isPlaying, isRecording, metronomeOn,
    loopEnabled, loopStart, loopEnd,
    canUndo, canRedo, gridDivision,
    onTogglePlay, onStop, onToggleRecord,
    onToggleMetronome, onToggleLoop, onTapTempo,
    onUndo, onRedo, onGridDivisionChange,
    onOpenSettings, onOpenExport,
    onOpenMastering, onOpenCollab
}: TransportBarProps) {
    return (
        <header className="toolbar">
            <div className="toolbar-left">
                <div className="logo">
                    <Sparkles size={20} className="logo-icon" />
                    <span className="logo-text">Drey</span>
                </div>
                <div className="project-name">{projectName}</div>
                <div className="history-controls">
                    <button
                        className={`history-btn ${!canUndo ? 'disabled' : ''}`}
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        className={`history-btn ${!canRedo ? 'disabled' : ''}`}
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Shift+Z)"
                        aria-label="Redo"
                    >
                        <Redo2 size={16} />
                    </button>
                </div>
                <div className="grid-controls">
                    <label htmlFor="grid-division-select" className="sr-only">Grid Division</label>
                    <select
                        id="grid-division-select"
                        className="grid-select"
                        value={gridDivision}
                        onChange={(e) => onGridDivisionChange(Number(e.target.value))}
                        title="Grid Division"
                        aria-label="Grid division"
                    >
                        <option value={1}>1/1</option>
                        <option value={2}>1/2</option>
                        <option value={4}>1/4</option>
                        <option value={8}>1/8</option>
                        <option value={16}>1/16</option>
                    </select>
                </div>
            </div>
            <div className="transport">
                <button className="transport-btn" onClick={onStop} aria-label="Stop">
                    <SkipBack size={16} />
                </button>
                <button className="transport-btn play" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button
                    className={`transport-btn record ${isRecording ? 'recording' : ''}`}
                    onClick={onToggleRecord}
                    title={isRecording ? 'Stop Recording' : 'Record (mic)'}
                    aria-label={isRecording ? 'Stop recording' : 'Record'}
                >
                    <Circle size={16} fill={isRecording ? 'currentColor' : 'none'} />
                </button>
                <button
                    className={`transport-btn metronome ${metronomeOn ? 'active' : ''}`}
                    onClick={onToggleMetronome}
                    title={metronomeOn ? 'Metronome On' : 'Metronome Off'}
                    aria-label={metronomeOn ? 'Disable metronome' : 'Enable metronome'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L6 22h12L12 2z" />
                        <line x1="12" y1="8" x2="16" y2="4" />
                    </svg>
                </button>
                <button
                    className={`transport-btn loop-btn ${loopEnabled ? 'active' : ''}`}
                    onClick={onToggleLoop}
                    title={loopEnabled ? `Loop: ${loopStart + 1}-${loopEnd}` : 'Enable Loop'}
                    aria-label={loopEnabled ? 'Disable loop' : 'Enable loop'}
                >
                    <Repeat size={16} />
                </button>
                <div className="time-display"><TimeDisplay /></div>
                <div className="tempo-display" onClick={onTapTempo} title="Click to tap tempo">
                    <span className="tempo-value">{tempo}</span>
                    <span className="tempo-label">TAP BPM</span>
                </div>
                <div className="signature">{timeSignature}</div>
            </div>
            <div className="toolbar-right">
                <ThemeToggle />
                <button className="action-btn" onClick={onOpenMastering} title="AI Mastering" aria-label="AI Mastering">
                    <Wand2 size={18} />
                </button>
                <button className="action-btn" onClick={onOpenCollab} title="Collaborate" aria-label="Collaborate">
                    <Users size={18} />
                </button>
                <button className="action-btn" onClick={onOpenSettings} aria-label="Settings">
                    <Settings size={18} />
                </button>
                <button className="action-btn" onClick={onOpenExport} title="Export / Share" aria-label="Export or share project">
                    <Share2 size={18} />
                </button>
            </div>
        </header>
    );
}

const TransportBar = memo(TransportBarInner);
export default TransportBar;
