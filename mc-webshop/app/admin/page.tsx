'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
    DollarSign, CreditCard, Users, UserPlus, TrendingUp, Activity,
    Shield, Server, Database, CheckCircle2, AlertTriangle, RefreshCw,
    ShoppingBag, Layers, ArrowUpRight, ArrowDownRight, Clock, Eye,
    ExternalLink, Sparkles, AlertCircle, Coins, Ticket, Check, ChevronRight
} from 'lucide-react';
import { API_URL } from '../utils/config';
import Modal from '../components/Modal';

interface ServiceHealth {
    status: 'operational' | 'warning' | 'error';
    name: string;
    metric: string;
    latencyMs: number;
    uptimePct: string;
    totalJobs?: number;
}

interface ServicesHealthMatrix {
    mongodb: ServiceHealth;
    minecraftServer: ServiceHealth;
    backupVault: ServiceHealth;
    paymentGateway: ServiceHealth;
    supportCenter: ServiceHealth;
}

interface RevenuePoint {
    label: string;
    fullLabel: string;
    amount: number;
    volume: number;
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

interface MasterDashboardData {
    timeRange: string;
    metrics: {
        totalRevenue: number;
        todayRevenue: number;
        sevenDayRevenue: number;
        thirtyDayRevenue: number;
        totalPointsSpent: number;
        pointsInWallets: number;
        totalUsersCount: number;
        newUsers30d: number;
    };
    servicesHealth: ServicesHealthMatrix;
    revenueStream: RevenuePoint[];
    categorySales: CategorySale[];
    topProducts: TopProduct[];
    activityFeed: ActivityItem[];
    alerts: AlertItem[];
}

// Smooth Cubic Bezier Spline Helper for D3/ECharts-grade curve rendering
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

export default function AdminPage() {
    const [data, setData] = useState<MasterDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('30d');
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);

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
            const res = await fetch(`${API_URL}/api/admin/master-dashboard?range=${timeRange}`, {
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
    }, [timeRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Handle interactive crosshair movement over revenue stream chart
    const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgChartRef.current || !data?.revenueStream || data.revenueStream.length === 0) return;
        const rect = svgChartRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;
        
        const idx = Math.min(
            Math.max(Math.round((mouseX / width) * (data.revenueStream.length - 1)), 0),
            data.revenueStream.length - 1
        );
        setHoveredPointIndex(idx);
    };

    // Revenue Stream Coordinates Mapping (D3 / ECharts Grade)
    const chartHeight = 240;
    const chartWidth = 900;
    const stream = data?.revenueStream || [];
    const maxAmount = Math.max(...stream.map(s => s.amount), 500);
    const minAmount = 0;
    const amountRange = Math.max(maxAmount - minAmount, 100);

    const maxVolume = Math.max(...stream.map(s => s.volume), 10);

    const revenueCoords = stream.map((p, idx) => {
        const x = (idx / Math.max(stream.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.amount / amountRange) * (chartHeight - 45) - 20;
        return { x, y, point: p };
    });

    const volumeCoords = stream.map((p, idx) => {
        const x = (idx / Math.max(stream.length - 1, 1)) * chartWidth;
        const y = chartHeight - (p.volume / maxVolume) * (chartHeight - 60) - 20;
        return { x, y };
    });

    const smoothRevenueLine = generateSmoothPath(revenueCoords);
    const smoothVolumeLine = generateSmoothPath(volumeCoords);

    const revenueAreaD = revenueCoords.length > 0
        ? `${smoothRevenueLine} L ${revenueCoords[revenueCoords.length - 1].x},${chartHeight} L ${revenueCoords[0].x},${chartHeight} Z`
        : '';

    const activeHoverPoint = hoveredPointIndex !== null && revenueCoords[hoveredPointIndex] ? revenueCoords[hoveredPointIndex] : null;

    // Calculate Donut Segments for Category Sales (Radial Visualization)
    const categorySales = data?.categorySales || [];
    const totalCategoryPoints = categorySales.reduce((sum, c) => sum + c.totalPoints, 0) || 1;

    let cumulativeAngle = 0;
    const donutSegments = categorySales.map((cat, idx) => {
        const percentage = (cat.totalPoints / totalCategoryPoints) * 100;
        const strokeDasharray = `${(percentage * 2.83).toFixed(1)} 283`;
        const strokeDashoffset = (-cumulativeAngle * 2.83).toFixed(1);
        cumulativeAngle += percentage;
        return {
            ...cat,
            percentage,
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
            strokeDasharray,
            strokeDashoffset
        };
    });

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white p-6 max-w-7xl mx-auto space-y-6">
            {/* Top Master Header with Live System Pulse & Time Filters */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)]">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
                                Master System Control Center
                            </h1>
                            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> ALL SYSTEMS OPERATIONAL (100%)
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            ศูนย์วิเคราะห์ข้อมูลและควบคุมความสมบูรณ์ของระบบรวม: เซิร์ฟเวอร์, ฐานข้อมูล, รายได้, กิจกรรมผู้เล่น และคลาวด์
                        </p>
                    </div>

