'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../utils/config';
import Modal from '../../../components/Modal';

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEditing = !!id;
    const { t } = useLanguage();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        author: 'Admin'
    });
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);

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
        if (id) {
            fetch(`${API_URL}/api/wiki/${id}`)
                .then(res => res.json())
                .then(data => {
                    setFormData({
                        title: data.title,
                        content: data.content,
                        author: data.author
                    });
                    if (data.imageUrl) setPreview(data.imageUrl);
                    setFetching(false);
                })
                .catch(err => {
                    console.error('Failed to fetch wiki:', err);
                    setFetching(false);
                });
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        data.append('author', formData.author);
        if (image) {
            data.append('image', image);
        }

        try {
            const url = isEditing
                ? `${API_URL}/api/wiki/${id}`
                : `${API_URL}/api/wiki`;

            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                body: data,
            });

            if (res.ok) {
                showModal(t('common.success'), t('common.success'), 'success', 'alert', () => {
                    router.push('/admin/wiki');
                });
            } else {
                showModal(t('common.error'), t('admin.wiki.saveFailed'), 'error');
            }
        } catch (error) {
            console.error('Error saving wiki:', error);
            showModal(t('common.error'), t('admin.wiki.saveError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    if (fetching) {
        return (
            <div className="text-center py-20 text-gray-500">
                {t('common.loading')}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        {isEditing ? t('admin.wiki.edit') : t('admin.wiki.new')}
                    </h1>
                    <p className="text-gray-400 mt-2">
                        {isEditing ? t('admin.wiki.editDesc') : t('admin.wiki.newDesc')}
                    </p>
                </div>
                <Link
                    href="/admin/wiki"
                    className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white font-medium rounded-lg transition-colors border border-white/10"
                >
                    {t('common.cancel')}
                </Link>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.wiki.form.title')}</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none text-lg font-bold"
                            placeholder={t('admin.wiki.form.titlePlaceholder')}
                            required
                        />
                    </div>

                    {/* Author */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.wiki.form.author')}</label>
                        <input
                            type="text"
                            value={formData.author}
                            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                            placeholder={t('admin.wiki.form.authorPlaceholder')}
                            required
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.wiki.form.coverImage')}</label>
                        <div className="flex flex-col gap-4">
                            <div className="w-full h-64 bg-[#2a2a2a] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm text-gray-500">{t('admin.wiki.form.noImage')}</span>
                                    </div>
                                )}
                            </div>
                            <label className="cursor-pointer px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-white/10 text-center w-fit">
                                {preview ? t('admin.wiki.form.changeImage') : t('admin.wiki.form.uploadImage')}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.wiki.form.content')}</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none min-h-[400px] font-mono leading-relaxed"
                            placeholder={t('admin.wiki.form.contentPlaceholder')}
                            required
                        />
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end gap-4">
                        <Link
                            href="/admin/wiki"
                            className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg transition-colors border border-white/10"
                        >
                            {t('common.cancel')}
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? t('common.saving') : (isEditing ? t('admin.wiki.update') : t('admin.wiki.publish'))}
                        </button>
                    </div>
                </form>
            </div>

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

export default function WikiEditorPage() {
    return (
        <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading...</div>}>
            <EditorContent />
        </Suspense>
    );
}
