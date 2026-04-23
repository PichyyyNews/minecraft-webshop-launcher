/**
 * Production-safe logger utility
 * Suppresses all console output in production environment
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// No-op function for production
const noop = () => {};

// Create safe logger that only works in development
export const logger = {
    log: isDevelopment ? console.log.bind(console) : noop,
    error: isDevelopment ? console.error.bind(console) : noop,
    warn: isDevelopment ? console.warn.bind(console) : noop,
    info: isDevelopment ? console.info.bind(console) : noop,
    debug: isDevelopment ? console.debug.bind(console) : noop,
};

/**
 * Override global console in production
 * Call this function in your app's entry point
 */
export const suppressConsoleLogs = () => {
    if (!isDevelopment) {
        // Store originals for potential debugging
        const originalConsole = { ...console };
        
        console.log = noop;
        console.error = noop;
        console.warn = noop;
        console.info = noop;
        console.debug = noop;
        console.trace = noop;
        
        // Return function to restore if needed
        return () => {
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
            console.debug = originalConsole.debug;
            console.trace = originalConsole.trace;
        };
    }
    return noop;
};

export default logger;
