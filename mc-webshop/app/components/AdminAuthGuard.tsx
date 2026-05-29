'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_URL } from '../utils/config';

// Map each sidebar page to its required permission key
const PAGE_PERMISSIONS: Record<string, string> = {
    '/admin': 'dashboard',
    '/admin/info': 'info',
    '/admin/player': 'players',
    '/admin/server': 'server',
    '/admin/launcher': 'launcher',
    '/admin/console': 'console',
    '/admin/wiki': 'wiki',
    '/admin/wiki/editor': 'wiki',
    '/admin/tickets': 'tickets',
    '/admin/store/packages': 'packages',
    '/admin/store/products': 'products',
    '/admin/users': 'users',
    '/admin/transactions': 'transactions',
    '/admin/payments': 'payments',
    '/admin/database': 'database',
    '/admin/settings': 'settings',
    '/admin/permissions': 'permissions',
};

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/admin/login') {
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        fetch(`${API_URL}/api/admin/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Refresh adminUser in localStorage (permissions may have changed)
                    localStorage.setItem('adminUser', JSON.stringify({
                        username: data.username,
                        isRoot: data.isRoot,
                        permissions: data.permissions,
                    }));

                    // Check page-level permission
                    const requiredPerm = PAGE_PERMISSIONS[pathname];
                    if (requiredPerm && !data.isRoot && !data.permissions.includes(requiredPerm)) {
                        // No permission for this page → redirect to dashboard or first allowed page
                        const firstAllowed = Object.entries(PAGE_PERMISSIONS).find(
                            ([, perm]) => data.permissions.includes(perm)
                        );
                        router.push(firstAllowed ? firstAllowed[0] : '/admin/login');
                        return;
                    }

                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    router.push('/admin/login');
                }
            })
            .catch(() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                router.push('/admin/login');
            })
            .finally(() => setIsLoading(false));
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    if (pathname === '/admin/login') return <>{children}</>;
    if (isAuthenticated) return <>{children}</>;
    return null;
}
