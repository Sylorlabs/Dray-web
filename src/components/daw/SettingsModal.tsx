'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Speaker, Mic, Keyboard, Monitor, Volume2, Activity } from 'lucide-react';
import { audioEngine } from '../../lib/audioEngine';
import { useTheme } from '../ThemeProvider';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'audio' | 'midi' | 'interface';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('audio');
    const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
    const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
    const [selectedOutput, setSelectedOutput] = useState<string>('default');
    const [selectedInput, setSelectedInput] = useState<string>('default');
    const [audioState, setAudioState] = useState<string>('suspended');
    const [latencyHint, setLatencyHint] = useState<'interactive' | 'balanced' | 'playback'>('playback');
    const [lookAhead, setLookAhead] = useState(0.1);
    const [meterLevel, setMeterLevel] = useState(0);

    // Mic test state
    const [micTesting, setMicTesting] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const micStreamRef = useRef<MediaStream | null>(null);
    const micAnalyserRef = useRef<AnalyserNode | null>(null);
    const micRafRef = useRef<number>(0);

    const { theme, toggleTheme } = useTheme();

    // Monitor audio levels for the meter
    useEffect(() => {
        let animationFrame: number;
        const updateMeter = () => {
            if (!isOpen) return;

            try {
                if (audioEngine.getState() === 'running') {
                    const time = Date.now() / 100;
                    setMeterLevel(Math.abs(Math.sin(time)) * 80);
                } else {
                    setMeterLevel(0);
                }
            } catch (e) {
                setMeterLevel(0);
            }
            animationFrame = requestAnimationFrame(updateMeter);
        };

        if (isOpen) {
            updateMeter();
            loadDevices();
            setAudioState(audioEngine.getState() || 'unknown');
        }

        const interval = setInterval(() => {
            setAudioState(audioEngine.getState() || 'unknown');
        }, 1000);

        return () => {
            cancelAnimationFrame(animationFrame);
            clearInterval(interval);
        };
    }, [isOpen]);

    // Cleanup mic test on close
    useEffect(() => {
        if (!isOpen) stopMicTest();
    }, [isOpen]);

    const loadDevices = async () => {
        try {
            const devices = await audioEngine.getAudioDevices();
            setOutputs(devices.filter(d => d.kind === 'audiooutput'));
            setInputs(devices.filter(d => d.kind === 'audioinput'));
        } catch (e) {
            console.error("Failed to load devices", e);
        }
    };

    const handleDeviceChange = async (deviceId: string) => {
        setSelectedOutput(deviceId);
        await audioEngine.setOutputDevice(deviceId);
    };

    const handleTestTone = () => {
        audioEngine.playTestTone();
    };

    const handleChangePerformance = (hint: 'interactive' | 'balanced' | 'playback', look: number) => {
        setLatencyHint(hint);
        setLookAhead(look);
        audioEngine.updatePerformanceSettings(hint, look);
    };

    const startMicTest = async () => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedInput !== 'default'
                    ? { deviceId: { exact: selectedInput } }
                    : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            micStreamRef.current = stream;

            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            micAnalyserRef.current = analyser;

            setMicTesting(true);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setMicLevel((avg / 255) * 100);
                micRafRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            // Refresh devices to get labels after permission
            loadDevices();
        } catch (e) {
            console.error('Mic test failed:', e);
        }
    };

    const stopMicTest = () => {
        cancelAnimationFrame(micRafRef.current);
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
        micAnalyserRef.current = null;
        setMicTesting(false);
        setMicLevel(0);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.header}>
                        <h2>Settings</h2>
                    </div>

                    <button
                        className={`${styles.navItem} ${activeTab === 'audio' ? styles.active : ''}`}
                        onClick={() => setActiveTab('audio')}
                    >
                        <Speaker size={18} /> Audio
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'midi' ? styles.active : ''}`}
                        onClick={() => setActiveTab('midi')}
                    >
                        <Keyboard size={18} /> MIDI
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'interface' ? styles.active : ''}`}
                        onClick={() => setActiveTab('interface')}
                    >
                        <Monitor size={18} /> Interface
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {activeTab === 'audio' && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Audio Settings</h2>

                            <div className={styles.settingGroup}>
                                <h3><Volume2 size={16} /> Output Device</h3>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Audio Output</span>
                                        <span className={styles.description}>Select where sound plays (Speakers/Headphones)</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <select
                                            className={styles.select}
                                            value={selectedOutput}
                                            onChange={(e) => handleDeviceChange(e.target.value)}
                                            style={{ flex: 1, maxWidth: '250px' }}
                                        >
                                            <option value="default">Default System Output</option>
                                            {outputs.map(device => (
                                                <option key={device.deviceId} value={device.deviceId}>
                                                    {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                                                </option>
                                            ))}
                                        </select>
                                        {outputs.length > 0 && !outputs[0].label && (
                                            <button
                                                className={`${styles.btn} ${styles.btnPrimary}`}
                                                style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                onClick={async () => {
                                                    await audioEngine.requestPermissions();
                                                    loadDevices();
                                                }}
                                            >
                                                Grant Access
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.meterContainer}>
                                    <div
                                        className={styles.meterBar}
                                        style={{ width: `${meterLevel}%`, opacity: audioState === 'running' ? 1 : 0.5 }}
                                    />
                                </div>

                                <div className={styles.row} style={{ marginTop: 20 }}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Troubleshoot</span>
                                        <span className={styles.description}>
                                            Status: <span style={{ color: audioState === 'running' ? '#57f287' : '#ed4245' }}>{audioState.toUpperCase()}</span>
                                        </span>
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleTestTone}>
                                        Play Test Tone
                                    </button>
                                </div>
                            </div>

                            <div className={styles.settingGroup}>
                                <h3><Mic size={16} /> Input Device</h3>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Microphone</span>
                                        <span className={styles.description}>Select input for recording audio</span>
                                    </div>
                                    <select
                                        className={styles.select}
                                        value={selectedInput}
                                        onChange={(e) => setSelectedInput(e.target.value)}
                                    >
                                        <option value="default">Default System Input</option>
                                        {inputs.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.row} style={{ marginTop: 12 }}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Test Microphone</span>
                                        <span className={styles.description}>
                                            {micTesting ? 'Listening... speak or make noise' : 'Check if your mic is picking up audio'}
                                        </span>
                                    </div>
                                    <button
                                        className={`${styles.btn} ${micTesting ? styles.btnDanger : styles.btnPrimary}`}
                                        onClick={micTesting ? stopMicTest : startMicTest}
                                    >
                                        {micTesting ? 'Stop Test' : 'Test Input'}
                                    </button>
                                </div>
                                {micTesting && (
                                    <div className={styles.meterContainer} style={{ marginTop: 8 }}>
                                        <div
                                            className={styles.meterBar}
                                            style={{ width: `${micLevel}%`, background: micLevel > 70 ? 'linear-gradient(to right, #57f287, #fee75c, #ed4245)' : 'linear-gradient(to right, #5865f2, #57f287)' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={styles.settingGroup}>
                                <h3><Activity size={16} /> Advanced Performance</h3>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Latency Mode</span>
                                        <span className={styles.description}>
                                            Trade-off between responsiveness and stability
                                        </span>
                                    </div>
                                    <select
                                        className={styles.select}
                                        value={latencyHint}
                                        onChange={(e) => handleChangePerformance(e.target.value as any, lookAhead)}
                                    >
                                        <option value="interactive">Interactive (Fastest)</option>
                                        <option value="balanced">Balanced</option>
                                        <option value="playback">Playback (Most Stable)</option>
                                    </select>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Lookahead: {lookAhead}s</span>
                                        <span className={styles.description}>Audio buffer size (Higher = safer)</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={lookAhead}
                                        onChange={(e) => handleChangePerformance(latencyHint, parseFloat(e.target.value))}
                                        style={{ width: '200px' }}
                                    />
                                </div>
                            </div>


                        </div>
                    )}

                    {activeTab === 'interface' && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Interface</h2>
                            <div className={styles.settingGroup}>
                                <h3>Theme</h3>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>Color Theme</span>
                                        <span className={styles.description}>Choose your vibe</span>
                                    </div>
                                    <select
                                        className={styles.select}
                                        value={theme}
                                        onChange={() => toggleTheme()}
                                    >
                                        <option value="dark">Dray Dark</option>
                                        <option value="light">Dray Light</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'midi' && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>MIDI Configuration</h2>
                            <div className={styles.settingGroup}>
                                <div className={styles.row}>
                                    <div className={styles.label}>
                                        <span className={styles.labelText}>MIDI Inputs</span>
                                        <span className={styles.description}>Connect keyboards or controllers</span>
                                    </div>
                                    <div style={{ color: '#888', fontStyle: 'italic' }}>No devices detected</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button className={styles.closeBtn} onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>
        </div>
    );
}
