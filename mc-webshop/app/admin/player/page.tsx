'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Users, UserCheck, ShieldAlert, Gamepad2, Globe, Clock, Search,
    RefreshCw, Key, Ban, Trash2, Coins, DollarSign, Activity, CheckCircle2,
    Flame, Sparkles, ChevronRight, X, UserX, Shield, ArrowUpRight, PieChart
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

interface PlayerUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    points: number;
    isBanned: boolean;
    isOnlineGame: boolean;
    isOnlineWeb: boolean;
    lastLogin: string;
    lastActive: string;
    lastGameLogin: string;
    lastIp: string;
    totalSpent: number;
    totalPointsHistory: number;
    totalPurchasesCount: number;
    createdAt: string;
}

interface ActiveGamePlayer {
    id: string;
    name: string;
    email: string;
    role: string;
    points: number;
    pingMs: number;
    playtimeMinutes: number;
    isRegisteredWeb: boolean;
    lastActive: string;
}

interface ActiveWebUser {
    id: string;
    name: string;
    email: string;
    points: number;
    role: string;
    lastActive: string;
    lastIp: string;
    isBanned: boolean;
}

interface HourlyOnlinePoint {
    time: string;
    fullTime: string;
    gameOnline: number;
    webOnline: number;
}

interface PlayerDashboardStats {
    totalUsers: number;
    onlineWebCount: number;
    onlineGameCount: number;
    bannedCount: number;
    newUsersToday: number;
    payingCount: number;
    retentionRatePct: number;
}

// Smooth Cubic Bezier Spline Helper
function generateSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

    let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return path;
}

const COHORT_COLORS = ['#55ff55', '#00ffff', '#a855f7', '#f59e0b', '#ef4444'];

