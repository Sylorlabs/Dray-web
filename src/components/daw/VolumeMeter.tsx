'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../lib/audioEngine';

interface VolumeMeterProps {
    trackId: number;
    volume: number; // 0-1 slider value
    onVolumeChange: (volume: number) => void;
    isPlaying: boolean;
    isMuted: boolean;
}

function VolumeMeterInner({
    trackId,
    volume,
    onVolumeChange,
    isPlaying,
    isMuted
}: VolumeMeterProps) {
    const meterRef = useRef<HTMLDivElement>(null);
    const [localVolume, setLocalVolume] = useState(volume);
    const isInteractingRef = useRef(false);
    const pendingValueRef = useRef<number | null>(null);
    const changeRafRef = useRef<number | null>(null);

    // Keep local value in sync unless user is currently dragging.
    useEffect(() => {
        if (!isInteractingRef.current) {
            setLocalVolume(volume);
        }
    }, [volume]);

    // Sync volume with audio engine on mount/update
    useEffect(() => {
        audioEngine.updateTrackVolume(trackId, volume);
    }, [trackId, volume]);

    // Animate audio level during playback using direct DOM manipulation
    useEffect(() => {
        if (!meterRef.current) return;

        if (!isPlaying || isMuted) {
            meterRef.current.style.width = '0%';
            return;
        }

        let animId: number;
        let lastTime = 0;
        const FRAME_TIME = 33; // ~30fps

        const animate = (currentTime: number) => {
            if (currentTime - lastTime >= FRAME_TIME) {
                const level = audioEngine.getTrackLevel(trackId);
                const widthPercent = Math.max(0, Math.min(100, level * 100));
                if (meterRef.current) {
                    meterRef.current.style.width = `${widthPercent}%`;
                }
                lastTime = currentTime;
            }

            if (isPlaying && !isMuted) {
                animId = requestAnimationFrame(animate);
            }
        };

        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, isMuted, trackId]);

    const flushPending = () => {
        if (pendingValueRef.current === null) return;
        onVolumeChange(pendingValueRef.current);
        pendingValueRef.current = null;
    };

    const scheduleParentUpdate = (nextValue: number) => {
        pendingValueRef.current = nextValue;
        if (changeRafRef.current !== null) return;
        changeRafRef.current = requestAnimationFrame(() => {
            changeRafRef.current = null;
            flushPending();
        });
    };

    const commitImmediately = () => {
        if (changeRafRef.current !== null) {
            cancelAnimationFrame(changeRafRef.current);
            changeRafRef.current = null;
        }
        flushPending();
    };

    useEffect(() => {
        return () => {
            if (changeRafRef.current !== null) {
                cancelAnimationFrame(changeRafRef.current);
                changeRafRef.current = null;
            }
        };
    }, []);

    const applyVolume = (newVal: number) => {
        setLocalVolume(newVal);
        audioEngine.updateTrackVolume(trackId, newVal);
        scheduleParentUpdate(newVal);
    };

    // Convert linear 0-1 to dB approximation for display
    const getDbValue = (val: number) => {
        if (val <= 0.01) return '-∞';
        const db = 20 * Math.log10(val);
        return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
    };

    return (
        <div
            className="volume-meter-component"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '130px',
                height: '18px',
                position: 'relative',
                cursor: 'default',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
        >
            <div style={{
                position: 'relative',
                flex: 1,
                height: '100%',
                background: 'var(--border-subtle)',
                borderRadius: '2px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                overflow: 'hidden',
            }}>
                <div
                    ref={meterRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '0%',
                        background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 60%, #ffeb3b 80%, #f44336 100%)',
                        opacity: 0.8,
                        transition: isPlaying ? 'width 0.04s' : 'width 0.2s',
                        willChange: 'width',
                    }}
                />

                <input
                    className="pro-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(localVolume * 100)}
                    aria-label="Volume"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(localVolume * 100)}
                    onChange={e => applyVolume(parseInt(e.target.value, 10) / 100)}
                    onDoubleClick={() => applyVolume(0.8)}
                    onMouseDown={() => { isInteractingRef.current = true; }}
                    onMouseUp={() => { isInteractingRef.current = false; commitImmediately(); }}
                    onTouchStart={() => { isInteractingRef.current = true; }}
                    onTouchEnd={() => { isInteractingRef.current = false; commitImmediately(); }}
                    onBlur={() => { isInteractingRef.current = false; commitImmediately(); }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        padding: 0,
                        opacity: 1,
                        background: 'transparent',
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                />
            </div>

            <div style={{
                width: '42px',
                textAlign: 'right',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-dim)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.5px'
            }}>
                <span style={{ color: localVolume > 0.9 ? '#ff6666' : 'var(--text-main)' }}>
                    {getDbValue(localVolume)} <span style={{ fontSize: '8px', color: 'var(--text-dim)' }}>dB</span>
                </span>
            </div>

            <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 10px;
          border-radius: 1px;
          background: linear-gradient(to bottom, #dcdcdc 0%, #a8a8a8 100%);
          border: 1px solid #555;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5);
          cursor: ew-resize;
          pointer-events: auto;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            background: linear-gradient(to bottom, #ffffff 0%, #c0c0c0 100%);
        }
      `}</style>
        </div>
    );
}

const VolumeMeter = memo(VolumeMeterInner);
export default VolumeMeter;
