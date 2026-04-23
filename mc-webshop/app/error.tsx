'use client';

import { useEffect } from 'react';
import { useLanguage } from './contexts/LanguageContext';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useLanguage();

    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center px-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl"></div>

            <div className="text-center relative z-10 max-w-2xl mx-auto">
                <h1 className="text-9xl font-bold text-red-500 mb-4 animate-pulse">!</h1>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    {t('error.title')}
                </h2>
                <p className="text-gray-400 text-lg mb-12 leading-relaxed">
                    {t('error.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={
                            // Attempt to recover by trying to re-render the segment
                            () => reset()
                        }
                        className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg w-full sm:w-auto"
                    >
                        {t('error.retry')}
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-4 bg-[#1e1e1e] text-white font-bold rounded-xl border border-white/10 hover:bg-[#2a2a2a] transition-all transform hover:scale-105 w-full sm:w-auto"
                    >
                        {t('error.backHome')}
                    </button>
                </div>
            </div>
        </div>
    );
}
