'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import AdminAuthGuard from '../components/AdminAuthGuard';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    return (
        <AdminAuthGuard>
            {isLoginPage ? (
                // Login page with navbar but no sidebar
                <div className="min-h-screen bg-[#121212] font-sans">
                    <AdminNavbar />
                    {children}
                </div>
            ) : (
                // Admin pages with navbar and sidebar
                <div className="min-h-screen bg-[#121212] font-sans">
                    <AdminNavbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                    {/* Overlay for mobile */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-30 md:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    <div className="md:pl-64 pt-16 transition-all duration-300">
                        <main className="p-4 md:p-8">
                            {children}
                        </main>
                    </div>
                </div>
            )}
        </AdminAuthGuard>
    );
}
