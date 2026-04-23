'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';

import Modal from '../components/Modal';
import ImageWithSkeleton from '../components/ImageWithSkeleton';
import AuthGuard from '../components/AuthGuard';

export default function SupportPage() {
    const { t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [tags, setTags] = useState<any[]>([]);
    const [selectedTag, setSelectedTag] = useState('');

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
        // Get logged-in user
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            fetchUserTickets(parsedUser._id);
        }

        // Fetch tags
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const res = await fetch(`${API_URL}/api/tags`);
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    const fetchUserTickets = async (userId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tickets/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append('userId', user._id);
        formData.append('subject', subject);
        formData.append('message', message);
        formData.append('category', selectedTag);
        if (image) {
            formData.append('image', image);
        }

        try {
            const res = await fetch(`${API_URL}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                showModal(t('common.success'), t('support.submitSuccess'), 'success');
                setSubject('');
                setMessage('');
                setSelectedTag('');
                setImage(null);
                setImagePreview(null);
                fetchUserTickets(user._id);
            } else {
                showModal(t('common.error'), data.message || t('support.submitError'), 'error');
            }
        } catch (error) {
            console.error('Error submitting ticket:', error);
            showModal(t('common.error'), t('support.submitErrorGeneric'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            unread: 'bg-red-500/20 text-red-500',
            read: 'bg-yellow-500/20 text-yellow-500',
            replied: 'bg-blue-500/20 text-blue-500',
            resolved: 'bg-green-500/20 text-green-500'
        };
        return badges[status as keyof typeof badges] || badges.unread;
    };



    return (
        <AuthGuard>
            <div className="min-h-screen bg-[#121212] text-white p-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">{t('support.title')}</h1>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Submit Ticket Form */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                            <h2 className="text-2xl font-bold mb-6">{t('support.submitTicket')}</h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('support.subject')}
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                        placeholder={t('support.subject')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('support.message')}
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={6}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none resize-none"
                                        placeholder={t('support.message')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('support.category')}
                                    </label>
                                    <select
                                        value={selectedTag}
                                        onChange={(e) => setSelectedTag(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white outline-none"
                                    >
                                        <option value="">{t('support.selectCategory')}</option>
                                        {tags.map((tag) => (
                                            <option key={tag._id} value={tag.name}>
                                                {tag.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('support.attachImage')}
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className="block w-full px-4 py-3 bg-[#2a2a2a] border border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                                    >
                                        {imagePreview ? (
                                            <div className="relative">
                                                <ImageWithSkeleton src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                                                <p className="text-sm text-gray-400 mt-2">{t('support.clickToChange')}</p>
                                            </div>
                                        ) : (
                                            <div className="py-8">
                                                <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <p className="text-gray-400">{t('support.clickToUpload')}</p>
                                                <p className="text-xs text-gray-500 mt-1">{t('support.imageHint')}</p>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full px-6 py-3 bg-[var(--primary)] text-black font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? t('support.submitting') : t('support.submit')}
                                </button>
                            </form>
                        </div>

                        {/* Ticket List */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                            <h2 className="text-2xl font-bold mb-6">{t('support.yourTickets')}</h2>

                            {loading ? (
                                <p className="text-gray-400 text-center py-8">{t('common.loading')}</p>
                            ) : tickets.length > 0 ? (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                    {tickets.map((ticket) => (
                                        <div key={ticket._id} className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5 hover:border-[var(--primary)]/30 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-bold text-lg text-white">{ticket.subject}</h3>
                                                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${getStatusBadge(ticket.status)}`}>
                                                    {t(`status.${ticket.status}`)}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{ticket.message}</p>
                                            {ticket.imageUrl && (
                                                <ImageWithSkeleton src={ticket.imageUrl} alt="Attachment" className="w-full h-32 object-cover rounded-lg mb-3" />
                                            )}
                                            {ticket.adminReply && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <p className="text-xs text-gray-500 mb-2 font-bold uppercase">{t('support.adminReply')}</p>
                                                    <p className="text-gray-300 text-sm">{ticket.adminReply}</p>
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-3">
                                                {new Date(ticket.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                    <p className="text-gray-400">{t('support.noTickets')}</p>
                                    <p className="text-sm text-gray-500 mt-1">{t('support.noTicketsDesc')}</p>
                                </div>
                            )}
                        </div>
                    </div>
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
        </AuthGuard>
    );
}
