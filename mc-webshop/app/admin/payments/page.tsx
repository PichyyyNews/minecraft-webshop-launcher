'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

export default function AdminPaymentsPage() {
    const { t } = useLanguage();

    // Settings State
    const [settings, setSettings] = useState({
        enableQrPayment: 'false',
        enableTrueMoney: 'false',
        promptPayNumber: '',
        trueMoneyNumber: '',
        slipCheckMode: 'manual', // 'manual' | 'auto'
        slip2goApiKey: '',
        slip2goBranchId: '',
        topupSystem: 'package',
        topupMultiplier: '1.0',
    });

    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [slip2goInfo, setSlip2goInfo] = useState<any>(null);
    const [slip2goError, setSlip2goError] = useState<string>('');
    const [checkingSlip, setCheckingSlip] = useState(false);

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

    useEffect(() => {
        if (settings.slipCheckMode === 'auto' && settings.slip2goApiKey) {
            fetchSlip2GoInfo(true); // IsAuto = true
        }
    }, [settings.slipCheckMode, settings.slip2goApiKey]);

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
            setSettings(prev => ({
                ...prev,
                enableQrPayment: data.enableQrPayment || 'false',
                enableTrueMoney: data.enableTrueMoney || 'false',
                promptPayNumber: data.promptPayNumber || '',
                trueMoneyNumber: data.trueMoneyNumber || '',
                slip2goApiKey: data.slip2goApiKey || '',
                slip2goBranchId: data.slip2goBranchId || '',
                slipCheckMode: data.slipCheckMode || 'manual',
                topupSystem: data.topupSystem || 'package',
                topupMultiplier: data.topupMultiplier || '1.0',
            }));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setLoading(false);
        }
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

    const fetchSlip2GoInfo = async (isAuto = false) => {
        if (!settings.slip2goApiKey) return;
        setSlip2goError('');
        if (!isAuto) setCheckingSlip(true);

        try {
            console.log('Fetching Slip2Go info via backend...');
            const res = await fetch(`${API_URL}/api/admin/slip2go/info`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`,
                    'x-slip2go-key': encodeURIComponent(settings.slip2goApiKey || '') // Pass current input value (encoded)
                }
            });

            if (res.status === 401) {
                setSlip2goError('API Key ไม่ถูกต้อง หรือหมดอายุ (Unauthorized)');
                setSlip2goInfo(null);
                setCheckingSlip(false);
                return;
            }

            const text = await res.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response as JSON:', text);
                setSlip2goError('Failed to parse response from server');
                setCheckingSlip(false);
                return;
            }

            if (res.ok && data.data) {
                console.log('Slip2Go Info received:', data.data);
                setSlip2goInfo(data.data);
                setSlip2goError('');
            } else {
                console.error('Failed to fetch Slip2Go info. Status:', res.status, 'Data:', data);
                setSlip2goError(data.message || `Error: ${res.status} Failed to fetch info`);
                setSlip2goInfo(null);
            }
        } catch (error) {
            console.error('Error fetching Slip2Go info:', error);
            setSlip2goError('Network error or server unreachable');
            setSlip2goInfo(null);
        } finally {
            setCheckingSlip(false);
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

            <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {t('admin.settings.payment')}
            </h1>

            {message && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg mb-6">
                    {message}
                </div>
            )}

            <form onSubmit={handleSettingsSubmit}>
                {/* Payment Settings */}
                <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl mb-8">

                    <div className="space-y-6">
                        {/* Topup Configuration */}
                        <div className="p-4 bg-[#121212] rounded-xl border border-white/10 mb-6">
                            <h2 className="text-xl font-bold mb-4 text-[var(--primary)] flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t('admin.settings.topupConfig') || 'Topup Configuration'}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.topupSystem') || 'Topup System'}
                                    </label>
                                    <select
                                        name="topupSystem"
                                        value={settings.topupSystem || 'package'}
                                        onChange={(e) => setSettings(prev => ({ ...prev, topupSystem: e.target.value }))}
                                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none mb-2"
                                    >
                                        <option value="package">{t('admin.settings.topupSystemPackage') || 'Package System (Recommended)'}</option>
                                        <option value="dynamic">{t('admin.settings.topupSystemDynamic') || 'Dynamic System (1:1 with Multiplier)'}</option>
                                    </select>
                                    <p className="text-xs text-gray-500">
                                        {settings.topupSystem === 'dynamic'
                                            ? t('admin.settings.topupDynamicHint') || 'Users will input an amount, and points will be calculated based on the multiplier.'
                                            : t('admin.settings.topupPackageHint') || 'Users will buy predefined packages with fixed points.'}
                                    </p>
                                </div>

                                {settings.topupSystem === 'dynamic' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            {t('admin.settings.topupMultiplier') || 'Point Multiplier'}
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.topupMultiplier || '1.0'}
                                            onChange={(e) => setSettings(prev => ({ ...prev, topupMultiplier: e.target.value }))}
                                            step="0.1"
                                            min="0.1"
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            {t('admin.settings.multiplierHint') || 'e.g., If multiplier is 1.5, paying 100 THB gives 150 Points.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QR Code Payment Toggle */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#121212] rounded-xl border border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-12 bg-blue-900/20 rounded border border-blue-500/30 flex items-center justify-center">
                                        <span className="text-blue-400 font-bold text-xs italic tracking-tighter">PromptPay</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{t('admin.settings.payment.qrTitle')}</h3>
                                        <p className="text-sm text-gray-400">{t('admin.settings.payment.qrDesc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enableQrPayment === 'true'}
                                        onChange={(e) => setSettings(prev => ({ ...prev, enableQrPayment: e.target.checked ? 'true' : 'false' }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                </label>
                            </div>

                            {settings.enableQrPayment === 'true' && (
                                <div className="p-4 bg-[#121212] rounded-xl border border-white/10">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.payment.promptPayNumber')}
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.promptPayNumber}
                                        onChange={(e) => setSettings(prev => ({ ...prev, promptPayNumber: e.target.value }))}
                                        placeholder="Mobile Number (08x) or ID Card (13 digits)"
                                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        {t('admin.settings.payment.promptPayHint')}
                                    </p>
                                </div>
                            )}

                            {/* Slip Verification Mode - Only show if PrompPay/QR is enabled */}
                            {settings.enableQrPayment === 'true' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[#121212] rounded-xl border border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-12 bg-green-900/20 rounded border border-green-500/30 flex items-center justify-center">
                                                <span className="text-green-400 font-bold text-xs">SLIP</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white mb-1">ระบบตรวจสอบสลิป (Slip Verification)</h3>
                                                <p className="text-sm text-gray-400">เลือกโหมดการตรวจสอบสลิปการโอนเงิน</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-[#2a2a2a] rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => setSettings(prev => ({ ...prev, slipCheckMode: 'manual' }))}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.slipCheckMode === 'manual' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                ตรวจสอบเอง (Manual)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSettings(prev => ({ ...prev, slipCheckMode: 'auto' }))}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.slipCheckMode === 'auto' ? 'bg-[var(--primary)] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                อัตโนมัติ (Slip2Go)
                                            </button>
                                        </div>
                                    </div>

                                    {settings.slipCheckMode === 'auto' && (
                                        <div className="p-4 bg-[#121212] rounded-xl border border-white/10 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                                    Slip2Go API Key
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={settings.slip2goApiKey}
                                                        onChange={(e) => {
                                                            setSettings(prev => ({ ...prev, slip2goApiKey: e.target.value }));
                                                            setSlip2goError(''); // Clear error on change
                                                        }}
                                                        placeholder="API Key"
                                                        className={`flex-1 bg-[#1e1e1e] border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none ${slip2goError ? 'border-red-500' : 'border-white/10'}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchSlip2GoInfo()}
                                                        disabled={checkingSlip}
                                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors border border-white/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {checkingSlip ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                <span>Check...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                <span>{t('common.check') || 'Check'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                {slip2goError && (
                                                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {slip2goError}
                                                    </p>
                                                )}
                                            </div>

                                            {slip2goInfo && !slip2goError && (
                                                <div className="bg-[#1e1e1e] rounded-lg border border-green-500/20 overflow-hidden">
                                                    <div className="bg-green-500/10 px-4 py-2 border-b border-green-500/20 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                            <span className="text-green-500 font-bold text-sm">API Connected</span>
                                                        </div>
                                                        <span className="text-xs text-green-500/70">Updated just now</span>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                                            <span className="text-sm text-gray-400">Shop Name</span>
                                                            <span className="font-bold text-white">{slip2goInfo.shopName}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/5">
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Package</p>
                                                                <p className="font-medium text-[var(--primary)]">{slip2goInfo.package}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Auto Renewal</p>
                                                                <p className="text-white">{slip2goInfo.autoRenewalPackage ? 'Yes' : 'No'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/5">
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Slip Quota</p>
                                                                <p className="font-bold text-white">{slip2goInfo.quotaRemaining} / {slip2goInfo.quotaLimit}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">QR Quota</p>
                                                                <p className="font-bold text-white">{slip2goInfo.quotaQrRemaining} / {slip2goInfo.quotaQrLimit}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-400">Expires At</span>
                                                            {slip2goInfo.packageExpiredDate && (
                                                                <span className="text-sm text-gray-300">
                                                                    {new Date(slip2goInfo.packageExpiredDate).toLocaleDateString()} {new Date(slip2goInfo.packageExpiredDate).toLocaleTimeString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {slip2goInfo.creditRemaining > 0 && (
                                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                                <span className="text-sm text-gray-400">Credit Remaining</span>
                                                                <span className="text-sm font-bold text-green-400">{slip2goInfo.creditRemaining}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-xs text-yellow-500/80">
                                                * ต้องสมัครสมาชิก Slip2Go ก่อนเพื่อรับ API Key
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* TrueMoney Wallet Angpao Toggle */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#121212] rounded-xl border border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-12 flex items-center justify-center bg-white/5 rounded p-1">
                                        <img src="/images/truemoney-wallet-logo.png" alt="TrueMoney" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{t('admin.settings.payment.tmTitle')}</h3>
                                        <p className="text-sm text-gray-400">{t('admin.settings.payment.tmDesc')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enableTrueMoney === 'true'}
                                        onChange={(e) => setSettings(prev => ({ ...prev, enableTrueMoney: e.target.checked ? 'true' : 'false' }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                </label>
                            </div>
                            {settings.enableTrueMoney === 'true' && (
                                <div className="p-4 bg-[#121212] rounded-xl border border-white/10">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.payment.tmNumber')}
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.trueMoneyNumber}
                                        onChange={(e) => setSettings(prev => ({ ...prev, trueMoneyNumber: e.target.value }))}
                                        placeholder="08x-xxx-xxxx"
                                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        {t('admin.settings.payment.tmHint')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
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
