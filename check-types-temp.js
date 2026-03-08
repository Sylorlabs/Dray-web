#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const cwd = 'C:\\dray-web';
const targetFiles = [
    'src/components/daw/SoundBrowser.tsx',
    'src/components/daw/AddTrackModal.tsx',
    'src/components/daw/ContextMenu.tsx',
    'src/components/daw/RenameModal.tsx',
    'src/components/daw/KeyboardShortcutsHelp.tsx',
    'src/components/daw/WingmanPanel.tsx',
    'src/components/daw/MasterPlayhead.tsx',
    'src/components/daw/VolumeMeter.tsx'
];

try {
    console.log('Running TypeScript type check...\n');
    const output = execSync('npx tsc --noEmit 2>&1', { 
        cwd: cwd,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
    });
    console.log(output);
    process.exit(0);
} catch (error) {
    const output = error.stdout || error.message || String(error);
    console.log(output);
    process.exit(0);
}
