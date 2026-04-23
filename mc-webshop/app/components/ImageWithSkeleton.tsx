'use client';

import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { API_URL } from '../utils/config';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt: string;
    className?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export default function ImageWithSkeleton({
    src,
    alt,
    className = '',
    objectFit = 'cover',
    ...props
}: ImageWithSkeletonProps) {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!src) {
            setStatus('error');
            setResolvedSrc(undefined);
            return;
        }

        let newSrc = src;

        // Fix localhost:5000 for remote users (replace with configured API_URL)
        if (newSrc.includes('localhost:5000')) {
            // Remove http://localhost:5000 or localhost:5000 to get relative path
            newSrc = newSrc.replace(/http:\/\/localhost:5000/g, '');
            newSrc = newSrc.replace(/localhost:5000/g, '');
            // Ensure it starts with /
            if (!newSrc.startsWith('/')) newSrc = '/' + newSrc;
        }

        // Handle relative API paths (starting with /uploads)
        if (newSrc.startsWith('/uploads')) {
            // Prepend API_URL - Fallback to localhost:5000 if API_URL is missing
            const effectiveApiUrl = API_URL || 'http://localhost:5000';
            const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;

            console.log('[ImageWithSkeleton] Prepending API_URL:', { src, baseUrl, effectiveApiUrl });
            newSrc = `${baseUrl}${newSrc}`;
        } else {
            console.log('[ImageWithSkeleton] Not prepending API_URL:', { src, newSrc, API_URL });
        }

        setResolvedSrc(newSrc);
        setStatus('loading');
    }, [src]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Skeleton / Placeholder */}
            {(status === 'loading' || status === 'error') && (
                <div className={`absolute inset-0 flex items-center justify-center bg-[#2a2a2a] ${status === 'loading' ? 'animate-pulse' : ''}`}>
                    {status === 'error' ? (
                        <div className="flex flex-col items-center justify-center text-gray-600">
                            <svg
                                className="w-1/3 h-1/3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Actual Image */}
            {resolvedSrc && (
                <img
                    src={resolvedSrc}
                    alt={alt}
                    className={`w-full h-full object-${objectFit} transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'
                        }`}
                    onLoad={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
                    {...props}
                />
            )}
        </div>
    );
}
