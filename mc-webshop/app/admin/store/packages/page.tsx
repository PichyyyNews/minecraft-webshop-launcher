'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../utils/config';
import Modal from '../../../components/Modal';
import ImageWithSkeleton from '../../../components/ImageWithSkeleton';

interface PointPackage {
    _id: string;
    name: string;
    price: number;
    points: number;
    imageUrl?: string;
    tag?: string;
    tagColor?: string;
}

export default function AdminPackagesPage() {
    const { t } = useLanguage();
    const [packages, setPackages] = useState<PointPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<PointPackage | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        points: '',
        tag: '',
        tagColor: '#ff0000',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
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
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/point-packages`);
            const data = await res.json();
            setPackages(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching packages:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (pkg?: PointPackage) => {
        if (pkg) {
            setEditingPackage(pkg);
            setFormData({
                name: pkg.name,
                price: pkg.price.toString(),
                points: pkg.points.toString(),
                tag: pkg.tag || '',
                tagColor: pkg.tagColor || '#ff0000',
            });
            setPreviewUrl(pkg.imageUrl || null);
        } else {
            setEditingPackage(null);
            setFormData({
                name: '',
                price: '',
                points: '',
                tag: '',
                tagColor: '#ff0000',
            });
            setFormData({
                name: '',
                price: '',
                points: '',
                tag: '',
                tagColor: '#ff0000',
            });
            setPreviewUrl(null);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPackage(null);
        setImageFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', formData.price);
        data.append('points', formData.points);
        data.append('tag', formData.tag);
        data.append('tagColor', formData.tagColor);
        if (imageFile) {
            data.append('image', imageFile);
        }

        try {
            const url = editingPackage
                ? `${API_URL}/api/point-packages/${editingPackage._id}`
                : `${API_URL}/api/point-packages`;

            const method = editingPackage ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: data,
            });

            if (res.ok) {
                fetchPackages();
                handleCloseModal();
                showModal(t('common.success'), t('common.success'), 'success');
            } else {
                showModal(t('common.error'), t('common.error'), 'error');
            }
        } catch (error) {
            console.error('Error saving package:', error);
            showModal(t('common.error'), t('common.error'), 'error');
        }
    };

    const handleDelete = (id: string) => {
        showModal(t('admin.packages.confirmDelete'), t('admin.packages.confirmDelete'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/point-packages/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    }
                });

                if (res.ok) {
                    fetchPackages();
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('common.error'), 'error');
                }
            } catch (error) {
                console.error('Error deleting package:', error);
                showModal(t('common.error'), t('common.error'), 'error');
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('admin.packages.title')}</h1>
                    <p className="text-gray-400 mt-2">{t('admin.packages.title')}</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t('admin.packages.add')}
                </button>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">{t('admin.products.image')}</th>
                                <th className="p-6 font-medium">{t('admin.products.name')}</th>
                                <th className="p-6 font-medium">{t('admin.packages.points')}</th>
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
                            ) : packages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {t('topup.noPackages')}
                                    </td>
                                </tr>
                            ) : (
                                packages.map((pkg) => (
                                    <tr key={pkg._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="w-12 h-12 bg-[#121212] rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                                                <ImageWithSkeleton src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="p-6 text-white font-medium">{pkg.name}</td>
                                        <td className="p-6 text-[var(--primary)] font-bold">{pkg.points.toLocaleString()} {t('shop.points')}</td>
                                        <td className="p-6 text-gray-300">฿{pkg.price.toLocaleString()}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(pkg)}
                                                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pkg._id)}
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
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {editingPackage ? t('admin.products.edit') : t('admin.products.add')}
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
                                    placeholder={t('admin.packages.namePlaceholder')}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.packages.points')}</label>
                                    <input
                                        type="number"
                                        value={formData.points}
                                        onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="100"
                                        required
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.price')}</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        placeholder="50"
                                        required
                                        min="0"
                                    />
                                </div>
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
                                    {editingPackage ? t('common.save') : t('common.create')}
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
