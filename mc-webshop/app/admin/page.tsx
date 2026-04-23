'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';
import Modal from '../components/Modal';
import { DollarSign, CreditCard, Users, UserPlus } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
    totalRevenue: number;
    totalPointsSpent: number;
    totalUsers: number;
    newUsers: number;
    revenueOverTime: { _id: string; amount: number }[];
    topSellingItems: { _id: string; count: number; totalPoints: number }[];
    recentTransactions: any[];
}

export default function AdminPage() {
    const { t } = useLanguage();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({
            isOpen: true,
            title,
            message,
            type,
            mode,
            onConfirm: onConfirm || (() => { }),
        });
    };

    const closeModal = () => {
        setModalProps(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/analytics`);
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            } else {
                console.error('Failed to fetch analytics');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                        <p className="text-gray-400 mt-2">Overview of your store performance</p>
                    </div>
                </div>

                {isLoading || !analytics ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</div>
                                    <div className="text-3xl font-bold text-[var(--primary)]">฿{analytics.totalRevenue.toLocaleString()}</div>
                                </div>
                                <div className="p-3 bg-[var(--primary)]/10 rounded-xl">
                                    <DollarSign className="w-8 h-8 text-[var(--primary)]" />
                                </div>
                            </div>
                            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Points Spent</div>
                                    <div className="text-3xl font-bold text-purple-400">{analytics.totalPointsSpent.toLocaleString()}</div>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <CreditCard className="w-8 h-8 text-purple-400" />
                                </div>
                            </div>
                            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Users</div>
                                    <div className="text-3xl font-bold text-blue-400">{analytics.totalUsers.toLocaleString()}</div>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <Users className="w-8 h-8 text-blue-400" />
                                </div>
                            </div>
                            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">New Users (30d)</div>
                                    <div className="text-3xl font-bold text-green-400">+{analytics.newUsers.toLocaleString()}</div>
                                </div>
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <UserPlus className="w-8 h-8 text-green-400" />
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Revenue Graph */}
                            <div className="lg:col-span-2 bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-xl font-bold text-white mb-6">Revenue Overview (30 Days)</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analytics.revenueOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis
                                                dataKey="_id"
                                                stroke="#666"
                                                tick={{ fill: '#666' }}
                                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                            />
                                            <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#2a2a2a', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: number) => [`฿${value.toLocaleString()}`, 'Revenue']}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="var(--primary)"
                                                strokeWidth={3}
                                                dot={{ fill: 'var(--primary)', r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-xl font-bold text-white mb-6">Top Selling Items</h3>
                                <div className="space-y-4">
                                    {analytics.topSellingItems.length > 0 ? (
                                        analytics.topSellingItems.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                                index === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-gray-500'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-medium text-white">{item._id}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-[var(--primary)]">{item.count} sold</div>
                                                    <div className="text-xs text-gray-500">{item.totalPoints.toLocaleString()} pts</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-gray-500 py-8">No sales data yet</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
                                <button
                                    onClick={() => router.push('/admin/transactions')}
                                    className="text-sm text-[var(--primary)] hover:underline"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">User</th>
                                            <th className="px-6 py-4 font-medium">Package</th>
                                            <th className="px-6 py-4 font-medium">Amount</th>
                                            <th className="px-6 py-4 font-medium">Date</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {analytics.recentTransactions.length > 0 ? (
                                            analytics.recentTransactions.map((tx) => (
                                                <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-white font-medium">
                                                        {tx.user ? tx.user.name : 'Unknown User'}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300">
                                                        {tx.package ? tx.package.name : 'Unknown Package'}
                                                    </td>
                                                    <td className="px-6 py-4 text-[var(--primary)] font-bold">
                                                        ฿{tx.price ? tx.price.toLocaleString() : (tx.packageDetails?.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                                        {new Date(tx.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded uppercase">
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No recent transactions
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </div>
    );
}
