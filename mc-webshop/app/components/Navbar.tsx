'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';
import Modal from './Modal';
import ImageWithSkeleton from './ImageWithSkeleton';

export default function Navbar() {
    const [user, setUser] = useState<any>(null);
    const [uuid, setUuid] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState('https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg');
    const { t } = useLanguage();

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

    const fetchUserData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                setUser(data.data);
                // Also update localStorage to keep it somewhat fresh
                localStorage.setItem('user', JSON.stringify(data.data));

                // Fetch UUID if needed
                if (data.data.name) {
                    fetch(`https://playerdb.co/api/player/minecraft/${data.data.name}`)
                        .then(res => res.json())
                        .then(pData => {
                            if (pData.success && pData.data.player.id) {
                                setUuid(pData.data.player.id);
                            }
                        })
                        .catch(err => console.error('Failed to fetch UUID:', err));
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchUserData();

        // Fetch logo from settings
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
            })
            .catch(err => console.error('Failed to fetch settings:', err));

        // Listen for storage changes (login/logout)
        const handleStorageChange = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
                fetchUserData(); // Fetch fresh data on login
            } else {
                setUser(null);
                setUuid(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // Also listen for custom event 'userUpdated' if we want to trigger updates manually
        window.addEventListener('userUpdated', fetchUserData);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userUpdated', fetchUserData);
        };
    }, []);

    const handleLogout = () => {
        showModal(t('nav.logoutConfirmTitle'), t('nav.logoutConfirmDesc'), 'warning', 'confirm', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setUuid(null);
            setIsDropdownOpen(false);
            window.dispatchEvent(new Event('storage'));
            window.location.href = '/';
        });
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-white/5 shadow-lg font-sans z-50">
                <div className="h-full px-8 flex items-center justify-between">
                    {/* Left Side: Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <ImageWithSkeleton
                                src={logoUrl}
                                alt="MC Webshop"
                                objectFit="contain"
                                className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    {/* Right Side: Profile & Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {/* Navigation Links */}
                        <div className="flex items-center gap-6">
                            <Link href="/" className="text-gray-300 hover:text-white font-medium transition-colors text-sm uppercase tracking-wide">{t('nav.home')}</Link>
                            <Link href="/shop" className="text-gray-300 hover:text-white font-medium transition-colors text-sm uppercase tracking-wide">{t('nav.store')}</Link>
                            <Link href="/wiki" className="text-gray-300 hover:text-white font-medium transition-colors text-sm uppercase tracking-wide">{t('nav.wiki')}</Link>
                            <Link href="/support" className="text-gray-300 hover:text-white font-medium transition-colors text-sm uppercase tracking-wide">{t('nav.support')}</Link>
                        </div>

                        {/* User Profile */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-all duration-200 group"
                            >
                                {user && (
                                    <span className="text-white font-medium hidden sm:block text-right">
                                        {user.name}
                                    </span>
                                )}
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#2a2a2a] ring-2 ring-transparent group-hover:ring-[var(--primary)] transition-all">
                                    {user && uuid ? (
                                        <ImageWithSkeleton
                                            src={`https://api.mineatar.io/face/${uuid}`}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Dropdown */}
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e1e1e] border border-white/10 shadow-2xl rounded-xl overflow-hidden z-50">
                                    <div className="p-2 space-y-1">
                                        {!user ? (
                                            <>
                                                <Link
                                                    href="/login"
                                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                >
                                                    {t('nav.login')}
                                                </Link>
                                                <Link
                                                    href="/register"
                                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                >
                                                    {t('nav.register')}
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <div className="px-4 py-2 border-b border-white/5 mb-1">
                                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('nav.balance')}</p>
                                                    <p className="text-[var(--primary)] font-bold">{user.points?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || 0} {t('shop.points')}</p>
                                                </div>
                                                <Link
                                                    href="/profile"
                                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                >
                                                    {t('nav.profile')}
                                                </Link>
                                                {user.role === 'admin' && (
                                                    <Link
                                                        href="/admin/info"
                                                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
                                                        onClick={() => setIsDropdownOpen(false)}
                                                    >
                                                        {t('nav.admin')}
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={handleLogout}
                                                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors rounded-lg"
                                                >
                                                    {t('nav.logout')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 right-0 bg-[#1e1e1e] border-b border-white/10 shadow-xl animate-in slide-in-from-top-5">
                        <div className="p-4 space-y-2">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.home')}</Link>
                            <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.store')}</Link>
                            <Link href="/wiki" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.wiki')}</Link>
                            <Link href="/support" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.support')}</Link>

                            <div className="h-px bg-white/10 my-2"></div>

                            {!user ? (
                                <>
                                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.login')}</Link>
                                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-[var(--primary)] hover:bg-white/5 hover:brightness-110 rounded-lg transition-colors font-bold">{t('nav.register')}</Link>
                                </>
                            ) : (
                                <>
                                    <div className="px-4 py-2 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#2a2a2a]">
                                            {uuid ? (
                                                <ImageWithSkeleton src={`https://api.mineatar.io/face/${uuid}`} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-white font-medium">{user.name}</span>
                                    </div>
                                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.profile')}</Link>
                                    {user.role === 'admin' && (
                                        <Link href="/admin/info" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors font-medium">{t('nav.admin')}</Link>
                                    )}
                                    <button
                                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                        className="block w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 hover:text-red-300 rounded-lg transition-colors font-medium"
                                    >
                                        {t('nav.logout')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
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
