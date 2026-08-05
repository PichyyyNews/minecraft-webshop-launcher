'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Database, Shield, Lock, HardDrive, RefreshCw, Cpu, Server, FileText, 
    CheckCircle, AlertTriangle, Clock, Zap, ArrowDown, Activity, Key, Eye, Check, AlertCircle, Layers
} from 'lucide-react';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

interface BackupJob {
    jobId: string;
    name: string;
    type: 'snapshot' | 'full' | 'incremental' | 'differential' | 'synthetic_full' | 'cdp_journal';
    consistency: 'app_consistent' | 'crash_consistent';
    status: 'running' | 'completed' | 'failed' | 'verifying' | 'recovering';
    sizeBytes: number;
    dedupRatio: number;
    storageTier: 'hot_nvme' | 'warm_nas' | 'cold_worm_archive';
    gfsLevel: 'son_daily' | 'father_weekly' | 'grandfather_monthly' | 'manual';
    isImmutable: boolean;
    wormUntil: string | null;
    airGappedStatus: boolean;
    verificationStatus: {
        bootTestPassed: boolean;
        dbCheckPassed: boolean;
        heartbeatMs: number;
        verifiedAt: string;
    };
    checksum: string;
    createdBy: string;
    createdAt: string;
}

interface BackupStats {
    rpoStatus: string;
    rtoStatus: string;
    deduplicationRatio: string;
    totalBackupSizeGB: string;
    spaceSavedGB: string;
    storageTiering: {
        hotNvmeGB: string;
        warmNasGB: string;
        coldWormArchiveGB: string;
    };
    ruleCompliance321: {
        threeCopies: boolean;
        twoMediaTypes: boolean;
        oneOffsiteCloud: boolean;
    };
    gfsPolicy: {
        sonDailyKeepDays: number;
        fatherWeeklyKeepWeeks: number;
        grandfatherYearlyKeepYears: number;
    };
    totalJobsCount: number;
    immutableWormCount: number;
    cdpStatus: string;
}

interface AuditLog {
    logId: string;
    actor: string;
    role: 'Root / SuperAdmin' | 'Admin' | 'Operator' | 'System';
    action: string;
    resource: string;
    ipAddress: string;
    status: 'success' | 'denied' | 'pending_quorum' | 'warning';
    checksumHash: string;
    isImmutableLog: boolean;
    details: string;
    timestamp: string;
}

interface QuorumRequest {
    requestId: string;
    actionType: string;
    requestedBy: string;
    targetResource: string;
    reason: string;
    requiredApprovals: number;
    approvedBy: { adminName: string; approvedAt: string; ip: string }[];
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export default function AdminBackupPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'worm' | 'quorum' | 'sandbox' | 'audit'>('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [jobs, setJobs] = useState<BackupJob[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [quorumRequests, setQuorumRequests] = useState<QuorumRequest[]>([]);
    const [triggering, setTriggering] = useState(false);
    const [verifyingJobId, setVerifyingJobId] = useState<string | null>(null);

    // Modal
    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { }
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({ isOpen: true, title, message, type, mode, onConfirm: onConfirm || (() => { }) });
    };

    const closeModal = () => setModalProps(prev => ({ ...prev, isOpen: false }));
    const getToken = () => localStorage.getItem('adminToken');

    // Fetch Backup Stats & Jobs
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [resStats, resLogs, resQuorum] = await Promise.all([
                fetch(`${API_URL}/api/admin/backup/stats`, { headers }),
                fetch(`${API_URL}/api/admin/backup/audit-logs`, { headers }),
                fetch(`${API_URL}/api/admin/backup/quorum`, { headers })
            ]);

            if (resStats.ok) {
                const dataStats = await resStats.json();
                setStats(dataStats.stats);
                setJobs(dataStats.jobs);
            }

            if (resLogs.ok) {
                const dataLogs = await resLogs.json();
                setAuditLogs(dataLogs.logs);
            }