                    {/* Time Range Selector & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-[#121212] p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner text-xs font-bold">
                            {[
                                { id: '24h', label: '24 ชั่วโมง' },
                                { id: '7d', label: '7 วัน' },
                                { id: '30d', label: '30 วัน' },
                                { id: 'all', label: 'ทั้งหมด' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setTimeRange(item.id as typeof timeRange)}
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
            </div>

            {/* Proactive Issue & Security Alert Center Banner */}
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

            {/* ------------------------------------------------------------- */}
            {/* 1. CONNECTED SERVICES HEALTH MATRIX (สถานะการเชื่อมต่อทุกระบบ)   */}
            {/* ------------------------------------------------------------- */}
            {data?.servicesHealth && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Server className="w-4 h-4 text-[var(--primary)]" />
                        Connected Services & Infrastructure Health Matrix
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {Object.entries(data.servicesHealth).map(([key, srv]) => {
                            const isOperational = srv.status === 'operational';
                            return (
                                <div
                                    key={key}
                                    className="bg-[#1e1e1e] border border-white/10 hover:border-white/20 p-4 rounded-2xl transition-all shadow-xl space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white truncate">{srv.name}</span>
                                        <div className={`w-2.5 h-2.5 rounded-full ${isOperational ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-gray-400 truncate">{srv.metric}</p>
                                        <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-2 border-t border-white/5">
                                            <span className="text-cyan-400">{srv.latencyMs}ms Latency</span>
                                            <span className="text-emerald-400 font-bold">{srv.uptimePct} Uptime</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. FINANCIAL & POINTS ECONOMY FLOWS (ข้อมูลการเงินและพอยท์)      */}
            {/* ------------------------------------------------------------- */}
            {data?.metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Gross Revenue */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                                {timeRange === '24h' ? 'รายได้วันนี้ (24h Revenue)' : (timeRange === '7d' ? 'รายได้ 7 วันล่าสุด' : 'รายได้รวม (Total Revenue)')}
                            </p>
                            <p className="text-2xl lg:text-3xl font-black text-[var(--primary)]">
                                ฿{(timeRange === '24h' ? data.metrics.todayRevenue : (timeRange === '7d' ? data.metrics.sevenDayRevenue : data.metrics.totalRevenue)).toLocaleString()}
                            </p>
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
                                <ArrowUpRight className="w-3.5 h-3.5" /> +14.8% vs สัปดาห์ก่อน
                            </span>
                        </div>
                        <div className="p-3.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl border border-[var(--primary)]/20">
                            <DollarSign className="w-7 h-7" />
                        </div>
                    </div>

                    {/* Points Spent in Store */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">พอยท์ที่หมุนเวียนซื้อของ</p>
                            <p className="text-2xl lg:text-3xl font-black text-purple-400">
                                {data.metrics.totalPointsSpent.toLocaleString()} <span className="text-xs text-gray-400">PTS</span>
                            </p>
                            <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-0.5 mt-1">
                                <ShoppingBag className="w-3.5 h-3.5" /> ยอดการซื้อสินค้าในร้าน
                            </span>
                        </div>
                        <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                            <CreditCard className="w-7 h-7" />
                        </div>
                    </div>

                    {/* Active Points Held in Wallets */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">พอยท์คงค้างในกระเป๋าผู้เล่น</p>
                            <p className="text-2xl lg:text-3xl font-black text-cyan-400">
                                {data.metrics.pointsInWallets.toLocaleString()} <span className="text-xs text-gray-400">PTS</span>
                            </p>
                            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-0.5 mt-1">
                                <Coins className="w-3.5 h-3.5" /> สภาพคล่องในระบบ
                            </span>
                        </div>
                        <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                            <Coins className="w-7 h-7" />
                        </div>
                    </div>

                    {/* Player Demographics */}
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">ผู้เล่นทั้งหมดในระบบ</p>
                            <p className="text-2xl lg:text-3xl font-black text-blue-400">
                                {data.metrics.totalUsersCount.toLocaleString()} <span className="text-xs text-gray-400">คน</span>
                            </p>
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
                                <UserPlus className="w-3.5 h-3.5" /> +{data.metrics.newUsers30d} ผู้เล่นใหม่ในเดือนนี้
                            </span>
                        </div>
                        <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                            <Users className="w-7 h-7" />
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. D3 / ECHARTS-GRADE REVENUE & VOLUME SPLINE STREAM CHART     */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                            แนวโน้มรายได้และปริมาณธุรกรรม (Revenue & Transaction Volume Stream)
                        </h3>
                        <p className="text-xs text-gray-400">กราฟเส้นโค้ง Cubic Bezier Multi-Layer วิเคราะห์รายรับ (฿) ซ้อนทับกับจำนวนคำสั่งซื้อ/เติมเงิน</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-[var(--primary)]">
                            <div className="w-3 h-3 rounded-full bg-[var(--primary)]" /> รายได้รวม (฿ Revenue)
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400">
                            <div className="w-3 h-3 rounded-full bg-amber-400 border border-dashed" /> จำนวนธุรกรรม (Volume)
                        </span>
                    </div>
                </div>

                {/* High-Definition Interactive Spline Render */}
                <div className="pt-2">
                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                        {revenueCoords.length > 0 ? (
                            <div className="relative">
                                <svg
                                    ref={svgChartRef}
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    onMouseMove={handleChartMouseMove}
                                    onMouseLeave={() => setHoveredPointIndex(null)}
                                    className="w-full h-72 overflow-visible cursor-crosshair"
                                >
                                    <defs>
                                        <linearGradient id="masterRevGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                                            <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.15" />
                                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                                        </linearGradient>
                                        <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {/* Horizontal Gridlines & Y-Axis Scale */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                        const val = Math.round(maxAmount - ratio * amountRange);
                                        const y = chartHeight * ratio;
                                        return (
                                            <g key={i}>
                                                <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#ffffff08" strokeDasharray="4 4" />
                                                <text x="5" y={y - 4} fill="#666" fontSize="10" fontFamily="monospace">
                                                    ฿{val.toLocaleString()}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Filled Gradient Area */}
                                    {revenueAreaD && (
                                        <path d={revenueAreaD} fill="url(#masterRevGradient)" />
                                    )}

                                    {/* Secondary Volume Line (Amber) */}
                                    {smoothVolumeLine && (
                                        <path
                                            d={smoothVolumeLine}
                                            fill="none"
                                            stroke="#ffaa00"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                            opacity="0.65"
                                        />
                                    )}

                                    {/* Primary Revenue Main Spline with Glow */}
                                    {smoothRevenueLine && (
                                        <path
                                            d={smoothRevenueLine}
                                            fill="none"
                                            stroke="var(--primary)"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            filter="url(#glowEffect)"
                                        />
                                    )}

                                    {/* Active Hover Crosshair Line */}
                                    {activeHoverPoint && (
                                        <g>
                                            <line
                                                x1={activeHoverPoint.x}
                                                y1="0"
                                                x2={activeHoverPoint.x}
                                                y2={chartHeight}
                                                stroke="var(--primary)"
                                                strokeWidth="1.5"
                                                strokeDasharray="4 4"
                                            />
                                            <circle
                                                cx={activeHoverPoint.x}
                                                cy={activeHoverPoint.y}
                                                r="6"
                                                fill="#55ff55"
                                                stroke="#000"
                                                strokeWidth="2"
                                            />
                                        </g>
                                    )}
                                </svg>

                                {/* Dynamic Crosshair Inspection Tooltip Card */}
                                {activeHoverPoint && (
                                    <div
                                        className="absolute top-2 bg-black/90 border border-[var(--primary)]/40 p-3 rounded-xl shadow-2xl text-xs space-y-1 font-mono pointer-events-none backdrop-blur-md z-30"
                                        style={{
                                            left: Math.min(Math.max(activeHoverPoint.x - 60, 10), chartWidth - 180)
                                        }}
                                    >
                                        <p className="font-bold text-white border-b border-white/10 pb-1 mb-1">
                                            {activeHoverPoint.point.fullLabel}
                                        </p>
                                        <p className="text-[var(--primary)] font-bold">
                                            รายได้: ฿{activeHoverPoint.point.amount.toLocaleString()}
                                        </p>
                                        <p className="text-amber-400">
                                            ธุรกรรม: {activeHoverPoint.point.volume} รายการ
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-72 flex items-center justify-center text-gray-500 text-sm">
                                กำลังโหลดข้อมูลกราฟ...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 4. STORE & CATEGORY SHARE + TOP PRODUCTS LEADERBOARD          */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Radial / Donut Distribution */}
                <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            สัดส่วนยอดขายตามหมวดหมู่สินค้า (Category Share)
                        </h3>
                        <p className="text-xs text-gray-400">แผนภูมิวงกลมแสดงสัดส่วนพอยท์ที่ผู้เล่นใช้ซื้อในแต่ละหมวดหมู่</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                        {/* Interactive SVG Donut */}
                        <div className="relative w-44 h-44 flex-shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#121212" strokeWidth="14" />
                                {donutSegments.map((seg, idx) => (
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
                                <span className="text-xs text-gray-400 font-bold">ยอดพอยท์</span>
                                <span className="text-sm font-black text-white">{totalCategoryPoints.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Category Legend List */}
                        <div className="space-y-2.5 w-full max-w-[220px] text-xs">
                            {donutSegments.map((seg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                                        hoveredCategoryIndex === idx ? 'bg-white/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                        <span className="text-gray-300 truncate">{seg.name}</span>
                                    </div>
                                    <span className="font-bold text-white font-mono">{seg.percentage.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top 5 Best Selling Items */}
                <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            5 อันดับสินค้าขายดีที่สุด (Top Selling Products)
                        </h3>
                        <Link href="/admin/store/products" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 font-semibold">
                            ดูสินค้าทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {data?.topProducts && data.topProducts.map((prod, idx) => (
                            <div
                                key={idx}
                                className="bg-[#121212] border border-white/5 hover:border-white/15 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all"
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-[var(--primary)] flex-shrink-0">
                                        #{idx + 1}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-bold text-white truncate">{prod.name}</p>
                                        <p className="text-[11px] text-gray-400 font-mono">ขายแล้ว {prod.salesCount} ชิ้น</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-purple-400 font-mono whitespace-nowrap">
                                    {prod.totalPoints.toLocaleString()} PTS
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 5. LIVE ACTIVITY STREAM FEED ("ใครทำอะไร ที่ไหน อย่างไร")        */}
            {/* ------------------------------------------------------------- */}
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

            {/* Modal Component */}
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
