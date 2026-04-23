'use client';

import React, { useEffect } from 'react';
import { API_URL } from '../utils/config';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.primaryColor) {
                    document.documentElement.style.setProperty('--primary', data.primaryColor);
                }
            })
            .catch(err => console.error('Failed to fetch theme settings:', err));
    }, []);

    return <>{children}</>;
}
