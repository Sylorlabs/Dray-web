'use client';
import React, { memo, useMemo, useRef, useCallback } from 'react';
import { Folder, ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import { SOUND_LIBRARY, type SoundCategoryType as SoundCategory } from '../../lib/constants';

type SubcategoryData = { readonly [subcategory: string]: readonly string[] } | readonly string[];

interface SoundBrowserProps {
  expandedCategory: string | null;
  onExpandCategory: (category: string | null) => void;
  onPreview: (category: SoundCategory, sound: string) => void;
  onApply: (category: SoundCategory, sound: string) => void;
}

function SoundBrowserInner({
  expandedCategory, onExpandCategory, onPreview, onApply,
}: SoundBrowserProps) {
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback((category: SoundCategory, sound: string) => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      onPreview(category, sound);
    }, 200);
  }, [onPreview]);

  const handleDoubleClick = useCallback((category: SoundCategory, sound: string) => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    onApply(category, sound);
  }, [onApply]);

  const totalSounds = useMemo(() => {
    return Object.values(SOUND_LIBRARY).reduce((acc, data) => {
        if (Array.isArray(data)) return acc + data.length;
        return acc + Object.values(data).flat().length;
    }, 0);
  }, []);

  return (
    <aside className="sample-browser">
      <div className="browser-header">
        <Folder size={16} />
        <span>Sounds</span>
        <span className="sound-count">{totalSounds}+</span>
      </div>
      <div className="browser-hint">Double-click to apply to track</div>
      <div className="browser-categories">
        {(Object.entries(SOUND_LIBRARY) as [SoundCategory, SubcategoryData][]).map(([category, data]) => {
          const isNested = !Array.isArray(data);
          const allSounds = isNested ? Object.values(data).flat() : data;
          const totalCount = allSounds.length;

          return (
            <div key={category} className="category">
              <button className="category-header" onClick={() => onExpandCategory(expandedCategory === category ? null : category)}>
                {expandedCategory === category ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{category}</span>
                <span className="count">{totalCount}</span>
              </button>
              {expandedCategory === category && (
                <div className="sounds-list" role="listbox" aria-label="Sound library">
                  {isNested ? (
                    Object.entries(data as { [key: string]: string[] }).map(([subcategory, sounds]) => (
                      <div key={subcategory} className="subcategory">
                        <div className="subcategory-header">
                          {subcategory}
                        </div>
                        {sounds.map(sound => (
                          <div
                            key={sound}
                            className="sound-item"
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            onClick={() => handleClick(category, sound)}
                            onDoubleClick={() => handleDoubleClick(category, sound)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onApply(category, sound);
                              if (e.key === ' ') { e.preventDefault(); onPreview(category, sound); }
                            }}
                          >
                            <Volume2 size={12} />
                            <span>{sound}</span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    (data as string[]).map(sound => (
                      <div
                        key={sound}
                        className="sound-item"
                        role="option"
                        aria-selected={false}
                        tabIndex={0}
                        onClick={() => handleClick(category, sound)}
                        onDoubleClick={() => handleDoubleClick(category, sound)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onApply(category, sound);
                          if (e.key === ' ') { e.preventDefault(); onPreview(category, sound); }
                        }}
                      >
                        <Volume2 size={12} />
                        <span>{sound}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

const SoundBrowser = memo(SoundBrowserInner);
export default SoundBrowser;
