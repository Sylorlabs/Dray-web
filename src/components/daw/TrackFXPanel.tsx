'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { audioEngine } from '../../lib/audioEngine';
import type { TrackFX } from '../../lib/types';
import { DEFAULT_TRACK_FX } from '../../lib/types';

interface TrackFXPanelProps {
    trackId: number;
    trackName: string;
    fx: TrackFX;
    onFXChange: (fx: TrackFX) => void;
    onClose: () => void;
}

export default function TrackFXPanel({ trackId, trackName, fx, onFXChange, onClose }: TrackFXPanelProps) {
    const update = useCallback((key: keyof TrackFX, value: number) => {
        const next = { ...fx, [key]: value };
        onFXChange(next);
        audioEngine.updateTrackFX(trackId, next);
    }, [fx, trackId, onFXChange]);

    const handleReset = () => {
        onFXChange({ ...DEFAULT_TRACK_FX });
        audioEngine.updateTrackFX(trackId, DEFAULT_TRACK_FX);
    };

    return (
        <div className="track-fx-panel">
            <div className="fx-header">
                <span className="fx-title">FX: {trackName}</span>
                <div className="fx-header-actions">
                    <button className="fx-reset" onClick={handleReset}>Reset</button>
                    <button className="fx-close" onClick={onClose}><X size={16} /></button>
                </div>
            </div>

            <div className="fx-section">
                <h4>EQ</h4>
                <div className="fx-row">
                    <label>Low</label>
                    <input type="range" min={-12} max={12} step={0.5} value={fx.eqLow}
                        onChange={e => update('eqLow', parseFloat(e.target.value))} />
                    <span className="fx-val">{fx.eqLow > 0 ? '+' : ''}{fx.eqLow}dB</span>
                </div>
                <div className="fx-row">
                    <label>Mid</label>
                    <input type="range" min={-12} max={12} step={0.5} value={fx.eqMid}
                        onChange={e => update('eqMid', parseFloat(e.target.value))} />
                    <span className="fx-val">{fx.eqMid > 0 ? '+' : ''}{fx.eqMid}dB</span>
                </div>
                <div className="fx-row">
                    <label>High</label>
                    <input type="range" min={-12} max={12} step={0.5} value={fx.eqHigh}
                        onChange={e => update('eqHigh', parseFloat(e.target.value))} />
                    <span className="fx-val">{fx.eqHigh > 0 ? '+' : ''}{fx.eqHigh}dB</span>
                </div>
            </div>

            <div className="fx-section">
                <h4>Reverb</h4>
                <div className="fx-row">
                    <label>Mix</label>
                    <input type="range" min={0} max={1} step={0.01} value={fx.reverbMix}
                        onChange={e => update('reverbMix', parseFloat(e.target.value))} />
                    <span className="fx-val">{Math.round(fx.reverbMix * 100)}%</span>
                </div>
            </div>

            <div className="fx-section">
                <h4>Delay</h4>
                <div className="fx-row">
                    <label>Mix</label>
                    <input type="range" min={0} max={1} step={0.01} value={fx.delayMix}
                        onChange={e => update('delayMix', parseFloat(e.target.value))} />
                    <span className="fx-val">{Math.round(fx.delayMix * 100)}%</span>
                </div>
                <div className="fx-row">
                    <label>Time</label>
                    <input type="range" min={0.05} max={1} step={0.01} value={fx.delayTime}
                        onChange={e => update('delayTime', parseFloat(e.target.value))} />
                    <span className="fx-val">{fx.delayTime.toFixed(2)}s</span>
                </div>
            </div>

            <style jsx>{`
                .track-fx-panel {
                    background: var(--bg-panel, #1a1a2e);
                    border: 1px solid var(--border-subtle, #333);
                    border-radius: 8px;
                    padding: 0.75rem;
                    min-width: 260px;
                    font-size: 0.8rem;
                    color: var(--text-main, #fff);
                }
                .fx-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 0.75rem; padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border-subtle, #333);
                }
                .fx-title { font-weight: 700; font-size: 0.85rem; }
                .fx-header-actions { display: flex; gap: 0.5rem; align-items: center; }
                .fx-reset {
                    background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle, #333);
                    color: var(--text-dim, #888); padding: 2px 8px; border-radius: 4px;
                    font-size: 0.7rem; cursor: pointer;
                }
                .fx-reset:hover { color: var(--text-main, #fff); }
                .fx-close {
                    background: none; border: none; color: var(--text-dim, #888);
                    cursor: pointer; display: flex; align-items: center;
                }
                .fx-close:hover { color: var(--text-main, #fff); }
                .fx-section { margin-bottom: 0.75rem; }
                .fx-section h4 {
                    margin: 0 0 0.4rem; font-size: 0.75rem;
                    color: var(--accent-primary, #5865f2); text-transform: uppercase; letter-spacing: 0.5px;
                }
                .fx-row {
                    display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;
                }
                .fx-row label { width: 32px; color: var(--text-dim, #888); font-size: 0.75rem; }
                .fx-row input[type="range"] { flex: 1; height: 4px; accent-color: var(--accent-primary, #5865f2); }
                .fx-val { width: 48px; text-align: right; font-size: 0.7rem; color: var(--text-dim, #888); font-family: monospace; }
            `}</style>
        </div>
    );
}
