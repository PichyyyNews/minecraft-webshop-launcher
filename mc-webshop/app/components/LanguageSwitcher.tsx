'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="fixed bottom-6 left-6 z-50">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                <button
                    onClick={() => setLanguage('th')}
                    className={`px-4 py-2 text-sm font-bold transition-colors ${language === 'th'
                            ? 'bg-[var(--primary)] text-black'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    ไทย
                </button>
                <button
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 text-sm font-bold transition-colors ${language === 'en'
                            ? 'bg-[var(--primary)] text-black'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    ENG
                </button>
            </div>
        </div>
    );
}