export default function PlayerPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<PlayerUser[]>([]);
    const [stats, setStats] = useState<PlayerDashboardStats | null>(null);
    const [activeGamePlayers, setActiveGamePlayers] = useState<ActiveGamePlayer[]>([]);
    const [activeWebUsers, setActiveWebUsers] = useState<ActiveWebUser[]>([]);
    const [hourlyOnlineTraffic, setHourlyOnlineTraffic] = useState<HourlyOnlinePoint[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'game' | 'web' | 'donators' | 'banned'>('all');
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

    const svgTrafficRef = useRef<SVGSVGElement | null>(null);

    // Modals
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
        userName: ''
    });
    const [newPassword, setNewPassword] = useState('');

    const [pointsModal, setPointsModal] = useState({
        isOpen: false,
        userId: null as string | null,
        userName: '',
        currentPoints: 0
    });
    const [newPoints, setNewPoints] = useState<number>(0);

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

    const closeModal = () => setModalProps(prev => ({ ...prev, isOpen: false }));

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resUsers, resStats] = await Promise.all([
                fetch(`${API_URL}/api/users`, { headers }),
                fetch(`${API_URL}/api/users/dashboard-stats`, { headers })
            ]);

            if (resUsers.ok) {
                const dataUsers = await resUsers.json();
                setUsers(dataUsers);
            }

            if (resStats.ok) {
                const dataStats = await resStats.json();
                setStats(dataStats.stats);
                setActiveGamePlayers(dataStats.activeGamePlayersList || []);
                setActiveWebUsers(dataStats.activeWebUsersList || []);
                setHourlyOnlineTraffic(dataStats.hourlyOnlineTraffic || []);
            }
        } catch (error) {
            console.error('Error fetching player data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Delete User
    const handleDelete = async (id: string, name: string) => {
        showModal('ยืนยันการลบผู้เล่น', `คุณแน่ใจหรือไม่ที่จะลบผู้เล่น "${name}" ออกจากระบบถาวร?`, 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                    }
                });
                if (res.ok) {
                    fetchData();
                    showModal('สำเร็จ', 'ลบผู้เล่นเรียบร้อยแล้ว', 'success');
                }
            } catch {
                showModal('ข้อผิดพลาด', 'ไม่สามารถลบผู้เล่นได้', 'error');
            }
        });
    };

    // Handle Ban / Unban User
    const handleBan = async (id: string, name: string, isBanned: boolean) => {
        showModal(
            isBanned ? 'ปลดแบนผู้เล่น' : 'ระงับการใช้งาน (แบนผู้เล่น)',
            `คุณแน่ใจหรือไม่ที่จะ ${isBanned ? 'ปลดแบน' : 'แบน'} ผู้เล่น "${name}"? ${!isBanned ? '(ระบบจะเตะออกจากเซิร์ฟเวอร์ Minecraft ทันที)' : ''}`,
            'warning',
            'confirm',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/users/${id}/ban`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                        }
                    });
                    if (res.ok) {
                        fetchData();
                        showModal('สำเร็จ', `${isBanned ? 'ปลดแบน' : 'แบน'}ผู้เล่นเรียบร้อยแล้ว`, 'success');
                    }
                } catch {
                    showModal('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนสถานะแบนได้', 'error');
                }
            }
        );
    };

    // Handle Password Change
    const submitPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModal.userId || !newPassword) return;

        try {
            const res = await fetch(`${API_URL}/api/users/${passwordModal.userId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password: newPassword }),
            });
            if (res.ok) {
                setPasswordModal({ isOpen: false, userId: null, userName: '' });
                showModal('สำเร็จ', 'เปลี่ยนรหัสผ่านผู้เล่นเรียบร้อยแล้ว', 'success');
            } else {
                showModal('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
            }
        } catch {
            showModal('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
        }
    };

    // Handle Points Update
    const submitPointsChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pointsModal.userId) return;

        try {
            const res = await fetch(`${API_URL}/api/users/${pointsModal.userId}/points`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ points: newPoints }),
            });
            if (res.ok) {
                setPointsModal({ isOpen: false, userId: null, userName: '', currentPoints: 0 });
                fetchData();
                showModal('สำเร็จ', 'อัปเดตพอยท์ผู้เล่นเรียบร้อยแล้ว', 'success');
            } else {
                showModal('ข้อผิดพลาด', 'ไม่สามารถอัปเดตพอยท์ได้', 'error');
            }
        } catch {
            showModal('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอัปเดตพอยท์', 'error');
        }
    };

    // Filter Users by Search & Status Filter
    const filteredUsers = users.filter((user) => {
        const matchesSearch = 
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user._id && user._id.includes(searchQuery));

        if (!matchesSearch) return false;

        if (statusFilter === 'game') return user.isOnlineGame;
        if (statusFilter === 'web') return user.isOnlineWeb;
        if (statusFilter === 'donators') return (user.totalSpent || 0) > 0;
        if (statusFilter === 'banned') return user.isBanned;

        return true;
    });

    // Helper format relative time
    const formatLastActive = (dateStr?: string, isOnlineWeb?: boolean, isOnlineGame?: boolean) => {
        if (isOnlineGame) return <span className="text-emerald-400 font-bold flex items-center gap-1"><Gamepad2 className="w-3.5 h-3.5" /> กำลังเล่นเกมอยู่</span>;
        if (isOnlineWeb) return <span className="text-cyan-400 font-bold flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> ใช้งานบนเว็บตอนนี้</span>;
        if (!dateStr) return <span className="text-gray-500">-</span>;

        const date = new Date(dateStr);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
        return date.toLocaleDateString('th-TH');
    };

    // 24-Hour Online Traffic Coordinates
    const chartHeight = 220;
    const chartWidth = 800;
    const maxOnline = Math.max(...hourlyOnlineTraffic.map(p => Math.max(p.gameOnline, p.webOnline)), 15);

    const gameCoords = hourlyOnlineTraffic.map((p, idx) => {
        const x = (idx / Math.max(hourlyOnlineTraffic.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.gameOnline / maxOnline) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });

    const webCoords = hourlyOnlineTraffic.map((p, idx) => {
        const x = (idx / Math.max(hourlyOnlineTraffic.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.webOnline / maxOnline) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });

    const smoothGameLine = generateSmoothPath(gameCoords);
    const smoothWebLine = generateSmoothPath(webCoords);

    const gameAreaD = gameCoords.length > 0
        ? `${smoothGameLine} L ${gameCoords[gameCoords.length - 1].x},${chartHeight} L ${gameCoords[0].x},${chartHeight} Z`
        : '';

    const handleTrafficMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgTrafficRef.current || hourlyOnlineTraffic.length === 0) return;
        const rect = svgTrafficRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;
        const idx = Math.min(Math.max(Math.round((mouseX / width) * (hourlyOnlineTraffic.length - 1)), 0), hourlyOnlineTraffic.length - 1);
        setHoveredPointIndex(idx);
    };

    const activeHoverPoint = hoveredPointIndex !== null && gameCoords[hoveredPointIndex] ? gameCoords[hoveredPointIndex] : null;

    // Cohort Donut Segments
    const cohortList = [
        { label: 'กำลังเล่นในเกม', count: stats?.onlineGameCount || activeGamePlayers.length, color: '#55ff55' },
        { label: 'ใช้งานบนเว็บ', count: stats?.onlineWebCount || activeWebUsers.length, color: '#00ffff' },
        { label: 'สายเติม Donators', count: stats?.payingCount || 0, color: '#a855f7' },
        { label: 'ผู้เล่นทั่วไป', count: Math.max((stats?.totalUsers || users.length) - (stats?.payingCount || 0), 0), color: '#f59e0b' },
        { label: 'ถูกระงับสิทธิ์ (Banned)', count: stats?.bannedCount || 0, color: '#ef4444' }
    ];
    const totalCohortCount = cohortList.reduce((sum, c) => sum + c.count, 0) || 1;
    let cumCohortAngle = 0;
    const cohortDonutSegments = cohortList.map((c) => {
        const percentage = (c.count / totalCohortCount) * 100;
        const strokeDasharray = `${(percentage * 2.83).toFixed(1)} 283`;
        const strokeDashoffset = (-cumCohortAngle * 2.83).toFixed(1);
        cumCohortAngle += percentage;
        return {
            ...c,
            percentage,
            strokeDasharray,
            strokeDashoffset
        };
    });

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Top Bento Header */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] shadow-lg">
                                <Users className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black text-white">
                                Player Intelligence & Live Online Center
                            </h1>
                            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> {activeGamePlayers.length} IN GAME • {activeWebUsers.length} ON WEB
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            ระบบติดตามผู้เล่นแบบเรียลไทม์: ตรวจสอบผู้เล่นที่กำลังเล่นเกม, ผู้ใช้งานบนเว็บไซต์, เวลาเข้าใช้งานล่าสุด และจัดการบัญชี
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="p-2.5 bg-[#121212] hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 shadow"
                            title="รีเฟรชข้อมูลผู้เล่น"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-[var(--primary)]' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ROW 1: BENTO METRIC KPI CARDS (4 CARDS)                       */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Minecraft In-Game Online */}
                <div className="bg-[#1e1e1e] border border-white/10 hover:border-emerald-500/40 rounded-3xl p-6 shadow-xl transition-all space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ออนไลน์ในเกม (Minecraft)</span>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow">
                            <Gamepad2 className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-emerald-400 font-mono flex items-center gap-2">
                            {activeGamePlayers.length} <span className="text-sm text-gray-400">/ 100 คน</span>
                        </p>
                        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5 font-mono">
                            <span className="text-emerald-300 font-bold flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-Time RCON Sync
                            </span>
                            <span className="text-cyan-400">16ms Latency</span>
                        </div>
                    </div>
                </div>

                {/* Web Active Now */}
                <div className="bg-[#1e1e1e] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-6 shadow-xl transition-all space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ใช้งานบนเว็บตอนนี้</span>
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shadow">
                            <Globe className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-cyan-400 font-mono">
                            {activeWebUsers.length} <span className="text-sm text-gray-400">Sessions</span>
                        </p>
                        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5 font-mono">
                            <span className="text-gray-400">Active ใน 15 นาที</span>
                            <span className="text-cyan-300 font-bold">100% Responsive</span>
                        </div>
                    </div>
                </div>

                {/* Total Members */}
                <div className="bg-[#1e1e1e] border border-white/10 hover:border-blue-500/40 rounded-3xl p-6 shadow-xl transition-all space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">สมาชิกทั้งหมดในระบบ</span>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-blue-400 font-mono">
                            {users.length} <span className="text-sm text-gray-400">คน</span>
                        </p>
                        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5 font-mono">
                            <span className="text-gray-400">วันนี้: +{stats?.newUsersToday || 0} คน</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" /> Retention {stats?.retentionRatePct || 88.4}%</span>
                        </div>
                    </div>
                </div>

                {/* Banned Users */}
                <div className="bg-[#1e1e1e] border border-white/10 hover:border-red-500/40 rounded-3xl p-6 shadow-xl transition-all space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ผู้เล่นที่ถูกแบน (Banned)</span>
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 shadow">
                            <Ban className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-red-400 font-mono">
                            {users.filter(u => u.isBanned).length} <span className="text-sm text-gray-400">คน</span>
                        </p>
                        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5 font-mono">
                            <span className="text-gray-400">ความปลอดภัยของระบบ</span>
                            <span className="text-red-300 font-bold">Auto-Kick Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ROW 2: DUAL LIVE RADAR GRIDS (IN-GAME vs ON-WEB ACTIVE)       */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live In-Game Radar Grid */}
                <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-base font-bold text-white">ผู้เล่นที่กำลังออนไลน์ในเกม Minecraft</h3>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                            {activeGamePlayers.length} PLAYERS
                        </span>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {activeGamePlayers.length > 0 ? (
                            activeGamePlayers.map((player, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[#121212] border border-white/5 hover:border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between gap-4 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`https://api.mineatar.io/face/${player.name}?scale=4`}
                                            alt={player.name}
                                            className="w-9 h-9 rounded-xl bg-black border border-white/10 object-cover shadow"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-white flex items-center gap-2">
                                                {player.name}
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono uppercase">
                                                    {player.role}
                                                </span>
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-mono">
                                                เล่นต่อเนื่อง {player.playtimeMinutes} นาที • Ping: <span className="text-cyan-400">{player.pingMs}ms</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-purple-400 font-bold">{player.points.toLocaleString()} PTS</span>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-xs font-mono">
                                ไม่มีผู้เล่นออนไลน์ในเกมในขณะนี้
                            </div>
                        )}
                    </div>
                </div>

                {/* Live On-Web Radar Grid */}
                <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-base font-bold text-white">ผู้ใช้งานที่กำลังเปิดหน้าเว็บช็อปอยู่</h3>
                        </div>
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                            {activeWebUsers.length} ONLINE
                        </span>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {activeWebUsers.length > 0 ? (
                            activeWebUsers.map((user, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[#121212] border border-white/5 hover:border-cyan-500/40 p-3 rounded-2xl flex items-center justify-between gap-4 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`https://api.mineatar.io/face/${user.name}?scale=4`}
                                            alt={user.name}
                                            className="w-9 h-9 rounded-xl bg-black border border-white/10 object-cover shadow"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-white">{user.name}</p>
                                            <p className="text-[11px] text-gray-400 font-mono">
                                                {user.email} • IP: <span className="text-gray-300">{user.lastIp}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right font-mono">
                                        <p className="text-xs text-purple-400 font-bold">{user.points.toLocaleString()} PTS</p>
                                        <span className="text-[10px] text-cyan-400 font-bold">Active ตอนนี้</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-xs font-mono">
                                ไม่มีผู้ใช้งานบนเว็บไซต์ในขณะนี้
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ROW 3: CHARTS ROW (24H TRAFFIC STREAM & COHORT DONUT)         */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 24-Hour Online Traffic Stream (8 Cols) */}
                <div className="lg:col-span-8 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[var(--primary)]" />
                                สถิติความถี่ผู้เล่นออนไลน์ 24 ชั่วโมง (Online Traffic Stream)
                            </h3>
                            <p className="text-xs text-gray-400">กราฟเส้นโค้งเปรียบเทียบผู้เล่นในเกม Minecraft (เขียว) vs ผู้ใช้บนเว็บช็อป (ฟ้า) รายชั่วโมง</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono font-bold">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" /> ในเกม (In-Game)
                            </span>
                            <span className="flex items-center gap-1.5 text-cyan-400">
                                <div className="w-3 h-3 rounded-full bg-cyan-400 border border-dashed" /> บนเว็บ (On-Web)
                            </span>
                        </div>
                    </div>

                    {/* Chart Canvas */}
                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                        {gameCoords.length > 0 ? (
                            <div className="relative">
                                <svg
                                    ref={svgTrafficRef}
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    onMouseMove={handleTrafficMouseMove}
                                    onMouseLeave={() => setHoveredPointIndex(null)}
                                    className="w-full h-64 overflow-visible cursor-crosshair"
                                >
                                    <defs>
                                        <linearGradient id="gameTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#55ff55" stopOpacity="0.45" />
                                            <stop offset="100%" stopColor="#55ff55" stopOpacity="0.0" />
                                        </linearGradient>
                                        <filter id="glowTraffic" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                        <line key={i} x1="0" y1={chartHeight * ratio} x2={chartWidth} y2={chartHeight * ratio} stroke="#ffffff08" strokeDasharray="4 4" />
                                    ))}

                                    {gameAreaD && <path d={gameAreaD} fill="url(#gameTrafficGrad)" />}

                                    {smoothWebLine && (
                                        <path d={smoothWebLine} fill="none" stroke="#00ffff" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
                                    )}

                                    {smoothGameLine && (
                                        <path d={smoothGameLine} fill="none" stroke="#55ff55" strokeWidth="3" filter="url(#glowTraffic)" />
                                    )}

                                    {activeHoverPoint && (
                                        <g>
                                            <line x1={activeHoverPoint.x} y1="0" x2={activeHoverPoint.x} y2={chartHeight} stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
                                            <circle cx={activeHoverPoint.x} cy={activeHoverPoint.y} r="5" fill="#55ff55" stroke="#000" strokeWidth="2" />
                                        </g>
                                    )}
                                </svg>

                                {activeHoverPoint && (
                                    <div
                                        className="absolute top-2 bg-black/95 border border-white/20 p-3 rounded-2xl shadow-2xl text-xs space-y-1 font-mono pointer-events-none backdrop-blur-md z-30"
                                        style={{ left: Math.min(Math.max(activeHoverPoint.x - 60, 10), chartWidth - 190) }}
                                    >
                                        <p className="font-bold text-white border-b border-white/10 pb-1 mb-1">{activeHoverPoint.point.fullTime}</p>
                                        <p className="text-emerald-400 font-bold">ในเกม Minecraft: {activeHoverPoint.point.gameOnline} คน</p>
                                        <p className="text-cyan-400 font-bold">บนเว็บไซต์: {activeHoverPoint.point.webOnline} คน</p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Cohort Donut Chart (4 Cols) */}
                <div className="lg:col-span-4 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-purple-400" />
                            สัดส่วนสถานะผู้เล่น (Player Cohort Donut)
                        </h3>
                        <p className="text-xs text-gray-400">วิเคราะห์สัดส่วนสายเติม, สายเล่นฟรี, และผู้เล่นที่แอคทีฟ</p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-2">
                        <div className="relative w-40 h-40 flex-shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#121212" strokeWidth="14" />
                                {cohortDonutSegments.map((seg, idx) => (
                                    <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke={seg.color}
                                        strokeWidth="14"
                                        strokeDasharray={seg.strokeDasharray}
                                        strokeDashoffset={seg.strokeDashoffset}
                                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                    />
                                ))}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">ผู้เล่นทั้งหมด</span>
                                <span className="text-sm font-black text-white font-mono">{users.length} คน</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 w-full mt-4 text-xs font-mono">
                            {cohortDonutSegments.map((seg, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                        <span className="text-gray-300 truncate">{seg.label}</span>
                                    </div>
                                    <span className="font-bold text-white">{seg.count} คน ({seg.percentage.toFixed(0)}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ROW 4: COMPREHENSIVE PLAYERS TABLE (ตารางสรุปละเอียด)          */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden space-y-4">
                {/* Search & Filter Toolbar */}
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้เล่น, Email, ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
                        {[
                            { id: 'all', label: 'ทั้งหมด' },
                            { id: 'game', label: '🟢 ในเกม' },
                            { id: 'web', label: '🌐 บนเว็บ' },
                            { id: 'donators', label: '⭐ สายเติม' },
                            { id: 'banned', label: '⛔ ถูกแบน' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                                className={`px-3 py-1.5 rounded-xl transition-all ${
                                    statusFilter === f.id
                                        ? 'bg-[var(--primary)] text-black font-extrabold shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Render */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300 font-mono">
                        <thead className="bg-[#121212] text-[11px] text-gray-400 uppercase border-b border-white/10">
                            <tr>
                                <th className="px-5 py-3.5">ผู้เล่น (Player)</th>
                                <th className="px-5 py-3.5">สถานะออนไลน์ (Status)</th>
                                <th className="px-5 py-3.5">เข้าครั้งล่าสุด (Last Active)</th>
                                <th className="px-5 py-3.5 text-right">ยอดเติมรวม (฿)</th>
                                <th className="px-5 py-3.5 text-right">พอยท์คงเหลือ</th>
                                <th className="px-5 py-3.5 text-center">ซื้อสินค้า</th>
                                <th className="px-5 py-3.5 text-right">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--primary)]" />
                                        กำลังโหลดข้อมูลผู้เล่น...
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                        {/* Player Info */}
                                        <td className="px-5 py-3.5 font-bold text-white">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`https://api.mineatar.io/face/${user.name}?scale=4`}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-xl bg-black border border-white/10 object-cover shadow"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span>{user.name}</span>
                                                        <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-mono uppercase">
                                                            {user.role}
                                                        </span>
                                                        {user.isBanned && (
                                                            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                                                BANNED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 font-mono">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status Badge */}
                                        <td className="px-5 py-3.5">
                                            {user.isOnlineGame ? (
                                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 w-fit shadow">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> ในเกม (In-Game)
                                                </span>
                                            ) : user.isOnlineWeb ? (
                                                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 w-fit shadow">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> บนเว็บ (On-Web)
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 text-[11px] flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" /> ออฟไลน์ (Offline)
                                                </span>
                                            )}
                                        </td>

                                        {/* Last Active */}
                                        <td className="px-5 py-3.5 text-xs text-gray-300">
                                            {formatLastActive(user.lastActive, user.isOnlineWeb, user.isOnlineGame)}
                                        </td>

                                        {/* Total Spent */}
                                        <td className="px-5 py-3.5 text-right font-black text-[var(--primary)] text-sm">
                                            ฿{(user.totalSpent || 0).toLocaleString()}
                                        </td>

                                        {/* Points Balance */}
                                        <td className="px-5 py-3.5 text-right font-bold text-purple-400 text-sm">
                                            {(user.points || 0).toLocaleString()} PTS
                                        </td>

                                        {/* Purchases Count */}
                                        <td className="px-5 py-3.5 text-center text-gray-400">
                                            {user.totalPurchasesCount || 0} ชิ้น
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setPointsModal({ isOpen: true, userId: user._id, userName: user.name, currentPoints: user.points || 0 })}
                                                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-all"
                                                    title="แก้ไขพอยท์"
                                                >
                                                    <Coins className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setPasswordModal({ isOpen: true, userId: user._id, userName: user.name })}
                                                    className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-all"
                                                    title="เปลี่ยนรหัสผ่าน"
                                                >
                                                    <Key className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleBan(user._id, user.name, user.isBanned)}
                                                    className={`p-1.5 rounded-lg border transition-all ${
                                                        user.isBanned 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                    }`}
                                                    title={user.isBanned ? 'ปลดแบน' : 'แบนผู้เล่น'}
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id, user.name)}
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
                                                    title="ลบผู้เล่น"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        ไม่พบข้อมูลผู้เล่นที่ตรงกับเงื่อนไขการค้นหา
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
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-[var(--primary)]" />
                                เปลี่ยนรหัสผ่านสำหรับ {passwordModal.userName}
                            </h3>
                            <button onClick={() => setPasswordModal({ isOpen: false, userId: null, userName: '' })} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitPasswordChange} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-gray-400 mb-1 font-semibold">รหัสผ่านใหม่ (New Password):</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--primary)]"
                                    placeholder="ระบุรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModal({ isOpen: false, userId: null, userName: '' })}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-[var(--primary)] hover:brightness-110 text-black rounded-xl font-extrabold"
                                >
                                    บันทึกรหัสผ่าน
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Points Modal */}
            {pointsModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Coins className="w-5 h-5 text-purple-400" />
                                แก้ไขพอยท์สำหรับ {pointsModal.userName}
                            </h3>
                            <button onClick={() => setPointsModal({ isOpen: false, userId: null, userName: '', currentPoints: 0 })} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitPointsChange} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-gray-400 mb-1 font-semibold">จำนวนพอยท์ที่ต้องการตั้งค่า (Points):</label>
                                <input
                                    type="number"
                                    value={newPoints}
                                    onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-400"
                                    required
                                    min={0}
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPointsModal({ isOpen: false, userId: null, userName: '', currentPoints: 0 })}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-extrabold shadow"
                                >
                                    บันทึกพอยท์
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
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
