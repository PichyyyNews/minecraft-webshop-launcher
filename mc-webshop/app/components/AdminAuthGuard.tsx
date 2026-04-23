'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_URL } from '../utils/config';

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip auth check for login page
        if (pathname === '/admin/login') {
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('adminToken');

        if (!token) {
            router.push('/admin/login');
            return;
        }

        // Verify token with backend
        fetch(`${API_URL}/api/admin/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                }
            })
            .catch(() => {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [pathname, router]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    // Show login page without auth check
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show protected content only if authenticated
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Return null while redirecting
    return null;
}
