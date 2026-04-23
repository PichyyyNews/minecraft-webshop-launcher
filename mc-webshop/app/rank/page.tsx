'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';

interface Donor {
    _id: string;
    name: string;
    totalAmount: number;
}

export default function RankPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'all' | 'monthly'>('all');
    const [donors, setDonors] = useState<Donor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const period = activeTab === 'monthly' ? 'monthly' : 'all';

        fetch(`${API_URL}/api/users/top-donors?limit=10&period=${period}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setDonors(data);
                } else {
                    console.error('Data is not an array:', data);
                    setDonors([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch rank:', err);
                setLoading(false);
            });
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white flex flex-col">
            <main className="flex-grow pt-8 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('rank.title')}</h1>
                        <div className="w-24 h-1 bg-[var(--primary)] mx-auto rounded-full"></div>
                    </div>

                    {/* Tabs */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-[#1e1e1e] p-1 rounded-xl border border-white/10 flex">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'all'
                                    ? 'bg-[var(--primary)] text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {t('rank.allTime')}
                            </button>
                            <button
                                onClick={() => setActiveTab('monthly')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'monthly'
                                    ? 'bg-[var(--primary)] text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {t('rank.monthly')}
                            </button>
                        </div>
                    </div>

                    {/* Ranking Table */}
                    <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                            </div>
                        ) : donors.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-center w-20">{t('rank.col.rank')}</th>
                                        <th className="px-6 py-4 font-bold">{t('rank.col.name')}</th>
                                        <th className="px-6 py-4 font-bold text-right">{t('rank.col.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {donors.map((donor, index) => (
                                        <tr key={donor._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                          ${index === 0 ? 'bg-yellow-500 text-black' :
                                                        index === 1 ? 'bg-gray-300 text-black' :
                                                            index === 2 ? 'bg-orange-700 text-white' : 'text-gray-400 bg-white/5'}`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={`https://minotar.net/avatar/${donor.name}/100.png`}
                                                        alt={donor.name}
                                                        className="w-10 h-10 rounded-lg bg-[#121212] group-hover:scale-110 transition-transform"
                                                    />
                                                    <span className="font-bold text-lg">{donor.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[var(--primary)] font-bold text-lg">
                                                    {donor.totalAmount.toLocaleString()} THB
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                <p>{t('rank.noData')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
