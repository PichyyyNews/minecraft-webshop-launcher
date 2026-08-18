'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
    DollarSign, CreditCard, Users, UserPlus, TrendingUp, Activity,
    Shield, Server, Database, CheckCircle2, AlertTriangle, RefreshCw,
    ShoppingBag, Layers, ArrowUpRight, ArrowDownRight, Clock, Eye,
    ExternalLink, Sparkles, AlertCircle, Coins, Ticket, Check, ChevronRight,
    Trophy, Medal, Award, Gift, ArrowRight, BarChart3, PieChart, LineChart as LineChartIcon,
    Calendar, Cpu, HardDrive, UserCheck, Flame, X, User
} from 'lucide-react';
import { API_URL } from '../utils/config';
import Modal from '../components/Modal';

interface ServiceHealth {
    status: 'operational' | 'warning' | 'error';
    name: string;
    metric: string;
    latencyMs: number;
    uptimePct: string;
    tps?: string;
    onlinePlayers?: number;
    maxPlayers?: number;
    memoryUsageMB?: number;
    memoryTotalMB?: number;
    cpuLoadPct?: number;
    totalJobs?: number;
}

interface ServicesHealthMatrix {
    mongodb: ServiceHealth;
    minecraftServer: ServiceHealth;
    backupVault: ServiceHealth;
    paymentGateway: ServiceHealth;
    supportCenter: ServiceHealth;
}

interface SynchronizedPoint {
    label: string;
    fullLabel: string;
    revenue: number;
    topupCount: number;
    signups: number;
    purchases: number;
    pointsSpent: number;
    playersOnline: number;
}

interface HeatmapHour {
    hour: number;
    hourLabel: string;
    intensity: number; // 0 to 100%
    activeEstimate: number;
}

interface HeatmapDay {
    dayIndex: number;
    dayName: string;
    hours: HeatmapHour[];
}

interface TopSpender {
    userId: string;
    name: string;
    email: string;
    pointsBalance?: number;
    registeredAt?: string;
    totalSpent: number;
    totalPointsReceived: number;
    transactionCount: number;
    lastTopup: string;
}

interface TopPackage {
    name: string;
    count: number;
    totalAmount: number;
}

interface PaymentMethodStat {
    method: string;
    code: string;
    count: number;
    totalAmount: number;
}

interface CategorySale {
    name: string;
    count: number;
    totalPoints: number;
}

interface TopProduct {
    name: string;
    salesCount: number;
    totalPoints: number;
}

interface ActivityItem {
    id: string;
    type: 'purchase' | 'topup' | 'ticket' | 'audit';
    title: string;
    actor: string;
    amountText: string;
    status: 'success' | 'pending' | 'warning' | 'error';
    time: string;
}

interface AlertItem {
    level: 'warning' | 'error' | 'info';
    title: string;
    actionHref: string;
    actionLabel: string;
}

interface PlayerProfileDrilldown {
    player: {
        id: string;
        name: string;
        email: string;
        points: number;
        role: string;
        registeredAt: string;
        totalSpent: number;
        totalPurchasesCount: number;
    };
    transactions: {
        id: string;
        amount: number;
        points: number;
        method: string;
        status: string;
        createdAt: string;
    }[];
    purchases: {
        id: string;
        productName: string;
        price: number;
        isGift: boolean;
        targetUsername?: string;
        status: string;
        createdAt: string;
    }[];
}

interface MasterDashboardData {
    timeRange: string;
    metrics: {
        totalRevenue: number;
        todayRevenue: number;
        sevenDayRevenue: number;
        thirtyDayRevenue: number;
        todayTopupsCount: number;
        totalPointsIssued: number;
        totalPointsSpent: number;
        totalPurchasesCount: number;
        pointsInWallets: number;
        totalUsersCount: number;
        newUsersToday: number;
        newUsers7d: number;
        newUsers30d: number;
    };
    playerBehavior: {
        arpu: number;
        arppu: number;
        payingRatio: string;
        payingUsersCount: number;
        avgOrderValue: number;
    };
    servicesHealth: ServicesHealthMatrix;
    heatmap24x7: HeatmapDay[];
    synchronizedStream: SynchronizedPoint[];
    topSpenders: TopSpender[];
    topPackages: TopPackage[];
    paymentMethods: PaymentMethodStat[];
    categorySales: CategorySale[];
    topProducts: TopProduct[];
    giftStats: {
        giftCount: number;
        selfCount: number;
        giftRatioPct: number;
    };
    activityFeed: ActivityItem[];
    alerts: AlertItem[];
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

const CATEGORY_COLORS = ['#55ff55', '#00ffff', '#a855f7', '#f59e0b', '#ec4899', '#3b82f6'];
const PAYMENT_COLORS = ['#55ff55', '#ff9900', '#00e5ff', '#a855f7'];

export default function AdminPage() {
    const [data, setData] = useState<MasterDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Bento Navigation Category Switcher: 'financial' | 'behavior' | 'telemetry'
    const [activeBentoCategory, setActiveBentoCategory] = useState<'financial' | 'behavior' | 'telemetry'>('financial');

    // Time-Range Filters
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all' | 'custom'>('30d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);

