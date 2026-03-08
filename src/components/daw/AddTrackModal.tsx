'use client';
import React, { memo } from 'react';
import { X, Music, FileAudio, Drum } from 'lucide-react';
import type { TrackType } from '../../lib/types';

interface AddTrackModalProps {
  onClose: () => void;
  onCreateTrack: (type: TrackType) => void;
}

function AddTrackModalInner({ onClose, onCreateTrack }: AddTrackModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Track</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-content">
          <button className="track-type-btn" onClick={() => onCreateTrack('midi')}>
            <Music size={24} />
            <span>MIDI Track</span>
            <small>For synths, keys, and virtual instruments</small>
          </button>
          <button className="track-type-btn" onClick={() => onCreateTrack('audio')}>
            <FileAudio size={24} />
            <span>Audio Track</span>
            <small>For recordings, samples, and vocals</small>
          </button>
          <button className="track-type-btn" onClick={() => onCreateTrack('drums')}>
            <Drum size={24} />
            <span>Drum Pad</span>
            <small>For beats and percussion</small>
          </button>
        </div>
      </div>
    </div>
  );
}

const AddTrackModal = memo(AddTrackModalInner);
export default AddTrackModal;
