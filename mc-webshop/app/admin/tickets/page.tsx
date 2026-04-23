'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';

import Modal from '../../components/Modal';
import ImageWithSkeleton from '../../components/ImageWithSkeleton';

export default function AdminTicketsPage() {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState<any[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tags, setTags] = useState<any[]>([]);
    const [showTagManager, setShowTagManager] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');

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
        fetchTickets();
        fetchTags();
    }, []);

    useEffect(() => {
        filterTickets();
    }, [filter, tickets, searchQuery]);

    const fetchTags = async () => {
        try {
            const res = await fetch(`${API_URL}/api/tags`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tickets`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterTickets = () => {
        let filtered = tickets;

        // Filter by status
        if (filter !== 'all') {
            filtered = filtered.filter(t => t.status === filter);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tag?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredTickets(filtered);
    };

    const updateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                fetchTickets();
                if (selectedTicket?._id === ticketId) {
                    setSelectedTicket({ ...selectedTicket, status: newStatus });
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const submitReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/tickets/${selectedTicket._id}/reply`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reply: replyText }),
            });

            if (res.ok) {
                showModal('Success', 'Reply sent successfully!', 'success');
                setReplyText('');
                fetchTickets();
                setSelectedTicket(null);
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            showModal('Error', 'Failed to send reply', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteTicket = (ticketId: string) => {
        showModal(t('common.delete'), t('admin.tickets.confirmDelete'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    }
                });

                if (res.ok) {
                    fetchTickets();
                    if (selectedTicket?._id === ticketId) {
                        setSelectedTicket(null);
                    }
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
                }
            } catch (error) {
                console.error('Error deleting ticket:', error);
                showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
            }
        });
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            unread: { bg: 'bg-red-500/20', text: 'text-red-500', label: t('admin.tickets.status.unread') },
            read: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: t('admin.tickets.status.read') },
            replied: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: t('admin.tickets.status.replied') },
            resolved: { bg: 'bg-green-500/20', text: 'text-green-500', label: t('admin.tickets.status.resolved') }
        };
        return badges[status as keyof typeof badges] || badges.unread;
    };

    const getStatusCount = (status: string) => {
        if (status === 'all') return tickets.length;
        return tickets.filter(t => t.status === status).length;
    };

    const createTag = async () => {
        if (!newTagName.trim()) {
            showModal(t('common.warning'), t('adminTickets.categoryName'), 'warning');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newTagName, color: newTagColor }),
            });

            if (res.ok) {
                showModal(t('common.success'), t('common.success'), 'success');
                setNewTagName('');
                setNewTagColor('#3b82f6');
                fetchTags();
            } else {
                const data = await res.json();
                showModal(t('common.error'), data.message || t('common.error'), 'error');
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            showModal(t('common.error'), t('common.error'), 'error');
        }
    };

    const deleteTag = (tagId: string) => {
        showModal(t('common.delete'), t('adminTickets.confirmDeleteTag'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/tags/${tagId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    }
                });

                if (res.ok) {
                    fetchTags();
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
                }
            } catch (error) {
                console.error('Error deleting tag:', error);
                showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">{t('admin.tickets.title')}</h1>
                <button
                    onClick={() => setShowTagManager(!showTagManager)}
                    className="px-4 py-2 bg-[var(--primary)] text-black font-bold rounded-lg hover:brightness-110 transition-all"
                >
                    {showTagManager ? t('admin.tickets.hideTags') : t('admin.tickets.manageTags')}
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('admin.tickets.searchPlaceholder')}
                    className="w-full px-4 py-3 bg-[#1e1e1e] border border-white/10 rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                />
            </div>

            {/* Tag Manager */}
            {showTagManager && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl mb-6">
                    <h2 className="text-xl font-bold text-white mb-6">{t('adminTickets.manageCategories')}</h2>

                    {/* Create New Tag */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('adminTickets.createCategory')}</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder={t('adminTickets.categoryName')}
                                className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                            />
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-16 h-10 bg-[#2a2a2a] border border-transparent rounded-lg cursor-pointer"
                            />
                            <button
                                onClick={createTag}
                                className="px-6 py-2 bg-[var(--primary)] text-black font-bold rounded-lg hover:brightness-110 transition-all"
                            >
                                {t('common.create')}
                            </button>
                        </div>
                    </div>

                    {/* Existing Tags */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t('adminTickets.existingCategories')}</h3>
                        {tags.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {tags.map((tag) => (
                                    <div
                                        key={tag._id}
                                        className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-3 border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-white font-medium">{tag.name}</span>
                                        </div>
                                        <button
                                            onClick={() => deleteTag(tag._id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">{t('adminTickets.noCategories')}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {['all', 'unread', 'read', 'replied', 'resolved'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${filter === status
                            ? 'bg-[var(--primary)] text-black'
                            : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                            }`}
                    >
                        {status === 'all' ? t('adminTickets.all') : getStatusBadge(status).label}
                        <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-xs">
                            {getStatusCount(status)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tickets Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Tickets List */}
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6">{t('admin.tickets.listTitle')} ({filteredTickets.length})</h2>

                    {loading ? (
                        <p className="text-gray-400 text-center py-8">{t('common.loading')}</p>
                    ) : filteredTickets.length > 0 ? (
                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                            {filteredTickets.map((ticket) => {
                                const badge = getStatusBadge(ticket.status);
                                return (
                                    <div
                                        key={ticket._id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`bg-[#2a2a2a] rounded-xl p-5 border transition-all cursor-pointer ${selectedTicket?._id === ticket._id
                                            ? 'border-[var(--primary)]'
                                            : 'border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white mb-1">{ticket.subject}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {ticket.userId?.name || 'Unknown User'} • {ticket.userId?.email || 'No email'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{ticket.message}</p>
                                        {ticket.tag && (
                                            <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded mb-2">
                                                {ticket.tag}
                                            </span>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            {new Date(ticket.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-400">{t('adminTickets.noTickets')}</p>
                        </div>
                    )}
                </div>

                {/* Ticket Details */}
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl">
                    {selectedTicket ? (
                        <div>
                            <div className="flex items-start justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">{t('admin.tickets.detailsTitle')}</h2>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* User Info */}
                                <div className="bg-[#2a2a2a] rounded-lg p-4">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.userInfo')}</p>
                                    <p className="text-white font-bold">{selectedTicket.userId?.name || 'Unknown'}</p>
                                    <p className="text-gray-400 text-sm">{selectedTicket.userId?.email || 'No email'}</p>
                                </div>

                                {/* Subject */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.subject')}</p>
                                    <p className="text-white font-bold text-lg">{selectedTicket.subject}</p>
                                </div>

                                {/* Tag */}
                                {selectedTicket.tag && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.category')}</p>
                                        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 font-bold rounded-lg">
                                            {selectedTicket.tag}
                                        </span>
                                    </div>
                                )}

                                {/* Message */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.message')}</p>
                                    <p className="text-gray-300 leading-relaxed">{selectedTicket.message}</p>
                                </div>

                                {/* Image */}
                                {selectedTicket.imageUrl && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.attachment')}</p>
                                        <ImageWithSkeleton src={selectedTicket.imageUrl} alt="Attachment" className="w-full rounded-lg" />
                                    </div>
                                )}

                                {/* Admin Reply */}
                                {selectedTicket.adminReply && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <p className="text-xs text-blue-500 uppercase font-bold mb-2">{t('admin.tickets.yourReply')}</p>
                                        <p className="text-gray-300">{selectedTicket.adminReply}</p>
                                    </div>
                                )}

                                {/* Reply Form */}
                                {selectedTicket.status !== 'resolved' && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">{t('admin.tickets.sendReply')}</p>
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none resize-none mb-3"
                                            placeholder={t('adminTickets.typeReply')}
                                        />
                                        <button
                                            onClick={submitReply}
                                            disabled={submitting || !replyText.trim()}
                                            className="w-full px-6 py-3 bg-[var(--primary)] text-black font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? t('admin.tickets.sending') : t('admin.tickets.sendReply')}
                                        </button>
                                    </div>
                                )}

                                {/* Status Actions */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">{t('admin.tickets.changeStatus')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => updateStatus(selectedTicket._id, 'read')}
                                            className="px-4 py-2 bg-yellow-500/10 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/20 transition-colors text-sm"
                                        >
                                            {t('admin.tickets.markRead')}
                                        </button>
                                        <button
                                            onClick={() => updateStatus(selectedTicket._id, 'resolved')}
                                            className="px-4 py-2 bg-green-500/10 text-green-500 font-bold rounded-lg hover:bg-green-500/20 transition-colors text-sm"
                                        >
                                            {t('admin.tickets.markResolved')}
                                        </button>
                                    </div>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={() => deleteTicket(selectedTicket._id)}
                                    className="w-full px-4 py-2 bg-red-500/10 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                                >
                                    {t('admin.tickets.delete')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center py-20">
                            <div>
                                <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                <p className="text-gray-400">{t('admin.tickets.selectTicket')}</p>
                            </div>
                        </div>
                    )}
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
    );
}
