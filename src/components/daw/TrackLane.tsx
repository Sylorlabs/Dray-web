'use client';

import React, { memo, useRef } from 'react';
import VolumeMeter from './VolumeMeter';
import PanKnob from './PanKnob';
import type { Track } from '../../lib/types';

const PIXELS_PER_BEAT = 50;

interface TrackLaneProps {
  track: Track;
  isSelected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isGreyed: boolean;
  isPlaying: boolean;
  showAutomation?: boolean;
  onSelect: (id: number) => void;
  onDoubleClick: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onMute: (id: number) => void;
  onSolo: (id: number, shift: boolean) => void;
  onVolumeChange: (id: number, vol: number) => void;
  onPanChange: (id: number, pan: number) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  onDragEnd: () => void;
  onClipResize?: (trackId: number, clipIdx: number, newDuration: number) => void;
  onClipMove?: (trackId: number, clipIdx: number, newStart: number) => void;
  onAutomationEdit?: (trackId: number, beat: number, value: number) => void;
}

function TrackLaneInner({
  track,
  isSelected,
  isDragging,
  isDropTarget,
  isGreyed,
  isPlaying,
  showAutomation,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onMute,
  onSolo,
  onVolumeChange,
  onPanChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClipResize,
  onClipMove,
  onAutomationEdit,
}: TrackLaneProps) {
  const resizingRef = useRef<{ clipIdx: number; startX: number; startDuration: number } | null>(null);
  const movingRef = useRef<{ clipIdx: number; startX: number; startPos: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, clipIdx: number, currentDuration: number) => {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = { clipIdx, startX: e.clientX, startDuration: currentDuration };

    const handleMove = (ev: MouseEvent) => {
      if (!resizingRef.current || !onClipResize) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newDuration = Math.max(0.25, resizingRef.current.startDuration + delta / PIXELS_PER_BEAT);
      onClipResize(track.id, resizingRef.current.clipIdx, newDuration);
    };

    const handleUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleMoveStart = (e: React.MouseEvent, clipIdx: number, currentStart: number) => {
    // Only move if not clicking the resize handle
    const target = e.target as HTMLElement;
    if (target.classList.contains('clip-resize-handle') || target.closest('.clip-resize-handle')) return;

    e.stopPropagation();
    movingRef.current = { clipIdx, startX: e.clientX, startPos: currentStart };

    const handleMove = (ev: MouseEvent) => {
      if (!movingRef.current || !onClipMove) return;
      const delta = ev.clientX - movingRef.current.startX;
      const newStart = Math.max(0, movingRef.current.startPos + delta / PIXELS_PER_BEAT);
      // Optional: Snap to grid? For now just smooth move
      onClipMove(track.id, movingRef.current.clipIdx, newStart);
    };

    const handleUp = () => {
      movingRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };
  const notes = track.clips.flatMap(c => c.notes || []);
  const minPitch = notes.length > 0 ? Math.min(...notes.map(n => n.pitch)) : 60;
  const maxPitch = notes.length > 0 ? Math.max(...notes.map(n => n.pitch)) : 72;

  return (
    <div
      role="listitem"
      aria-label={track.name}
      aria-selected={isSelected}
      className={[
        'track-lane',
        track.muted ? 'muted' : '',
        isSelected ? 'selected' : '',
        isGreyed ? 'greyed' : '',
        isDragging ? 'dragging' : '',
        isDropTarget ? 'drop-target' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onSelect(track.id)}
      onDoubleClick={() => onDoubleClick(track.id)}
      onContextMenu={(e) => onContextMenu(e, track.id)}
      onDragOver={(e) => onDragOver(e, track.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, track.id)}
    >
      <div
        className="track-header"
        draggable
        onDragStart={(e) => onDragStart(e, track.id)}
        onDragEnd={onDragEnd}
      >
        <div className="track-color" style={{ backgroundColor: track.color }} />
        <div className="track-info">
          <div className="track-row-1">
            <span className="track-name" title={track.name}>{track.name}</span>
            <div className="track-controls">
              <button
                className={`track-btn mute ${track.muted ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); onMute(track.id); }}
                title="Mute"
                aria-label={`Mute ${track.name}`}
                aria-pressed={track.muted}
              >M</button>
              <button
                className={`track-btn solo ${track.soloed ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); onSolo(track.id, e.shiftKey); }}
                title="Solo (Shift+Click for multi)"
                aria-label={`Solo ${track.name}`}
                aria-pressed={track.soloed}
              >S</button>
            </div>
          </div>
          <div className="track-row-2" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <VolumeMeter
              trackId={track.id}
              volume={track.volume}
              onVolumeChange={(vol) => onVolumeChange(track.id, vol)}
              isPlaying={isPlaying}
              isMuted={track.muted}
            />
            <PanKnob
              value={track.pan}
              size={20}
              onChange={pan => onPanChange(track.id, pan)}
            />
          </div>
          {track.instrument && track.instrument !== track.name && (
            <span className="track-instrument">{track.instrument}</span>
          )}
        </div>
      </div>

      <div className="track-content" style={{ minHeight: '80px' }}>
        {track.clips.map((clip, idx) => {
          const clipWidth = clip.duration * PIXELS_PER_BEAT;
          const clipNotes = clip.notes || [];
          const clipMinPitch = clipNotes.length > 0 ? Math.min(...clipNotes.map(n => n.pitch)) : minPitch;
          const clipMaxPitch = clipNotes.length > 0 ? Math.max(...clipNotes.map(n => n.pitch)) : maxPitch;
          const pitchRange = Math.max(12, clipMaxPitch - clipMinPitch + 1);

          return (
            <div
              key={idx}
              className="clip"
              style={{
                left: `${clip.start * PIXELS_PER_BEAT}px`,
                width: `${clipWidth}px`,
                backgroundColor: track.color + '33',
                borderColor: track.color,
                boxShadow: `0 0 10px ${track.color}22`,
              }}
              onMouseDown={(e) => handleMoveStart(e, idx, clip.start)}
            >
              <span className="clip-name">{clip.name}</span>
              {/* MIDI Note Visualization */}
              {(track.type === 'midi' || track.type === 'drums') && clipNotes.length > 0 && (
                <svg className="clip-notes" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {clipNotes.map((note, noteIdx) => {
                    const x = (note.start / clip.duration) * 100;
                    const w = Math.max(1, (note.duration / clip.duration) * 100);
                    const y = ((clipMaxPitch - note.pitch) / pitchRange) * 100;
                    const h = (1 / pitchRange) * 100;
                    return (
                      <rect
                        key={noteIdx}
                        x={x}
                        y={y}
                        width={w - 0.5}
                        height={h}
                        rx={0.5}
                        fill={track.color}
                        opacity={0.9}
                      />
                    );
                  })}
                </svg>
              )}

              {/* Audio Waveform Visualization */}
              {track.type === 'audio' && (
                <svg className="clip-waveform" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {clip.waveform?.peaks ? (
                    // Real waveform from decoded audio
                    clip.waveform.peaks.map((peak, i) => {
                      const barCount = clip.waveform!.peaks.length;
                      const barW = 100 / barCount;
                      const h = Math.max(2, peak * 80);
                      const y = (100 - h) / 2;
                      return (
                        <rect
                          key={i}
                          x={i * barW}
                          y={y}
                          width={Math.max(0.5, barW - 0.3)}
                          height={h}
                          rx={0.3}
                          fill={track.color}
                          opacity={0.7}
                        />
                      );
                    })
                  ) : (
                    // Fallback: procedural waveform from clip name
                    Array.from({ length: 50 }).map((_, i) => {
                      const seed = (clip.name.charCodeAt(i % clip.name.length) + i) % 100;
                      const h = 20 + (seed / 100) * 60;
                      const y = (100 - h) / 2;
                      return (
                        <rect
                          key={i}
                          x={i * 2}
                          y={y}
                          width={1.5}
                          height={h}
                          rx={0.5}
                          fill={track.color}
                          opacity={0.6}
                        />
                      );
                    })
                  )}
                </svg>
              )}

              {/* Clip resize handle */}
              {onClipResize && (
                <div
                  className="clip-resize-handle"
                  onMouseDown={(e) => handleResizeStart(e, idx, clip.duration)}
                />
              )}
            </div>
          );
        })}

        {/* Automation Lane Overlay */}
        {showAutomation && track.automation && track.automation.length > 0 && track.automation.map(lane => {
          if (lane.points.length < 2) return null;
          const sorted = [...lane.points].sort((a, b) => a.beat - b.beat);
          const maxBeat = Math.max(16, sorted[sorted.length - 1].beat);
          const totalWidth = maxBeat * PIXELS_PER_BEAT;
          const pathPoints = sorted.map(p => `${p.beat * PIXELS_PER_BEAT},${(1 - p.value) * 70 + 5}`).join(' ');
          const color = lane.param === 'volume' ? '#57f287' : '#faa61a';
          return (
            <svg
              key={lane.param}
              className="automation-overlay"
              viewBox={`0 0 ${totalWidth} 80`}
              preserveAspectRatio="none"
              onClick={(e) => {
                if (!onAutomationEdit) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const beat = Math.round((x / rect.width * maxBeat) * 4) / 4;
                const value = Math.max(0, Math.min(1, 1 - (y / rect.height)));
                onAutomationEdit(track.id, beat, value);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${totalWidth}px`,
                height: '100%',
                pointerEvents: showAutomation ? 'auto' : 'none',
                zIndex: 5,
                cursor: showAutomation ? 'crosshair' : 'default'
              }}
            >
              {/* Shaded area under curve */}
              <polygon
                points={`0,80 ${pathPoints} ${totalWidth},80`}
                fill={color}
                opacity={0.08}
              />
              <polyline
                points={pathPoints}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                opacity={0.8}
              />
              {sorted.map((p, i) => (
                <circle
                  key={i}
                  cx={p.beat * PIXELS_PER_BEAT}
                  cy={(1 - p.value) * 70 + 5}
                  r="4"
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                  opacity={0.9}
                  style={{ cursor: 'grab' }}
                />
              ))}
            </svg>
          );
        })}
      </div>
    </div>
  );
}

// Memoize: only re-render if props that actually affect this track change.
// The key insight: editing track 3 no longer forces track 1 to re-render.
export const TrackLane = memo(TrackLaneInner, (prev, next) => {
  // Return true if equal (skip render), false if different (do render)
  return (
    prev.track === next.track &&
    prev.isSelected === next.isSelected &&
    prev.isDragging === next.isDragging &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isGreyed === next.isGreyed &&
    prev.isPlaying === next.isPlaying &&
    prev.showAutomation === next.showAutomation
  );
});

export default TrackLane;
