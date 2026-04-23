'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import ImageWithSkeleton from '../components/ImageWithSkeleton';
import AuthGuard from '../components/AuthGuard';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';


interface Wiki {
    _id: string;
    title: string;
    content: string;
    imageUrl: string;
    author: string;
    createdAt: string;
}

export default function WikiPage() {
    const { t } = useLanguage();
    const [wikis, setWikis] = useState<Wiki[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/wiki`)
            .then(res => res.json())
            .then(data => {
                setWikis(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch wikis:', err);
                setLoading(false);
            });
    }, []);

    return (
        <AuthGuard>
            <div className="min-h-screen bg-[#121212] font-sans text-white">
                <Navbar />

                <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            {t('wiki.title')}
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            {t('wiki.subtitle')}
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)] mx-auto"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {wikis.map((wiki) => (
                                <Link href={`/wiki/${wiki._id}`} key={wiki._id} className="group">
                                    <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--primary)]/10 h-full flex flex-col">
                                        <div className="h-48 bg-[#2a2a2a] relative overflow-hidden">
                                            <ImageWithSkeleton
                                                src={wiki.imageUrl}
                                                alt={wiki.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent opacity-60"></div>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                                                <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-full">{t('common.article')}</span>
                                                <span>•</span>
                                                <span>{new Date(wiki.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h2 className="text-xl font-bold mb-3 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                                {wiki.title}
                                            </h2>
                                            <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                                                {wiki.content}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-auto pt-4 border-t border-white/5">
                                                <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-black font-bold text-xs">
                                                    {wiki.author[0].toUpperCase()}
                                                </div>
                                                <span>{wiki.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!loading && wikis.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-xl">{t('wiki.noArticles')}</p>
                            <p className="mt-2 text-sm">{t('wiki.checkBack')}</p>
                        </div>
                    )}
                </div>

            </div>
        </AuthGuard>
    );
}
