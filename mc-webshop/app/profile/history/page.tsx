'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { API_URL } from '../../utils/config';

interface Transaction {
    _id: string;
    createdAt: string;
    package: {
        name: string;
        price: number;
        points: number;
    };
    status: string;
}

export default function TransactionHistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        fetch(`${API_URL}/api/transactions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch transactions');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTransactions(data);
                } else {
                    console.error('Data is not an array:', data);
                    setTransactions([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch transactions:', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white flex flex-col">
            <Navbar />

            <main className="flex-1 pt-24 pb-12 px-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Transaction History</h1>
                    <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
                        Back to Profile
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e1e1e] rounded-2xl border border-white/5">
                        <p className="text-gray-500 text-lg">No transactions found.</p>
                        <Link href="/shop/topup" className="text-[var(--primary)] hover:underline mt-2 inline-block">
                            Top up now
                        </Link>
                    </div>
                ) : (
                    <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#2a2a2a] text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Package</th>
                                        <th className="px-6 py-4 font-medium">Price</th>
                                        <th className="px-6 py-4 font-medium">Points</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {transactions.map((tx) => (
                                        <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-400">
                                                {new Date(tx.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-medium">
                                                {tx.package?.name || 'Unknown Package'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {tx.package?.price.toLocaleString()} THB
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[var(--primary)] font-bold">
                                                +{tx.package?.points.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${tx.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                    tx.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
