'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    points: number;
    isBanned: boolean;
    createdAt: string;
    totalSpent?: number;
    totalPointsHistory?: number;
}

// Component for rendering a single user row with UUID fetching and actions
const UserRow = ({ user, onDelete, onBan, onPasswordChange, onEditPoints, t }: {
    user: User,
    onDelete: (id: string) => void,
    onBan: (id: string) => void,
    onPasswordChange: (id: string) => void,
    onEditPoints: (user: User) => void,
    t: (key: string) => string
}) => {
    const [uuid, setUuid] = useState<string | null>(null);

    useEffect(() => {
        if (user.name) {
            fetch(`https://playerdb.co/api/player/minecraft/${user.name}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setUuid(data.data.player.id);
                    }
                })
                .catch(err => console.error(`Failed to fetch UUID for ${user.name}`, err));
        }
    }, [user.name]);

    return (
        <tr className="hover:bg-white/5 transition-colors group">
            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user._id}</td>
            <td className="px-6 py-4 text-white font-medium">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#2a2a2a] overflow-hidden">
                        {uuid ? (
                            <img
                                src={`https://api.mineatar.io/face/${uuid}?scale=4`}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            {user.name}
                            {user.isBanned && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] uppercase font-bold rounded">{t('admin.users.banned')}</span>}
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-blue-500/10 text-blue-500'
                    }`}>
                    {user.role.toUpperCase()}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <span className="text-[var(--primary)] font-bold">
                    {(user.points || 0).toLocaleString()}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <span className="text-green-400 font-medium font-mono">
                    ฿{(user.totalSpent || 0).toLocaleString()}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <span className="text-yellow-400 font-medium">
                    {(user.totalPointsHistory || 0).toLocaleString()}
                </span>
            </td>
            <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                {new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 flex items-center gap-2 justify-end">
                <button
                    onClick={() => onEditPoints(user)}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                >
                    {t('admin.users.editPoints')}
                </button>
                <button
                    onClick={() => onBan(user._id)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${user.isBanned ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'}`}
                >
                    {user.isBanned ? t('admin.users.unban') : t('admin.users.ban')}
                </button>
                <button
                    onClick={() => onPasswordChange(user._id)}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                >
                    {t('admin.users.password')}
                </button>
                <button
                    onClick={() => onDelete(user._id)}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                    {t('common.delete')}
                </button>
            </td>
        </tr>
    );
};

export default function AdminUsersPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Points State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [points, setPoints] = useState('');
    const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

    // Change Password State
    const [passwordModal, setPasswordModal] = useState({
        isOpen: false,
        userId: null as string | null,
    });
    const [newPassword, setNewPassword] = useState('');

    // General Modal State
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
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                showModal(t('common.error'), 'Session expired. Please login again.', 'error', 'alert', () => {
                    window.location.href = '/login';
                });
                return;
            }

            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error('Expected array of users, got:', data);
                setUsers([]);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    // Actions
    const handleDelete = async (id: string) => {
        showModal(t('admin.users.confirmDelete'), t('admin.users.confirmDelete'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    }
                });
                if (res.ok) {
                    fetchUsers();
                    showModal(t('common.success'), t('common.success'), 'success');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showModal(t('common.error'), t('common.error'), 'error');
            }
        });
    };

    const handleBan = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/users/${id}/ban`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Error banning user:', error);
        }
    };

    const handlePasswordChange = (id: string) => {
        setPasswordModal({ isOpen: true, userId: id });
        setNewPassword('');
    };

    const submitPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModal.userId || !newPassword) return;

        try {
            const res = await fetch(`${API_URL}/api/users/${passwordModal.userId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password: newPassword }),
            });
            if (res.ok) {
                setPasswordModal({ isOpen: false, userId: null });
                showModal(t('common.success'), t('admin.users.passwordUpdated'), 'success');
            } else {
                showModal(t('common.error'), t('common.error'), 'error');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            showModal(t('common.error'), t('common.error'), 'error');
        }
    };

    const handleEditPoints = (user: User) => {
        setEditingUser(user);
        setPoints(user.points.toString());
        setIsPointsModalOpen(true);
    };

    const handleSavePoints = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`${API_URL}/api/users/${editingUser._id}/points`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ points: parseInt(points) }),
            });

            if (res.ok) {
                fetchUsers();
                setIsPointsModalOpen(false);
                setEditingUser(null);
                showModal(t('common.success'), 'Points updated successfully', 'success');
            } else {
                showModal(t('common.error'), 'Failed to update points', 'error');
            }
        } catch (error) {
            console.error('Error updating points:', error);
            showModal(t('common.error'), 'Error updating points', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('admin.users.title')}</h1>
                    <p className="text-gray-400 mt-2">{t('admin.users.total')}: {users.length}</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('common.search') || 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#1e1e1e] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none w-64"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">ID</th>
                                <th className="p-6 font-medium">{t('admin.products.name')}</th>
                                <th className="p-6 font-medium text-left">{t('admin.users.role')}</th>
                                <th className="p-6 font-medium text-right">{t('shop.points')} (Current)</th>
                                <th className="p-6 font-medium text-right text-green-400">Total Top-up</th>
                                <th className="p-6 font-medium text-right text-yellow-400">Total Points</th>
                                <th className="p-6 font-medium text-left">{t('admin.transactions.date')}</th>
                                <th className="p-6 font-medium text-right">{t('admin.products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">
                                        {t('admin.users.noUsers')}
                                    </td>
                                </tr>
                            ) : (

                                users
                                    .filter(user =>
                                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        user.email.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((user) => (
                                        <UserRow
                                            key={user._id}
                                            user={user}
                                            onDelete={handleDelete}
                                            onBan={handleBan}
                                            onPasswordChange={handlePasswordChange}
                                            onEditPoints={handleEditPoints}
                                            t={t}
                                        />
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Points Modal */}
            {isPointsModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">{t('admin.users.editPoints')}</h2>
                            <button onClick={() => setIsPointsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSavePoints} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.products.name')}</label>
                                <div className="text-white font-medium">{editingUser.name}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('shop.points')}</label>
                                <input
                                    type="number"
                                    value={points}
                                    onChange={(e) => setPoints(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPointsModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {passwordModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">{t('admin.users.changePassword')}</h2>
                            <button onClick={() => setPasswordModal({ isOpen: false, userId: null })} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={submitPasswordChange} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('admin.users.newPassword')}</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    placeholder={t('admin.users.newPasswordPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModal({ isOpen: false, userId: null })}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors"
                                >
                                    {t('common.save')}
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
