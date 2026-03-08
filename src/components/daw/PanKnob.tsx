'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PanKnobProps {
    value: number; // -100 to 100
    onChange: (value: number) => void;
    size?: number;
}

export default function PanKnob({ value, onChange, size = 24 }: PanKnobProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const pendingValueRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isDragging) {
            setLocalValue(value);
        }
    }, [value, isDragging]);

    const flushPending = () => {
        if (pendingValueRef.current === null) return;
        onChange(pendingValueRef.current);
        pendingValueRef.current = null;
    };

    const scheduleOnChange = (nextValue: number) => {
        pendingValueRef.current = nextValue;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            flushPending();
        });
    };

    const commitImmediately = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        flushPending();
    };

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, []);

    // Convert value (-100 to 100) to rotation (-135° to 135°)
    const rotation = (localValue / 100) * 135;

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);

        const startY = e.clientY;
        const startValue = localValue;

        const handleMouseMove = (evt: MouseEvent) => {
            const deltaY = startY - evt.clientY;
            const newValue = Math.max(-100, Math.min(100, startValue + deltaY * 2));
            const rounded = Math.round(newValue);
            setLocalValue(rounded);
            scheduleOnChange(rounded);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            commitImmediately();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Double-click to reset to center
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLocalValue(0);
        onChange(0);
    };

    return (
        <div
            role="slider"
            aria-label="Pan"
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuenow={localValue}
            tabIndex={0}
            style={{
                width: size,
                height: size,
                cursor: 'ns-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            title={`Pan: ${localValue > 0 ? `R${localValue}` : localValue < 0 ? `L${Math.abs(localValue)}` : 'C'}`}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                style={{ overflow: 'visible' }}
            >
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="#1a1a24"
                    stroke="#333"
                    strokeWidth="1"
                />

                <path
                    d="M 4.5 17 A 9 9 0 1 1 19.5 17"
                    fill="none"
                    stroke="#2a2a3a"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                <path
                    d={localValue >= 0
                        ? `M 12 3 A 9 9 0 0 1 ${12 + 9 * Math.sin(rotation * Math.PI / 180)} ${12 - 9 * Math.cos(rotation * Math.PI / 180)}`
                        : `M ${12 + 9 * Math.sin(rotation * Math.PI / 180)} ${12 - 9 * Math.cos(rotation * Math.PI / 180)} A 9 9 0 0 1 12 3`
                    }
                    fill="none"
                    stroke={localValue === 0 ? '#555' : '#5865f2'}
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                <circle
                    cx="12"
                    cy="12"
                    r="4"
                    fill={isDragging ? '#5865f2' : '#444'}
                />

                <line
                    x1="12"
                    y1="12"
                    x2={12 + 7 * Math.sin(rotation * Math.PI / 180)}
                    y2={12 - 7 * Math.cos(rotation * Math.PI / 180)}
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
