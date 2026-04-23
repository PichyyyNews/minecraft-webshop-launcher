'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';

import Modal from '../../components/Modal';

interface Transaction {
    _id: string;
    user: {
        name: string;
        email: string;
    };
    package?: {
        name: string;
        price: number;
        points: number;
    };
    price: number;
    points: number;
    slipUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export default function AdminTransactionsPage() {
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

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
        fetchTransactions();
    }, [filter]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/api/transactions`;
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data = await res.json();
            if (Array.isArray(data)) {
                setTransactions(data);
            } else {
                setTransactions([]);
                console.error('Transactions data is not an array:', data);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = (id: string, status: 'approved' | 'rejected') => {
        const confirmMsg = status === 'approved' ? t('admin.transactions.confirmApprove') : t('admin.transactions.confirmReject');
        showModal(t('admin.transactions.updateTitle'), confirmMsg, 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/transactions/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ status })
                });

                if (res.ok) {
                    showModal(t('common.success'), t('common.success'), 'success');
                    fetchTransactions();
                } else {
                    showModal(t('common.error'), t('admin.settings.saveFailed'), 'error');
                }
            } catch (error) {
                console.error('Error updating transaction:', error);
                showModal(t('common.error'), t('admin.settings.saveFailed'), 'error');
            }
        });
    };

    return (

        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">{t('admin.transactions.title')}</h1>

                <div className="relative mx-4 flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder={t('common.search') || 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-white/10">
                    {['pending', 'approved', 'rejected', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${filter === f
                                ? 'bg-[var(--primary)] text-black shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {t(`admin.transactions.status.${f}`)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-20 bg-[#1e1e1e] rounded-2xl border border-white/5">
                    <p className="text-gray-500 text-lg">{t('admin.transactions.noTransactions')}</p>
                </div>
            ) : (
                <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-[#2a2a2a] text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.date')}</th>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.user')}</th>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.package')}</th>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.amount')}</th>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.slip')}</th>
                                <th className="px-6 py-4 font-medium">{t('admin.transactions.status')}</th>
                                <th className="px-6 py-4 font-medium text-right">{t('admin.products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions
                                .filter(tx =>
                                    (tx.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (tx.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (tx.package?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((tx) => (
                                    <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(tx.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{tx.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{tx.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            {tx.package?.name || t('admin.settings.topupSystemDynamic') || '1:1 Top-up'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="text-[var(--primary)] font-bold">{(tx.price || tx.package?.price || 0).toLocaleString()} THB</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedSlip(tx.slipUrl)}
                                                className="text-blue-400 hover:text-blue-300 text-sm underline"
                                            >
                                                {t('admin.transactions.viewSlip')}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${tx.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                tx.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                    'bg-yellow-500/20 text-yellow-500'
                                                }`}>
                                                {t(`admin.transactions.status.${tx.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {tx.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleStatusUpdate(tx._id, 'approved')}
                                                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black rounded-lg transition-all"
                                                        title={t('admin.transactions.approve')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(tx._id, 'rejected')}
                                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                        title={t('admin.transactions.reject')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Slip Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSlip(null)}>
                    <div className="relative max-w-2xl max-h-[90vh]">
                        <img src={selectedSlip ? (selectedSlip.startsWith('http') ? selectedSlip : `${API_URL}/${selectedSlip.replace(/^\//, '')}`) : undefined} alt="Payment Slip" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                        <button
                            className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200"
                            onClick={() => setSelectedSlip(null)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

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
