'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';
import {
    ShieldCheck, Plus, Pencil, Trash2, X, Save, Eye, EyeOff,
    LayoutDashboard, Globe, Users, Server, Terminal, BookOpen,
    MessageSquareWarning, Coins, ShoppingBag, UserCog, ReceiptText,
    Settings, CreditCard, Gamepad2, Database,
} from 'lucide-react';

interface AdminUser {
    _id: string;
    username: string;
    permissions: string[];
    createdAt: string;
    updatedAt?: string;
}

const PERMISSION_ITEMS = [
    { key: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { key: 'info', label: 'ข้อมูลเว็บ (Info)', icon: Globe },
    { key: 'players', label: 'จัดการผู้เล่น (Players)', icon: Users },
    { key: 'server', label: 'Server Status', icon: Server },
    { key: 'launcher', label: 'Launcher', icon: Gamepad2 },
    { key: 'console', label: 'Console (RCON)', icon: Terminal },
    { key: 'wiki', label: 'Wiki', icon: BookOpen },
    { key: 'tickets', label: 'Support Tickets', icon: MessageSquareWarning },
    { key: 'packages', label: 'Point Packages', icon: Coins },
    { key: 'products', label: 'Store Products', icon: ShoppingBag },
    { key: 'users', label: 'User Balances', icon: UserCog },
    { key: 'transactions', label: 'Transactions', icon: ReceiptText },
    { key: 'payments', label: 'Payment Settings', icon: CreditCard },
    { key: 'database', label: 'Database / AuthMe', icon: Database },
    { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPermissionsPage() {
    const router = useRouter();
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

    // Form state
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formPermissions, setFormPermissions] = useState<string[]>(['dashboard']);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [modalProps, setModalProps] = useState({
        isOpen: false, title: '', message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') =>
        setModalProps({ isOpen: true, title, message, type, mode: 'alert', onConfirm: () => { } });

    const token = () => localStorage.getItem('adminToken') || '';

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin-users`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            const data = await res.json();
            if (data.success) setAdminUsers(data.users);
        } catch {
            showAlert('Error', 'Failed to load admin users', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Guard: only root can access
        try {
            const stored = localStorage.getItem('adminUser');
            if (!stored) { router.push('/admin'); return; }
            const parsed = JSON.parse(stored);
            if (!parsed.isRoot) { router.push('/admin'); return; }
        } catch {
            router.push('/admin');
            return;
        }
        fetchUsers();
    }, [fetchUsers, router]);

    const openAdd = () => {
        setFormUsername('');
        setFormPassword('');
        setFormPermissions(['dashboard']);
        setFormError('');
        setShowPassword(false);
        setShowAddModal(true);
    };

    const openEdit = (user: AdminUser) => {
        setEditUser(user);
        setFormUsername(user.username);
        setFormPassword('');
        setFormPermissions([...user.permissions]);
        setFormError('');
        setShowPassword(false);
    };

    const togglePermission = (key: string) => {
        setFormPermissions(prev =>
            prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
        );
    };

    const handleAdd = async () => {
        setFormError('');
        if (!formUsername.trim() || !formPassword.trim()) {
            setFormError('Username and password are required');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ username: formUsername.trim(), password: formPassword, permissions: formPermissions }),
            });
            const data = await res.json();
            if (data.success) {
                setShowAddModal(false);
                fetchUsers();
                showAlert('Success', `Admin user "${formUsername}" created successfully`, 'success');
            } else {
                setFormError(data.message || 'Failed to create user');
            }
        } catch {
            setFormError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!editUser) return;
        setFormError('');
        setSaving(true);
        try {
            const body: any = { permissions: formPermissions };
            if (formUsername.trim() && formUsername !== editUser.username) body.username = formUsername.trim();
            if (formPassword.trim()) body.password = formPassword.trim();

            const res = await fetch(`${API_URL}/api/admin-users/${editUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setEditUser(null);
                fetchUsers();
                showAlert('Success', 'Admin user updated successfully', 'success');
            } else {
                setFormError(data.message || 'Failed to update user');
            }
        } catch {
            setFormError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`${API_URL}/api/admin-users/${deleteTarget._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });
            const data = await res.json();
            if (data.success) {
                setDeleteTarget(null);
                fetchUsers();
                showAlert('Deleted', `Admin user "${deleteTarget.username}" has been removed`, 'success');
            } else {
                showAlert('Error', data.message || 'Failed to delete', 'error');
            }
        } catch {
            showAlert('Error', 'Network error', 'error');
        }
    };

    // ── Shared permission grid UI ─────────────────────────────────────────────
    const PermissionGrid = () => (
        <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
            {PERMISSION_ITEMS.map(({ key, label, icon: Icon }) => {
                const enabled = formPermissions.includes(key);
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${enabled
                            ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40 text-white'
                            : 'bg-white/3 border-white/8 text-gray-400 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${enabled ? 'text-[var(--primary)]' : 'text-gray-500'}`} />
                            <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-[var(--primary)]' : 'bg-white/20'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#121212] font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Admin Permissions</h1>
                            <p className="text-gray-400 text-sm">จัดการ admin users และสิทธิ์การเข้าถึง</p>
                        </div>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Admin
                    </button>
                </div>

                {/* Root info banner */}
                <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                        <span className="text-[var(--primary)] font-bold">Root admin</span> ถูกกำหนดจาก environment variables และมีสิทธิ์ทุกอย่างโดยอัตโนมัติ ไม่สามารถแก้ไขหรือลบได้จากที่นี่
                    </p>
                </div>

                {/* Admin users table */}
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--primary)]" />
                        </div>
                    ) : adminUsers.length === 0 ? (
                        <div className="py-16 text-center">
                            <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500">ยังไม่มี admin user เพิ่มเติม</p>
                            <p className="text-gray-600 text-sm mt-1">กด "Add Admin" เพื่อสร้าง admin user ใหม่</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-[#2a2a2a] text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium">Username</th>
                                    <th className="px-6 py-4 text-left font-medium">Permissions</th>
                                    <th className="px-6 py-4 text-left font-medium">Created</th>
                                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {adminUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-white/3 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                                    <span className="text-blue-400 text-xs font-bold uppercase">{user.username[0]}</span>
                                                </div>
                                                <span className="text-white font-medium">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.permissions.slice(0, 4).map(p => (
                                                    <span key={p} className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] text-xs rounded-full border border-[var(--primary)]/20">
                                                        {p}
                                                    </span>
                                                ))}
                                                {user.permissions.length > 4 && (
                                                    <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-full">
                                                        +{user.permissions.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(user)}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Add Admin Modal ───────────────────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[var(--primary)]" />
                                Add Admin User
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={e => setFormUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    placeholder="admin_username"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formPassword}
                                        onChange={e => setFormPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[var(--primary)] outline-none pr-10"
                                        placeholder="Min 6 characters"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Permissions ({formPermissions.length}/{PERMISSION_ITEMS.length})</label>
                                <PermissionGrid />
                            </div>
                            {formError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleAdd} disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Admin Modal ──────────────────────────────────────────── */}
            {editUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-blue-400" />
                                Edit: <span className="text-[var(--primary)]">{editUser.username}</span>
                            </h2>
                            <button onClick={() => setEditUser(null)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={e => setFormUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    New Password <span className="text-gray-500 text-xs">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formPassword}
                                        onChange={e => setFormPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[var(--primary)] outline-none pr-10"
                                        placeholder="Leave blank to keep current"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Permissions ({formPermissions.length}/{PERMISSION_ITEMS.length})</label>
                                <PermissionGrid />
                            </div>
                            {formError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setEditUser(null)}
                                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleEdit} disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-red-500/20 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">ลบ Admin User</h2>
                        </div>
                        <p className="text-gray-300 mb-6">
                            ต้องการลบ admin user <span className="text-red-400 font-bold">"{deleteTarget.username}"</span> หรือไม่?
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-all">
                                ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={modalProps.isOpen}
                onClose={() => setModalProps(p => ({ ...p, isOpen: false }))}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </div>
    );
}
