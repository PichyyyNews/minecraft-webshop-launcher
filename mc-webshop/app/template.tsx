'use client';

import { useEffect, useState } from 'react';
import MinecraftLoader from './components/MinecraftLoader';

export default function Template({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Show loader for 1.5 seconds on mount (which happens on every page navigation)
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            {loading && <MinecraftLoader />}
            {children}
        </>
    );
}
