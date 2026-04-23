'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

// Component for rendering a single user row with UUID fetching and actions
const UserRow = ({ user, onDelete, onBan, onPasswordChange, t }: { user: any, onDelete: any, onBan: any, onPasswordChange: any, t: any }) => {
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
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user._id}</td>
            <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
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
                {user.name}
                {user.isBanned && <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] uppercase font-bold rounded">{t('admin.users.banned')}</span>}
            </td>
            <td className="px-6 py-4 text-gray-300">{user.email}</td>
            <td className="px-6 py-4 flex items-center gap-2">
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

export default function PlayerPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const [passwordModal, setPasswordModal] = useState({
        isOpen: false,
        userId: null as string | null,
    });
    const [newPassword, setNewPassword] = useState('');

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
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                showModal('Error', 'Session expired. Please login again.', 'error', 'alert', () => {
                    window.location.href = '/login';
                });
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                console.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    // Filter users based on search query
    const filteredUsers = users.filter((user: any) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats Calculation
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.isBanned).length;

    // Mock data for graph
    const data = [
        { name: 'Mon', users: 4 },
        { name: 'Tue', users: 3 },
        { name: 'Wed', users: 2 },
        { name: 'Thu', users: 7 },
        { name: 'Fri', users: 5 },
        { name: 'Sat', users: 8 },
        { name: 'Sun', users: totalUsers },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">{t('admin.users.title')}</h1>

            {/* Stats Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{t('admin.users.total')}</h3>
                    <p className="text-4xl font-bold text-white">{totalUsers}</p>
                </div>
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{t('admin.users.active')}</h3>
                    <p className="text-4xl font-bold text-[var(--primary)]">{activeUsers}</p>
                </div>
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{t('admin.users.banned')}</h3>
                    <p className="text-4xl font-bold text-red-500">{totalUsers - activeUsers}</p>
                </div>
            </div>

            {/* Graph */}
            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-lg mb-8">
                <h3 className="text-xl font-bold text-white mb-6">{t('admin.users.growth')}</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff' }}
                                itemStyle={{ color: 'var(--primary)' }}
                            />
                            <Line type="monotone" dataKey="users" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: '#1e1e1e', stroke: 'var(--primary)', strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* User Table */}
            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {/* Search Bar */}
                <div className="p-6 border-b border-white/5">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('admin.users.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-12 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">ID</th>
                                <th className="px-6 py-4 font-medium">{t('admin.products.name')}</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">{t('admin.products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <UserRow
                                        key={user._id}
                                        user={user}
                                        onDelete={handleDelete}
                                        onBan={handleBan}
                                        onPasswordChange={handlePasswordChange}
                                        t={t}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? t('admin.users.noUsersFound') : t('admin.users.noUsers')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
