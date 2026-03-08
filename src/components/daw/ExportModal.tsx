'use client';

import React, { useState } from 'react';
import { X, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { audioEngine } from '../../lib/audioEngine';
import { logger } from '../../lib/logger';
import type { Track } from '../../lib/types';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tracks: Track[];
    tempo: number;
}

export default function ExportModal({ isOpen, onClose, tracks, tempo }: ExportModalProps) {
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [format] = useState<'wav'>('wav');

    if (!isOpen) return null;

    // Calculate total duration from tracks
    const totalBeats = tracks.reduce((max, track) => {
        const trackEnd = track.clips.reduce((clipMax, clip) => Math.max(clipMax, clip.start + clip.duration), 0);
        return Math.max(max, trackEnd);
    }, 4);

    const handleExport = async () => {
        setExporting(true);
        setProgress(0);
        setDone(false);
        try {
            await audioEngine.initialize();
            const blob = await audioEngine.exportToWav(tracks, tempo, totalBeats, setProgress);
            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `drey-export-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDone(true);
        } catch (e) {
            logger.error('Export failed:', e);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Project link copied to clipboard!');
        });
    };

    return (
        <div className="export-overlay" onClick={onClose}>
            <div className="export-modal" onClick={e => e.stopPropagation()}>
                <button className="export-close" onClick={onClose}><X size={20} /></button>
                <h2>Export &amp; Share</h2>

                <div className="export-section">
                    <h3>Export Audio</h3>
                    <p className="export-desc">Render your project as a WAV file ({totalBeats} beats at {tempo} BPM)</p>

                    {done ? (
                        <div className="export-done">
                            <CheckCircle2 size={24} color="#57f287" />
                            <span>Export complete! File downloaded.</span>
                        </div>
                    ) : (
                        <>
                            {exporting && (
                                <div className="export-progress">
                                    <div className="export-progress-bar" style={{ width: `${progress}%` }} />
                                    <span>{Math.round(progress)}%</span>
                                </div>
                            )}
                            <button
                                className="export-btn"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                                {exporting ? 'Rendering...' : 'Export WAV'}
                            </button>
                        </>
                    )}
                </div>

                <div className="export-section">
                    <h3>Share</h3>
                    <button className="export-btn secondary" onClick={handleCopyLink}>
                        Copy Project Link
                    </button>
                </div>

                <style jsx>{`
                    .export-overlay {
                        position: fixed; inset: 0; z-index: 9999;
                        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                        display: flex; align-items: center; justify-content: center;
                    }
                    .export-modal {
                        background: var(--bg-panel, #1a1a2e); border: 1px solid var(--border-subtle, #333);
                        border-radius: 12px; padding: 2rem; width: 420px; max-width: 90vw;
                        position: relative; color: var(--text-main, #fff);
                    }
                    .export-close {
                        position: absolute; top: 12px; right: 12px;
                        background: none; border: none; color: var(--text-dim, #888); cursor: pointer;
                    }
                    .export-close:hover { color: var(--text-main, #fff); }
                    h2 { margin: 0 0 1.5rem; font-size: 1.25rem; }
                    h3 { margin: 0 0 0.5rem; font-size: 0.95rem; color: var(--accent-primary, #5865f2); }
                    .export-section { margin-bottom: 1.5rem; }
                    .export-desc { font-size: 0.8rem; color: var(--text-dim, #888); margin: 0 0 1rem; }
                    .export-btn {
                        display: flex; align-items: center; gap: 0.5rem;
                        padding: 0.6rem 1.2rem; border-radius: 8px; border: none;
                        background: linear-gradient(135deg, var(--accent-primary, #5865f2), var(--accent-secondary, #eb459e));
                        color: #fff; font-weight: 600; font-size: 0.875rem; cursor: pointer;
                        width: 100%; justify-content: center;
                    }
                    .export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    .export-btn.secondary {
                        background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle, #333);
                    }
                    .export-btn.secondary:hover { background: rgba(255,255,255,0.12); }
                    .export-progress {
                        background: rgba(255,255,255,0.08); border-radius: 6px; height: 28px;
                        margin-bottom: 0.75rem; position: relative; overflow: hidden;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .export-progress span { position: relative; z-index: 1; font-size: 0.75rem; font-weight: 600; }
                    .export-progress-bar {
                        position: absolute; left: 0; top: 0; bottom: 0;
                        background: linear-gradient(90deg, var(--accent-primary, #5865f2), var(--accent-secondary, #eb459e));
                        transition: width 0.3s;
                    }
                    .export-done {
                        display: flex; align-items: center; gap: 0.5rem;
                        padding: 0.75rem; background: rgba(87,242,135,0.1);
                        border-radius: 8px; font-size: 0.875rem;
                    }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    .spin { animation: spin 1s linear infinite; }
                `}</style>
            </div>
        </div>
    );
}
