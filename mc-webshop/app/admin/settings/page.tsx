'use client';

import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

export default function AdminSettingsPage() {
    const { t } = useLanguage();

    // Settings State
    const [settings, setSettings] = useState({
        smtpHost: '',
        smtpPort: '',
        smtpEmail: '',
        smtpPassword: '',
        smtpSecure: 'false',
        emailProvider: 'smtp',
        teamTitle: '',
        teamSubtitle: '',
        turnstileEnabled: 'false',
        turnstileSiteKey: '',
        turnstileSecretKey: '',
    });



    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Modal State
    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    useEffect(() => {
        fetchSettings();
    }, []);

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

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings`);
            const data = await res.json();
            setSettings(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };



    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                setMessage(t('admin.settings.saved'));
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showModal('Error', 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };



    return (
        <div className="max-w-4xl mx-auto pb-20">
            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />

            <h1 className="text-3xl font-bold mb-8">{t('admin.settings.title')}</h1>

            <form onSubmit={handleSettingsSubmit}>





                {/* SMTP Settings */}
                <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl mb-8">
                    <h2 className="text-xl font-bold mb-6 text-[var(--primary)] flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        {t('admin.settings.smtp')}
                    </h2>

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg mb-6">
                            {message}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {t('admin.settings.emailProvider')}
                            </label>
                            <select
                                name="emailProvider"
                                value={settings.emailProvider || 'smtp'}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none mb-4"
                            >
                                <option value="smtp">{t('admin.settings.provider.smtp')}</option>
                                <option value="gmail">{t('admin.settings.provider.gmail')}</option>
                            </select>
                            {settings.emailProvider === 'gmail' && (
                                <p className="text-xs text-gray-500 mb-4">
                                    {t('admin.settings.gmailHint')} <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Create App Password</a>
                                </p>
                            )}
                        </div>

                        {(settings.emailProvider !== 'gmail') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.smtpHost')}
                                    </label>
                                    <input
                                        type="text"
                                        name="smtpHost"
                                        value={settings.smtpHost}
                                        onChange={handleSettingsChange}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="smtp.example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.smtpPort')}
                                    </label>
                                    <input
                                        type="text"
                                        name="smtpPort"
                                        value={settings.smtpPort}
                                        onChange={handleSettingsChange}
                                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="587"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {t('admin.settings.smtpEmail')}
                            </label>
                            <input
                                type="email"
                                name="smtpEmail"
                                value={settings.smtpEmail}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="your-email@gmail.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {t('admin.settings.smtpPassword')}
                            </label>
                            <input
                                type="password"
                                name="smtpPassword"
                                value={settings.smtpPassword}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder={settings.emailProvider === 'gmail' ? "App Password (16 chars)" : "Password"}
                            />
                        </div>

                        {(settings.emailProvider !== 'gmail') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {t('admin.settings.smtpSecure')}
                                </label>
                                <select
                                    name="smtpSecure"
                                    value={settings.smtpSecure}
                                    onChange={handleSettingsChange}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                >
                                    <option value="false">False (TLS - Port 587)</option>
                                    <option value="true">True (SSL - Port 465)</option>
                                </select>
                            </div>
                        )}

                    </div>
                </div>

                {/* Cloudflare Turnstile Captcha Settings */}
                <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl mb-8">
                    <h2 className="text-xl font-bold mb-6 text-[var(--primary)] flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        Cloudflare Turnstile Captcha
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Status (สถานะการเปิดใช้งาน)
                            </label>
                            <select
                                name="turnstileEnabled"
                                value={settings.turnstileEnabled || 'false'}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                            >
                                <option value="false">Disabled (ปิดการใช้งาน)</option>
                                <option value="true">Enabled (เปิดการใช้งาน)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Turnstile Site Key
                            </label>
                            <input
                                type="text"
                                name="turnstileSiteKey"
                                value={settings.turnstileSiteKey || ''}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="1x00000000000000000000AA"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Turnstile Secret Key
                            </label>
                            <input
                                type="password"
                                name="turnstileSecretKey"
                                value={settings.turnstileSecretKey || ''}
                                onChange={handleSettingsChange}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[var(--primary)] hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-[var(--primary)]/20 disabled:opacity-50"
                        >
                            {saving ? '...' : t('admin.settings.save')}
                        </button>
                    </div>
                </div>




            </form>
        </div>
    );
}
