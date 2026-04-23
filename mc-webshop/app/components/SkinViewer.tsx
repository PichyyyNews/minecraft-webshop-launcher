'use client';

import { useEffect, useRef } from 'react';
import { SkinViewer, IdleAnimation, WalkingAnimation, RunningAnimation, FlyingAnimation } from 'skinview3d';

interface SkinViewerProps {
    uuid?: string | null;
    skinUrl?: string;
    width?: number;
    height?: number;
    className?: string;
    autoRotate?: boolean;
    animation?: 'idle' | 'walk' | 'run' | 'fly';
    changeAnimationInterval?: number; // Time in ms to randomly change animation
    isResponsive?: boolean;
}

export default function SkinViewerComponent({
    uuid,
    skinUrl,
    width = 300,
    height = 400,
    className = '',
    autoRotate = false,
    animation = 'idle',
    changeAnimationInterval,
    isResponsive = false
}: SkinViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<SkinViewer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Initialization Effect
    useEffect(() => {
        if (!canvasRef.current) return;

        const viewer = new SkinViewer({
            canvas: canvasRef.current,
            width: isResponsive ? 0 : width,
            height: isResponsive ? 0 : height,
        });

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewerRef.current = viewer;

        return () => {
            viewer.dispose();
            viewerRef.current = null;
        };
    }, []); // Run once on mount

    // 2. Props Update & Resize Effect
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        // Handle skin update
        const skin = uuid ? `https://mineskin.eu/skin/${uuid}` : skinUrl || 'https://mineskin.eu/skin/steve';
        viewer.loadSkin(skin);

        if (isResponsive && containerRef.current) {
            const updateSize = () => {
                if (containerRef.current && viewer) {
                    viewer.width = containerRef.current.clientWidth;
                    viewer.height = containerRef.current.clientHeight;
                }
            };

            const resizeObserver = new ResizeObserver(updateSize);
            resizeObserver.observe(containerRef.current);
            updateSize(); // Initial sizing

            return () => resizeObserver.disconnect();
        } else {
            viewer.width = width;
            viewer.height = height;
        }

    }, [width, height, uuid, skinUrl, isResponsive]);

    // 3. Animation & AutoRotate Effect
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        viewer.autoRotate = autoRotate;
        viewer.autoRotateSpeed = 1;

        const setAnimation = (animName: string) => {
            // Clean previous animation? skinview3d replaces it automatically on assignment.
            switch (animName) {
                case 'walk':
                    viewer.animation = new WalkingAnimation();
                    break;
                case 'run':
                    viewer.animation = new RunningAnimation();
                    break;
                case 'fly':
                    viewer.animation = new FlyingAnimation();
                    break;
                case 'idle':
                default:
                    viewer.animation = new IdleAnimation();
                    break;
            }
        };

        if (changeAnimationInterval) {
            const animations = ['idle', 'walk', 'run', 'fly'];
            const interval = setInterval(() => {
                const randomAnim = animations[Math.floor(Math.random() * animations.length)];
                setAnimation(randomAnim);
            }, changeAnimationInterval);

            // Set initial random
            const randomAnim = animations[Math.floor(Math.random() * animations.length)];
            setAnimation(randomAnim);

            return () => clearInterval(interval);
        } else {
            setAnimation(animation);
        }
    }, [animation, autoRotate, changeAnimationInterval]);

    return (
        <div ref={containerRef} className={`relative ${className} ${isResponsive ? 'w-full h-full' : ''}`}>
            <canvas ref={canvasRef} className="cursor-move" />
        </div>
    );
}
