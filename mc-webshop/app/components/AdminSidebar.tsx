'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

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
    LogOut,
    CreditCard
} from 'lucide-react';

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const { t } = useLanguage();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-[#1e1e1e] border-r border-white/10 z-40 flex flex-col pt-20 font-sans transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
            <div className="flex flex-col py-4">
                <Link
                    href="/admin"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    {t('admin.dashboard')}
                </Link>
                <Link
                    href="/admin/info"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/info')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Globe className="w-5 h-5" />
                    {t('admin.info')}
                </Link>
                <Link
                    href="/admin/player"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/player')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Users className="w-5 h-5" />
                    {t('admin.playerManagement')}
                </Link>
                <Link
                    href="/admin/server"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/server')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Server className="w-5 h-5" />
                    {t('admin.serverStatus')}
                </Link>
                <Link
                    href="/admin/console"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/console')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Terminal className="w-5 h-5" />
                    {t('admin.console')}
                </Link>
                <Link
                    href="/admin/wiki"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${pathname.startsWith('/admin/wiki')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <BookOpen className="w-5 h-5" />
                    {t('admin.wiki')}
                </Link>
                <Link
                    href="/admin/tickets"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/tickets')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <MessageSquareWarning className="w-5 h-5" />
                    {t('admin.supportTickets')}
                </Link>
                <Link
                    href="/admin/store/packages"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/store/packages')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Coins className="w-5 h-5" />
                    {t('admin.pointPackages')}
                </Link>
                <Link
                    href="/admin/store/products"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/store/products')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <ShoppingBag className="w-5 h-5" />
                    {t('admin.storeProducts')}
                </Link>
                <Link
                    href="/admin/users"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/users')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <UserCog className="w-5 h-5" />
                    {t('admin.userBalances')}
                </Link>
                <Link
                    href="/admin/transactions"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/transactions')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <ReceiptText className="w-5 h-5" />
                    {t('admin.transactions')}
                </Link>
                <Link
                    href="/admin/payments"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/payments')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <CreditCard className="w-5 h-5" />
                    {t('admin.settings.payment')}
                </Link>
                <Link
                    href="/admin/settings"
                    onClick={onClose}
                    className={`px-8 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${isActive('/admin/settings')
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-r-2 border-[var(--primary)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Settings className="w-5 h-5" />
                    {t('admin.settings.title')}
                </Link>
            </div>
        </aside>
    );
}
