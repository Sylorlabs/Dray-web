'use client';

import React, { memo, useRef, useCallback } from 'react';

interface TimelineRulerProps {
    pixelsPerBeat: number;
    tempo: number;
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    onSeek: (timeInSeconds: number) => void;
    onLoopRegionChange: (start: number, end: number) => void;
    onLoopToggle: () => void;
}

function TimelineRulerInner({
    pixelsPerBeat, tempo,
    loopEnabled, loopStart, loopEnd,
    onSeek, onLoopRegionChange, onLoopToggle
}: TimelineRulerProps) {
    const loopDragRef = useRef<{ dragging: boolean; startBeat: number } | null>(null);

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (loopDragRef.current?.dragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const headerWidth = 200;
        if (x > headerWidth) {
            const pixels = x - headerWidth;
            const beat = pixels / pixelsPerBeat;
            const time = beat * (60 / tempo);
            onSeek(time);
        }
    }, [pixelsPerBeat, tempo, onSeek]);

    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - 200;
        if (x > 0) {
            const beat = Math.floor(x / pixelsPerBeat);
            onLoopRegionChange(beat, beat + 4);
            if (!loopEnabled) onLoopToggle();
        }
    }, [pixelsPerBeat, loopEnabled, onLoopRegionChange, onLoopToggle]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button === 2 || e.altKey) {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left - 200;
            if (x > 0) {
                const beat = Math.round((x / pixelsPerBeat) * 4) / 4;
                loopDragRef.current = { dragging: true, startBeat: beat };
                const onMove = (me: MouseEvent) => {
                    const mx = me.clientX - rect.left - 200;
                    const endBeat = Math.round((mx / pixelsPerBeat) * 4) / 4;
                    const s = Math.min(beat, endBeat);
                    const en = Math.max(beat, endBeat);
                    if (en - s >= 0.25) onLoopRegionChange(s, en);
                };
                const onUp = () => {
                    loopDragRef.current = null;
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    if (!loopEnabled) onLoopToggle();
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            }
        }
    }, [pixelsPerBeat, loopEnabled, onLoopRegionChange, onLoopToggle]);

    return (
        <div
            className="timeline-ruler"
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: 'pointer', position: 'relative' }}
        >
            <div className="ruler-track-space"></div>
            {Array.from({ length: 17 }, (_, i) => (
                <div key={i} className="ruler-mark" style={{ width: pixelsPerBeat }}>
                    <span>{i + 1}</span>
                </div>
            ))}
            {loopEnabled && (
                <div
                    className="loop-region"
                    style={{
                        left: `${200 + loopStart * pixelsPerBeat}px`,
                        width: `${(loopEnd - loopStart) * pixelsPerBeat}px`
                    }}
                />
            )}
        </div>
    );
}

const TimelineRuler = memo(TimelineRulerInner);
export default TimelineRuler;
