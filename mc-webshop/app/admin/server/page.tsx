'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

export default function ServerPage() {
    const { t } = useLanguage();
    const [ip, setIp] = useState('');
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // RCON Settings
    const [rconSettings, setRconSettings] = useState({
        rconHost: '',
        rconPort: '25575',
        rconPassword: '',
        rconName: 'Console',
        authmeEnabled: true
    });
    const [savingRcon, setSavingRcon] = useState(false);

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

    const pingServer = useCallback(async (targetIp: string) => {
        if (!targetIp) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/server/ping?ip=${targetIp}`);
            const data = await res.json();

            if (res.ok) {
                setStatus(data);
            } else {
                setError(data.message || 'Failed to ping server');
                setStatus(null);
            }
        } catch (err) {
            setError('Error connecting to server');
            console.error(err);
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.serverIp) {
                    setIp(data.serverIp);
                    pingServer(data.serverIp);
                }
                setRconSettings({
                    rconHost: data.rconHost || '',
                    rconPort: data.rconPort || '25575',
                    rconPassword: data.rconPassword || '',
                    rconName: data.rconName || 'Console',
                    authmeEnabled: data.authmeEnabled === 'true' || data.authmeEnabled === true
                });
            })
            .catch(err => console.error('Failed to fetch settings:', err));
    }, [pingServer]);

    const handlePing = (e: React.FormEvent) => {
        e.preventDefault();
        pingServer(ip);
    };

    const saveServerIp = async () => {
        if (!ip) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverIp: ip }),
            });

            if (res.ok) {
                showModal('Success', 'Server IP saved as main server!', 'success');
            } else {
                showModal('Error', 'Failed to save server IP', 'error');
            }
        } catch (error) {
            console.error('Error saving server IP:', error);
            showModal('Error', 'Error saving server IP', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setRconSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const saveRconSettings = async () => {
        setSavingRcon(true);
        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rconSettings),
            });

            if (res.ok) {
                showModal('Success', 'RCON settings saved successfully!', 'success');
            } else {
                showModal('Error', 'Failed to save RCON settings', 'error');
            }
        } catch (error) {
            console.error('Error saving RCON settings:', error);
            showModal('Error', 'Error saving RCON settings', 'error');
        } finally {
            setSavingRcon(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <h1 className="text-3xl font-bold text-white mb-8">{t('admin.server.title')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Server Status Check */}
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                        {t('admin.server.status')}
                    </h2>
                    <form onSubmit={handlePing} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.server.ip')}</label>
                            <input
                                type="text"
                                placeholder={t('admin.server.ipPlaceholder')}
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                                {loading ? t('admin.server.pinging') : t('admin.server.checkStatus')}
                            </button>
                            <button
                                type="button"
                                onClick={saveServerIp}
                                disabled={saving || !ip}
                                className="px-4 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg border border-white/10 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* RCON Settings */}
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        {t('admin.server.rcon')}
                    </h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.server.host')}</label>
                                <input
                                    type="text"
                                    name="rconHost"
                                    value={rconSettings.rconHost}
                                    onChange={handleRconChange}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                    placeholder="127.0.0.1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.server.port')}</label>
                                <input
                                    type="text"
                                    name="rconPort"
                                    value={rconSettings.rconPort}
                                    onChange={handleRconChange}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                    placeholder="25575"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.server.rconPassword')}</label>
                            <input
                                type="password"
                                name="rconPassword"
                                value={rconSettings.rconPassword}
                                onChange={handleRconChange}
                                className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.server.consoleName')}</label>
                            <input
                                type="text"
                                name="rconName"
                                value={rconSettings.rconName}
                                onChange={handleRconChange}
                            />
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        name="authmeEnabled"
                                        checked={rconSettings.authmeEnabled}
                                        onChange={handleRconChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-white group-hover:text-[var(--primary)] transition-colors">
                                        {t('admin.server.authmeEnabled')}
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        {t('admin.server.authmeDesc')}
                                    </span>
                                </div>
                            </label>
                        </div>
                        <button
                            onClick={saveRconSettings}
                            disabled={savingRcon}
                            className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg border border-white/10 transition-all disabled:opacity-50"
                        >
                            {savingRcon ? t('common.saving') : t('admin.server.saveConnection')}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-8">
                    {error}
                </div>
            )}

            {status && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center gap-6 mb-8">
                            {status.favicon ? (
                                <img src={status.favicon} alt="Server Icon" className="w-24 h-24 rounded-lg" />
                            ) : (
                                <div className="w-24 h-24 bg-[#2a2a2a] rounded-lg flex items-center justify-center text-gray-500">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-white">{ip}</h2>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold uppercase rounded-full">Online</span>
                                </div>
                                <p className="text-gray-400">{status.version?.name || 'Unknown Version'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#2a2a2a] rounded-xl p-6">
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Players</h3>
                                <p className="text-3xl font-bold text-white">
                                    {status.players?.online} <span className="text-gray-500 text-lg">/ {status.players?.max}</span>
                                </p>
                            </div>
                            <div className="bg-[#2a2a2a] rounded-xl p-6">
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Latency</h3>
                                <p className="text-3xl font-bold text-[var(--primary)]">{status.roundTripLatency}ms</p>
                            </div>
                            <div className="bg-[#2a2a2a] rounded-xl p-6">
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Version</h3>
                                <p className="text-3xl font-bold text-white truncate">{status.version?.name}</p>
                            </div>
                        </div>

                        {status.motd && (
                            <div className="mt-8 bg-[#2a2a2a] rounded-xl p-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {status.motd.clean}
                            </div>
                        )}
                    </div>

                    {status.players?.online > 0 && (
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                {t('admin.server.onlinePlayers')}
                            </h3>

                            {status.players?.sample && status.players.sample.length > 0 ? (
                                <>
                                    <p className="text-gray-400 mb-4 text-sm">{t('admin.server.showingPlayers').replace('{length}', status.players.sample.length).replace('{online}', status.players.online)}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {status.players.sample.map((player: any) => (
                                            <div key={player.id} className="bg-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 border border-white/5 hover:border-[var(--primary)]/30 transition-colors">
                                                <img
                                                    src={`https://api.mineatar.io/face/${player.id}?scale=4`}
                                                    alt={player.name}
                                                    className="w-10 h-10 rounded bg-[#1e1e1e]"
                                                />
                                                <div className="overflow-hidden">
                                                    <p className="text-white font-bold truncate text-sm">{player.name}</p>
                                                    <p className="text-xs text-gray-500 truncate font-mono">{player.id.substring(0, 8)}...</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 bg-[#2a2a2a] rounded-xl border border-white/5">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold mb-2">{t('admin.server.playerListHidden')}</p>
                                            <p className="text-gray-400 text-sm max-w-md">
                                                {t('admin.server.hiddenDesc').replace('{online}', status.players.online)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
