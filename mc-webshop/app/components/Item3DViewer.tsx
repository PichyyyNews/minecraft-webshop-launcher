'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Item3DViewerProps {
    imageUrl?: string;
    className?: string;
    showAxes?: boolean;
    autoRotate?: boolean;
    backgroundStyle?: string;
    enableZoom?: boolean;
    yOffset?: number;
    scale?: number;        // Scale factor (0.5 - 2.0), default 1
    rotateSpeed?: number;  // Rotation speed multiplier, default 1
    onCapture?: (dataUrl: string) => void; // Callback to return captured preview
}

export default function Item3DViewer({
    imageUrl,
    className = '',
    showAxes = false,
    autoRotate = false,
    backgroundStyle = 'bg-gray-900',
    enableZoom = true,
    yOffset = 0,
    scale = 1,
    rotateSpeed = 1,
    onCapture
}: Item3DViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
    const itemGroupRef = useRef<THREE.Group | null>(null);
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
        camera.position.z = 32;
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
        controls.enableZoom = enableZoom;
        controlsRef.current = controls;

        // Helpers
        const axesHelper = new THREE.AxesHelper(10);
        axesHelper.visible = showAxes;
        scene.add(axesHelper);
        axesHelperRef.current = axesHelper;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 10, 10);
        scene.add(dirLight);

        // Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
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
            controlsRef.current.enableZoom = enableZoom;
            controlsRef.current.autoRotateSpeed = rotateSpeed * 2; // Base speed is 2
        }
        if (axesHelperRef.current) axesHelperRef.current.visible = showAxes;
        if (itemGroupRef.current) {
            itemGroupRef.current.position.y = yOffset;
            itemGroupRef.current.scale.set(scale, scale, scale);
        }
    }, [autoRotate, showAxes, enableZoom, yOffset, scale, rotateSpeed]);

    // Image Loading
    useEffect(() => {
        if (!imageUrl || !sceneRef.current) return;

        setIsReadyToCapture(false);
        const scene = sceneRef.current;
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            // Cleanup previous
            const prevGroup = scene.getObjectByName('itemGroup');
            if (prevGroup) scene.remove(prevGroup);

            const itemGroup = new THREE.Group();
            itemGroup.name = 'itemGroup';
            itemGroup.position.y = yOffset;
            scene.add(itemGroup);
            itemGroupRef.current = itemGroup;

            // Access Pixel Data
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            try {
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, img.width, img.height).data;

                // Generate Voxels
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

                let voxelCount = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 10) voxelCount++;
                }

                if (voxelCount === 0) {
                    console.warn('[Item3DViewer] No opaque pixels found in image');
                    return;
                }


                const instancedMesh = new THREE.InstancedMesh(geometry, material, voxelCount);
                const dummy = new THREE.Object3D();
                let index = 0;

                const maxDim = Math.max(img.width, img.height);
                const scaleFactor = 16 / maxDim;

                for (let y = 0; y < img.height; y++) {
                    for (let x = 0; x < img.width; x++) {
                        const i = (y * img.width + x) * 4;
                        const a = data[i + 3];
                        if (a > 10) {
                            const r = data[i] / 255;
                            const g = data[i + 1] / 255;
                            const b = data[i + 2] / 255;

                            dummy.position.set(
                                x - img.width / 2 + 0.5,
                                -(y - img.height / 2 + 0.5),
                                0
                            );
                            dummy.updateMatrix();

                            instancedMesh.setMatrixAt(index, dummy.matrix);
                            instancedMesh.setColorAt(index, new THREE.Color(r, g, b));
                            index++;
                        }
                    }
                }

                instancedMesh.instanceMatrix.needsUpdate = true;
                if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

                if (maxDim > 32) {
                    itemGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }

                itemGroup.add(instancedMesh);

                // Signal that the model is ready for capture
                // Small delay to ensure one render cycle has passed
                setTimeout(() => {
                    setIsReadyToCapture(true);
                }, 100);

            } catch (e) {
                console.error('[Item3DViewer] Error processing image:', e);
            }
        };

        img.onerror = (e) => {
            console.error('[Item3DViewer] Error loading image:', imageUrl, e);
        };

        img.src = imageUrl;

    }, [imageUrl]);

    // Capture Effect
    // Capture Effect
    useEffect(() => {
        if (!onCapture || !rendererRef.current || !sceneRef.current || !isReadyToCapture) return;

        // Perform capture
        const capture = () => {
            if (rendererRef.current && sceneRef.current && itemGroupRef.current) {
                // Force "Beauty Angle" for preview - show front face with slight depth
                const originalRotation = itemGroupRef.current.rotation.clone();
                itemGroupRef.current.rotation.set(0, Math.PI / 8, 0);

                // Reset camera position to default
                if (controlsRef.current) controlsRef.current.reset();

                // Ensure a render happens before capture
                rendererRef.current.render(sceneRef.current, cameraRef.current!);
                const canvas = rendererRef.current.domElement;
                const dataUrl = canvas.toDataURL('image/png');
                onCapture(dataUrl);

                // Restore rotation (optional, but good practice)
                itemGroupRef.current.rotation.copy(originalRotation);
            }
        };

        // Allow a slight buffer for the render loop to update
        const timeout = setTimeout(capture, 50);
        return () => clearTimeout(timeout);
    }, [isReadyToCapture, onCapture]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            <div className="absolute inset-0 z-0" style={{ background: backgroundStyle }}></div>
            <div ref={containerRef} className="absolute inset-0 z-10" />
        </div>
    );
}
