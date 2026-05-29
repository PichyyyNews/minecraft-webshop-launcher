'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../utils/config';
import Modal from '../../../components/Modal';
import { Plus, Pencil, Trash2, X, Ticket, History, RefreshCw } from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    price: number;
}

interface RedeemCode {
    _id: string;
    code: string;
    rewardType: 'points' | 'product';
    points: number;
    product?: Product;
    maxUses: number | null;
    usedCount: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
}

interface RedemptionLog {
    _id: string;
    user: {
        name: string;
        email: string;
    };
    code: string;
    rewardType: 'points' | 'product';
    points: number;
    productName?: string;
    redeemedAt: string;
}

export default function AdminRedeemPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'codes' | 'logs'>('codes');
    const [codes, setCodes] = useState<RedeemCode[]>([]);
    const [logs, setLogs] = useState<RedemptionLog[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<RedeemCode | null>(null);

    // Form states
    const [code, setCode] = useState('');
    const [rewardType, setRewardType] = useState<'points' | 'product'>('points');
    const [points, setPoints] = useState<number>(0);
    const [product, setProduct] = useState('');
    const [maxUses, setMaxUses] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    useEffect(() => {
        fetchProducts();
        fetchCodes();
        fetchLogs();
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

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        }
    };

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/redeem/admin/codes`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setCodes(data);
            }
        } catch (err) {
            console.error('Failed to fetch codes:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/redeem/admin/logs`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    };

    const handleGenerateRandom = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCode(result);
    };

    const formatForInput = (isoString: string | null) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    };

    const handleOpenModal = (redeemCode?: RedeemCode) => {
        setError('');
        if (redeemCode) {
            setEditingCode(redeemCode);
            setCode(redeemCode.code);
            setRewardType(redeemCode.rewardType);
            setPoints(redeemCode.points);
            setProduct(redeemCode.product?._id || '');
            setMaxUses(redeemCode.maxUses !== null ? String(redeemCode.maxUses) : '');
            setStartDate(formatForInput(redeemCode.startDate));
            setEndDate(formatForInput(redeemCode.endDate));
        } else {
            setEditingCode(null);
            setCode('');
            setRewardType('points');
            setPoints(100);
            setProduct(products[0]?._id || '');
            setMaxUses('');
            setStartDate('');
            setEndDate('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCode(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            code: code.trim(),
            rewardType,
            points: rewardType === 'points' ? Number(points) : 0,
            product: rewardType === 'product' ? product : undefined,
            maxUses: maxUses === '' ? null : Number(maxUses),
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? new Date(endDate).toISOString() : null
        };

        try {
            const url = editingCode
                ? `${API_URL}/api/redeem/admin/codes/${editingCode._id}`
                : `${API_URL}/api/redeem/admin/codes`;
            const method = editingCode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                fetchCodes();
                handleCloseModal();
                showModal('Success', 'Redeem code saved successfully.', 'success');
            } else {
                setError(data.message || 'An error occurred.');
            }
        } catch (err) {
            console.error('Error saving code:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (redeemCode: RedeemCode) => {
        showModal(
            'Confirm Delete',
            `Are you sure you want to delete code "${redeemCode.code}"? Users will no longer be able to claim it.`,
            'warning',
            'confirm',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/redeem/admin/codes/${redeemCode._id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                        }
                    });

                    if (res.ok) {
                        fetchCodes();
                        showModal('Deleted', 'Redeem code deleted successfully.', 'success');
                    } else {
                        const data = await res.json();
                        showModal('Error', data.message || 'Failed to delete code.', 'error');
                    }
                } catch (err) {
                    console.error('Error deleting code:', err);
                    showModal('Error', 'Connection error.', 'error');
                }
            }
        );
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">จัดการรหัสของขวัญ (Redeem Codes)</h1>
                        <p className="text-gray-400 text-sm mt-1">สร้างสุ่มรหัส หรือกำหนดโค้ดแลกของขวัญ/พอยท์สำหรับผู้เล่น</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl transition-all"
                        title="Refresh Logs"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2.5 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างรหัสใหม่
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/5 pb-px">
                <button
                    onClick={() => setActiveTab('codes')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 ${
                        activeTab === 'codes'
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <Ticket className="w-4 h-4" />
                    โค้ดทั้งหมด
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 ${
                        activeTab === 'logs'
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <History className="w-4 h-4" />
                    ประวัติการเคลม
                </button>
            </div>

            {/* Tab: Codes */}
            {activeTab === 'codes' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                    <th className="p-6 font-medium">โค้ด (Redeem Code)</th>
                                    <th className="p-6 font-medium">ของรางวัล (Reward)</th>
                                    <th className="p-6 font-medium">โควตาการใช้งาน (Usage Limit)</th>
                                    <th className="p-6 font-medium">วันใช้งาน (Validity Period)</th>
                                    <th className="p-6 font-medium text-right">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            กำลังโหลดข้อมูล...
                                        </td>
                                    </tr>
                                ) : codes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            ยังไม่มีรหัสของขวัญในระบบ
                                        </td>
                                    </tr>
                                ) : (
                                    codes.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6 font-mono text-white text-base font-bold tracking-wider">{item.code}</td>
                                            <td className="p-6">
                                                {item.rewardType === 'points' ? (
                                                    <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                                                        +{item.points} พอยท์
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                                                        สินค้า: {item.product?.name || 'ไม่พบสินค้า'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-white font-medium">{item.usedCount} ครั้ง</span>
                                                    <span className="text-gray-500 text-xs">
                                                        {item.maxUses !== null ? `สูงสุด ${item.maxUses} สิทธิ์` : 'ไม่จำกัดสิทธิ์'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col text-xs text-gray-400 gap-0.5">
                                                    <span>เริ่ม: {item.startDate ? new Date(item.startDate).toLocaleString() : 'ทันที'}</span>
                                                    <span>หมดอายุ: {item.endDate ? new Date(item.endDate).toLocaleString() : 'ไม่มีกำหนด'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            )}

            {/* Tab: Logs */}
            {activeTab === 'logs' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                    <th className="p-6 font-medium">ผู้แลกรับ (User)</th>
                                    <th className="p-6 font-medium">โค้ด (Redeem Code)</th>
                                    <th className="p-6 font-medium">ประเภทรางวัล</th>
                                    <th className="p-6 font-medium">ของรางวัล</th>
                                    <th className="p-6 font-medium">วันเวลาเคลม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            ยังไม่มีประวัติการแลกโค้ดของขวัญ
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-medium text-white">
                                                <div className="flex flex-col">
                                                    <span>{log.user?.name || 'Unknown User'}</span>
                                                    <span className="text-gray-500 text-xs">{log.user?.email || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 font-mono text-white text-sm font-bold tracking-wider">{log.code}</td>
                                            <td className="p-6">
                                                {log.rewardType === 'points' ? (
                                                    <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                                                        Points
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                                                        Product
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-sm text-gray-300">
                                                {log.rewardType === 'points' ? `${log.points} พอยท์` : log.productName || 'สินค้า'}
                                            </td>
                                            <td className="p-6 text-sm text-gray-400">
                                                {new Date(log.redeemedAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Create/Edit Code */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">
                                {editingCode ? 'แก้ไขรหัสของขวัญ' : 'สร้างรหัสของขวัญใหม่'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">รหัสของขวัญ (Redeem Code)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="flex-grow bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white font-mono uppercase tracking-wider focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="เช่น VIPWEEKEND"
                                        required
                                    />
                                    {!editingCode && (
                                        <button
                                            type="button"
                                            onClick={handleGenerateRandom}
                                            className="px-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-lg transition-all text-xs"
                                        >
                                            สุ่มรหัส
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">ประเภทรางวัล (Reward Type)</label>
                                <select
                                    value={rewardType}
                                    onChange={(e) => setRewardType(e.target.value as 'points' | 'product')}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                >
                                    <option value="points">ได้รับ พอยท์ (Points)</option>
                                    <option value="product">ได้รับ สินค้า (Product)</option>
                                </select>
                            </div>

                            {rewardType === 'points' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">จำนวนพอยท์ที่ได้รับ (Points)</label>
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        min={1}
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">สินค้าที่ได้รับ (Select Product)</label>
                                    {products.length === 0 ? (
                                        <p className="text-yellow-400 text-sm">ไม่มีรายการสินค้าในระบบ กรุณาลงสินค้าก่อน</p>
                                    ) : (
                                        <select
                                            value={product}
                                            onChange={(e) => setProduct(e.target.value)}
                                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                            required
                                        >
                                            {products.map(p => (
                                                <option key={p._id} value={p._id}>{p.name} ({p.price} P)</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">จำนวนสิทธิ์รวม (Max Global Uses) - เว้นว่างได้</label>
                                <input
                                    type="number"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    placeholder="เช่น 100 (ปล่อยว่างหากแลกได้ไม่จำกัดครั้ง)"
                                    min={1}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">วันที่เริ่มใช้งาน - เว้นว่างได้</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">วันหมดอายุ - เว้นว่างได้</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || (rewardType === 'product' && !product)}
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'กำลังบันทึก...' : editingCode ? 'บันทึก' : 'สร้างโค้ด'}
                                </button>
                            </div>
                        </form>
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
