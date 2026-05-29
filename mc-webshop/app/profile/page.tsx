'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';
import SkinViewer from '../components/SkinViewer';

export default function ProfilePage() {
    const { t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [uuid, setUuid] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const [purchases, setPurchases] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'purchases' | 'topups'>('purchases');
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!user?.name) {
            setIsOnline(false);
            return;
        }

        const checkOnlineStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/rcon/check-online`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ username: user.name })
                });
                const data = await res.json();
                if (data && typeof data.online === 'boolean') {
                    setIsOnline(data.online);
                }
            } catch (err) {
                console.error('Failed to check online status:', err);
            }
        };

        checkOnlineStatus();

        const interval = setInterval(checkOnlineStatus, 30000);
        return () => clearInterval(interval);
    }, [user?.name]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setNewName(userData.name);

            // Fetch UUID for skin
            fetch(`https://api.ashcon.app/mojang/v2/user/${userData.name}`)
                .then(res => res.json())
                .then(data => setUuid(data.uuid))
                .catch(err => {
                    console.error('Failed to fetch UUID:', err);
                });

            const token = localStorage.getItem('token');
            if (token) {
                // Fetch purchase history
                fetch(`${API_URL}/api/products/purchases/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => setPurchases(data))
                    .catch(err => console.error('Failed to fetch purchases:', err));

                // Fetch top-up history (transactions)
                fetch(`${API_URL}/api/transactions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => setTransactions(data))
                    .catch(err => console.error('Failed to fetch transactions:', err));
            }
        }
    }, []);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/auth/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });

            const data = await res.json();

            if (res.ok) {
                // Update local storage
                const updatedUser = { ...user, name: data.user.name };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setIsEditing(false);
                setMessage({ type: 'success', text: t('common.success') });

                // Trigger storage event to update Navbar
                window.dispatchEvent(new Event('storage'));

                // Refresh UUID in case the skin changes with the name
                fetch(`https://api.ashcon.app/mojang/v2/user/${data.user.name}`)
                    .then(res => res.json())
                    .then(data => setUuid(data.uuid))
                    .catch(console.error);

            } else {
                setMessage({ type: 'error', text: data.message || t('common.error') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('common.error') });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#121212] pt-24 pb-12 px-4 font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">{t('profile.title')}</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Skin Display & Quick Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                            {uuid ? (
                                <div className="h-64 w-full flex items-center justify-center">
                                    <SkinViewer
                                        uuid={uuid}
                                        width={250}
                                        height={350}
                                    />
                                </div>
                            ) : (
                                <div className="text-gray-500 flex flex-col items-center">
                                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <p>{t('common.loading')}</p>
                                </div>
                            )}
                            <p className="mt-6 text-xl font-bold text-white">{user.name}</p>
                            
                            {/* Online/Offline Status Badge */}
                            <div className="mt-2 mb-1 flex items-center gap-2 bg-[#2a2a2a]/60 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                                <span className="relative flex h-2.5 w-2.5">
                                    {isOnline && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-wide ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                                    {isOnline ? 'ออนไลน์ในเกม (In-Game)' : 'ออฟไลน์ (Offline)'}
                                </span>
                            </div>

                            <p className="text-gray-500 text-sm uppercase tracking-wider font-bold mt-1">{t('admin.users.role')}</p>
                            <div className="mt-4 px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg font-bold">
                                {user.points?.toLocaleString() || 0} {t('shop.points')}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-white mb-4">{t('profile.quickActions')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Link href="/shop/topup" className="flex flex-col items-center justify-center p-4 bg-[#2a2a2a] hover:bg-[var(--primary)]/20 hover:border-[var(--primary)] border border-transparent rounded-xl transition-all group">
                                    <svg className="w-6 h-6 text-[var(--primary)] mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    <span className="text-sm font-bold text-white">{t('shop.topup')}</span>
                                </Link>
                                <Link href="/shop" className="flex flex-col items-center justify-center p-4 bg-[#2a2a2a] hover:bg-[var(--primary)]/20 hover:border-[var(--primary)] border border-transparent rounded-xl transition-all group">
                                    <svg className="w-6 h-6 text-[var(--primary)] mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                    <span className="text-sm font-bold text-white">{t('shop.title')}</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: User Details & History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Account Info Card */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-2 h-8 bg-[var(--primary)] rounded-full"></span>
                                {t('profile.title')}
                            </h2>

                            {message && (
                                <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('login.email')}</label>
                                    <div className="px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg text-gray-300 cursor-not-allowed opacity-75">
                                        {user.email}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{t('profile.emailNote')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('register.name')}</label>
                                    {isEditing ? (
                                        <form onSubmit={handleUpdateName} className="flex gap-4">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                                placeholder={t('profile.changeName')}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? t('common.loading') : t('common.save')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsEditing(false); setNewName(user.name); }}
                                                className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg transition-colors border border-white/10"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="flex items-center justify-between px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg group">
                                            <span className="text-white font-medium">{user.name}</span>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="text-gray-400 hover:text-[var(--primary)] transition-colors text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                {t('common.edit')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* History Tabs */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                            <div className="flex items-center gap-6 border-b border-white/10 mb-6">
                                <button
                                    onClick={() => setActiveTab('purchases')}
                                    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === 'purchases' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {t('profile.history')}
                                    {activeTab === 'purchases' && <span className="absolute bottom-0 left-0 w-full h-1 bg-[var(--primary)] rounded-t-full"></span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('topups')}
                                    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === 'topups' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {t('profile.topupHistory')}
                                    {activeTab === 'topups' && <span className="absolute bottom-0 left-0 w-full h-1 bg-[var(--primary)] rounded-t-full"></span>}
                                </button>
                            </div>

                            {activeTab === 'purchases' ? (
                                purchases.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        {t('profile.noHistory')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <table className="w-full text-left border-collapse relative">
                                            <thead className="sticky top-0 bg-[#1e1e1e] z-10">
                                                <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                                    <th className="py-3 font-medium">{t('profile.item')}</th>
                                                    <th className="py-3 font-medium">{t('profile.amount')}</th>
                                                    <th className="py-3 font-medium">{t('profile.date')}</th>
                                                    <th className="py-3 font-medium text-right">{t('profile.status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {purchases.map((purchase: any) => (
                                                    <tr key={purchase._id} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-4 text-white font-medium">{purchase.productName}</td>
                                                        <td className="py-4 text-[var(--primary)] font-bold">{purchase.price.toLocaleString()}</td>
                                                        <td className="py-4 text-gray-400 text-sm">
                                                            {new Date(purchase.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${purchase.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                {t(`status.${purchase.status}`)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                transactions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        {t('profile.noHistory')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <table className="w-full text-left border-collapse relative">
                                            <thead className="sticky top-0 bg-[#1e1e1e] z-10">
                                                <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                                    <th className="py-3 font-medium">{t('topup.package')}</th>
                                                    <th className="py-3 font-medium">{t('shop.points')}</th>
                                                    <th className="py-3 font-medium">{t('profile.date')}</th>
                                                    <th className="py-3 font-medium text-right">{t('profile.status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {transactions.map((tx: any) => (
                                                    <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-4 text-white font-medium">{tx.package?.name || t('profile.unknownPackage')}</td>
                                                        <td className="py-4 text-[var(--primary)] font-bold">+{tx.package?.points?.toLocaleString() || 0}</td>
                                                        <td className="py-4 text-gray-400 text-sm">
                                                            {new Date(tx.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${tx.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                                tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                    'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                {t(`status.${tx.status}`)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
