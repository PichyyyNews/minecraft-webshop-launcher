'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useEffect, useState } from 'react';

import {
    LayoutDashboard,
    Globe,
    Users,
    Server,
    Terminal,
    BookOpen,
    MessageSquareWarning,
    Coins,
    ShoppingBag,
    UserCog,
    ReceiptText,
    Settings,
    CreditCard,
    Gamepad2,
    Database,
    ShieldCheck,
    FolderKanban,
    Ticket,
} from 'lucide-react';

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

interface SidebarItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    permissionKey: string;
    matchFn?: (path: string) => boolean;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isRoot, setIsRoot] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('adminUser');
            if (stored) {
                const parsed = JSON.parse(stored);
                setPermissions(parsed.permissions || []);
                setIsRoot(parsed.isRoot === true);
            }
        } catch {
            setPermissions([]);
        }
    }, []);

    const isActive = (path: string) => pathname === path;
    const hasPermission = (key: string) => isRoot || permissions.includes(key);

    const linkClass = (active: boolean) =>
        `px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${active
            ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    const items: SidebarItem[] = [
        { href: '/admin', label: t('admin.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, permissionKey: 'dashboard' },
        { href: '/admin/info', label: t('admin.info'), icon: <Globe className="w-5 h-5" />, permissionKey: 'info' },
        { href: '/admin/player', label: t('admin.playerManagement'), icon: <Users className="w-5 h-5" />, permissionKey: 'players' },
        { href: '/admin/server', label: t('admin.serverStatus'), icon: <Server className="w-5 h-5" />, permissionKey: 'server' },
        { href: '/admin/launcher', label: 'Launcher', icon: <Gamepad2 className="w-5 h-5" />, permissionKey: 'launcher' },
        { href: '/admin/console', label: t('admin.console'), icon: <Terminal className="w-5 h-5" />, permissionKey: 'console' },
        { href: '/admin/wiki', label: t('admin.wiki'), icon: <BookOpen className="w-5 h-5" />, permissionKey: 'wiki', matchFn: (p) => p.startsWith('/admin/wiki') },
        { href: '/admin/tickets', label: t('admin.supportTickets'), icon: <MessageSquareWarning className="w-5 h-5" />, permissionKey: 'tickets' },
        { href: '/admin/store/packages', label: t('admin.pointPackages'), icon: <Coins className="w-5 h-5" />, permissionKey: 'packages' },
        { href: '/admin/store/products', label: t('admin.storeProducts'), icon: <ShoppingBag className="w-5 h-5" />, permissionKey: 'products' },
        { href: '/admin/store/categories', label: 'Store Categories', icon: <FolderKanban className="w-5 h-5" />, permissionKey: 'categories' },
        { href: '/admin/store/redeem', label: 'Redeem Codes', icon: <Ticket className="w-5 h-5" />, permissionKey: 'redeem' },
        { href: '/admin/users', label: t('admin.userBalances'), icon: <UserCog className="w-5 h-5" />, permissionKey: 'users' },
        { href: '/admin/transactions', label: t('admin.transactions'), icon: <ReceiptText className="w-5 h-5" />, permissionKey: 'transactions' },
        { href: '/admin/payments', label: t('admin.settings.payment'), icon: <CreditCard className="w-5 h-5" />, permissionKey: 'payments' },
        { href: '/admin/database', label: 'Database', icon: <Database className="w-5 h-5" />, permissionKey: 'database' },
        { href: '/admin/backup', label: 'Backup & DR Engine', icon: <ShieldCheck className="w-5 h-5" />, permissionKey: 'database' },
        { href: '/admin/settings', label: t('admin.settings.title'), icon: <Settings className="w-5 h-5" />, permissionKey: 'settings' },
    ];

    return (
        <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-[#1e1e1e] border-r border-white/10 z-40 flex flex-col overflow-hidden pt-20 font-sans transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="flex flex-col pt-4 pb-24 flex-grow overflow-y-auto max-h-[calc(100vh-5rem)] scrollbar-none md:scrollbar-thin">
                {items.map((item) => {
                    if (!hasPermission(item.permissionKey)) return null;
                    const active = item.matchFn ? item.matchFn(pathname) : isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={linkClass(active)}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    );
                })}

                {/* Admin Permissions — root only */}
                {isRoot && (
                    <>
                        <div className="mx-8 my-2 border-t border-white/10" />
                        <Link
                            href="/admin/permissions"
                            onClick={onClose}
                            className={linkClass(isActive('/admin/permissions'))}
                        >
                            <ShieldCheck className="w-5 h-5" />
                            Admin Permissions
                        </Link>
                    </>
                )}
            </div>
        </aside>
    );
}
