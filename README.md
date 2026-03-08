# Drey — Browser-Based DAW

Drey is a free, open-source Digital Audio Workstation that runs entirely in your browser. Built for beginners and creative producers who want to make music without downloading software.

## Features

- **75+ Synthesized Instruments** — Bass, drums, keys, leads, pads, vocals, and FX using Tone.js synthesis
- **Piano Roll Editor** — Full MIDI editing with grid snapping, velocity control, and real-time preview
- **Multi-Engine Audio** — Dedicated engines for bass, drums, keys, synths, vocals, and FX
- **AI Assistant (Wingman)** — Natural language music creation powered by Grok AI
- **Hum-to-MIDI** — Real-time pitch detection converts humming/singing to MIDI notes
- **Audio Stem Separation** — Frequency-based separation of audio into bass, drums, vocals, and instruments
- **Pattern Generators** — One-click drum beats, chord progressions, and bass lines
- **Undo/Redo** — Full history with Ctrl+Z / Ctrl+Shift+Z support
- **Dark/Light Theme** — Automatic and manual theme switching
- **Local Storage** — Projects save automatically to your browser (no account needed)

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Audio**: Tone.js + Web Audio API + AudioWorklet scheduler
- **State**: Zustand
- **Database**: Dexie (IndexedDB)
- **Styling**: CSS Modules + CSS Variables
- **AI**: Grok API (xAI) via server-side API route

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your GROK_API_KEY to .env.local (optional, for AI features)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page. Click "Launch App" to open the DAW.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # Server-side API routes (Wingman AI)
│   ├── daw/          # Main DAW application page
│   └── page.tsx      # Landing page
├── components/       # React components
│   └── daw/          # DAW-specific components (PianoRoll, Transport, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Core libraries
│   ├── engines/      # Tone.js instrument engines (bass, drums, keys, etc.)
│   ├── presets/      # Synth preset definitions
│   └── worker/       # Web Worker for scheduling
├── store/            # Zustand state management
└── styles/           # Global styles
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |

## Browser Support

Drey requires a modern browser with Web Audio API and AudioWorklet support:
- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

## License

MIT
