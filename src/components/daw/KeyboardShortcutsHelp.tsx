'use client';
import React, { memo } from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

function KeyboardShortcutsHelpInner({ onClose }: KeyboardShortcutsHelpProps) {
  return (
    <div className="fx-panel-overlay" onClick={onClose}>
      <div className="keyboard-help" onClick={e => e.stopPropagation()}>
        <h2>Keyboard Shortcuts</h2>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="shortcut-grid">
          <div className="shortcut-section">
            <h3>Transport</h3>
            <div className="shortcut"><kbd>Space</kbd>Play / Stop</div>
            <div className="shortcut"><kbd>Ctrl+Z</kbd>Undo</div>
            <div className="shortcut"><kbd>Ctrl+Shift+Z</kbd>Redo</div>
          </div>
          <div className="shortcut-section">
            <h3>Piano Roll</h3>
            <div className="shortcut"><kbd>Ctrl+A</kbd>Select All</div>
            <div className="shortcut"><kbd>Ctrl+C</kbd>Copy Notes</div>
            <div className="shortcut"><kbd>Ctrl+V</kbd>Paste Notes</div>
            <div className="shortcut"><kbd>Ctrl+D</kbd>Duplicate Notes</div>
            <div className="shortcut"><kbd>Delete</kbd>Delete Selected</div>
            <div className="shortcut"><kbd>↑/↓</kbd>Transpose ±1 semitone</div>
            <div className="shortcut"><kbd>Shift+↑/↓</kbd>Transpose ±1 octave</div>
            <div className="shortcut"><kbd>←/→</kbd>Move in time</div>
            <div className="shortcut"><kbd>Shift+←/→</kbd>Resize duration</div>
            <div className="shortcut"><kbd>Alt+↑/↓</kbd>Adjust velocity ±5%</div>
            <div className="shortcut"><kbd>Ctrl++/-</kbd>Zoom in/out</div>
          </div>
          <div className="shortcut-section">
            <h3>General</h3>
            <div className="shortcut"><kbd>?</kbd>This help overlay</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KeyboardShortcutsHelp = memo(KeyboardShortcutsHelpInner);
export default KeyboardShortcutsHelp;
