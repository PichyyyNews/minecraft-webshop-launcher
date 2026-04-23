'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';

import Modal from '../../components/Modal';
import ImageWithSkeleton from '../../components/ImageWithSkeleton';

interface PointPackage {
    _id: string;
    name: string;
    price: number;
    points: number;
    imageUrl?: string;
    qrCodeUrl?: string;
    tag?: string;
    tagColor?: string;
}

export default function TopupPage() {
    const { t } = useLanguage();
    const [packages, setPackages] = useState<PointPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(null);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Dynamic Topup State
    const [dynamicAmount, setDynamicAmount] = useState('');

    const [settings, setSettings] = useState({
        enableQrPayment: 'false',
        enableTrueMoney: 'false',
        promptPayNumber: '',
        trueMoneyNumber: '',
        topupSystem: 'package',
        topupMultiplier: '1.0',
    });
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'truemoney'>('qr');
    const [angpaoLink, setAngpaoLink] = useState('');

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
        // Fetch packages
        fetch(`${API_URL}/api/point-packages`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPackages(data);
                } else {
                    console.error('Packages data is not an array:', data);
                    setPackages([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch packages:', err);
                setLoading(false);
            });

        // Fetch settings
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                setSettings({
                    enableQrPayment: data.enableQrPayment || 'false',
                    enableTrueMoney: data.enableTrueMoney || 'false',
                    promptPayNumber: data.promptPayNumber || '',
                    trueMoneyNumber: data.trueMoneyNumber || '',
                    topupSystem: data.topupSystem || 'package',
                    topupMultiplier: data.topupMultiplier || '1.0',
                });

                // Set default payment method
                if (data.enableQrPayment === 'true') {
                    setPaymentMethod('qr');
                } else if (data.enableTrueMoney === 'true') {
                    setPaymentMethod('truemoney');
                }
            })
            .catch(err => console.error('Failed to fetch settings:', err));
    }, []);

    const handleBuy = (pkg: PointPackage) => {
        const user = localStorage.getItem('user');
        if (!user) {
            showModal(t('support.pleaseLogin'), t('support.loginRequired'), 'warning');
            return;
        }
        setSelectedPackage(pkg);
        setSlipFile(null);
        setAngpaoLink('');
        // Reset payment method to available one
        if (settings.enableQrPayment === 'true') {
            setPaymentMethod('qr');
        } else if (settings.enableTrueMoney === 'true') {
            setPaymentMethod('truemoney');
        }
    };

    const handleDynamicBuy = () => {
        const user = localStorage.getItem('user');
        if (!user) {
            showModal(t('support.pleaseLogin'), t('support.loginRequired'), 'warning');
            return;
        }

        const amount = parseFloat(dynamicAmount);
        if (isNaN(amount) || amount <= 0) {
            showModal(t('common.error'), t('topup.invalidAmount'), 'warning');
            return;
        }

        const multiplier = parseFloat(settings.topupMultiplier) || 1;
        const points = amount * multiplier;

        // Create a temporary package object for the modal
        const dummyPackage: PointPackage = {
            _id: '', // Empty ID signals dynamic transaction
            name: `${t('shop.points')} x${points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
            price: amount,
            points: points,
            imageUrl: ''
        };

        setSelectedPackage(dummyPackage);
        setSlipFile(null);
        setAngpaoLink('');
        if (settings.enableQrPayment === 'true') {
            setPaymentMethod('qr');
        } else if (settings.enableTrueMoney === 'true') {
            setPaymentMethod('truemoney');
        }
    }

    const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSlipFile(e.target.files[0]);
        }
    };

    const handleSubmitPayment = async () => {
        if (!selectedPackage) return;

        if (paymentMethod === 'qr' && !slipFile) {
            showModal('Error', 'Please upload a slip', 'warning');
            return;
        }
        if (paymentMethod === 'truemoney' && !angpaoLink) {
            showModal('Error', 'Please enter Angpao link', 'warning');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();

        // If it's a real package, send ID. If dynamic (empty ID), send amount.
        if (selectedPackage._id) {
            formData.append('packageId', selectedPackage._id);
        } else {
            formData.append('amount', selectedPackage.price.toString());
        }

        formData.append('paymentMethod', paymentMethod);

        if (paymentMethod === 'qr' && slipFile) {
            formData.append('slip', slipFile);
        } else if (paymentMethod === 'truemoney') {
            formData.append('angpaoLink', angpaoLink);
        }

        try {
            const res = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                if (data.status === 'approved') {
                    // Success case: Status is approved (Auto-approved)
                    showModal(
                        t('topup.success') || 'Payment Successful',
                        t('topup.pointsAdded') || 'Payment successful! Points have been added to your account.',
                        'success'
                    );
                } else {
                    // Pending case: Status is pending (Manual review needed)
                    showModal(
                        t('topup.submitted') || 'Payment Submitted',
                        t('topup.pending') || 'Your payment has been submitted and is pending admin review.',
                        'info'
                    );
                }
                setSelectedPackage(null);
                setDynamicAmount('');
            } else {
                showModal(t('common.error'), data.message || t('shop.error'), 'error');
            }
        } catch (error) {
            console.error('Error submitting payment:', error);
            showModal(t('common.error'), t('shop.error'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate PromptPay QR Payload
    const qrPayload = (selectedPackage && settings.promptPayNumber)
        ? generatePayload(settings.promptPayNumber, { amount: selectedPackage.price })
        : '';

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white">
            <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('topup.title')}</h1>
                    <p className="text-gray-400">{t('topup.subtitle')}</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    </div>
                ) : (
                    <>
                        {settings.topupSystem === 'dynamic' ? (
                            // --- DYNAMIC TOPUP UI ---
                            <div className="max-w-xl mx-auto">
                                <div className="bg-[#1e1e1e]/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                                    {/* Ambient Background Gradient */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                                    <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-center flex items-center justify-center gap-3">
                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        {t('topup.calculatorTitle') || 'Point Calculator'}
                                    </h2>

                                    <div className="space-y-6">
                                        {/* Amount Input */}
                                        <div className="bg-[#121212]/50 p-4 md:p-6 rounded-2xl border border-white/5 transition-colors focus-within:border-[var(--primary)]/50">
                                            <label className="block text-sm font-medium text-gray-400 mb-2 md:mb-3 uppercase tracking-wider text-xs">
                                                {t('topup.enterAmount') || 'Enter Amount (THB)'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={dynamicAmount}
                                                    onChange={(e) => setDynamicAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-transparent text-white text-3xl md:text-4xl font-bold focus:outline-none placeholder-gray-700 font-mono"
                                                />
                                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base md:text-lg">THB</span>
                                            </div>
                                        </div>

                                        {/* Multiplier Badge */}
                                        <div className="flex items-center justify-center">
                                            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                                <span className="text-gray-400 text-xs uppercase tracking-wide">{t('topup.multiplierRate') || 'Rate'}:</span>
                                                <span className="text-[var(--primary)] font-bold font-mono text-sm">x{settings.topupMultiplier}</span>
                                            </div>
                                        </div>

                                        {/* Result Preview */}
                                        <div className="bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 p-6 rounded-2xl border border-[var(--primary)]/20 flex items-center justify-between shadow-lg shadow-[var(--primary)]/5">
                                            <div>
                                                <p className="text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{t('topup.receivePoints') || 'You will receive'}</p>
                                                <p className="text-white font-bold text-3xl">
                                                    {dynamicAmount && !isNaN(parseFloat(dynamicAmount))
                                                        ? (parseFloat(dynamicAmount) * (parseFloat(settings.topupMultiplier) || 1)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                                        : '0'}
                                                </p>
                                            </div>
                                            <div className="h-12 w-12 rounded-full bg-[var(--primary)] text-black flex items-center justify-center font-bold shadow-lg shadow-[var(--primary)]/30">
                                                <span className="text-xl">P</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleDynamicBuy}
                                            disabled={!dynamicAmount || isNaN(parseFloat(dynamicAmount)) || parseFloat(dynamicAmount) <= 0}
                                            className="w-full py-4 bg-[var(--primary)] text-black font-extrabold text-lg rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_8px_40px_rgba(var(--primary-rgb),0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 uppercase tracking-wide"
                                        >
                                            {t('topup.buy')}
                                        </button>

                                        {!dynamicAmount && (
                                            <div className="text-center">
                                                <p className="text-gray-600 text-xs">
                                                    {t('topup.minAmount') || 'Minimum amount is 1 THB'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- PACKAGE SYSTEM UI ---
                            packages.length === 0 ? (
                                <div className="text-center py-20 bg-[#1e1e1e] rounded-3xl border border-white/5">
                                    <p className="text-gray-500 text-lg">{t('topup.noPackages')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                                    {packages.map((pkg) => (
                                        <div key={pkg._id} className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-2 shadow-xl group flex flex-col">
                                            {/* Image Section */}
                                            <div className="h-48 bg-[#181818] relative overflow-hidden flex items-center justify-center">
                                                <ImageWithSkeleton
                                                    src={pkg.imageUrl}
                                                    alt={pkg.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute top-4 right-4 bg-[var(--primary)] text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                                                    {pkg.points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {t('shop.points')}
                                                </div>
                                                {pkg.tag && (
                                                    <div
                                                        className="absolute top-4 left-4 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg"
                                                        style={{ backgroundColor: pkg.tagColor || '#ff0000' }}
                                                    >
                                                        {pkg.tag}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                                                <div className="flex items-baseline gap-1 mb-6">
                                                    <span className="text-2xl font-bold text-[var(--primary)]">฿{pkg.price.toLocaleString()}</span>
                                                    <span className="text-sm text-gray-500">{t('shop.price')}</span>
                                                </div>

                                                <div className="mt-auto">
                                                    <button
                                                        onClick={() => handleBuy(pkg)}
                                                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-[var(--primary)] transition-colors shadow-lg"
                                                    >
                                                        {t('topup.buy')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </>
                )}
            </main>
            {/* Payment Modal */}
            {selectedPackage && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                            <h3 className="text-lg md:text-xl font-bold text-white">{t('topup.confirm')}</h3>
                            <button
                                onClick={() => setSelectedPackage(null)}
                                className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
                            <div className="bg-[#2a2a2a] p-3 md:p-4 rounded-xl flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-gray-400 text-xs md:text-sm">{selectedPackage._id ? t('topup.package') : 'Points'}</p>
                                    <p className="text-white font-bold text-sm md:text-base">{selectedPackage.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-xs md:text-sm">{t('shop.price')}</p>
                                    <p className="text-[var(--primary)] font-bold text-lg md:text-xl">{selectedPackage.price.toLocaleString()} ฿</p>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 shrink-0">
                                {settings.enableQrPayment === 'true' && (
                                    <button
                                        onClick={() => setPaymentMethod('qr')}
                                        className={`relative group p-3 md:p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-3 ${paymentMethod === 'qr'
                                            ? 'bg-[#1a1a1a] border-[var(--primary)] shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                                            : 'bg-[#121212] border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]'
                                            }`}
                                    >
                                        <div className="h-10 md:h-12 flex items-center justify-center w-full">
                                            {/* PromptPay Logo Placeholder */}
                                            <div className="bg-blue-900/20 px-2 py-1 md:px-3 rounded border border-blue-500/30 flex items-center justify-center">
                                                <span className="text-blue-400 font-bold italic tracking-tighter text-sm md:text-base">PromptPay</span>
                                            </div>
                                        </div>
                                        <span className={`text-xs md:text-sm font-bold ${paymentMethod === 'qr' ? 'text-[var(--primary)]' : 'text-gray-400 group-hover:text-white'}`}>
                                            {t('topup.method.qr')}
                                        </span>
                                        {paymentMethod === 'qr' && (
                                            <div className="absolute top-2 right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]"></div>
                                        )}
                                    </button>
                                )}

                                {settings.enableTrueMoney === 'true' && (
                                    <button
                                        onClick={() => setPaymentMethod('truemoney')}
                                        className={`relative group p-3 md:p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 md:gap-3 ${paymentMethod === 'truemoney'
                                            ? 'bg-[#1a1a1a] border-[#ffba00] shadow-[0_0_20px_rgba(255,186,0,0.2)]'
                                            : 'bg-[#121212] border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]'
                                            }`}
                                    >
                                        <div className="h-10 md:h-12 flex items-center justify-center w-full">
                                            <ImageWithSkeleton src="/images/truemoney-wallet-logo.png" alt="TrueMoney" objectFit="contain" className="h-full" />
                                        </div>
                                        <span className={`text-xs md:text-sm font-bold ${paymentMethod === 'truemoney' ? 'text-[#ffba00]' : 'text-gray-400 group-hover:text-white'}`}>
                                            {t('topup.method.truemoney')}
                                        </span>
                                        {paymentMethod === 'truemoney' && (
                                            <div className="absolute top-2 right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ffba00] shadow-[0_0_10px_#ffba00]"></div>
                                        )}
                                    </button>
                                )}
                            </div>

                            {paymentMethod === 'qr' && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4">{t('topup.scanQR')}</p>
                                        <div className="bg-white p-3 md:p-4 rounded-xl inline-block shadow-lg">
                                            {qrPayload ? (
                                                <QRCodeSVG value={qrPayload} size={160} level="M" className="w-40 h-40 md:w-48 md:h-48" />
                                            ) : (
                                                <div className="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center text-black font-bold text-xs md:text-sm">
                                                    {t('topup.promptPayIdNotSet')}
                                                </div>
                                            )}
                                        </div>
                                        {settings.promptPayNumber && (
                                            <p className="text-xs text-gray-500 mt-2 font-mono">
                                                {settings.promptPayNumber}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-gray-400 mb-2">{t('topup.uploadSlip')}</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSlipChange}
                                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 md:px-4 text-xs md:text-sm text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-black hover:file:bg-opacity-80 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'truemoney' && (
                                <div className="space-y-4">
                                    <div className="flex justify-center mb-2">
                                        <ImageWithSkeleton src="/images/truemoney-wallet-logo.png" alt="TrueMoney Wallet" objectFit="contain" className="h-12 md:h-16" />
                                    </div>
                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-gray-400 mb-2">{t('topup.angpaoLabel')}</label>
                                        <input
                                            type="text"
                                            value={angpaoLink}
                                            onChange={(e) => setAngpaoLink(e.target.value)}
                                            placeholder="https://gift.truemoney.com/campaign/..."
                                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 md:px-4 text-sm text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            <span dangerouslySetInnerHTML={{ __html: t('topup.angpaoHint').replace('{amount}', `<b>${selectedPackage.price.toLocaleString()}</b>`) }} />
                                        </p>
                                        {settings.trueMoneyNumber && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('topup.accountLabel')}: {settings.trueMoneyNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 md:pt-4 shrink-0">
                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={submitting || (paymentMethod === 'qr' && !slipFile) || (paymentMethod === 'truemoney' && !angpaoLink)}
                                    className="w-full py-2.5 md:py-3 bg-[var(--primary)] text-black font-bold text-sm md:text-base rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {submitting ? t('topup.submitting') : t('topup.confirm')}
                                </button>
                            </div>
                        </div>
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
