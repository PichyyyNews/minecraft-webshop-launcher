'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import ImageWithSkeleton from '../components/ImageWithSkeleton';
import Item3DViewer from '../components/Item3DViewer';
import Block3DViewer from '../components/Block3DViewer';
import Model3DViewer from '../components/Model3DViewer';
import AuthGuard from '../components/AuthGuard';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    subcategory?: string;
    isHide?: boolean;
    sortOrder?: number;
    imageUrl?: string;
    tag?: string;
    tagColor?: string;
    allowGift?: boolean;
    displayType?: 'image' | '3d' | 'block' | 'model';
    modelSettings?: {
        showAxes: boolean;
        autoRotate: boolean;
        bgType: 'solid' | 'gradient';
        bgColor: string;
        gradientStart: string;
        gradientEnd: string;
    };
    blockTextures?: {
        front: string;
        back: string;
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
    gltfModel?: string;
}

export default function ShopPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<{ _id: string, name: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [userPoints, setUserPoints] = useState<number | null>(null);
    const [redeemCodeInput, setRedeemCodeInput] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [showOfflineWarning, setShowOfflineWarning] = useState(false);
    const [targetUsername, setTargetUsername] = useState('');
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [pendingIsGift, setPendingIsGift] = useState(false);
    const [checkingOnline, setCheckingOnline] = useState(false);

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
        confirmText: 'OK',
        cancelText: 'Cancel'
    });

    const showModal = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'warning' | 'info' = 'info',
        mode: 'alert' | 'confirm' = 'alert',
        onConfirm?: () => void,
        confirmText?: string,
        cancelText?: string
    ) => {
        setModalProps({
            isOpen: true,
            title,
            message,
            type,
            mode,
            onConfirm: onConfirm || (() => { }),
            confirmText: confirmText || 'OK',
            cancelText: cancelText || 'Cancel'
        });
    };

    const closeModal = () => {
        setModalProps(prev => ({ ...prev, isOpen: false }));
    };

    const getBackgroundStyle = (settings: Product['modelSettings']) => {
        if (!settings) return '#181818';
        if (settings.bgType === 'solid') return settings.bgColor;
        return `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientEnd} 100%)`;
    };

    const resolveUrl = (url?: string) => {
        if (!url) return undefined;
        // Handle both /uploads and uploads
        if (url.startsWith('/uploads') || url.startsWith('uploads')) {
            const effectiveApiUrl = API_URL || 'http://localhost:5000';
            const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;
            // Ensure url has leading slash for concatenation if needed, or just handle consistently
            const cleanUrl = url.startsWith('/') ? url : `/${url}`;
            return `${baseUrl}${cleanUrl}`;
        }
        return url;
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserPoints(userData.points);
        }
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchProducts = async () => {
        console.log('Fetching products from:', `${API_URL}/api/products`);
        try {
            const res = await fetch(`${API_URL}/api/products`);
            console.log('Response status:', res.status);
            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json();
                    setProducts(data);
                } else {
                    const text = await res.text();
                    console.error('Received non-JSON response:', text.substring(0, 500)); // Log first 500 chars
                }
            } else {
                console.error('Fetch failed with status:', res.status);
                const text = await res.text();
                console.error('Error response:', text.substring(0, 500));
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!redeemCodeInput.trim()) return;

        setRedeeming(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ code: redeemCodeInput.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                let successMessage = 'ยินดีด้วย! คุณได้รับของรางวัลเรียบร้อยแล้ว';
                if (data.rewardType === 'points') {
                    successMessage = `คุณได้รับรางวัลเป็น ${data.points} พอยท์!`;
                    setUserPoints(data.userPoints);
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        const userObj = JSON.parse(userData);
                        userObj.points = data.userPoints;
                        localStorage.setItem('user', JSON.stringify(userObj));
                    }
                } else if (data.rewardType === 'product') {
                    successMessage = `คุณได้รับสินค้า "${data.productName}" เรียบร้อยแล้ว! ไอเท็มกำลังจัดส่งในเกม...`;
                }

                showModal('ใช้งานโค้ดสำเร็จ', successMessage, 'success');
                setRedeemCodeInput('');
            } else {
                showModal('เกิดข้อผิดพลาด', data.message || 'รหัสแลกของรางวัลไม่ถูกต้องหรือหมดอายุ', 'error');
            }
        } catch (error) {
            console.error('Redeem Error:', error);
            showModal('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้', 'error');
        } finally {
            setRedeeming(false);
        }
    };

    const checkOnlineStatus = async (username: string): Promise<{ online: boolean; cannotVerify: boolean }> => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/rcon/check-online`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ username }),
            });
            if (res.ok) {
                const data = await res.json();
                return { online: data.online === true, cannotVerify: data.cannotVerify === true };
            }
            return { online: false, cannotVerify: true };
        } catch (error) {
            console.error('Error checking online status:', error);
            return { online: false, cannotVerify: true };
        }
    };

    const processPurchase = async (product: Product, username: string) => {
        try {
            const res = await fetch(`${API_URL}/api/products/${product._id}/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetUsername: username })
            });

            const data = await res.json();

            if (res.ok) {
                showModal(t('shop.success'), `${t('shop.success')} ${product.name} for ${username}!`, 'success');
                // Update local points
                setUserPoints(data.points);
                // Update local storage if needed
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    user.points = data.points;
                    localStorage.setItem('user', JSON.stringify(user));
                }
                setShowOfflineModal(false);
                setPendingProduct(null);
            } else {
                showModal(t('shop.error'), data.message || t('shop.error'), 'error');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showModal(t('common.error'), t('shop.error'), 'error');
        }
    };

    const handleGift = (product: Product) => {
        setPendingProduct(product);
        setPendingIsGift(true);
        setTargetUsername('');
        setShowOfflineModal(true);
    };

    const handleBuy = async (product: Product) => {
        if (userPoints === null) {
            showModal(t('support.pleaseLogin'), t('support.loginRequired'), 'warning');
            return;
        }
        if (userPoints < product.price) {
            showModal(
                t('shop.insufficientPoints'),
                t('shop.insufficientPointsDesc'),
                'warning',
                'confirm',
                () => router.push('/shop/topup'),
                t('shop.topup'),
                t('common.cancel')
            );
            return;
        }

        setCheckingOnline(true);
        const userData = localStorage.getItem('user');
        const currentUsername = userData ? JSON.parse(userData).name : '';

        const { online, cannotVerify } = await checkOnlineStatus(currentUsername);
        setCheckingOnline(false);

        if (online || cannotVerify) {
            if (online) {
                // Player confirmed online → show confirm and buy
                showModal(
                    t('shop.confirmBuy'),
                    `${t('shop.confirmBuyDesc')} (${product.name} - ${product.price} ${t('shop.points')})`,
                    'info',
                    'confirm',
                    () => processPurchase(product, currentUsername)
                );
            } else {
                // cannotVerify → skip warning and go straight to confirm
                showModal(
                    t('shop.confirmBuy'),
                    `${t('shop.confirmBuyDesc')} (${product.name} - ${product.price} ${t('shop.points')})`,
                    'info',
                    'confirm',
                    () => processPurchase(product, currentUsername)
                );
            }
        } else {
            // Confirmed offline by at least one system
            setPendingProduct(product);
            setPendingIsGift(false);
            setTargetUsername(currentUsername);
            setShowOfflineWarning(true);
        }
    };

    useEffect(() => {
        setSelectedSubcategory('All');
    }, [selectedCategory]);

    const availableSubcategories = Array.from(
        new Set(
            products
                .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
                .map(p => p.subcategory?.trim())
                .filter(Boolean) as string[]
        )
    );

    const filteredProducts = products.filter(product => {
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesSubcategory = selectedSubcategory === 'All' || (product.subcategory && product.subcategory.trim() === selectedSubcategory);
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (product.subcategory && product.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSubcategory && matchesSearch;
    });

    return (
        <AuthGuard>
            <div className="min-h-screen bg-[#121212] font-sans text-white">
                <Navbar />

                <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                Server <span className="text-[var(--primary)]">{t('shop.title')}</span>
                            </h1>
                            <p className="text-gray-400">
                                {t('shop.subtitle')}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                            {/* Points Balance Card */}
                            <div className="flex items-center justify-between gap-4 bg-[#1e1e1e] p-4 rounded-2xl border border-white/10 shadow-lg flex-1 sm:flex-initial">
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('profile.points')}</p>
                                    <p className="text-xl font-bold text-[var(--primary)] whitespace-nowrap">
                                        {userPoints !== null ? userPoints.toLocaleString() : '0'} <span className="text-sm text-white">{t('shop.points')}</span>
                                    </p>
                                </div>
                                <Link
                                    href="/shop/topup"
                                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-[var(--primary)]/20 flex items-center gap-2 text-sm"
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    {t('shop.topup')}
                                </Link>
                            </div>

                            {/* Redeem Code Card */}
                            <form onSubmit={handleRedeemSubmit} className="flex items-center gap-2 bg-[#1e1e1e] p-3 rounded-2xl border border-white/10 shadow-lg w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={redeemCodeInput}
                                    onChange={(e) => setRedeemCodeInput(e.target.value)}
                                    placeholder="กรอกรหัสแลกของรางวัล..."
                                    className="bg-black/40 border border-white/10 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 w-full sm:w-44 uppercase font-mono tracking-wider"
                                    required
                                    disabled={redeeming}
                                />
                                <button
                                    type="submit"
                                    disabled={redeeming}
                                    className="px-5 py-2.5 bg-white hover:bg-[var(--primary)] hover:text-black text-black font-bold rounded-xl transition-all text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {redeeming ? 'กำลังแลก...' : 'ใช้งานโค้ด'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Search & Category Filter Section */}
                    {!loading && products.length > 0 && (
                        <div className="flex flex-col mb-8 bg-[#1e1e1e]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md gap-3">
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                                {/* Horizontal Category Scroll */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none flex-grow scroll-smooth">
                                    <button
                                        onClick={() => setSelectedCategory('All')}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                                            selectedCategory === 'All'
                                                ? 'bg-[var(--primary)] text-black font-bold shadow-lg shadow-[var(--primary)]/20 scale-105'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-102'
                                        }`}
                                    >
                                        {t('shop.all')}
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat._id}
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                                                selectedCategory === cat.name
                                                    ? 'bg-[var(--primary)] text-black font-bold shadow-lg shadow-[var(--primary)]/20 scale-105'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-102'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <div className="relative w-full lg:w-80 flex-shrink-0">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('shop.search') || 'ค้นหาสินค้า...'}
                                        className="w-full bg-black/40 border border-white/10 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Subcategories Filter Bar */}
                            {availableSubcategories.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-white/5 scrollbar-none flex-grow">
                                    <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1 shrink-0">
                                        <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                        ย่อย:
                                    </span>
                                    <button
                                        onClick={() => setSelectedSubcategory('All')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                            selectedSubcategory === 'All'
                                                ? 'bg-white/20 text-white font-bold border border-white/20'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        ทั้งหมด
                                    </button>
                                    {availableSubcategories.map((subCat) => (
                                        <button
                                            key={subCat}
                                            onClick={() => setSelectedSubcategory(subCat)}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                                selectedSubcategory === subCat
                                                    ? 'bg-[var(--primary)] text-black font-bold shadow'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {subCat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Products Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e1e1e] rounded-3xl border border-white/5">
                            <p className="text-gray-500 text-lg">{t('shop.outOfStock')}</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e1e1e] rounded-3xl border border-white/5">
                            <p className="text-gray-500 text-lg">ไม่พบสินค้าในหมวดหมู่หรือผลการค้นหานี้</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredProducts.map((product) => (
                                <div key={product._id} className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-2 shadow-xl group flex flex-col">
                                    {/* Image Section - Click to open modal */}
                                    <div 
                                        onClick={() => setDetailProduct(product)}
                                        className="h-64 bg-[#181818] relative overflow-hidden flex items-center justify-center cursor-pointer"
                                    >
                                        {product.displayType === '3d' && product.imageUrl ? (
                                            <div className="w-full h-full">
                                                <Item3DViewer
                                                    imageUrl={(() => {
                                                        let src = product.imageUrl;
                                                        if (src.startsWith('/uploads')) {
                                                            const effectiveApiUrl = API_URL || 'http://localhost:5000';
                                                            const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;
                                                            return `${baseUrl}${src}`;
                                                        }
                                                        return src;
                                                    })()}
                                                    backgroundStyle={getBackgroundStyle(product.modelSettings)}
                                                    showAxes={product.modelSettings?.showAxes}
                                                    autoRotate={product.modelSettings?.autoRotate}
                                                    className="w-full h-full pointer-events-none"
                                                    enableZoom={false}
                                                    yOffset={1}
                                                />
                                            </div>
                                        ) : product.displayType === 'block' && product.blockTextures ? (
                                            <div className="w-full h-full">
                                                <Block3DViewer
                                                    textures={{
                                                        front: resolveUrl(product.blockTextures.front),
                                                        back: resolveUrl(product.blockTextures.back),
                                                        top: resolveUrl(product.blockTextures.top),
                                                        bottom: resolveUrl(product.blockTextures.bottom),
                                                        left: resolveUrl(product.blockTextures.left),
                                                        right: resolveUrl(product.blockTextures.right),
                                                    }}
                                                    backgroundStyle={getBackgroundStyle(product.modelSettings)}
                                                    showAxes={product.modelSettings?.showAxes}
                                                    autoRotate={product.modelSettings?.autoRotate}
                                                    className="w-full h-full pointer-events-none"
                                                />
                                            </div>
                                        ) : product.displayType === 'model' && product.gltfModel ? (
                                            <div className="w-full h-full">
                                                <Model3DViewer
                                                    modelUrl={resolveUrl(product.gltfModel) || ''}
                                                    backgroundStyle={getBackgroundStyle(product.modelSettings)}
                                                    showAxes={product.modelSettings?.showAxes}
                                                    autoRotate={product.modelSettings?.autoRotate}
                                                    className="w-full h-full pointer-events-none"
                                                />
                                            </div>
                                        ) : (
                                            <ImageWithSkeleton
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        )}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-20">
                                            <div className="bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                                {product.category}
                                            </div>
                                            {product.subcategory && (
                                                <div className="bg-[var(--primary)]/90 backdrop-blur-md text-black px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow">
                                                    {product.subcategory}
                                                </div>
                                            )}
                                        </div>
                                        {product.tag && (
                                            <div
                                                className="absolute top-4 left-4 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg"
                                                style={{ backgroundColor: product.tagColor || '#ff0000' }}
                                            >
                                                {product.tag}
                                            </div>
                                        )}

                                        {/* Overlay hint */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <span className="px-4 py-2 bg-black/80 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 shadow-2xl">
                                                <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                ดูรายละเอียด
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 
                                            onClick={() => setDetailProduct(product)}
                                            className="text-lg font-bold mb-2 line-clamp-1 cursor-pointer hover:text-[var(--primary)] transition-colors" 
                                            title={product.name}
                                        >
                                            {product.name}
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1 cursor-pointer" onClick={() => setDetailProduct(product)} title={product.description}>
                                            {product.description}
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                                            <div className="text-[var(--primary)] font-bold whitespace-nowrap">
                                                {product.price.toLocaleString()} P
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => setDetailProduct(product)}
                                                    className="p-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/15 hover:text-white transition-colors"
                                                    title="ดูรายละเอียดสินค้า"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                                {product.allowGift && (
                                                    <button
                                                        onClick={() => handleGift(product)}
                                                        className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                                                        title={t('shop.gift')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleBuy(product)}
                                                    disabled={checkingOnline}
                                                    className="px-3.5 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                >
                                                    {checkingOnline ? t('shop.checking') : t('shop.buy')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                {/* ── Product Description Modal Popup ───────────────────────── */}
                {detailProduct && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1e1e1e] sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 rounded-full text-xs font-bold">
                                        {detailProduct.category}
                                    </span>
                                    {detailProduct.subcategory && (
                                        <span className="px-3 py-1 bg-white/5 text-gray-300 rounded-full text-xs font-semibold">
                                            {detailProduct.subcategory}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setDetailProduct(null)}
                                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* 3D / Image Viewer */}
                                <div className="h-72 bg-[#121212] rounded-2xl overflow-hidden relative border border-white/5 flex items-center justify-center">
                                    {detailProduct.displayType === '3d' && detailProduct.imageUrl ? (
                                        <Item3DViewer
                                            imageUrl={(() => {
                                                let src = detailProduct.imageUrl;
                                                if (src.startsWith('/uploads')) {
                                                    const effectiveApiUrl = API_URL || 'http://localhost:5000';
                                                    const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;
                                                    return `${baseUrl}${src}`;
                                                }
                                                return src;
                                            })()}
                                            backgroundStyle={getBackgroundStyle(detailProduct.modelSettings)}
                                            showAxes={detailProduct.modelSettings?.showAxes}
                                            autoRotate={detailProduct.modelSettings?.autoRotate}
                                            className="w-full h-full"
                                            enableZoom={true}
                                            yOffset={1}
                                        />
                                    ) : detailProduct.displayType === 'block' && detailProduct.blockTextures ? (
                                        <Block3DViewer
                                            textures={{
                                                front: resolveUrl(detailProduct.blockTextures.front),
                                                back: resolveUrl(detailProduct.blockTextures.back),
                                                top: resolveUrl(detailProduct.blockTextures.top),
                                                bottom: resolveUrl(detailProduct.blockTextures.bottom),
                                                left: resolveUrl(detailProduct.blockTextures.left),
                                                right: resolveUrl(detailProduct.blockTextures.right),
                                            }}
                                            backgroundStyle={getBackgroundStyle(detailProduct.modelSettings)}
                                            showAxes={detailProduct.modelSettings?.showAxes}
                                            autoRotate={detailProduct.modelSettings?.autoRotate}
                                            className="w-full h-full"
                                        />
                                    ) : detailProduct.displayType === 'model' && detailProduct.gltfModel ? (
                                        <Model3DViewer
                                            modelUrl={resolveUrl(detailProduct.gltfModel) || ''}
                                            backgroundStyle={getBackgroundStyle(detailProduct.modelSettings)}
                                            showAxes={detailProduct.modelSettings?.showAxes}
                                            autoRotate={detailProduct.modelSettings?.autoRotate}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <ImageWithSkeleton
                                            src={detailProduct.imageUrl}
                                            alt={detailProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {detailProduct.tag && (
                                        <div
                                            className="absolute top-4 left-4 text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg"
                                            style={{ backgroundColor: detailProduct.tagColor || '#ff0000' }}
                                        >
                                            {detailProduct.tag}
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{detailProduct.name}</h2>
                                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {detailProduct.description || 'ไม่มีคำอธิบายสำหรับสินค้านี้'}
                                    </div>
                                </div>

                                {/* Price & Balance info */}
                                <div className="flex items-center justify-between bg-[#121212]/80 border border-white/10 p-4 rounded-2xl">
                                    <div>
                                        <p className="text-xs text-gray-400">ราคาสินค้า</p>
                                        <p className="text-2xl font-extrabold text-[var(--primary)]">
                                            {detailProduct.price.toLocaleString()} <span className="text-sm font-semibold text-white">Points</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">พอยท์คงเหลือของคุณ</p>
                                        <p className="text-lg font-bold text-white">
                                            {userPoints !== null ? userPoints.toLocaleString() : '0'} <span className="text-xs text-gray-400">Points</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-6 border-t border-white/10 bg-[#1e1e1e] flex gap-3">
                                {detailProduct.allowGift && (
                                    <button
                                        onClick={() => {
                                            const p = detailProduct;
                                            setDetailProduct(null);
                                            handleGift(p);
                                        }}
                                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                                        ส่งของขวัญ
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        const p = detailProduct;
                                        setDetailProduct(null);
                                        handleBuy(p);
                                    }}
                                    className="flex-1 px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all shadow-lg shadow-[var(--primary)]/20 text-base"
                                >
                                    สั่งซื้อสินค้าทันที
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </main>
                <Footer />

                {/* ── Offline Warning Modal (player not online) ─────────────────── */}
                {showOfflineWarning && pendingProduct && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1e1e1e] border border-yellow-500/30 rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="p-6">
                                {/* Icon + Title */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">คุณไม่ได้อยู่ในเกม</h2>
                                        <p className="text-yellow-400 text-sm">ไม่พบผู้เล่นในเซิร์ฟเวอร์ขณะนี้</p>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-5">
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        ระบบตรวจพบว่า <span className="text-white font-bold">{targetUsername}</span> ไม่ได้อยู่ในเซิร์ฟเวอร์ในขณะนี้
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        ของที่ซื้อ <span className="text-[var(--primary)] font-semibold">{pendingProduct.name}</span> อาจจะไม่เข้าสู่ตัวละครทันที หากต้องการให้ได้ของทันที กรุณาเข้าเกมก่อนแล้วซื้อใหม่
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    {/* Cancel (Primary color — main action) */}
                                    <button
                                        onClick={() => { setShowOfflineWarning(false); setPendingProduct(null); }}
                                        className="flex-1 px-4 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all text-sm"
                                    >
                                        ยกเลิกการซื้อ
                                    </button>
                                    {/* Continue (Gray — secondary) */}
                                    <button
                                        onClick={() => {
                                            setShowOfflineWarning(false);
                                            processPurchase(pendingProduct!, targetUsername);
                                        }}
                                        className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 text-white/70 font-medium rounded-xl transition-all text-sm"
                                    >
                                        ซื้อต่อ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Gift Modal (enter target username) ──────────────────────── */}
                {showOfflineModal && pendingProduct && pendingIsGift && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                                    {t('shop.gift')}
                                </h2>
                                <p className="text-gray-400 mb-4">
                                    {t('shop.confirmBuyDesc')} <span className="text-white font-bold">{pendingProduct.name}</span>
                                </p>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!pendingProduct || !targetUsername) return;

                                    // Check if target is online before gifting
                                    setCheckingOnline(true);
                                    const { online, cannotVerify } = await checkOnlineStatus(targetUsername);
                                    setCheckingOnline(false);

                                    if (!online && !cannotVerify) {
                                        setShowOfflineModal(false);
                                        setShowOfflineWarning(true);
                                    } else {
                                        setShowOfflineModal(false);
                                        processPurchase(pendingProduct, targetUsername);
                                    }
                                }}>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            {t('shop.targetUser')}
                                        </label>
                                        <input
                                            type="text"
                                            value={targetUsername}
                                            onChange={(e) => setTargetUsername(e.target.value)}
                                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                            placeholder={t('shop.enterUsername')}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setShowOfflineModal(false); setPendingProduct(null); }}
                                            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={checkingOnline}
                                            className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {checkingOnline ? 'กำลังตรวจสอบ...' : t('shop.confirmBuy')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
                {/* Generic Modal */}
                <Modal
                    isOpen={modalProps.isOpen}
                    onClose={closeModal}
                    onConfirm={modalProps.onConfirm}
                    title={modalProps.title}
                    message={modalProps.message}
                    type={modalProps.type}
                    mode={modalProps.mode}
                    confirmText={modalProps.confirmText}
                    cancelText={modalProps.cancelText}
                />
            </div>
        </AuthGuard>
    );
}