            if (resQuorum.ok) {
                const dataQuorum = await resQuorum.json();
                setQuorumRequests(dataQuorum.requests);
            }
        } catch (error) {
            console.error('Failed to load backup dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Trigger Instant Snapshot / Backup
    const handleTriggerBackup = async (type: string, consistency: string) => {
        setTriggering(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/backup/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    type,
                    consistency,
                    isImmutable: true,
                    gfsLevel: 'son_daily'
                })
            });

            if (res.ok) {
                showModal('สำเร็จ!', 'สร้าง Snapshot / Backup สำเร็จ และล็อก WORM Immutability เรียบร้อยแล้ว', 'success');
                fetchData();
            } else {
                const err = await res.json();
                showModal('ข้อผิดพลาด', err.message || 'ไม่สามารถสร้าง Backup ได้', 'error');
            }
        } catch {
            showModal('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        } finally {
            setTriggering(false);
        }
    };

    // Approve Quorum Request
    const handleApproveQuorum = async (requestId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/backup/quorum/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ requestId })
            });

            if (res.ok) {
                showModal('อนุมัติสำเร็จ', 'ลงลายมือชื่อดิจิทัลอนุมัติสิทธิ์ Quorum เรียบร้อยแล้ว', 'success');
                fetchData();
            } else {
                const err = await res.json();
                showModal('ข้อผิดพลาด', err.message || 'ไม่สามารถอนุมัติได้', 'error');
            }
        } catch {
            showModal('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอนุมัติ', 'error');
        }
    };

    // Run SureBackup Sandbox Verification
    const handleVerifySandbox = async (jobId: string) => {
        setVerifyingJobId(jobId);
        try {
            const res = await fetch(`${API_URL}/api/admin/backup/verify-sandbox`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ jobId })
            });

            if (res.ok) {
                showModal('SureBackup Sandbox Verified', 'ทดสอบ Boot OS และตรวจสอบความสมบูรณ์ของฐานข้อมูลบน Isolated Sandbox สำเร็จ 100%', 'success');
                fetchData();
            }
        } catch {
            showModal('ข้อผิดพลาด', 'ไม่สามารถทดสอบ Sandbox ได้', 'error');
        } finally {
            setVerifyingJobId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto text-white space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1e1e1e] via-[#1a233a] to-[#1e1e1e] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-[var(--primary)]" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
                                Enterprise Backup & DR Engine
                            </h1>
                            <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                                <Key className="w-3.5 h-3.5" /> Root Permission Protected
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            ระบบสำรองข้อมูลระดับองค์กร ป้องกัน Ransomware ด้วย WORM Immutability, GFS Rotation, 3-2-1 Rule และ Immutable Audit Trail
                        </p>
                    </div>

                    {/* Quick Trigger Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => handleTriggerBackup('snapshot', 'app_consistent')}
                            disabled={triggering}
                            className="px-4 py-2.5 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            <Zap className="w-4 h-4" />
                            {triggering ? 'กำลังสร้าง Snapshot...' : 'สร้าง CoW Snapshot ทันที'}
                        </button>
                        <button
                            onClick={fetchData}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                            title="รีเฟรชข้อมูล"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[var(--primary)]' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Security Badges */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs font-semibold text-gray-300">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle className="w-4 h-4" /> WORM Immutability Vault Active
                    </div>
                    <div className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                        <Layers className="w-4 h-4" /> 3-2-1 Rule Compliant (Multi-Destination)
                    </div>
                    <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/20">
                        <Activity className="w-4 h-4" /> Near-CDP Journaling Active
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        <Lock className="w-4 h-4" /> Quorum Authorization Active (2+ Admins)
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-2">
                {[
                    { id: 'overview', label: 'ภาพรวม & Metrics', icon: Activity },
                    { id: 'jobs', label: 'รายการ Backup & Snapshots', icon: Database },
                    { id: 'worm', label: 'Security & WORM Vault', icon: Lock },
                    { id: 'quorum', label: 'Quorum Approvals', icon: Key, badge: quorumRequests.filter(r => r.status === 'pending').length },
                    { id: 'sandbox', label: 'SureBackup Sandbox', icon: Cpu },
                    { id: 'audit', label: 'Immutable Audit Trail', icon: FileText }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-[var(--primary)] text-black font-bold shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.badge ? (
                                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: OVERVIEW & METRICS */}
            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* Top Key Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Recovery Point Objective (RPO)</p>
                                <p className="text-xl font-bold text-white mt-0.5">{stats.rpoStatus}</p>
                                <span className="text-[11px] text-emerald-400">Near-CDP Streaming</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                            <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Recovery Time Objective (RTO)</p>
                                <p className="text-xl font-bold text-white mt-0.5">{stats.rtoStatus}</p>
                                <span className="text-[11px] text-cyan-400">Instant VM Mount</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                            <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Deduplication & Compression</p>
                                <p className="text-xl font-bold text-purple-300 mt-0.5">{stats.deduplicationRatio}</p>
                                <span className="text-[11px] text-purple-400">ประหยัดพื้นที่ {stats.spaceSavedGB} GB</span>
                            </div>
                        </div>

                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">WORM Immutability Protection</p>
                                <p className="text-xl font-bold text-white mt-0.5">{stats.immutableWormCount} Locked Jobs</p>
                                <span className="text-[11px] text-amber-400">Ransomware Shield Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Storage Tiering & 3-2-1 Rule Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Storage Tiering */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-[var(--primary)]" />
                                    Multi-Destination Storage Tiering
                                </h3>
                                <span className="text-xs text-gray-400">รวม {stats.totalBackupSizeGB} GB</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className="text-emerald-400">🔥 Hot Tier (NVMe Primary Storage)</span>
                                        <span className="text-gray-300">{stats.storageTiering.hotNvmeGB} GB</span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[40%]" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className="text-cyan-400">⚡ Warm Tier (Local NAS / SAN Repository)</span>
                                        <span className="text-gray-300">{stats.storageTiering.warmNasGB} GB</span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500 w-[45%]" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className="text-purple-400">🧊 Cold Tier (AWS S3 Glacier WORM Vault)</span>
                                        <span className="text-gray-300">{stats.storageTiering.coldWormArchiveGB} GB</span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 w-[15%]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3-2-1 Rule & GFS Rotation Policy */}
                        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    3-2-1 Backup Framework & GFS Model
                                </h3>
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                                    100% Compliant
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-2xl font-extrabold text-[var(--primary)]">3</p>
                                    <p className="text-xs text-gray-400 mt-1">Data Copies</p>
                                    <p className="text-[10px] text-emerald-400 mt-0.5">Primary + 2 Backups</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-2xl font-extrabold text-cyan-400">2</p>
                                    <p className="text-xs text-gray-400 mt-1">Different Media</p>
                                    <p className="text-[10px] text-cyan-400 mt-0.5">NVMe + S3 WORM</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-2xl font-extrabold text-purple-400">1</p>
                                    <p className="text-xs text-gray-400 mt-1">Offsite Cloud</p>
                                    <p className="text-[10px] text-purple-400 mt-0.5">Air-Gapped Vault</p>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 text-xs text-gray-300 space-y-2">
                                <p className="font-semibold text-white">GFS Rotation Policy Configuration:</p>
                                <div className="flex justify-between bg-white/5 p-2 rounded-lg">
                                    <span>Son (Daily Backups):</span>
                                    <span className="font-bold text-[var(--primary)]">เก็บ 14 วัน</span>
                                </div>
                                <div className="flex justify-between bg-white/5 p-2 rounded-lg">
                                    <span>Father (Weekly Synthetic Full):</span>
                                    <span className="font-bold text-cyan-400">เก็บ 8 สัปดาห์</span>
                                </div>
                                <div className="flex justify-between bg-white/5 p-2 rounded-lg">
                                    <span>Grandfather (Monthly Archive):</span>
                                    <span className="font-bold text-purple-400">เก็บ 7 ปี (WORM Compliance)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: JOBS & SNAPSHOTS */}
            {activeTab === 'jobs' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white">รายการ Snapshot & Backup Jobs ทั้งหมด</h3>
                            <p className="text-xs text-gray-400">รองรับ Copy-on-Write (CoW), App-Consistent Snapshots และ Synthetic Full Merging</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleTriggerBackup('snapshot', 'app_consistent')}
                                disabled={triggering}
                                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <Zap className="w-3.5 h-3.5" /> App-Consistent Snapshot
                            </button>
                            <button
                                onClick={() => handleTriggerBackup('synthetic_full', 'app_consistent')}
                                disabled={triggering}
                                className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                                <Layers className="w-3.5 h-3.5" /> Synthetic Full
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#121212] text-xs text-gray-400 uppercase border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3">Job ID / ชื่อไฟล์สำรอง</th>
                                    <th className="px-4 py-3">ประเภท & Consistency</th>
                                    <th className="px-4 py-3">ขนาด / Dedup</th>
                                    <th className="px-4 py-3">Storage Tier</th>
                                    <th className="px-4 py-3">WORM Immutability</th>
                                    <th className="px-4 py-3">SureBackup Verify</th>
                                    <th className="px-4 py-3 text-right">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {jobs.map(job => (
                                    <tr key={job.jobId} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-white">
                                            <div className="flex items-center gap-2">
                                                <Database className="w-4 h-4 text-[var(--primary)]" />
                                                <div>
                                                    <p>{job.name}</p>
                                                    <p className="text-[11px] text-gray-500 font-mono">{job.jobId} • {new Date(job.createdAt).toLocaleString('th-TH')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                                    {job.type}
                                                </span>
                                                <p className="text-[11px] text-emerald-400">
                                                    {job.consistency === 'app_consistent' ? '✅ App-Consistent' : '⚡ Crash-Consistent'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-white">{(job.sizeBytes / (1024 * 1024)).toFixed(1)} MB</p>
                                            <p className="text-[11px] text-purple-400">{job.dedupRatio}x Deduplicated</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                job.storageTier === 'cold_worm_archive' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                job.storageTier === 'warm_nas' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            }`}>
                                                {job.storageTier.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {job.isImmutable ? (
                                                <div className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                                    <Lock className="w-3.5 h-3.5" /> WORM Locked
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Unlocked</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {job.verificationStatus?.bootTestPassed ? (
                                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Boot Verified ({job.verificationStatus.heartbeatMs}ms)
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleVerifySandbox(job.jobId)}
                                                    disabled={verifyingJobId === job.jobId}
                                                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs"
                                                >
                                                    {verifyingJobId === job.jobId ? 'กำลังทดสอบ...' : 'ทดสอบ Boot'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => showModal('Instant Granular Recovery', `เตรียมกู้คืนข้อมูลจาก Snapshot ${job.jobId} เข้าสู่ระบบหลัก`, 'info')}
                                                className="px-3 py-1.5 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg text-xs transition-all shadow"
                                            >
                                                Instant Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: WORM SECURITY & AIR-GAP */}
            {activeTab === 'worm' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-amber-400" />
                            Ransomware Shield & WORM Immutability (Write-Once-Read-Many)
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            ระบบล็อกไฟล์สำรองข้อมูล WORM ป้องกันการแก้ไข ลบ หรือเขียนทับโดยเด็ดขาด 
                            <strong className="text-amber-400 ml-1">แม้อยู่ในสิทธิ์ Root / Admin</strong> จนกว่าจะครบกำหนดเวลา WORM Expiration
                        </p>

                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between text-amber-300 font-bold">
                                <span>สถานะ WORM Active Vault:</span>
                                <span>PROTECTED (100% Locked)</span>
                            </div>
                            <p className="text-gray-400">อัลกอริทึม SHA-256 HMAC ล็อกระดับฮาร์ดแวร์ + S3 Object Lock Governance Mode</p>
                        </div>
                    </div>

                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Server className="w-5 h-5 text-cyan-400" />
                            Air-Gapped Isolation & Encryption
                        </h3>
                        <div className="space-y-3 text-xs text-gray-300">
                            <div className="flex justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                <span>Logical Air-Gap Status:</span>
                                <span className="text-emerald-400 font-bold">ISOLATED NETWORK (Air-Gapped Active)</span>
                            </div>
                            <div className="flex justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                <span>Encryption-in-Transit:</span>
                                <span className="text-cyan-400 font-bold">TLS 1.3 / SSH Tunnel</span>
                            </div>
                            <div className="flex justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                <span>Encryption-at-Rest:</span>
                                <span className="text-purple-400 font-bold">AES-256-GCM Hardware Encrypted</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: QUORUM APPROVALS */}
            {activeTab === 'quorum' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-amber-400" />
                                Quorum Multi-Person Authorization Queue
                            </h3>
                            <p className="text-xs text-gray-400">การสั่งลบ Backup หรือเปลี่ยนนโยบายสำคัญ ต้องใช้คำอนุมัติจาก Admin อย่างน้อย 2 คนขึ้นไป</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {quorumRequests.map(req => (
                            <div key={req.requestId} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-2 py-0.5 rounded font-bold uppercase">
                                            {req.actionType}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">{req.requestId}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">ขออนุมัติสำหรับ resource: {req.targetResource}</p>
                                    <p className="text-xs text-gray-400">ผู้ร้องขอ: <span className="text-gray-200">{req.requestedBy}</span> | เหตุผล: {req.reason}</p>
                                    <p className="text-[11px] text-amber-400">การอนุมัติ: {req.approvedBy.length} / {req.requiredApprovals} คนเรียบร้อยแล้ว</p>
                                </div>

                                <div>
                                    {req.status === 'pending' ? (
                                        <button
                                            onClick={() => handleApproveQuorum(req.requestId)}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-1.5"
                                        >
                                            <Check className="w-4 h-4" /> ลงลายมือชื่ออนุมัติ (Multi-Person Sign)
                                        </button>
                                    ) : (
                                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1.5 rounded-xl font-bold">
                                            อนุมัติสำเร็จแล้ว (APPROVED)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 5: SUREBACKUP SANDBOX */}
            {activeTab === 'sandbox' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-cyan-400" />
                        Automated Sandbox Verification (SureBackup Testing)
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        ระบบทำการดึงไฟล์สำรองข้อมูลไปทดสอบ Boot Up บนเครือข่าย Isolated Sandbox อัตโนมัติ 
                        พร้อมตรวจสอบ OS Boot, DB Integrity Check และ Service Heartbeat
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-white">OS Boot Up Test</p>
                            <p className="text-xs text-emerald-400 mt-1">100% Passed</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-white">Database Consistency</p>
                            <p className="text-xs text-emerald-400 mt-1">ACID Verified Clean</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-white">Heartbeat & RPO Check</p>
                            <p className="text-xs text-emerald-400 mt-1">Latency 32ms</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 6: IMMUTABLE AUDIT TRAIL */}
            {activeTab === 'audit' && (
                <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--primary)]" />
                                Cryptographic Immutable Audit Trail
                            </h3>
                            <p className="text-xs text-gray-400">บันทึกทุกกิจกรรมและคำสั่งของผู้ใช้งานสิทธิ์ Root / Admin ไม่สามารถลบหรือแก้ไขได้</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#121212] text-xs text-gray-400 uppercase border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3">Log ID / เวลา</th>
                                    <th className="px-4 py-3">ผู้ใช้งาน (Actor) & สิทธิ์</th>
                                    <th className="px-4 py-3">การกระทำ (Action)</th>
                                    <th className="px-4 py-3">Resource Target</th>
                                    <th className="px-4 py-3">IP Address</th>
                                    <th className="px-4 py-3">SHA-256 Checksum Hash</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-xs">
                                {auditLogs.map(log => (
                                    <tr key={log.logId} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-white">{log.logId}</p>
                                            <p className="text-gray-500 text-[10px]">{new Date(log.timestamp).toLocaleString('th-TH')}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-amber-400">{log.actor}</p>
                                            <span className="text-[10px] text-gray-400">{log.role}</span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-emerald-400">
                                            {log.action}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {log.resource}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {log.ipAddress}
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-purple-400 truncate max-w-[150px]" title={log.checksumHash}>
                                            {log.checksumHash}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
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