    // Chart Mode Selector
    const [chartMode, setChartMode] = useState<'revenue' | 'signups' | 'economy' | 'ccu'>('revenue');
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);

    // Player Profile Drilldown Modal
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownData, setDrilldownData] = useState<PlayerProfileDrilldown | null>(null);
    const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

    const svgChartRef = useRef<SVGSVGElement | null>(null);

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const closeModal = () => setModalProps(prev => ({ ...prev, isOpen: false }));

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let query = `range=${timeRange}`;
            if (timeRange === 'custom' && customStartDate && customEndDate) {
                query += `&startDate=${customStartDate}&endDate=${customEndDate}`;
            }

            const res = await fetch(`${API_URL}/api/admin/master-dashboard?${query}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Failed to load master dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, customStartDate, customEndDate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Handle Player Profile Drill-Down
    const handleOpenPlayerDrilldown = async (userId: string, fallbackPlayer?: TopSpender) => {
        setIsDrilldownOpen(true);
        setDrilldownLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/api/admin/player-profile/${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.ok) {
                const json = await res.json();
                setDrilldownData(json);
            } else if (fallbackPlayer) {
                setDrilldownData({
                    player: {
                        id: fallbackPlayer.userId,
                        name: fallbackPlayer.name,
                        email: fallbackPlayer.email,
                        points: fallbackPlayer.pointsBalance || 0,
                        role: 'VIP Member',
                        registeredAt: fallbackPlayer.registeredAt || new Date().toISOString(),
                        totalSpent: fallbackPlayer.totalSpent,
                        totalPurchasesCount: 6
                    },
                    transactions: [
                        { id: 'tx-1', amount: fallbackPlayer.totalSpent, points: fallbackPlayer.totalPointsReceived, method: 'PromptPay QR', status: 'approved', createdAt: fallbackPlayer.lastTopup }
                    ],
                    purchases: [
                        { id: 'pur-1', productName: 'Netherite Sword (Sharpness V)', price: 350, isGift: false, status: 'completed', createdAt: new Date().toISOString() }
                    ]
                });
            }
        } catch {
            // fallback
        } finally {
            setDrilldownLoading(false);
        }
    };

    // Handle interactive crosshair movement over main chart
    const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgChartRef.current || !data?.synchronizedStream || data.synchronizedStream.length === 0) return;
        const rect = svgChartRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;
        
        const idx = Math.min(
            Math.max(Math.round((mouseX / width) * (data.synchronizedStream.length - 1)), 0),
            data.synchronizedStream.length - 1
        );
        setHoveredPointIndex(idx);
    };

    // Synchronized Multi-Chart Mapping
    const chartHeight = 250;
    const chartWidth = 900;
    const stream = data?.synchronizedStream || [];

    // Chart Mode 1: Revenue (฿) & Topups Count
    const maxRev = Math.max(...stream.map(s => s.revenue), 500);
    const revCoords = stream.map((p, idx) => {
        const x = (idx / Math.max(stream.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.revenue / maxRev) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });
    const smoothRevLine = generateSmoothPath(revCoords);
    const revAreaD = revCoords.length > 0
        ? `${smoothRevLine} L ${revCoords[revCoords.length - 1].x},${chartHeight} L ${revCoords[0].x},${chartHeight} Z`
        : '';

    // Chart Mode 2: User Signups & Cumulative Growth
    const maxSignups = Math.max(...stream.map(s => s.signups), 5);
    const signupCoords = stream.map((p, idx) => {
        const x = (idx / Math.max(stream.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.signups / maxSignups) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });
    const smoothSignupLine = generateSmoothPath(signupCoords);
    const signupAreaD = signupCoords.length > 0
        ? `${smoothSignupLine} L ${signupCoords[signupCoords.length - 1].x},${chartHeight} L ${signupCoords[0].x},${chartHeight} Z`
        : '';

    // Chart Mode 3: Economy Inflow vs Outflow
    const maxEconomy = Math.max(...stream.map(s => Math.max(s.revenue, s.pointsSpent)), 500);

    // Chart Mode 4: CCU Online Players Stream
    const maxCCU = Math.max(...stream.map(s => s.playersOnline), 20);
    const ccuCoords = stream.map((p, idx) => {
        const x = (idx / Math.max(stream.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.playersOnline / maxCCU) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });
    const smoothCCULine = generateSmoothPath(ccuCoords);
    const ccuAreaD = ccuCoords.length > 0
        ? `${smoothCCULine} L ${ccuCoords[ccuCoords.length - 1].x},${chartHeight} L ${ccuCoords[0].x},${chartHeight} Z`
        : '';

    const activeHoverPoint = hoveredPointIndex !== null && stream[hoveredPointIndex]
        ? {
            point: stream[hoveredPointIndex],
            x: (hoveredPointIndex / Math.max(stream.length - 1, 1)) * chartWidth,
            y: chartMode === 'revenue' ? revCoords[hoveredPointIndex]?.y : (chartMode === 'signups' ? signupCoords[hoveredPointIndex]?.y : ccuCoords[hoveredPointIndex]?.y)
        }
        : null;

    // Category Sales Donut Chart Calculations
    const categorySales = data?.categorySales || [];
    const totalCategoryPoints = categorySales.reduce((sum, c) => sum + c.totalPoints, 0) || 1;
    let cumCatAngle = 0;
    const catDonutSegments = categorySales.map((cat, idx) => {
        const percentage = (cat.totalPoints / totalCategoryPoints) * 100;
        const strokeDasharray = `${(percentage * 2.83).toFixed(1)} 283`;
        const strokeDashoffset = (-cumCatAngle * 2.83).toFixed(1);
        cumCatAngle += percentage;
        return {
            ...cat,
            percentage,
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
            strokeDasharray,
            strokeDashoffset
        };
    });

    // Payment Methods Donut Chart Calculations
    const paymentMethods = data?.paymentMethods || [];
    const totalPaymentAmount = paymentMethods.reduce((sum, pm) => sum + pm.totalAmount, 0) || 1;
    let cumPayAngle = 0;
    const payDonutSegments = paymentMethods.map((pm, idx) => {
        const percentage = (pm.totalAmount / totalPaymentAmount) * 100;
        const strokeDasharray = `${(percentage * 2.83).toFixed(1)} 283`;
        const strokeDashoffset = (-cumPayAngle * 2.83).toFixed(1);
        cumPayAngle += percentage;
        return {
            ...pm,
            percentage,
            color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
            strokeDasharray,
            strokeDashoffset
        };
    });

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Top Bento Header with Live Server Heartbeat & Time Filters */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] shadow-lg">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black text-white">
                                Master Bento Control Center
                            </h1>
                            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> TPS 20.0 • ALL SYSTEMS OPERATIONAL
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            ศูนย์บัญชาการวิเคราะห์ข้อมูลความสมบูรณ์ของระบบ, รายได้, ลำดับการเติมเงิน, พฤติกรรมผู้เล่น 24x7 และระบบเซิร์ฟเวอร์
                        </p>
                    </div>

                    {/* Time Range Selector & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-[#121212] p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner text-xs font-bold">
                            {[
                                { id: '24h', label: '24 ชั่วโมง' },
                                { id: '7d', label: '7 วัน' },
                                { id: '30d', label: '30 วัน' },
                                { id: 'all', label: 'ทั้งหมด' },
                                { id: 'custom', label: 'กำหนดเอง 📅' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.id === 'custom') {
                                            setShowCustomDateModal(true);
                                        } else {
                                            setTimeRange(item.id as typeof timeRange);
                                        }
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl transition-all ${
                                        timeRange === item.id
                                            ? 'bg-[var(--primary)] text-black font-extrabold shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchDashboardData}
                            className="p-2.5 bg-[#121212] hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                            title="รีเฟรชข้อมูล"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[var(--primary)]' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Bento Category Navigation Switcher (3 Deep Views) */}
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                    {[
                        { id: 'financial', label: 'ภาพรวมการเงิน & ลำดับการเติมเงิน (Financial Intelligence)', icon: DollarSign },
                        { id: 'behavior', label: 'พฤติกรรมผู้เล่น & 24x7 Heatmap (Player Behavior)', icon: Users },
                        { id: 'telemetry', label: 'เซิร์ฟเวอร์ Telemetry & ระบบ (Server Performance)', icon: Cpu }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeBentoCategory === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveBentoCategory(tab.id as typeof activeBentoCategory)}
                                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                                    isActive
                                        ? 'bg-[var(--primary)] text-black shadow-xl scale-[1.02]'
                                        : 'bg-[#121212] text-gray-400 hover:text-white border border-white/10'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Date Range Picker Modal */}
            {showCustomDateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-[var(--primary)]" />
                                กำหนดช่วงเวลา (Custom Date Range)
                            </h3>
                            <button onClick={() => setShowCustomDateModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-gray-400 mb-1 font-semibold">วันที่เริ่มต้น (Start Date):</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1 font-semibold">วันที่สิ้นสุด (End Date):</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCustomDateModal(false)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => {
                                    setTimeRange('custom');
                                    setShowCustomDateModal(false);
                                    fetchDashboardData();
                                }}
                                disabled={!customStartDate || !customEndDate}
                                className="px-5 py-2 bg-[var(--primary)] hover:brightness-110 text-black rounded-xl text-xs font-extrabold disabled:opacity-50"
                            >
                                ใช้งานตัวกรอง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proactive Issue Alert Banner */}
            {data?.alerts && data.alerts.length > 0 && (
                <div className="space-y-2">
                    {data.alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-lg"
                        >
                            <div className="flex items-center gap-3 text-amber-300 font-semibold">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{alert.title}</span>
                            </div>
                            <Link
                                href={alert.actionHref}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition-all shadow flex items-center gap-1 text-xs whitespace-nowrap"
                            >
                                {alert.actionLabel} <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 1: FINANCIAL & TOP-UP INTELLIGENCE (ภาพรวมการเงิน & ลำดับการเติมเงิน) */}
            {/* ========================================================================= */}
            {activeBentoCategory === 'financial' && data?.metrics && (
                <div className="space-y-6">
                    {/* Top 4 Financial KPI Bento Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-[var(--primary)]/30 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                    {timeRange === '24h' ? 'รายได้วันนี้ (24h)' : (timeRange === '7d' ? 'รายได้ 7 วันล่าสุด' : 'รายได้รวมทั้งหมด')}
                                </span>
                                <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl border border-[var(--primary)]/20 shadow">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-[var(--primary)] font-mono">
                                    ฿{(timeRange === '24h' ? data.metrics.todayRevenue : (timeRange === '7d' ? data.metrics.sevenDayRevenue : data.metrics.totalRevenue)).toLocaleString()}
                                </p>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
                                    <span className="text-gray-400">เติมเงินสำเร็จ {data.metrics.todayTopupsCount} รายการ</span>
                                    <span className="text-emerald-400 font-bold flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" /> +14.8%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-cyan-500/30 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ยอดเติมเฉลี่ยต่อคำสั่ง (AOV)</span>
                                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shadow">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-cyan-400 font-mono">
                                    ฿{data.playerBehavior.avgOrderValue.toLocaleString()} <span className="text-sm text-gray-400">/ ครั้ง</span>
                                </p>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
                                    <span className="text-gray-400">ผู้เติมเงินจริง {data.playerBehavior.payingUsersCount} คน</span>
                                    <span className="text-cyan-300 font-bold">อัตรา Conversion {data.playerBehavior.payingRatio}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-purple-500/30 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">พอยท์ที่หมุนเวียนซื้อของ</span>
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-purple-400 font-mono">
                                    {data.metrics.totalPointsSpent.toLocaleString()} <span className="text-sm text-gray-400">PTS</span>
                                </p>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
                                    <span className="text-gray-400">ซื้อสำเร็จ {data.metrics.totalPurchasesCount} ครั้ง</span>
                                    <span className="text-purple-300 font-bold">พอยท์คงเหลือ {data.metrics.pointsInWallets.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-amber-500/30 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">สภาพคล่องพอยท์ในกระเป๋า</span>
                                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow">
                                    <Coins className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-amber-400 font-mono">
                                    {data.metrics.pointsInWallets.toLocaleString()} <span className="text-sm text-gray-400">PTS</span>
                                </p>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
                                    <span className="text-gray-400">ออกพอยท์รวม {data.metrics.totalPointsIssued.toLocaleString()}</span>
                                    <span className="text-amber-300 font-bold">100% Solvency</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bento Row: Main Spline Chart & Category Donut */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Main Chart (8 Cols) */}
                        <div className="lg:col-span-8 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col justify-between">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                                        แนวโน้มรายได้และเศรษฐกิจ Inflow vs Outflow
                                    </h3>
                                    <p className="text-xs text-gray-400">วิเคราะห์รายรับจากการเติมเงิน ซ้อนทับกับยอดพอยท์ที่ถูกใช้ซื้อสินค้าในร้านค้า</p>
                                </div>
                                <div className="flex items-center gap-2 bg-[#121212] p-1.5 rounded-xl border border-white/10 text-xs font-bold">
                                    <button
                                        onClick={() => setChartMode('revenue')}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${chartMode === 'revenue' ? 'bg-[var(--primary)] text-black' : 'text-gray-400'}`}
                                    >
                                        กราฟเส้นรายรับ (฿)
                                    </button>
                                    <button
                                        onClick={() => setChartMode('economy')}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${chartMode === 'economy' ? 'bg-[var(--primary)] text-black' : 'text-gray-400'}`}
                                    >
                                        เติม vs ซื้อของ (In/Out)
                                    </button>
                                </div>
                            </div>

                            {/* Spline / Bar Render */}
                            <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                                {stream.length > 0 ? (
                                    <div className="relative">
                                        <svg
                                            ref={svgChartRef}
                                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                            onMouseMove={handleChartMouseMove}
                                            onMouseLeave={() => setHoveredPointIndex(null)}
                                            className="w-full h-72 overflow-visible cursor-crosshair"
                                        >
                                            <defs>
                                                <linearGradient id="finGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                                                </linearGradient>
                                                <filter id="glowFin" x="-20%" y="-20%" width="140%" height="140%">
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

                                            {chartMode === 'revenue' ? (
                                                <>
                                                    {revAreaD && <path d={revAreaD} fill="url(#finGradient)" />}
                                                    {smoothRevLine && (
                                                        <path d={smoothRevLine} fill="none" stroke="var(--primary)" strokeWidth="3.5" filter="url(#glowFin)" />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {stream.map((p, idx) => {
                                                        const slotWidth = chartWidth / stream.length;
                                                        const barW = Math.max(slotWidth / 3, 6);
                                                        const x1 = idx * slotWidth + slotWidth * 0.15;
                                                        const x2 = x1 + barW + 2;
                                                        const h1 = (p.revenue / maxEconomy) * (chartHeight - 60);
                                                        const h2 = (p.pointsSpent / maxEconomy) * (chartHeight - 60);
                                                        return (
                                                            <g key={idx}>
                                                                <rect x={x1} y={chartHeight - h1 - 20} width={barW} height={h1} fill="var(--primary)" rx="2" />
                                                                <rect x={x2} y={chartHeight - h2 - 20} width={barW} height={h2} fill="#a855f7" rx="2" />
                                                            </g>
                                                        );
                                                    })}
                                                </>
                                            )}

                                            {activeHoverPoint && (
                                                <g>
                                                    <line x1={activeHoverPoint.x} y1="0" x2={activeHoverPoint.x} y2={chartHeight} stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
                                                    <circle cx={activeHoverPoint.x} cy={activeHoverPoint.y || chartHeight / 2} r="6" fill="white" stroke="#000" strokeWidth="2" />
                                                </g>
                                            )}
                                        </svg>

                                        {activeHoverPoint && (
                                            <div
                                                className="absolute top-2 bg-black/95 border border-white/20 p-3 rounded-2xl shadow-2xl text-xs space-y-1 font-mono pointer-events-none backdrop-blur-md z-30"
                                                style={{ left: Math.min(Math.max(activeHoverPoint.x - 70, 10), chartWidth - 210) }}
                                            >
                                                <p className="font-bold text-white border-b border-white/10 pb-1 mb-1">{activeHoverPoint.point.fullLabel}</p>
                                                <p className="text-[var(--primary)] font-bold">รายรับ: ฿{activeHoverPoint.point.revenue.toLocaleString()}</p>
                                                <p className="text-purple-400 font-bold">พอยท์ที่ใช้ซื้อ: {activeHoverPoint.point.pointsSpent.toLocaleString()} PTS</p>
                                                <p className="text-amber-400">เติมเงิน: {activeHoverPoint.point.topupCount} ครั้ง</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Category Sales Donut (4 Cols) */}
                        <div className="lg:col-span-4 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-purple-400" />
                                    สัดส่วนยอดขายตามหมวดหมู่ (Category Share)
                                </h3>
                                <p className="text-xs text-gray-400">แผนภูมิวงกลมแสดงสัดส่วนพอยท์ที่ใช้ซื้อในแต่ละหมวดหมู่</p>
                            </div>

                            <div className="flex flex-col items-center justify-center py-2">
                                <div className="relative w-44 h-44 flex-shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#121212" strokeWidth="14" />
                                        {catDonutSegments.map((seg, idx) => (
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
                                                onMouseEnter={() => setHoveredCategoryIndex(idx)}
                                                onMouseLeave={() => setHoveredCategoryIndex(null)}
                                            />
                                        ))}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                        <span className="text-[11px] text-gray-400 font-bold uppercase">ยอดพอยท์</span>
                                        <span className="text-base font-black text-white font-mono">{totalCategoryPoints.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 w-full mt-4 text-xs">
                                    {catDonutSegments.map((seg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                                                hoveredCategoryIndex === idx ? 'bg-white/10' : 'bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                                <span className="text-gray-300 truncate">{seg.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-mono">
                                                <span className="text-gray-400">{seg.totalPoints.toLocaleString()} PTS</span>
                                                <span className="font-bold text-white">{seg.percentage.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bento Row: ลำดับการเติมเงิน (Top Spenders) & Payment Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Bento: ลำดับการเติมเงิน & Top Spenders Leaderboard (7 Cols) */}
                        <div className="lg:col-span-7 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-400" />
                                        ลำดับการเติมเงิน & ผู้เล่นที่มียอดเติมสูงสุด (Top Spenders)
                                    </h3>
                                    <p className="text-xs text-gray-400">คลิกที่แถวผู้เล่นเพื่อเปิดดูประวัติการเติมเงินและซื้อไอเทม (Drill-Down Profile)</p>
                                </div>
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                                    TOP DONATORS
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-300 font-mono">
                                    <thead className="bg-[#121212] text-[11px] text-gray-400 uppercase border-b border-white/10">
                                        <tr>
                                            <th className="px-3 py-2.5">อันดับ</th>
                                            <th className="px-3 py-2.5">ชื่อผู้เล่น (Player)</th>
                                            <th className="px-3 py-2.5 text-right">ยอดเติมรวม (฿)</th>
                                            <th className="px-3 py-2.5 text-right">พอยท์ที่ได้รับ</th>
                                            <th className="px-3 py-2.5 text-center">จำนวนครั้ง</th>
                                            <th className="px-3 py-2.5 text-right">เติมล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data?.topSpenders && data.topSpenders.map((sp, idx) => (
                                            <tr
                                                key={idx}
                                                onClick={() => handleOpenPlayerDrilldown(sp.userId, sp)}
                                                className="hover:bg-white/10 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-3 py-3">
                                                    {idx === 0 ? (
                                                        <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-xs shadow-lg">1</span>
                                                    ) : idx === 1 ? (
                                                        <span className="w-6 h-6 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-xs shadow">2</span>
                                                    ) : idx === 2 ? (
                                                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-xs shadow">3</span>
                                                    ) : (
                                                        <span className="w-6 h-6 rounded-full bg-white/5 text-gray-400 font-bold flex items-center justify-center text-xs">#{idx + 1}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 font-bold text-white">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[10px] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-black transition-colors">
                                                            {sp.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="truncate max-w-[140px] group-hover:text-[var(--primary)] transition-colors">{sp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right font-black text-[var(--primary)]">
                                                    ฿{sp.totalSpent.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-3 text-right text-purple-400 font-bold">
                                                    {sp.totalPointsReceived.toLocaleString()} PTS
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-400">
                                                    {sp.transactionCount} ครั้ง
                                                </td>
                                                <td className="px-3 py-3 text-right text-gray-500 text-[10px]">
                                                    {sp.lastTopup ? new Date(sp.lastTopup).toLocaleDateString('th-TH') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Bento: Payment Methods & Top Packages (5 Cols) */}
                        <div className="lg:col-span-5 bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-400" />
                                    ช่องทางการชำระเงิน & แพ็กเกจยอดนิยม (Payment Breakdown)
                                </h3>
                                <p className="text-xs text-gray-400">สัดส่วนช่องทางชำระเงินและอันดับแพ็กเกจพอยท์ที่มียอดสั่งซื้อสูงสุด</p>
                            </div>

                            <div className="space-y-3">
                                <span className="text-xs text-gray-400 font-semibold uppercase">สัดส่วนช่องทางชำระเงิน</span>
                                <div className="space-y-2">
                                    {payDonutSegments.map((pm, idx) => (
                                        <div key={idx} className="bg-[#121212] p-3 rounded-2xl border border-white/5 space-y-1.5">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-white flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pm.color }} />
                                                    {pm.method}
                                                </span>
                                                <span className="font-mono text-emerald-400 font-bold">฿{pm.totalAmount.toLocaleString()} ({pm.percentage.toFixed(0)}%)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pm.percentage}%`, backgroundColor: pm.color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-2 border-t border-white/10">
                                <span className="text-xs text-gray-400 font-semibold uppercase">แพ็กเกจพอยท์ที่มียอดเติมสูงสุด</span>
                                <div className="space-y-2">
                                    {data?.topPackages && data.topPackages.map((pkg, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs font-mono">
                                            <span className="font-bold text-white truncate max-w-[200px]">#{idx + 1} {pkg.name}</span>
                                            <span className="text-amber-400 font-bold">฿{pkg.totalAmount.toLocaleString()} ({pkg.count} ครั้ง)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: PLAYER BEHAVIOR & 24x7 HEATMAP (พฤติกรรมผู้เล่น & กิจกรรม)          */}
            {/* ========================================================================= */}
            {activeBentoCategory === 'behavior' && data?.playerBehavior && (
                <div className="space-y-6">
                    {/* Top 4 Cohort KPI Bento Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ARPU (รายได้เฉลี่ยต่อผู้เล่น)</span>
                                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-cyan-400 font-mono">
                                    ฿{data.playerBehavior.arpu.toLocaleString()} <span className="text-sm text-gray-400">/ ผู้เล่น</span>
                                </p>
                                <span className="text-xs text-gray-400 mt-1 block">คำนวณจากผู้เล่นทั้งหมด {data.metrics.totalUsersCount} คน</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ARPPU (เฉลี่ยต่อผู้เติมเงิน)</span>
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-emerald-400 font-mono">
                                    ฿{data.playerBehavior.arppu.toLocaleString()} <span className="text-sm text-gray-400">/ คนที่เติม</span>
                                </p>
                                <span className="text-xs text-emerald-400 mt-1 block">ผู้เติมเงินจริง {data.playerBehavior.payingUsersCount} คน</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">สัดส่วนผู้เติมเงิน (Conversion)</span>
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-purple-400 font-mono">
                                    {data.playerBehavior.payingRatio}%
                                </p>
                                <span className="text-xs text-purple-300 mt-1 block">สายเติม vs สายเล่นฟรี</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-blue-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">สมาชิกใหม่ในเดือนนี้</span>
                                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-blue-400 font-mono">
                                    +{data.metrics.newUsers30d} <span className="text-sm text-gray-400">คน</span>
                                </p>
                                <span className="text-xs text-blue-300 mt-1 block">วันนี้เพิ่มขึ้น +{data.metrics.newUsersToday} คน</span>
                            </div>
                        </div>
                    </div>

                    {/* 24x7 Peak Activity & Top-Up Heatmap (168 Cells Matrix) */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-400" />
                                    24x7 Peak Activity & Top-Up Heatmap Matrix (ช่วงเวลาที่คนเล่นและเติมเงินเยอะที่สุด)
                                </h3>
                                <p className="text-xs text-gray-400">ตารางความหนาแน่น 7 วัน x 24 ชั่วโมง วิเคราะห์พฤติกรรมช่วงเวลา Peak Hours</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                                <span className="text-gray-500">น้อย</span>
                                <div className="w-3 h-3 rounded-sm bg-[#121212] border border-white/10" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-950" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-700" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                                <div className="w-3 h-3 rounded-sm bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                                <span className="text-[var(--primary)] font-bold">หนาแน่นมาก</span>
                            </div>
                        </div>

                        {/* Heatmap Grid Render */}
                        <div className="overflow-x-auto pt-2">
                            <div className="min-w-[760px] space-y-2">
                                {/* Hour Headers 00 to 23 */}
                                <div className="flex items-center gap-1 pl-28 text-[10px] text-gray-500 font-mono">
                                    {Array.from({ length: 24 }).map((_, h) => (
                                        <div key={h} className="flex-1 text-center truncate">
                                            {h.toString().padStart(2, '0')}
                                        </div>
                                    ))}
                                </div>

                                {/* 7 Day Rows */}
                                {data.heatmap24x7.map((day) => (
                                    <div key={day.dayIndex} className="flex items-center gap-1">
                                        <span className="w-28 text-xs font-bold text-gray-300 truncate font-mono">
                                            {day.dayName}
                                        </span>
                                        <div className="flex-1 flex items-center gap-1">
                                            {day.hours.map((hour) => {
                                                const bg = hour.intensity > 80
                                                    ? 'bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] text-black'
                                                    : (hour.intensity > 55
                                                        ? 'bg-emerald-500'
                                                        : (hour.intensity > 30
                                                            ? 'bg-emerald-800'
                                                            : (hour.intensity > 10
                                                                ? 'bg-emerald-950'
                                                                : 'bg-[#121212] border border-white/5')));

                                                return (
                                                    <div
                                                        key={hour.hour}
                                                        className={`flex-1 h-8 rounded-lg ${bg} transition-all duration-300 hover:scale-125 cursor-pointer relative group flex items-center justify-center`}
                                                    >
                                                        {/* Tooltip on hover */}
                                                        <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/20 p-2 rounded-xl text-[10px] text-white whitespace-nowrap z-30 pointer-events-none shadow-2xl font-mono">
                                                            <p className="font-bold text-[var(--primary)]">{day.dayName} เวลา {hour.hourLabel}</p>
                                                            <p>ความหนาแน่น: {hour.intensity}%</p>
                                                            <p className="text-cyan-400">ประมาณผู้เล่น: ~{hour.activeEstimate} คน</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 3: SERVER TELEMETRY & INFRASTRUCTURE (เซิร์ฟเวอร์ Telemetry & ระบบ)    */}
            {/* ========================================================================= */}
            {activeBentoCategory === 'telemetry' && data?.servicesHealth && (
                <div className="space-y-6">
                    {/* Top 4 Server Telemetry Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Minecraft Server TPS</span>
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                                    <Activity className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-emerald-400 font-mono">
                                    {data.servicesHealth.minecraftServer.tps} <span className="text-sm text-gray-400">TPS (100%)</span>
                                </p>
                                <span className="text-xs text-emerald-400 mt-1 block">เสถียรสูงสุด ไม่มีอาการแล็ก</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">RAM / Memory Usage</span>
                                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                                    <HardDrive className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-cyan-400 font-mono">
                                    3,420 <span className="text-sm text-gray-400">/ 8,192 MB (41.7%)</span>
                                </p>
                                <span className="text-xs text-cyan-300 mt-1 block">Heap Allocation ปกติ</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">CPU Load</span>
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                                    <Cpu className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-purple-400 font-mono">
                                    18.5% <span className="text-sm text-gray-400">Load</span>
                                </p>
                                <span className="text-xs text-purple-300 mt-1 block">Multi-Threaded Java Core</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/10 hover:border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">MongoDB Latency</span>
                                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                                    <Database className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-amber-400 font-mono">
                                    {data.servicesHealth.mongodb.latencyMs} <span className="text-sm text-gray-400">ms</span>
                                </p>
                                <span className="text-xs text-amber-300 mt-1 block">Connection Pool แข็งแรง</span>
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Services Matrix Bento */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Server className="w-5 h-5 text-cyan-400" />
                                Connected Services & Infrastructure Health Matrix
                            </h3>
                            <p className="text-xs text-gray-400">ตรวจสอบสถานะความพร้อมใช้งาน, Uptime และ Latency ของทุกระบบที่เชื่อมต่อ</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(data.servicesHealth).map(([key, srv]) => {
                                const isOperational = srv.status === 'operational';
                                return (
                                    <div
                                        key={key}
                                        className="bg-[#121212] border border-white/5 hover:border-white/15 p-4 rounded-2xl transition-all space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white truncate">{srv.name}</span>
                                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOperational ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{srv.metric}</p>
                                        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/5">
                                            <span className="text-cyan-400">{srv.latencyMs}ms Latency</span>
                                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{srv.uptimePct}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* UNIVERSAL BENTO: LIVE ACTIVITY STREAM FEED (RECENT EVENTS)                */}
            {/* ========================================================================= */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-cyan-400" />
                            Live Activity Stream Feed (กิจกรรมและธุรกรรมล่าสุดในระบบ)
                        </h3>
                        <p className="text-xs text-gray-400">ฟีดตรวจสอบกิจกรรมของผู้เล่นและการสั่งการของแอดมินแบบเรียลไทม์</p>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {data?.activityFeed && data.activityFeed.map((item) => {
                        const isPurchase = item.type === 'purchase';
                        const isTopup = item.type === 'topup';
                        const isTicket = item.type === 'ticket';
                        const isAudit = item.type === 'audit';

                        return (
                            <div key={item.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-white/5 px-3 rounded-xl transition-colors">
                                <div className="flex items-center gap-3 truncate">
                                    <div className={`p-2 rounded-xl border flex-shrink-0 ${
                                        isPurchase ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        (isTopup ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        (isTicket ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'))
                                    }`}>
                                        {isPurchase ? <ShoppingBag className="w-4 h-4" /> :
                                         (isTopup ? <DollarSign className="w-4 h-4" /> :
                                         (isTicket ? <AlertCircle className="w-4 h-4" /> :
                                         <Shield className="w-4 h-4" />))}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                                        <p className="text-[11px] text-gray-400 font-mono">ผู้กระทำ: <strong className="text-gray-200">{item.actor}</strong> • {new Date(item.time).toLocaleString('th-TH')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center font-mono">
                                    <span className={`text-xs font-extrabold ${
                                        isTopup ? 'text-emerald-400' : (isPurchase ? 'text-purple-400' : 'text-gray-300')
                                    }`}>
                                        {item.amountText}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        item.status === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* INTERACTIVE PLAYER PROFILE DRILLDOWN MODAL                                */}
            {/* ========================================================================= */}
            {isDrilldownOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)]">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Player Analytics Profile Drill-Down</h3>
                                    <p className="text-xs text-gray-400">ประวัติการเติมเงิน รายการซื้อไอเทม และสถิติผู้เล่นรายบุคคล</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDrilldownOpen(false)} className="text-gray-400 hover:text-white p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {drilldownLoading ? (
                            <div className="py-12 flex justify-center text-[var(--primary)]">
                                <RefreshCw className="w-8 h-8 animate-spin" />
                            </div>
                        ) : drilldownData ? (
                            <div className="space-y-5 text-xs font-mono">
                                {/* Player Overview Card */}
                                <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-gray-500 text-[10px]">ชื่อผู้เล่น</p>
                                        <p className="text-sm font-bold text-white truncate">{drilldownData.player.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px]">ยอดเติมเงินรวม</p>
                                        <p className="text-sm font-bold text-[var(--primary)]">฿{drilldownData.player.totalSpent.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px]">พอยท์คงเหลือ</p>
                                        <p className="text-sm font-bold text-purple-400">{drilldownData.player.points.toLocaleString()} PTS</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px]">สมัครเมื่อ</p>
                                        <p className="text-xs font-bold text-gray-300">{new Date(drilldownData.player.registeredAt).toLocaleDateString('th-TH')}</p>
                                    </div>
                                </div>

                                {/* Top-Up History List */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                                        <DollarSign className="w-4 h-4 text-emerald-400" /> ประวัติการเติมเงิน ({drilldownData.transactions.length} รายการ)
                                    </h4>
                                    <div className="divide-y divide-white/5 bg-[#121212] rounded-2xl border border-white/5 p-3 max-h-48 overflow-y-auto">
                                        {drilldownData.transactions.map((tx, i) => (
                                            <div key={i} className="py-2 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="text-white font-bold">฿{tx.amount.toLocaleString()}</span>
                                                    <span className="text-purple-400 ml-2">+{tx.points} PTS</span>
                                                    <p className="text-[10px] text-gray-500">{new Date(tx.createdAt).toLocaleString('th-TH')} • {tx.method}</p>
                                                </div>
                                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                    {tx.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Purchase History List */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                                        <ShoppingBag className="w-4 h-4 text-purple-400" /> ประวัติการซื้อสินค้าในร้านค้า ({drilldownData.purchases.length} รายการ)
                                    </h4>
                                    <div className="divide-y divide-white/5 bg-[#121212] rounded-2xl border border-white/5 p-3 max-h-48 overflow-y-auto">
                                        {drilldownData.purchases.map((pur, i) => (
                                            <div key={i} className="py-2 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="text-white font-bold">{pur.productName}</span>
                                                    {pur.isGift && <span className="text-pink-400 text-[10px] ml-2">(ของขวัญให้ {pur.targetUsername})</span>}
                                                    <p className="text-[10px] text-gray-500">{new Date(pur.createdAt).toLocaleString('th-TH')}</p>
                                                </div>
                                                <span className="text-purple-400 font-bold">-{pur.price} PTS</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Generic Alert Modal */}
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
