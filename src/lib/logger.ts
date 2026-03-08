/**
 * Conditional logger that only outputs in development mode.
 * Replaces scattered console.log/warn/error calls throughout the codebase.
 */
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
    debug: (...args: unknown[]) => { if (isDev) console.log(...args); },
    info: (...args: unknown[]) => { if (isDev) console.info(...args); },
    warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
    error: (...args: unknown[]) => { console.error(...args); },  // Always log errors
};
