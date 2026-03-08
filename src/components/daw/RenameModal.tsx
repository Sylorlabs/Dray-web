'use client';
import React, { memo } from 'react';
import { X } from 'lucide-react';

interface RenameModalProps {
  name: string;
  onNameChange: (name: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function RenameModalInner({ name, onNameChange, onConfirm, onClose }: RenameModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rename-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rename Track</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-content">
          <input
            type="text"
            className="rename-input"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConfirm()}
            autoFocus
            placeholder="Track name..."
          />
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onConfirm}>Rename</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RenameModal = memo(RenameModalInner);
export default RenameModal;
