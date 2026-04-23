'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { t } = useLanguage();
    const router = useRouter();
    const resolvedParams = use(params);
    const { token } = resolvedParams;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/resetpassword/${token}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage(t('auth.resetSuccess'));
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch (err) {
            setError('Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] font-sans text-white p-4">
            <div className="w-full max-w-md bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl border border-white/10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[var(--primary)] mb-2">{t('auth.resetPassword')}</h1>
                </div>

                {message && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg mb-6 text-center">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('auth.newPassword')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('auth.confirmNewPassword')}
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '...' : t('auth.resetPassword')}
                    </button>
                </form>
            </div>
        </div>
    );
}
