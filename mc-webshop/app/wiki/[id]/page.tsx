'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import ImageWithSkeleton from '../../components/ImageWithSkeleton';
import { API_URL } from '../../utils/config';

interface Wiki {
    _id: string;
    title: string;
    content: string;
    imageUrl?: string;
    author: string;
    createdAt: string;
}

export default function WikiDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [wiki, setWiki] = useState<Wiki | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetch(`${API_URL}/api/wiki/${id}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch wiki');
                    return res.json();
                })
                .then(data => {
                    setWiki(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch wiki:', err);
                    setLoading(false);
                });
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    if (!wiki) {
        return (
            <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white">
                <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
                <Link href="/wiki" className="text-[var(--primary)] hover:underline">
                    Back to Wiki
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white">
            <Navbar />

            <article className="pt-32 pb-20 px-4 max-w-4xl mx-auto">
                <Link href="/wiki" className="inline-flex items-center gap-2 text-gray-400 hover:text-[var(--primary)] mb-8 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Wiki
                </Link>

                <header className="mb-12">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                        <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 rounded-full font-medium">Article</span>
                        <span>{new Date(wiki.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                        {wiki.title}
                    </h1>

                    <div className="flex items-center gap-4 p-4 bg-[#1e1e1e] rounded-xl border border-white/5 w-fit">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-black font-bold text-lg">
                            {wiki.author[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-white">{wiki.author}</p>
                            <p className="text-xs text-gray-500">Author</p>
                        </div>
                    </div>
                </header>

                {wiki.imageUrl && (
                    <div className="mb-12 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                        <ImageWithSkeleton src={wiki.imageUrl} alt={wiki.title} className="w-full h-auto" />
                    </div>
                )}

                <div className="prose prose-invert prose-lg max-w-none">
                    <div className="space-y-6">
                        {wiki.content.split('\n\n').map((section, index) => {
                            // Check if section is a heading (starts with #)
                            if (section.trim().startsWith('# ')) {
                                return (
                                    <h2 key={index} className="text-3xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-3">
                                        {section.replace('# ', '')}
                                    </h2>
                                );
                            } else if (section.trim().startsWith('## ')) {
                                return (
                                    <h3 key={index} className="text-2xl font-bold text-white mt-6 mb-3">
                                        {section.replace('## ', '')}
                                    </h3>
                                );
                            } else if (section.trim().startsWith('### ')) {
                                return (
                                    <h4 key={index} className="text-xl font-bold text-[var(--primary)] mt-4 mb-2">
                                        {section.replace('### ', '')}
                                    </h4>
                                );
                            } else if (section.trim().startsWith('- ') || section.trim().startsWith('* ')) {
                                // Bullet list
                                const items = section.split('\n').filter(line => line.trim());
                                return (
                                    <ul key={index} className="space-y-2 ml-6 my-4">
                                        {items.map((item, i) => (
                                            <li key={i} className="text-gray-300 leading-relaxed flex items-start gap-3">
                                                <span className="text-[var(--primary)] mt-2">•</span>
                                                <span>{item.replace(/^[-*]\s/, '')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            } else if (section.trim().match(/^\d+\.\s/)) {
                                // Numbered list
                                const items = section.split('\n').filter(line => line.trim());
                                return (
                                    <ol key={index} className="space-y-2 ml-6 my-4 list-decimal list-inside">
                                        {items.map((item, i) => (
                                            <li key={i} className="text-gray-300 leading-relaxed">
                                                {item.replace(/^\d+\.\s/, '')}
                                            </li>
                                        ))}
                                    </ol>
                                );
                            } else if (section.trim().startsWith('> ')) {
                                // Blockquote
                                return (
                                    <blockquote key={index} className="border-l-4 border-[var(--primary)] pl-6 py-2 my-6 bg-[var(--primary)]/5 rounded-r-lg">
                                        <p className="text-gray-300 italic leading-relaxed">
                                            {section.replace(/^>\s/, '')}
                                        </p>
                                    </blockquote>
                                );
                            } else if (section.trim()) {
                                // Regular paragraph
                                return (
                                    <p key={index} className="text-gray-300 leading-relaxed text-lg mb-4">
                                        {section}
                                    </p>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </article>
        </div>
    );
}
