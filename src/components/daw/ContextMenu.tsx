'use client';
import React, { memo, useEffect } from 'react';
import type { TrackType } from '../../lib/types';

interface ContextMenuProps {
  x: number;
  y: number;
  trackId: number;
  onClose: () => void;
  onRename: (trackId: number) => void;
  onChangeType: (trackId: number, type: TrackType) => void;
  onChangeColor: (trackId: number, color: string) => void;
  onDuplicate: (trackId: number) => void;
  onOpenFX: (trackId: number) => void;
  onToggleAutomation: (trackId: number) => void;
  onClearClips: (trackId: number) => void;
  onDelete: (trackId: number) => void;
  colors: string[];
  hasAutomation?: boolean;
}

function ContextMenuInner({
  x, y, trackId, onClose, onRename, onChangeType, onChangeColor,
  onDuplicate, onOpenFX, onToggleAutomation, onClearClips, onDelete, colors, hasAutomation,
}: ContextMenuProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="context-menu-overlay"
      onClick={onClose}
    >
      <div
        className="context-menu"
        role="menu"
        style={{ left: x, top: y }}
        onClick={e => e.stopPropagation()}
      >
        <button role="menuitem" onClick={() => onRename(trackId)}>
          ✏️ Rename
        </button>
        <div className="context-menu-divider" />
        <div className="context-menu-label">Track Type</div>
        <button role="menuitem" onClick={() => onChangeType(trackId, 'midi')}>
          🎹 MIDI
        </button>
        <button role="menuitem" onClick={() => onChangeType(trackId, 'audio')}>
          🎵 Audio
        </button>
        <button role="menuitem" onClick={() => onChangeType(trackId, 'drums')}>
          🥁 Drums
        </button>
        <div className="context-menu-divider" />
        <div className="context-menu-label">Color</div>
        <div className="color-picker-row">
          {colors.map(color => (
            <button
              key={color}
              role="menuitem"
              className="color-swatch"
              style={{ backgroundColor: color }}
              onClick={() => onChangeColor(trackId, color)}
            />
          ))}
        </div>
        <div className="context-menu-divider" />
        <button role="menuitem" onClick={() => onDuplicate(trackId)}>
          📋 Duplicate
        </button>
        <button role="menuitem" onClick={() => onOpenFX(trackId)}>
          🎛️ Effects
        </button>
        <button role="menuitem" onClick={() => onToggleAutomation(trackId)}>
          📈 {hasAutomation ? 'Hide Automation' : 'Show Automation'}
        </button>
        <button role="menuitem" onClick={() => onClearClips(trackId)}>
          🗑️ Clear Clips
        </button>
        <div className="context-menu-divider" />
        <button role="menuitem" className="danger" onClick={() => onDelete(trackId)}>
          ❌ Delete Track
        </button>
      </div>
    </div>
  );
}

const ContextMenu = memo(ContextMenuInner);
export default ContextMenu;
