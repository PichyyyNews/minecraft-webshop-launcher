'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

type AnimationType = 'fade-up' | 'fade-in' | 'scale-up' | 'slide-in-right' | 'slide-in-left';

interface ScrollAnimationProps {
    children: ReactNode;
    animation?: AnimationType;
    delay?: number;
    className?: string;
    threshold?: number;
    id?: string;
}

export default function ScrollAnimation({
    children,
    animation = 'fade-up',
    delay = 0,
    className = '',
    threshold = 0.1,
    id
}: ScrollAnimationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Once visible, we can stop observing to avoid re-triggering (optional, depends on preference)
                    if (elementRef.current) {
                        observer.unobserve(elementRef.current);
                    }
                }
            },
            {
                threshold: threshold,
                rootMargin: '0px 0px -50px 0px', // Trigger slightly before element is fully in view
            }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            if (elementRef.current) {
                observer.unobserve(elementRef.current);
            }
        };
    }, [threshold]);

    const getAnimationClasses = () => {
        const baseClasses = 'transition-all duration-1000 ease-out transform';

        if (!isVisible) {
            switch (animation) {
                case 'fade-up':
                    return `${baseClasses} opacity-0 translate-y-10`;
                case 'fade-in':
                    return `${baseClasses} opacity-0`;
                case 'scale-up':
                    return `${baseClasses} opacity-0 scale-90`;
                case 'slide-in-right':
                    return `${baseClasses} opacity-0 translate-x-20`;
                case 'slide-in-left':
                    return `${baseClasses} opacity-0 -translate-x-20`;
                default:
                    return baseClasses;
            }
        }

        // Visible state
        return `${baseClasses} opacity-100 translate-y-0 translate-x-0 scale-100`;
    };

    return (
        <div
            ref={elementRef}
            id={id}
            className={`${getAnimationClasses()} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}
