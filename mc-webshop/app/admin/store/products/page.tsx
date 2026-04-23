'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../utils/config';
import Modal from '../../../components/Modal';
import ImageWithSkeleton from '../../../components/ImageWithSkeleton';

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    tag?: string;
    tagColor?: string;
    command?: string;
    allowGift?: boolean;
    displayType?: 'image' | '3d';
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

export default function AdminProductsPage() {
    const { t } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'General',
        tag: '',
        tagColor: '#ff0000',
        command: '',
        allowGift: false,
        displayType: 'image',
        modelSettings: {
            showAxes: false,
            autoRotate: true,
            bgType: 'solid',
            bgColor: '#121212',
            gradientStart: '#1e1e1e',
            gradientEnd: '#3a3a3a'
        },
        blockTextures: {
            front: '',
            back: '',
            top: '',
            bottom: '',
            left: '',
            right: ''
        },
        gltfModel: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [gltfFile, setGltfFile] = useState<File | null>(null);
    const [blockTextureFiles, setBlockTextureFiles] = useState<{ [key: string]: File | null }>({
        front: null,
        back: null,
        top: null,
        bottom: null,
        left: null,
        right: null
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const resolveUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('data:')) return url; // Handle data URLs for previews
        if (url.startsWith('blob:')) return url; // Handle blob URLs
        if (url.startsWith('http')) return url;

        // Remove localhost:5000 if present to normalize
        let cleanUrl = url.replace('http://localhost:5000', '').replace('localhost:5000', '');

        if (cleanUrl.startsWith('/uploads')) return `${API_URL}${cleanUrl}`;
        if (cleanUrl.startsWith('uploads')) return `${API_URL}/${cleanUrl}`;

        // If it starts with / but not uploads, assuming it is relative to public or root, 
        // but if it is an uploaded file it should have uploads.
        // Let's assume valid paths are either http, data, or uploads/...

        return cleanUrl;
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            const data = await res.json();
            setProducts(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                price: product.price.toString(),
                category: product.category,
                tag: product.tag || '',
                tagColor: product.tagColor || '#ff0000',
                command: product.command || '',
                allowGift: product.allowGift || false,
                displayType: product.displayType || 'image',
                modelSettings: product.modelSettings || {
                    showAxes: false,
                    autoRotate: true,
                    bgType: 'solid',
                    bgColor: '#121212',
                    gradientStart: '#1e1e1e',
                    gradientEnd: '#3a3a3a'
                },
                blockTextures: product.blockTextures || {
                    front: '',
                    back: '',
                    top: '',
                    bottom: '',
                    left: '',
                    right: ''
                },
                gltfModel: product.gltfModel || ''
            });
            setPreviewUrl(product.imageUrl || null);
            // We don't preview GLTF file content here directly in formData as it's a path, 
            // but we can set it to formData to show existing status
            setFormData(prev => ({ ...prev, gltfModel: product.gltfModel || '' }));
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                category: 'General',
                tag: '',
                tagColor: '#ff0000',
                command: '',
                allowGift: false,
                displayType: 'image',
                modelSettings: {
                    showAxes: false,
                    autoRotate: true,
                    bgType: 'solid',
                    bgColor: '#121212',
                    gradientStart: '#1e1e1e',
                    gradientEnd: '#3a3a3a'
                },
                blockTextures: {
                    front: '',
                    back: '',
                    top: '',
                    bottom: '',
                    left: '',
                    right: ''
                },
                gltfModel: ''
            });
            setPreviewUrl(null);
        }
        setImageFile(null);
        setGltfFile(null);
        setBlockTextureFiles({
            front: null,
            back: null,
            top: null,
            bottom: null,
            left: null,
            right: null
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setImageFile(null);
        setGltfFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        data.append('price', formData.price);
        data.append('category', formData.category);
        data.append('tag', formData.tag);
        data.append('tagColor', formData.tagColor);
        data.append('command', formData.command);
        data.append('allowGift', String(formData.allowGift));
        data.append('displayType', formData.displayType);
        data.append('modelSettings', JSON.stringify(formData.modelSettings));
        data.append('blockTextures', JSON.stringify(formData.blockTextures)); // Send current URLs/State as fallback/data

        if (imageFile) {
            data.append('image', imageFile);
        }

        if (gltfFile) {
            data.append('gltfModel', gltfFile);
        } else if (formData.gltfModel && editingProduct) {
            // If we have an existing model and didn't upload a new one, we might want to preserve it.
            // The backend usually preserves unless overwritten. 
            // But if we want to support "removing" it, that's complex. 
            // For now, let's just send the path if it helps, but backend create/update logic 
            // mostly looks for req.file['gltfModel']. 
            // So if we don't send a file, it keeps the old one. Good.
            data.append('gltfModel', formData.gltfModel);
        }

        // Append block texture files
        Object.entries(blockTextureFiles).forEach(([key, file]) => {
            if (file) {
                data.append(`blockTexture_${key}`, file);
            }
        });

        try {
            const url = editingProduct
                ? `${API_URL}/api/products/${editingProduct._id}`
                : `${API_URL}/api/products`;

            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: data,
            });

            if (res.ok) {
                fetchProducts();
                handleCloseModal();
                showModal(t('common.success'), t('common.success'), 'success');
            } else {
                showModal(t('common.error'), t('common.error'), 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showModal(t('common.error'), t('common.error'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        showModal(
            t('admin.products.confirmDelete'),
            t('admin.products.confirmDelete'),
            'warning',
            'confirm',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/products/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                        }
                    });

                    if (res.ok) {
                        fetchProducts();
                        showModal(t('common.success'), t('common.success'), 'success');
                    } else {
                        showModal(t('common.error'), t('common.error'), 'error');
                    }
                } catch (error) {
                    console.error('Error deleting product:', error);
                    showModal(t('common.error'), t('common.error'), 'error');
                }
            }
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('admin.products.title')}</h1>
                    <p className="text-gray-400 mt-2">{t('admin.products.title')}</p>
                </div>

                <div className="relative mx-4 flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder={t('common.search') || 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t('admin.products.add')}
                </button>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">{t('admin.products.image')}</th>
                                <th className="p-6 font-medium">{t('admin.products.name')}</th>
                                <th className="p-6 font-medium">{t('admin.products.category')}</th>
                                <th className="p-6 font-medium">{t('admin.products.price')}</th>
                                <th className="p-6 font-medium text-right">{t('admin.products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {t('shop.outOfStock')}
                                    </td>
                                </tr>
                            ) : (
                                products
                                    .filter(product =>
                                        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        product.category.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((product) => (
                                        <tr key={product._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6">
                                                <div className="w-12 h-12 bg-[#121212] rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                                                    <ImageWithSkeleton src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-white font-medium">{product.name}</div>
                                                <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                                            </td>
                                            <td className="p-6 text-gray-400">
                                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-6 text-[var(--primary)] font-bold">{product.price.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(product)}
                                                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                        title={t('common.edit')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product._id)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        title={t('common.delete')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1e1e1e] z-10">
                            <h2 className="text-xl font-bold text-white">
                                {editingProduct ? t('admin.products.edit') : t('admin.products.add')}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.name')}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    placeholder={t('admin.products.namePlaceholder')}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none h-24 resize-none"
                                    placeholder={t('admin.products.descPlaceholder')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.price')}</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="500"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.category')}</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    >
                                        <option value="General">General</option>
                                        <option value="Ranks">Ranks</option>
                                        <option value="Items">Items</option>
                                        <option value="Keys">Keys</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.command')} {t('admin.products.optional')}</label>
                                <input
                                    type="text"
                                    value={formData.command}
                                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none font-mono text-sm"
                                    placeholder="give [player] diamond 1"
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('admin.products.commandHint').split('[player]')[0]} <span className="text-[var(--primary)]">[player]</span> {t('admin.products.commandHint').split('[player]')[1]}</p>
                            </div>

                            <div className="flex items-center gap-3 bg-[#121212] border border-white/10 rounded-lg px-4 py-3">
                                <input
                                    type="checkbox"
                                    id="allowGift"
                                    checked={formData.allowGift}
                                    onChange={(e) => setFormData({ ...formData, allowGift: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-600 text-[var(--primary)] focus:ring-[var(--primary)] bg-[#1e1e1e]"
                                />
                                <label htmlFor="allowGift" className="text-sm font-medium text-white cursor-pointer select-none">
                                    {t('admin.products.allowGift')}
                                </label>
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.tag')} {t('admin.products.optional')}</label>
                                    <input
                                        type="text"
                                        value={formData.tag}
                                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="e.g. HOT, -50%"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.tagColor')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.tagColor}
                                            onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.tagColor}
                                            onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                                            className="flex-1 min-w-0 bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none uppercase"
                                            placeholder="#FF0000"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.image')} {t('admin.products.optional')}</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20"
                                    accept="image/*"
                                />
                            </div>

                            {previewUrl && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Preview</label>
                                    <div className="w-32 h-32 bg-[#121212] rounded-lg overflow-hidden border border-white/10 relative">
                                        <ImageWithSkeleton src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors"
                                >
                                    {editingProduct ? t('common.save') : t('common.create')}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )
            }

            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </div >
    );
}
