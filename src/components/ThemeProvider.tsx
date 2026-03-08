'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadCustomPresets } from '../lib/presets/synthPresets';
import { logger } from '../lib/logger';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Default to dark to match server-side rendering and avoid white flash
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Check local storage on mount
        // load any custom synth presets saved by the user
        try { if (typeof window !== 'undefined') loadCustomPresets(); } catch (e) { logger.warn('Failed to load custom presets', e); }
        const saved = localStorage.getItem('drey-theme') as Theme;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            // Default to dark explicitly
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('drey-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    if (!mounted) {
        // Render children with default theme (dark) to allow hydration
        // Use visibility hidden or just render? Just render is fine as CSS handles it.
        // The key to avoiding flash is that initial HTML + CSS = Dark.
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
