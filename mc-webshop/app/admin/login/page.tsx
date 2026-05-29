'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import { Turnstile } from '@marsidev/react-turnstile';

export default function AdminLoginPage() {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
    const [turnstileEnabled, setTurnstileEnabled] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.turnstileSiteKey) setTurnstileSiteKey(data.turnstileSiteKey);
                if (data.turnstileEnabled === 'true') setTurnstileEnabled(true);
            })
            .catch(err => console.error('Failed to fetch settings:', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (turnstileEnabled && !turnstileToken) {
            setError('Please complete the Captcha check.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileToken }),
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                // Store admin info for sidebar permission filtering
                localStorage.setItem('adminUser', JSON.stringify({
                    username: data.username,
                    isRoot: data.isRoot,
                    permissions: data.permissions,
                }));
                router.push('/admin');
            } else {
                setError(data.message || t('admin.login.invalidPassword'));
            }
        } catch (err) {
            setError(t('admin.login.connectionError'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#121212] flex items-start justify-center p-4 pt-24">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">{t('admin.login.title')}</h1>
                    <p className="text-gray-400">{t('admin.login.subtitle')}</p>
                </div>

                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="admin-username" className="block text-sm font-medium text-gray-400 mb-2">
                                Username
                            </label>
                            <input
                                id="admin-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                placeholder="admin username"
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-400 mb-2">
                                {t('admin.login.password')}
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                placeholder={t('admin.login.placeholder')}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {turnstileEnabled && turnstileSiteKey && (
                            <div className="flex justify-center my-4">
                                <Turnstile
                                    siteKey={turnstileSiteKey}
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    onError={() => setError('Captcha verification error. Please reload.')}
                                    onExpire={() => setTurnstileToken('')}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? t('admin.login.loggingIn') : t('admin.login.submit')}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <a href="/" className="text-sm text-gray-400 hover:text-[var(--primary)] transition-colors">
                            ← {t('admin.login.backToHome')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
