'use client';

import Link from 'next/link';

export default function BasketPage() {
    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 font-sans">
            <div className="text-center">
                <div className="w-24 h-24 bg-[#1e1e1e] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-xl">
                    <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Your Basket is Empty</h1>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">Looks like you haven't added any items to your basket yet. Browse our store to find the best ranks and items.</p>
                <Link
                    href="/"
                    className="inline-block px-8 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                    Browse Store
                </Link>
            </div>
        </div>
    );
}
