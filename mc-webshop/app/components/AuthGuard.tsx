'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        console.info('[AuthGuard] Checking user authentication status');

        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            console.warn('[AuthGuard] No token or user found, redirecting to login');
            router.push(redirectTo);
            return;
        }

        try {
            // Verify user data is valid JSON
            JSON.parse(user);
            console.info('[AuthGuard] User authenticated successfully');
            setIsAuthenticated(true);
        } catch (error) {
            console.error('[AuthGuard] Invalid user data in localStorage:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push(redirectTo);
        } finally {
            setIsLoading(false);
        }
    }, [router, redirectTo]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    // Show protected content only if authenticated
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Return null while redirecting
    return null;
}
