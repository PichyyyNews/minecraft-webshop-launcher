'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';

import Modal from '../../components/Modal';

interface Wiki {
    _id: string;
    title: string;
    author: string;
    createdAt: string;
}

export default function AdminWikiPage() {
    const { t } = useLanguage();
    const [wikis, setWikis] = useState<Wiki[]>([]);
    const [loading, setLoading] = useState(true);

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
        fetchWikis();
    }, []);

    const fetchWikis = async () => {
        try {
            const res = await fetch(`${API_URL}/api/wiki`);
            const data = await res.json();
            setWikis(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching wikis:', error);
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        showModal(t('common.delete'), t('admin.wiki.confirmDelete'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/wiki/${id}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    fetchWikis();
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
                }
            } catch (error) {
                console.error('Error deleting wiki:', error);
                showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('admin.wiki.title')}</h1>
                    <p className="text-gray-400 mt-2">{t('admin.wiki.subtitle')}</p>
                </div>
                <Link
                    href="/admin/wiki/editor"
                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t('admin.wiki.new')}
                </Link>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">{t('admin.wiki.form.title')}</th>
                                <th className="p-6 font-medium">{t('admin.wiki.form.author')}</th>
                                <th className="p-6 font-medium">{t('profile.date')}</th>
                                <th className="p-6 font-medium text-right">{t('admin.products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : wikis.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        {t('admin.wiki.noArticles')}
                                    </td>
                                </tr>
                            ) : (
                                wikis.map((wiki) => (
                                    <tr key={wiki._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6 text-white font-medium">{wiki.title}</td>
                                        <td className="p-6 text-gray-400">{wiki.author}</td>
                                        <td className="p-6 text-gray-400">{new Date(wiki.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/wiki/editor?id=${wiki._id}`}
                                                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(wiki._id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
