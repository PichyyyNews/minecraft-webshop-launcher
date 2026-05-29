'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';

interface AdminNavbarProps {
    onMenuClick?: () => void;
}

export default function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [adminUsername, setAdminUsername] = useState('Admin');
    const [isRoot, setIsRoot] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('adminUser');
            if (stored) {
                const parsed = JSON.parse(stored);
                setAdminUsername(parsed.username || 'Admin');
                setIsRoot(parsed.isRoot === true);
            }
        } catch {
            // ignore
        }
    }, []);

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({ isOpen: true, title, message, type, mode, onConfirm: onConfirm || (() => { }) });
    };

    const closeModal = () => setModalProps(prev => ({ ...prev, isOpen: false }));

    const handleLogout = () => {
        showModal(t('admin.logoutConfirmTitle'), t('admin.logoutConfirmDesc'), 'warning', 'confirm', () => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            router.push('/admin/login');
        });
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1e1e1e] border-b border-white/10 z-50 flex items-center justify-between px-4 md:px-8 font-sans">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h1 className="text-xl font-bold text-white hidden sm:block">{t('admin.panel')}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Admin badge */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${isRoot ? 'bg-[var(--primary)]' : 'bg-blue-400'}`} />
                        <span className="text-sm text-gray-300 font-medium">{adminUsername}</span>
                        {isRoot && (
                            <span className="text-xs bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold">ROOT</span>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-lg transition-colors border border-red-500/20 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {t('admin.logout')}
                    </button>
                </div>
            </nav>
            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </>
    );
}
