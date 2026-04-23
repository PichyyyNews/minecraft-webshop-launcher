'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Block3DViewerProps {
    textures: {
        front?: string;
        back?: string;
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
    };
    className?: string;
    showAxes?: boolean;
    autoRotate?: boolean;
    backgroundStyle?: string;
    scale?: number;        // Scale factor (0.5 - 2.0), default 1
    yOffset?: number;      // Y position offset, default 0
    rotateSpeed?: number;  // Rotation speed multiplier, default 1
    onCapture?: (dataUrl: string) => void; // Callback to return captured preview
}

export default function Block3DViewer({
    textures,
    className = '',
    showAxes = false,
    autoRotate = false,
    backgroundStyle = 'bg-gray-900',
    scale = 1,
    yOffset = 0,
    rotateSpeed = 1,
    onCapture
}: Block3DViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); // Re-enabled for capture logic
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const [isReadyToCapture, setIsReadyToCapture] = useState(false);

    // Initialization Effect
    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous if exists
        if (rendererRef.current) {
            rendererRef.current.dispose();
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) containerRef.current.removeChild(canvas);
        }

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(1.5, 1, 2.5);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = autoRotate;
        controlsRef.current = controls;

        // Helpers
        const axesHelper = new THREE.AxesHelper(5);
        axesHelper.visible = showAxes;
        scene.add(axesHelper);
        axesHelperRef.current = axesHelper;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // Cube Geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        // Default Material (Gray)
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

        // Initial Mesh (Material checked in texture effect)
        const mesh = new THREE.Mesh(geometry, defaultMaterial);
        scene.add(mesh);
        meshRef.current = mesh;

        // Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            if (rendererRef.current && containerRef.current) {
                const canvas = containerRef.current.querySelector('canvas');
                if (canvas) containerRef.current.removeChild(canvas);
                rendererRef.current.dispose();
            }
        };
    }, []);

    // Prop Updates
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.autoRotate = autoRotate;
            controlsRef.current.autoRotateSpeed = rotateSpeed * 2; // Base speed is 2
        }
        if (axesHelperRef.current) axesHelperRef.current.visible = showAxes;
        if (meshRef.current) {
            meshRef.current.scale.set(scale, scale, scale);
            meshRef.current.position.y = yOffset / 100; // Convert to scene units
        }
    }, [autoRotate, showAxes, scale, yOffset, rotateSpeed]);

    // Texture Loading
    useEffect(() => {
        if (!meshRef.current) return;

        setIsReadyToCapture(false);
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        const loadContent = (url?: string) => {
            if (!url) {
                return new THREE.MeshStandardMaterial({ color: 0x333333 });
            }

            const texture = loader.load(
                url,
                undefined,
                undefined,
                (err) => console.error(`Error loading texture (${url}):`, err)
            );

            // Nearest filter for pixel art look
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;

            return new THREE.MeshStandardMaterial({ map: texture });
        };

        // Order: right, left, top, bottom, front, back
        const materials = [
            loadContent(textures.right),
            loadContent(textures.left),
            loadContent(textures.top),
            loadContent(textures.bottom),
            loadContent(textures.front),
            loadContent(textures.back),
        ];

        meshRef.current.material = materials;

        // Signal ready
        setTimeout(() => setIsReadyToCapture(true), 200);

    }, [textures]);

    // Capture Effect
    // Capture Effect
    useEffect(() => {
        if (!onCapture || !rendererRef.current || !sceneRef.current || !isReadyToCapture) return;

        const capture = () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                // Ensure Isometric Angle
                if (controlsRef.current) controlsRef.current.reset();

                rendererRef.current.render(sceneRef.current, cameraRef.current);
                const canvas = rendererRef.current.domElement;
                const dataUrl = canvas.toDataURL('image/png');
                onCapture(dataUrl);
            }
        };

        const timeout = setTimeout(capture, 100);
        return () => clearTimeout(timeout);
    }, [isReadyToCapture, onCapture]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            <div className="absolute inset-0 z-0" style={{ background: backgroundStyle }}></div>
            <div ref={containerRef} className="absolute inset-0 z-10" />
        </div>
    );
}
