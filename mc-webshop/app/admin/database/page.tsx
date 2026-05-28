'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Trash2, Search, CheckCircle, XCircle, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, Save, Zap, Users, UserCheck, UserPlus, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

interface AuthMeUser {
    id: number;
    username: string;
    realname: string;
    ip: string;
    email: string;
    isLogged: number;
    hasSession: number;
    regdate: number;
    lastlogin: number;
}

interface AuthMeConfig {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    table: string;
}

interface AuthMeStats {
    totalUsers: number;
    loggedInUsers: number;
    recentRegistrations: number;
}

export default function AdminDatabasePage() {
    // Config state
    const [config, setConfig] = useState<AuthMeConfig>({
        host: '',
        port: '3306',
        user: '',
        password: '',
        database: '',
        table: 'authme',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);

    // Connection test state
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState('');

    // Users table state
    const [users, setUsers] = useState<AuthMeUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Stats state
    const [stats, setStats] = useState<AuthMeStats>({ totalUsers: 0, loggedInUsers: 0, recentRegistrations: 0 });

    // Sync state
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; failed: number } | null>(null);

    // Modal
    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({ isOpen: true, title, message, type, mode, onConfirm: onConfirm || (() => { }) });
    };

    const closeModal = () => setModalProps(prev => ({ ...prev, isOpen: false }));

    const getToken = () => localStorage.getItem('adminToken');

    // Fetch config
    const fetchConfig = useCallback(async () => {
        setConfigLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/authme/config`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setConfig(prev => ({
                        ...prev,
                        host: data.config.host || '',
                        port: data.config.port || '3306',
                        user: data.config.user || '',
                        database: data.config.database || '',
                        table: data.config.table || 'authme',
                    }));
                }
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Error fetching AuthMe config:', error);
        } finally {
            setConfigLoading(false);
        }
    }, []);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (search) params.set('search', search);

            const res = await fetch(`${API_URL}/api/admin/authme/users?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setTotalUsers(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching AuthMe users:', error);
        } finally {
            setUsersLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);
    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Save config
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfigSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/authme/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (res.ok) {
                showModal('สำเร็จ', 'บันทึกการตั้งค่า MySQL สำเร็จ', 'success');
                fetchConfig();
                fetchUsers();
            } else {
                showModal('Error', data.message || 'Failed to save config', 'error');
            }
        } catch (error) {
            showModal('Error', 'Failed to save config', 'error');
        } finally {
            setConfigSaving(false);
        }
    };

    // Test connection
    const handleTestConnection = async () => {
        setConnectionStatus('testing');
        setConnectionMessage('');
        try {
            const res = await fetch(`${API_URL}/api/admin/authme/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setConnectionStatus('success');
                setConnectionMessage(data.message || 'เชื่อมต่อสำเร็จ!');
            } else {
                setConnectionStatus('error');
                setConnectionMessage(data.message || 'เชื่อมต่อไม่สำเร็จ');
            }
        } catch (error) {
            setConnectionStatus('error');
            setConnectionMessage('Network error');
        }
    };

    // Search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput);
    };

    // Delete user
    const handleDeleteUser = (username: string) => {
        showModal(
            'ยืนยันการลบ',
            `ต้องการลบผู้ใช้ "${username}" ออกจาก AuthMe หรือไม่? (ผู้ใช้จะไม่สามารถเข้าเซิร์ฟเวอร์ Minecraft ได้จนกว่าจะสมัครใหม่)`,
            'warning',
            'confirm',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/admin/authme/users/${encodeURIComponent(username)}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${getToken()}` },
                    });
                    if (res.ok) {
                        showModal('สำเร็จ', `ลบผู้ใช้ "${username}" จาก AuthMe แล้ว`, 'success');
                        fetchUsers();
                        fetchConfig();
                    } else {
                        const data = await res.json();
                        showModal('Error', data.message || 'Failed to delete user', 'error');
                    }
                } catch (error) {
                    showModal('Error', 'Failed to delete user', 'error');
                }
            }
        );
    };

    // Sync
    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/authme/sync`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (res.ok) {
                setSyncResult(data);
                showModal('Sync สำเร็จ', `Synced: ${data.synced} | Skipped: ${data.skipped} | Failed: ${data.failed}`, 'success');
                fetchUsers();
                fetchConfig();
            } else {
                showModal('Error', data.message || 'Sync failed', 'error');
            }
        } catch (error) {
            showModal('Error', 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const totalPages = Math.ceil(totalUsers / limit);

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '-';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />

            <div className="flex items-center gap-3 mb-8">
                <Database className="w-8 h-8 text-[var(--primary)]" />
                <h1 className="text-3xl font-bold">AuthMe Database</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#1e1e1e] rounded-2xl p-5 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-400">จำนวนผู้ใช้ทั้งหมด</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="bg-[#1e1e1e] rounded-2xl p-5 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-sm text-gray-400">กำลังออนไลน์</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.loggedInUsers.toLocaleString()}</p>
                </div>
                <div className="bg-[#1e1e1e] rounded-2xl p-5 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-400">สมัครใหม่ (7 วัน)</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.recentRegistrations.toLocaleString()}</p>
                </div>
            </div>

            {/* MySQL Config Form */}
            <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl mb-8">
                <h2 className="text-xl font-bold mb-6 text-[var(--primary)] flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    MySQL Connection Settings
                </h2>

                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm ${connectionStatus === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
                        connectionStatus === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                            'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                        }`}>
                        {connectionStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {connectionStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                        {connectionStatus === 'error' && <XCircle className="w-4 h-4" />}
                        {connectionMessage || 'กำลังทดสอบการเชื่อมต่อ...'}
                    </div>
                )}

                <form onSubmit={handleSaveConfig}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Host</label>
                            <input
                                type="text"
                                value={config.host}
                                onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="127.0.0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Port</label>
                            <input
                                type="text"
                                value={config.port}
                                onChange={e => setConfig(prev => ({ ...prev, port: e.target.value }))}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="3306"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                            <input
                                type="text"
                                value={config.user}
                                onChange={e => setConfig(prev => ({ ...prev, user: e.target.value }))}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="root"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={config.password}
                                    onChange={e => setConfig(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Database</label>
                            <input
                                type="text"
                                value={config.database}
                                onChange={e => setConfig(prev => ({ ...prev, database: e.target.value }))}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="cobblemon_kati"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Table</label>
                            <input
                                type="text"
                                value={config.table}
                                onChange={e => setConfig(prev => ({ ...prev, table: e.target.value }))}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                placeholder="authme"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={configSaving}
                            className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-[var(--primary)]/20 disabled:opacity-50"
                        >
                            {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {configSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </button>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={connectionStatus === 'testing'}
                            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                        >
                            {connectionStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            ทดสอบการเชื่อมต่อ
                        </button>
                    </div>
                </form>
            </div>

            {/* Sync Section */}
            <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-[var(--primary)]" />
                            Sync ผู้ใช้จากเว็บไปยัง AuthMe
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Sync จะตรวจสอบผู้ใช้ทั้งหมดที่สมัครบนเว็บ แล้วเพิ่มเข้า AuthMe Database สำหรับผู้ที่ยังไม่มี
                        </p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {syncing ? 'กำลัง Sync...' : 'Sync ทั้งหมด'}
                    </button>
                </div>
                {syncResult && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-400">{syncResult.synced}</p>
                            <p className="text-xs text-green-400/70">Synced</p>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{syncResult.skipped}</p>
                            <p className="text-xs text-yellow-400/70">Skipped</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-red-400">{syncResult.failed}</p>
                            <p className="text-xs text-red-400/70">Failed</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-[var(--primary)] flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        AuthMe Users ({totalUsers.toLocaleString()})
                    </h2>

                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none w-56"
                                placeholder="ค้นหา username..."
                            />
                        </div>
                        <button type="submit" className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
                            ค้นหา
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/5 text-gray-400">
                                <th className="text-left px-4 py-3 font-medium">ID</th>
                                <th className="text-left px-4 py-3 font-medium">Username</th>
                                <th className="text-left px-4 py-3 font-medium">Email</th>
                                <th className="text-left px-4 py-3 font-medium">IP</th>
                                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                                <th className="text-left px-4 py-3 font-medium">วันที่สมัคร</th>
                                <th className="text-left px-4 py-3 font-medium">เข้าล่าสุด</th>
                                <th className="text-center px-4 py-3 font-medium">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {usersLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-500 mb-2" />
                                        <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12">
                                        <Database className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-sm">
                                            {search ? `ไม่พบผู้ใช้ที่ตรงกับ "${search}"` : 'ไม่พบข้อมูลในตาราง AuthMe'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{user.id}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-white">{user.realname || user.username}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{user.email || '-'}</td>
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{user.ip || '-'}</td>
                                        <td className="px-4 py-3">
                                            {user.isLogged ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                                    Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(user.regdate)}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(user.lastlogin)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleDeleteUser(user.username)}
                                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="ลบผู้ใช้"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <p className="text-sm text-gray-500">
                            หน้า {page} จาก {totalPages} ({totalUsers.toLocaleString()} รายการ)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                ก่อนหน้า
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                ถัดไป
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
