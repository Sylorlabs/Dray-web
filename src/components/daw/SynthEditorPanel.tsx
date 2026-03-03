import React, { useState, useEffect, useRef } from 'react';
import { SYNTH_PRESETS, SynthPreset, OscillatorType, updatePreset, addPreset, findPreset, getCategories, getPresetsByCategory } from '../../lib/presets/synthPresets';
import { toneSynthEngine } from '../../lib/engines/synth';
import { audioEngine } from '../../lib/audioEngine';

interface SynthEditorPanelProps {
  presetName: string;
  onPresetChange?: (preset: SynthPreset) => void;
}

const WAVE_ICONS: Record<OscillatorType, string> = {
  sine: '∿',
  square: '⊓',
  sawtooth: '⩘',
  triangle: '△',
};

const WAVE_LABELS: Record<OscillatorType, string> = {
  sine: 'Sine',
  square: 'Square',
  sawtooth: 'Saw',
  triangle: 'Triangle',
};

function Knob({ value, min, max, step = 0.01, label, unit = '', onChange }: {
  value: number; min: number; max: number; step?: number; label: string; unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayVal = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : step >= 1 ? value.toFixed(0) : value.toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
      <span style={{ fontSize: 10, color: '#8888aa', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
      <div style={{
        position: 'relative', width: 44, height: 44, borderRadius: '50%',
        background: `conic-gradient(#5865f2 0% ${pct}%, #1a1a2e ${pct}% 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: '#1e1e2d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#ccc', fontWeight: 600
        }}>
          {displayVal}{unit}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: 52, height: 4, appearance: 'auto', accentColor: '#5865f2', cursor: 'pointer' }}
      />
    </div>
  );
}

export default function SynthEditorPanel({ presetName, onPresetChange }: SynthEditorPanelProps) {
  const [preset, setPreset] = useState<SynthPreset | null>(null);
  const [previewNote, setPreviewNote] = useState<number>(60);
  const [status, setStatus] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const saveTimer = useRef<any>(null);
  const debouncedUpdateRef = useRef<any>(null);

  useEffect(() => {
    const found = findPreset(presetName) || null;
    setPreset(found ? { ...found } : null);
    if (found) setSelectedCategory(found.category);
  }, [presetName]);

  const update = (field: keyof SynthPreset, value: any) => {
    if (!preset) return;
    const updated = { ...preset, [field]: value };
    setPreset(updated);
    onPresetChange?.(updated);
    if (debouncedUpdateRef.current) clearTimeout(debouncedUpdateRef.current);
    debouncedUpdateRef.current = setTimeout(() => {
      try {
        const applied = updatePreset(preset.name, { [field]: value } as Partial<SynthPreset>);
        if (!applied) addPreset({ ...(preset as SynthPreset) });
        try { (toneSynthEngine as any).applyPresetUpdate?.(preset.name, { [field]: value }); } catch (e) { }
      } catch (e) {
        console.error('Failed to apply preset update', e);
      }
    }, 180);
  };

  const updateOsc = (idx: number, field: keyof SynthPreset['oscillators'][0], value: any) => {
    if (!preset) return;
    const newOsc = preset.oscillators.map((o, i) => i === idx ? { ...o, [field]: value } : o);
    update('oscillators', newOsc);
  };

  const playPreview = () => {
    if (!preset) return;
    setStatus('♪');
    try {
      toneSynthEngine.playNote(-1, preset.name, previewNote, 0.5, 0.9);
    } catch (e) {
      console.error('Preview play error', e);
      setStatus('✕');
      setTimeout(() => setStatus(null), 1500);
    }
    setTimeout(() => setStatus(null), 600);
  };

  const handleSave = () => {
    if (!preset) return;
    try {
      const ok = updatePreset(preset.name, preset as Partial<SynthPreset>);
      if (!ok) addPreset(preset as SynthPreset);
      const custom = localStorage.getItem('drey-custom-presets');
      const list = custom ? JSON.parse(custom) : [];
      const idx = list.findIndex((p: any) => p.name === preset.name);
      if (idx === -1) list.push(preset); else list[idx] = preset;
      localStorage.setItem('drey-custom-presets', JSON.stringify(list));
      setStatus('Saved ✓');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setStatus(null), 1400);
    } catch (e) {
      console.error('Save preset failed', e);
      setStatus('Save failed');
      setTimeout(() => setStatus(null), 1400);
    }
  };

  const handleReset = () => {
    const original = findPreset(presetName);
    if (!original) return;
    setPreset({ ...original });
    try { updatePreset(original.name, original); } catch (e) { }
    setStatus('Reset ✓');
    setTimeout(() => setStatus(null), 1200);
  };

  if (!preset) return (
    <div style={{
      background: '#13131d', color: '#666', borderRadius: 12, padding: 24,
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200,
      border: '1px solid #1e1e2d', fontSize: 14
    }}>
      Select an instrument to edit its sound
    </div>
  );

  const categories = getCategories();
  const categoryPresets = selectedCategory ? getPresetsByCategory(selectedCategory as any) : [];

  return (
    <div style={{
      background: '#13131d', color: '#e2e2e9', borderRadius: 12,
      minWidth: 360, border: '1px solid #1e1e2d', overflow: 'hidden'
    }} aria-label={preset.name + ' Synth Editor'} role="region">

      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #1e1e2d', background: '#0f0f19'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#5865f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700
          }}>
            {WAVE_ICONS[preset.oscillators[0]?.type] || '∿'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{preset.name}</div>
            <div style={{ fontSize: 11, color: '#7171a1' }}>{preset.category}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12, color: '#57f287', marginRight: 4 }}>{status}</span>}
          <button onClick={handleSave} style={{
            background: '#57f287', color: '#0a0a0a', border: 'none', padding: '6px 14px',
            borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer'
          }}>Save</button>
          <button onClick={handleReset} style={{
            background: '#2a2a3e', color: '#aaa', border: 'none', padding: '6px 14px',
            borderRadius: 6, fontSize: 12, cursor: 'pointer'
          }}>Reset</button>
        </div>
      </div>

      {/* Preset Browser (compact) */}
      <div style={{
        padding: '10px 20px', display: 'flex', gap: 6, flexWrap: 'wrap',
        borderBottom: '1px solid #1e1e2d', background: '#111119'
      }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
            padding: '4px 10px', borderRadius: 12, border: 'none', fontSize: 11,
            cursor: 'pointer', fontWeight: 500,
            background: selectedCategory === cat ? '#5865f2' : '#1e1e2d',
            color: selectedCategory === cat ? '#fff' : '#8888aa'
          }}>{cat}</button>
        ))}
      </div>
      {selectedCategory && categoryPresets.length > 0 && (
        <div style={{
          padding: '8px 20px', display: 'flex', gap: 4, flexWrap: 'wrap',
          borderBottom: '1px solid #1e1e2d', background: '#0f0f17', maxHeight: 72, overflowY: 'auto'
        }}>
          {categoryPresets.map(p => (
            <button key={p.name} onClick={() => {
              setPreset({ ...p });
              onPresetChange?.(p);
              try { updatePreset(p.name, p); } catch (e) { }
            }} style={{
              padding: '3px 8px', borderRadius: 4, border: 'none', fontSize: 11,
              cursor: 'pointer',
              background: p.name === preset.name ? 'rgba(88,101,242,0.2)' : 'transparent',
              color: p.name === preset.name ? '#5865f2' : '#7171a1'
            }}>{p.name}</button>
          ))}
        </div>
      )}

      {/* Preview */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid #1e1e2d'
      }}>
        <button onClick={playPreview} style={{
          width: 36, height: 36, borderRadius: '50%', background: '#5865f2', border: 'none',
          color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(88,101,242,0.4)'
        }}>▶</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#7171a1' }}>Note</span>
          <input
            type="range" min={36} max={96} value={previewNote}
            onChange={e => setPreviewNote(Number(e.target.value))}
            style={{ width: 100, accentColor: '#5865f2', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace', minWidth: 28 }}>
            {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][previewNote % 12]}{Math.floor(previewNote / 12) - 1}
          </span>
        </div>
      </div>

      {/* Main Controls - Simple / Beginner Friendly */}
      <div style={{ padding: '16px 20px' }}>
        {/* Waveform selector for main osc */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waveform</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(waveType => (
              <button key={waveType} onClick={() => updateOsc(0, 'type', waveType)} style={{
                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: preset.oscillators[0]?.type === waveType ? 'rgba(88,101,242,0.2)' : '#1a1a2e',
                color: preset.oscillators[0]?.type === waveType ? '#5865f2' : '#7171a1',
                outline: preset.oscillators[0]?.type === waveType ? '1px solid #5865f2' : '1px solid transparent'
              }}>
                <span style={{ fontSize: 18 }}>{WAVE_ICONS[waveType]}</span>
                <span style={{ fontSize: 10 }}>{WAVE_LABELS[waveType]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Envelope (ADSR) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Envelope</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#1a1a2e', borderRadius: 8, padding: '12px 8px' }}>
            <Knob label="Attack" value={preset.attack} min={0} max={2} step={0.01} unit="s" onChange={v => update('attack', v)} />
            <Knob label="Decay" value={preset.decay} min={0} max={2} step={0.01} unit="s" onChange={v => update('decay', v)} />
            <Knob label="Sustain" value={preset.sustain} min={0} max={1} step={0.01} onChange={v => update('sustain', v)} />
            <Knob label="Release" value={preset.release} min={0} max={3} step={0.01} unit="s" onChange={v => update('release', v)} />
          </div>
        </div>

        {/* Filter & Reverb */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tone & Space</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#1a1a2e', borderRadius: 8, padding: '12px 8px' }}>
            <Knob label="Brightness" value={preset.filterFreq} min={100} max={15000} step={50} onChange={v => update('filterFreq', v)} />
            <Knob label="Resonance" value={preset.filterQ} min={0.1} max={15} step={0.1} onChange={v => update('filterQ', v)} />
            <Knob label="Reverb" value={preset.reverbMix} min={0} max={1} step={0.01} onChange={v => update('reverbMix', v)} />
          </div>
        </div>

        {/* Effects (simple) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Effects</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', background: '#1a1a2e', borderRadius: 8, padding: '12px 8px' }}>
            <Knob label="Chorus" value={preset.chorus?.mix ?? 0} min={0} max={1} step={0.01}
              onChange={v => update('chorus', { ...preset.chorus, rate: preset.chorus?.rate ?? 1.5, depth: preset.chorus?.depth ?? 0.5, mix: v })} />
            <Knob label="Delay" value={preset.delay?.mix ?? 0} min={0} max={1} step={0.01}
              onChange={v => update('delay', { ...preset.delay, time: preset.delay?.time ?? 0.25, feedback: preset.delay?.feedback ?? 0.3, mix: v })} />
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
        width: '100%', padding: '10px 20px', background: '#0f0f19', border: 'none',
        borderTop: '1px solid #1e1e2d', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        color: '#7171a1', fontSize: 12
      }}>
        <span style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
      </button>

      {/* Advanced Section */}
      {showAdvanced && (
        <div style={{
          padding: '16px 20px', borderTop: '1px solid #1e1e2d',
          background: '#0d0d15', maxHeight: 400, overflowY: 'auto'
        }}>
          {/* Oscillators */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Oscillators ({preset.oscillators.length})
            </div>
            {preset.oscillators.map((osc, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px',
                background: '#1a1a2e', borderRadius: 6, marginBottom: 4, fontSize: 12
              }}>
                <span style={{ color: '#5865f2', fontWeight: 600, minWidth: 20 }}>#{i + 1}</span>
                <select value={osc.type} onChange={e => updateOsc(i, 'type', e.target.value as OscillatorType)} style={{
                  background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc',
                  padding: '3px 6px', borderRadius: 4, fontSize: 11
                }}>
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="sawtooth">Saw</option>
                  <option value="triangle">Triangle</option>
                </select>
                <span style={{ color: '#666', fontSize: 10 }}>Detune</span>
                <input type="number" value={osc.detune} onChange={e => updateOsc(i, 'detune', Number(e.target.value))}
                  style={{ width: 48, background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 4px', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
                <span style={{ color: '#666', fontSize: 10 }}>Gain</span>
                <input type="range" min={0} max={1} step={0.01} value={osc.gain}
                  onChange={e => updateOsc(i, 'gain', Number(e.target.value))}
                  style={{ width: 60, accentColor: '#5865f2', cursor: 'pointer' }} />
                <span style={{ fontSize: 10, color: '#888', minWidth: 28 }}>{osc.gain.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Effects Detail */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Effects Detail</div>
            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '12px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
                <Knob label="Cho Rate" value={preset.chorus?.rate ?? 0} min={0} max={10} step={0.1}
                  onChange={v => update('chorus', { ...preset.chorus, rate: v })} />
                <Knob label="Cho Depth" value={preset.chorus?.depth ?? 0} min={0} max={1} step={0.01}
                  onChange={v => update('chorus', { ...preset.chorus, depth: v })} />
                <Knob label="Dly Time" value={preset.delay?.time ?? 0} min={0} max={2} step={0.01} unit="s"
                  onChange={v => update('delay', { ...preset.delay, time: v })} />
                <Knob label="Dly FB" value={preset.delay?.feedback ?? 0} min={0} max={0.95} step={0.01}
                  onChange={v => update('delay', { ...preset.delay, feedback: v })} />
              </div>
            </div>
          </div>

          {/* LFO */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LFO</div>
            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '12px 10px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#888' }}>Shape</span>
                  <select value={preset.lfo?.type ?? 'sine'} onChange={e => update('lfo', { ...preset.lfo, type: e.target.value })} style={{
                    background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 6px', borderRadius: 4, fontSize: 11
                  }}>
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#888' }}>Target</span>
                  <select value={preset.lfo?.target ?? 'filter'} onChange={e => update('lfo', { ...preset.lfo, target: e.target.value })} style={{
                    background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 6px', borderRadius: 4, fontSize: 11
                  }}>
                    <option value="filter">Filter</option>
                    <option value="pitch">Pitch</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <Knob label="Rate" value={preset.lfo?.rate ?? 0} min={0} max={10} step={0.1}
                  onChange={v => update('lfo', { ...preset.lfo, rate: v })} />
                <Knob label="Amount" value={preset.lfo?.amount ?? 0} min={0} max={5000} step={10}
                  onChange={v => update('lfo', { ...preset.lfo, amount: v })} />
              </div>
            </div>
          </div>

          {/* Automation */}
          <div>
            <div style={{ fontSize: 11, color: '#7171a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parameter Automation</div>
            <div style={{
              background: '#1a1a2e', borderRadius: 8, padding: '12px 10px',
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#888' }}>Filter</span>
                <input id="autoStart" type="number" min={20} max={20000} defaultValue={preset.filterFreq}
                  style={{ width: 60, background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 4px', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
                <span style={{ fontSize: 10, color: '#666' }}>→</span>
                <input id="autoEnd" type="number" min={20} max={20000} defaultValue={Math.round(preset.filterFreq / 2)}
                  style={{ width: 60, background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 4px', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#888' }}>Dur</span>
                <input id="autoDur" type="number" min={0.01} max={60} step={0.01} defaultValue={2}
                  style={{ width: 48, background: '#0f0f19', border: '1px solid #2a2a3e', color: '#ccc', padding: '3px 4px', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
                <span style={{ fontSize: 10, color: '#666' }}>s</span>
              </div>
              <button onClick={() => {
                try {
                  const s = Number((document.getElementById('autoStart') as HTMLInputElement).value);
                  const e = Number((document.getElementById('autoEnd') as HTMLInputElement).value);
                  const d = Number((document.getElementById('autoDur') as HTMLInputElement).value);
                  if (isNaN(s) || isNaN(e) || isNaN(d) || d <= 0) { setStatus('Invalid values'); setTimeout(() => setStatus(null), 1200); return; }
                  const now = audioEngine.getNow();
                  const startTime = now + 0.02;
                  const endTime = startTime + d;
                  (toneSynthEngine as any).scheduleParamRamp?.(preset.name, ['filter', 'frequency'], s, e, startTime, endTime);
                  setStatus('Applied ✓');
                  setTimeout(() => setStatus(null), 1200);
                } catch (err) {
                  console.error('Schedule automation failed', err);
                  setStatus('Failed');
                  setTimeout(() => setStatus(null), 1200);
                }
              }} style={{
                background: '#5865f2', color: 'white', border: 'none', padding: '5px 10px',
                borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 500
              }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
