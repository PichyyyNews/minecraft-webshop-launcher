'use client';

import { useEffect } from 'react';

/**
 * Production Console Suppressor Component
 * Automatically suppresses all console output in production environment
 */
export default function ConsoleSuppressor() {
    useEffect(() => {
        // Only suppress in production
        if (process.env.NODE_ENV === 'production') {
            const noop = () => {};
            
            // Override all console methods
            console.log = noop;
            console.error = noop;
            console.warn = noop;
            console.info = noop;
            console.debug = noop;
            console.trace = noop;
            console.dir = noop;
            console.table = noop;
            console.group = noop;
            console.groupEnd = noop;
            console.time = noop;
            console.timeEnd = noop;
        }
    }, []);

    return null;
}
