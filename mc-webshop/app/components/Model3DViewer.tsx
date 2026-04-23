'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Model3DViewerProps {
    modelUrl?: string; // URL to the .gltf or .glb file
    className?: string;
    showAxes?: boolean;
    autoRotate?: boolean;
    backgroundStyle?: string;
    scale?: number;        // Scale factor (0.5 - 2.0), default 1
    yOffset?: number;      // Y position offset, default 0
    rotateSpeed?: number;  // Rotation speed multiplier, default 1
    onCapture?: (dataUrl: string) => void; // Callback to return captured preview
}

export default function Model3DViewer({
    modelUrl,
    className = '',
    showAxes = false,
    autoRotate = false,
    backgroundStyle = 'bg-gray-900',
    scale = 1,
    yOffset = 0,
    rotateSpeed = 1,
    onCapture
}: Model3DViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
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
        camera.position.set(2, 2, 2); // Initial position, will be adjusted when model loads
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color handling for GLTF
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight2.position.set(-5, -5, -5);
        scene.add(dirLight2);

        // Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);

            if (mixerRef.current) {
                const delta = clockRef.current.getDelta();
                mixerRef.current.update(delta);
            }

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
        if (modelRef.current) {
            // Apply additional scale on top of base scale
            const baseScale = modelRef.current.userData.baseScale || 1;
            modelRef.current.scale.set(baseScale * scale, baseScale * scale, baseScale * scale);
            modelRef.current.position.y = yOffset / 100; // Convert to scene units
        }
    }, [autoRotate, showAxes, scale, yOffset, rotateSpeed]);

    // Model Loading
    useEffect(() => {
        if (!sceneRef.current || !modelUrl) return;

        setIsReadyToCapture(false);

        // Remove existing model
        if (modelRef.current) {
            sceneRef.current.remove(modelRef.current);
            modelRef.current = null;
            mixerRef.current = null;
        }

        const loader = new GLTFLoader();
        loader.load(
            modelUrl,
            (gltf) => {
                const model = gltf.scene;

                // Center and Scale Model
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Reset model position to center
                model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z);

                // Scale to fit in a 2x2x2 box approx
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                model.scale.set(scale, scale, scale);

                sceneRef.current?.add(model);
                modelRef.current = model;

                // Handle Animations if any
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => {
                        mixer.clipAction(clip).play();
                    });
                    mixerRef.current = mixer;
                }

                console.log('GLTF Model loaded successfully');

                // Signal ready for capture after a short delay to allow first render
                setTimeout(() => {
                    setIsReadyToCapture(true);
                }, 200);

            },
            (xhr) => {
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened loading GLTF:', error);
            }
        );

    }, [modelUrl]);

    // Capture Effect
    useEffect(() => {
        if (!onCapture || !rendererRef.current || !sceneRef.current || !isReadyToCapture || !modelRef.current) return;

        const capture = () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current && modelRef.current) {
                // Force Front View
                const originalRotation = modelRef.current.rotation.clone();
                modelRef.current.rotation.set(0, Math.PI / 8, 0); // Slight turn

                if (controlsRef.current) controlsRef.current.reset();

                // Force a render
                rendererRef.current.render(sceneRef.current, cameraRef.current);
                const canvas = rendererRef.current.domElement;
                const dataUrl = canvas.toDataURL('image/png');
                onCapture(dataUrl);

                modelRef.current.rotation.copy(originalRotation);
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
