'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for 3D viewers to avoid SSR issues
const Item3DViewer = dynamic(() => import('./Item3DViewer'), { ssr: false });
const Block3DViewer = dynamic(() => import('./Block3DViewer'), { ssr: false });
const Model3DViewer = dynamic(() => import('./Model3DViewer'), { ssr: false });

// Item rarity types with CS:GO-style colors
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
type DisplayType = 'emoji' | 'image' | 'item3d' | 'block3d' | 'gltf';

interface BlockTextures {
    front?: string;
    back?: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
}

interface CaseItem {
    id: string;
    name: string;
    displayType: DisplayType;
    // For emoji/image
    image: string;
    // For item3d
    itemTexture?: string;
    // For block3d
    blockTextures?: BlockTextures;
    // For gltf
    gltfUrl?: string;
    rarity: Rarity;
    chance: number;
    // Model adjustment options
    modelScale?: number;       // Scale factor (0.5 - 2.0), default 1
    modelYOffset?: number;     // Y position offset (-50 to 50), default 0
    modelRotateSpeed?: number; // Rotation speed multiplier (0 - 5), default 1
    cachedPreview?: string;    // Data URL of the rendered 3D model for fast display
}

interface CaseOpeningProps {
    initialItems?: CaseItem[];
    onResult?: (item: CaseItem) => void;
    caseName?: string;
    caseId?: string;    // Unique ID for localStorage persistence
    editable?: boolean;
    onItemsChange?: (items: CaseItem[]) => void; // Callback when items change
}

const RARITY_COLORS: Record<Rarity, { bg: string; border: string; glow: string; text: string }> = {
    common: {
        bg: 'linear-gradient(180deg, #5a5a5a 0%, #3d3d3d 100%)',
        border: '#6b6b6b',
        glow: '0 0 20px rgba(107, 107, 107, 0.5)',
        text: '#b0b0b0'
    },
    uncommon: {
        bg: 'linear-gradient(180deg, #4a69bd 0%, #2c3e50 100%)',
        border: '#5d8bf4',
        glow: '0 0 20px rgba(93, 139, 244, 0.5)',
        text: '#5d8bf4'
    },
    rare: {
        bg: 'linear-gradient(180deg, #8854d0 0%, #5f27cd 100%)',
        border: '#a855f7',
        glow: '0 0 25px rgba(168, 85, 247, 0.6)',
        text: '#a855f7'
    },
    epic: {
        bg: 'linear-gradient(180deg, #d63031 0%, #a71d31 100%)',
        border: '#ff4757',
        glow: '0 0 30px rgba(255, 71, 87, 0.6)',
        text: '#ff4757'
    },
    legendary: {
        bg: 'linear-gradient(180deg, #f39c12 0%, #d68910 100%)',
        border: '#ffd700',
        glow: '0 0 35px rgba(255, 215, 0, 0.7)',
        text: '#ffd700'
    },
    mythic: {
        bg: 'linear-gradient(180deg, #ff6b6b 0%, #ee5a24 100%)',
        border: '#ff9f43',
        glow: '0 0 40px rgba(255, 159, 67, 0.8), 0 0 60px rgba(238, 90, 36, 0.4)',
        text: '#ff9f43'
    }
};

const RARITY_LABELS: Record<Rarity, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic'
};

const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = {
    emoji: '😀 Emoji',
    image: '🖼️ Image',
    item3d: '🗡️ Item 3D',
    block3d: '📦 Block 3D',
    gltf: '🎮 GLTF Model'
};

const RARITY_OPTIONS: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const DISPLAY_TYPE_OPTIONS: DisplayType[] = ['emoji', 'image', 'item3d', 'block3d', 'gltf'];

const EMOJI_OPTIONS = ['⚔️', '📖', '🍎', '💎', '🔩', '⚫', '🪵', '🏆', '⭐', '🎁', '🔮', '🛡️', '🎯', '💰', '🔥', '❄️', '⚡', '🌟'];

// Default sample items for demo
const DEFAULT_ITEMS: CaseItem[] = [
    { id: '1', name: 'Diamond Sword', displayType: 'emoji', image: '⚔️', rarity: 'legendary', chance: 2 },
    { id: '2', name: 'Enchanted Book', displayType: 'emoji', image: '📖', rarity: 'epic', chance: 5 },
    { id: '3', name: 'Golden Apple', displayType: 'emoji', image: '🍎', rarity: 'rare', chance: 10 },
    { id: '4', name: 'Emerald Block', displayType: 'emoji', image: '💎', rarity: 'rare', chance: 10 },
    { id: '5', name: 'Iron Ingot', displayType: 'emoji', image: '🔩', rarity: 'uncommon', chance: 20 },
    { id: '6', name: 'Coal', displayType: 'emoji', image: '⚫', rarity: 'common', chance: 25 },
    { id: '7', name: 'Stick', displayType: 'emoji', image: '🪵', rarity: 'common', chance: 28 },
];

// Sound Manager using Web Audio API
const useSoundManager = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const playTick = useCallback(() => {
        try {
            const ctx = initAudio();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = 800 + Math.random() * 400;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.05);
        } catch (e) {
            console.warn('[SoundManager] Audio tick failed:', e);
        }
    }, [initAudio]);

    const playWin = useCallback((rarity: Rarity) => {
        try {
            const ctx = initAudio();

            const frequencies = {
                common: [400, 500, 600],
                uncommon: [500, 600, 700],
                rare: [600, 750, 900],
                epic: [700, 900, 1100],
                legendary: [800, 1000, 1200, 1400],
                mythic: [900, 1100, 1300, 1500, 1700]
            };

            const freqs = frequencies[rarity];
            freqs.forEach((freq, i) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine';

                const startTime = ctx.currentTime + i * 0.1;
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.3);
            });
        } catch (e) {
            console.warn('[SoundManager] Audio win failed:', e);
        }
    }, [initAudio]);

    return { playTick, playWin };
};

// Item Display Component - renders item based on displayType
// use3D controls whether to show actual 3D viewers (expensive) or just placeholder icons (fast)
function ItemDisplay({
    item,
    use3D = true,
    onCapture
}: {
    item: CaseItem;
    use3D?: boolean;
    onCapture?: (dataUrl: string) => void;
}) {
    // Priority 1: Use cached preview image if we are in non-3D mode (perfect for spin strip)
    if (!use3D && item.cachedPreview) {
        return (
            <div className="flex items-center justify-center w-full h-full p-2">
                <img
                    src={item.cachedPreview}
                    alt={item.name}
                    className={`max-w-full max-h-full object-contain drop-shadow-md ${(item.displayType === 'item3d' || item.displayType === 'block3d' || item.displayType === 'gltf')
                        ? 'animate-spin-y'
                        : ''
                        }`}
                />
            </div>
        );
    }

    // New logic: If non-3D and no preview, but it IS a 3D type, it might be in the snapshot queue
    const is3DType = item.displayType === 'item3d' || item.displayType === 'block3d' || item.displayType === 'gltf';
    if (!use3D && is3DType && !item.cachedPreview) {
        const placeholderIcon = item.displayType === 'item3d' ? '🗡️' : item.displayType === 'block3d' ? '📦' : '🎮';
        return (
            <div className="flex flex-col items-center justify-center w-full h-full p-2 relative">
                <span
                    className="text-6xl drop-shadow-2xl animate-pulse"
                    style={{
                        textShadow: '0 0 10px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.8)'
                    }}
                >
                    {placeholderIcon}
                </span>
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-white/50" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
            </div>
        );
    }

    switch (item.displayType) {
        case 'emoji':
            return (
                <div className="flex items-center justify-center w-full h-full">
                    <span
                        className="text-6xl drop-shadow-2xl text-white"
                        style={{ textShadow: '0 5px 15px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,1)' }}
                    >
                        {item.image}
                    </span>
                </div>
            );

        case 'image':
            return (
                <div className="flex items-center justify-center w-full h-full p-2">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain drop-shadow-md"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="50">❓</text></svg>';
                        }}
                    />
                </div>
            );

        case 'item3d':
            return (
                <div className="w-full h-full relative">
                    {item.itemTexture ? (
                        <Item3DViewer
                            imageUrl={item.itemTexture}
                            autoRotate={true}
                            backgroundStyle="transparent"
                            enableZoom={false}
                            className="absolute inset-0"
                            scale={item.modelScale ?? 1}
                            yOffset={item.modelYOffset ?? 0}
                            rotateSpeed={item.modelRotateSpeed ?? 1}
                            onCapture={onCapture}
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-5xl opacity-50">🗡️</div>
                    )}
                </div>
            );

        case 'block3d':
            return (
                <div className="w-full h-full relative">
                    {item.blockTextures && Object.keys(item.blockTextures).length > 0 ? (
                        <Block3DViewer
                            textures={item.blockTextures}
                            autoRotate={true}
                            backgroundStyle="transparent"
                            className="absolute inset-0"
                            scale={item.modelScale ?? 1}
                            yOffset={item.modelYOffset ?? 0}
                            rotateSpeed={item.modelRotateSpeed ?? 1}
                            onCapture={onCapture}
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-5xl opacity-50">📦</div>
                    )}
                </div>
            );

        case 'gltf':
            return (
                <div className="w-full h-full relative">
                    {item.gltfUrl ? (
                        <Model3DViewer
                            modelUrl={item.gltfUrl}
                            autoRotate={true}
                            backgroundStyle="transparent"
                            className="absolute inset-0"
                            scale={item.modelScale ?? 1}
                            yOffset={item.modelYOffset ?? 0}
                            rotateSpeed={item.modelRotateSpeed ?? 1}
                            onCapture={onCapture}
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-5xl opacity-50">🎮</div>
                    )}
                </div>
            );

        default:
            return (
                <div className="flex items-center justify-center w-full h-full text-4xl">
                    <span>❓</span>
                </div>
            );
    }
}

export default function CaseOpening({
    initialItems = DEFAULT_ITEMS,
    onResult,
    caseName = "Mystery Case",
    caseId = "default",
    editable = true,
    onItemsChange
}: CaseOpeningProps) {
    const [items, setItems] = useState<CaseItem[]>(() => {
        // Load from localStorage on initial mount
        if (typeof window !== 'undefined' && caseId) {
            try {
                const saved = localStorage.getItem(`case-opening-${caseId}`);
                if (saved) {
                    console.info(`[CaseOpening] Loaded saved items for case: ${caseId}`);
                    return JSON.parse(saved);
                }
            } catch (e) {
                console.warn('[CaseOpening] Failed to load saved items:', e);
            }
        }
        return initialItems;
    });
    const [isSpinning, setIsSpinning] = useState(false);
    const [wonItem, setWonItem] = useState<CaseItem | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [spinItems, setSpinItems] = useState<CaseItem[]>([]);
    const [translateX, setTranslateX] = useState(0);
    const [tickCount, setTickCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingItem, setEditingItem] = useState<CaseItem | null>(null);
    const [enable3DStrip, setEnable3DStrip] = useState(false); // New setting for 3D in strip
    const [snapshotQueue, setSnapshotQueue] = useState<CaseItem[]>([]);
    const [currentSnapshotItem, setCurrentSnapshotItem] = useState<CaseItem | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    // Set hasMounted to true after client-side mount
    useEffect(() => {
        setHasMounted(true);
    }, []);

    const stripRef = useRef<HTMLDivElement>(null);
    const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const texturesCacheRef = useRef<Set<string>>(new Set()); // Cache for loaded textures
    const [isPreloading, setIsPreloading] = useState(false);

    const { playTick, playWin } = useSoundManager();

    const ITEM_WIDTH = 140;
    const VISIBLE_ITEMS = 5;
    const SPIN_ITEMS_COUNT = 60;
    const WINNING_INDEX = 50;

    // Automated Snapshot System - converts 3D to Image previews in background
    useEffect(() => {
        // Find items that need a preview and aren't already being processed
        const needsSnapshot = items.filter(item =>
            (item.displayType === 'item3d' || item.displayType === 'block3d' || item.displayType === 'gltf') &&
            !item.cachedPreview &&
            !snapshotQueue.some(q => q.id === item.id) &&
            currentSnapshotItem?.id !== item.id
        );

        if (needsSnapshot.length > 0) {
            setSnapshotQueue(prev => {
                // Final double-check to avoid duplicates in the queue
                const filtered = needsSnapshot.filter(n => !prev.some(p => p.id === n.id));
                return [...prev, ...filtered];
            });
        }
    }, [items, snapshotQueue, currentSnapshotItem]);

    // Process the queue one by one
    useEffect(() => {
        if (snapshotQueue.length > 0 && !currentSnapshotItem) {
            const next = snapshotQueue[0];
            setCurrentSnapshotItem(next);
            setSnapshotQueue(prev => prev.slice(1));
        }
    }, [snapshotQueue, currentSnapshotItem]);

    const handleSnapshotCapture = useCallback((dataUrl: string) => {
        if (currentSnapshotItem) {
            // Update items and persist
            setItems(prevItems => {
                const updated = prevItems.map(i => i.id === currentSnapshotItem.id ? { ...i, cachedPreview: dataUrl } : i);
                return updated;
            });
            setCurrentSnapshotItem(null);
            console.info(`[CaseOpening] Captured snapshot for: ${currentSnapshotItem.name}`);
        }
    }, [currentSnapshotItem, setItems]);

    // Preload all textures/images/models for items
    const preloadTextures = useCallback(async (): Promise<void> => {
        const textureUrls: string[] = [];
        const gltfUrls: string[] = [];

        for (const item of items) {
            // Image type
            if (item.displayType === 'image' && item.image) {
                if (!texturesCacheRef.current.has(item.image)) {
                    textureUrls.push(item.image);
                }
            }
            // Item3D type
            if (item.displayType === 'item3d' && item.itemTexture) {
                if (!texturesCacheRef.current.has(item.itemTexture)) {
                    textureUrls.push(item.itemTexture);
                }
            }
            // Block3D type - all faces
            if (item.displayType === 'block3d' && item.blockTextures) {
                Object.values(item.blockTextures).forEach(url => {
                    if (url && !texturesCacheRef.current.has(url)) {
                        textureUrls.push(url);
                    }
                });
            }
            // GLTF type
            if (item.displayType === 'gltf' && item.gltfUrl) {
                if (!texturesCacheRef.current.has(item.gltfUrl)) {
                    gltfUrls.push(item.gltfUrl);
                }
            }
        }

        if (textureUrls.length === 0 && gltfUrls.length === 0) {
            console.info('[CaseOpening] All assets already cached');
            // Give a tiny delay so the "Loading" state is actually visible for UX feedback
            await new Promise(r => setTimeout(r, 500));
            return;
        }

        console.info(`[CaseOpening] Preloading ${textureUrls.length} textures and ${gltfUrls.length} models...`);

        // Preload textures in parallel
        const texturePromises = textureUrls.map(url => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    texturesCacheRef.current.add(url);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`[CaseOpening] Failed to preload texture: ${url.substring(0, 50)}...`);
                    resolve();
                };
                img.src = url;
            });
        });

        // Preload GLTF models in parallel
        const gltfPromises = gltfUrls.map(url => {
            return new Promise<void>((resolve) => {
                const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
                const loader = new GLTFLoader();
                loader.load(
                    url,
                    () => {
                        texturesCacheRef.current.add(url);
                        resolve();
                    },
                    undefined,
                    (err: any) => {
                        console.warn(`[CaseOpening] Failed to preload model: ${url.substring(0, 50)}...`, err);
                        resolve();
                    }
                );
            });
        });

        await Promise.all([...texturePromises, ...gltfPromises]);

        // Final "settle" delay to ensure textures are uploaded to GPU
        await new Promise(r => setTimeout(r, 300));

        console.info('[CaseOpening] All assets preloaded');
    }, [items]);

    // Save to localStorage with debounce
    const saveToStorage = useCallback((itemsToSave: CaseItem[]) => {
        if (typeof window !== 'undefined' && caseId) {
            // Debounce save
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                try {
                    localStorage.setItem(`case-opening-${caseId}`, JSON.stringify(itemsToSave));
                    console.info(`[CaseOpening] Saved items for case: ${caseId}`);
                } catch (e) {
                    console.error('[CaseOpening] Failed to save items:', e);
                }
            }, 500);
        }
        if (onItemsChange) {
            onItemsChange(itemsToSave);
        }
    }, [caseId, onItemsChange]);

    // Auto-save when items change
    useEffect(() => {
        saveToStorage(items);
    }, [items, saveToStorage]);

    // Export items as JSON
    const exportItems = useCallback(() => {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `case-${caseId}-items.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.info(`[CaseOpening] Exported items for case: ${caseId}`);
    }, [items, caseId]);

    // Import items from JSON
    const importItems = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (Array.isArray(imported) && imported.length > 0) {
                    setItems(imported);
                    console.info(`[CaseOpening] Imported ${imported.length} items`);
                }
            } catch (err) {
                console.error('[CaseOpening] Failed to import items:', err);
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    }, []);

    // Reset to default items
    const resetToDefault = useCallback(() => {
        setItems(DEFAULT_ITEMS);
        if (typeof window !== 'undefined' && caseId) {
            localStorage.removeItem(`case-opening-${caseId}`);
        }
        console.info('[CaseOpening] Reset to default items');
    }, [caseId]);

    const totalPercentage = items.reduce((sum, item) => sum + item.chance, 0);

    const balancePercentages = useCallback((itemsToBalance: CaseItem[], changedItemId?: string, newValue?: number): CaseItem[] => {
        if (itemsToBalance.length === 0) return [];

        const result = [...itemsToBalance];

        if (changedItemId && newValue !== undefined) {
            const changedIndex = result.findIndex(i => i.id === changedItemId);
            if (changedIndex !== -1) {
                const oldValue = result[changedIndex].chance;
                const diff = newValue - oldValue;
                result[changedIndex].chance = newValue;

                const otherItems = result.filter(i => i.id !== changedItemId && i.chance > 0);
                if (otherItems.length > 0 && diff !== 0) {
                    const totalOtherChance = otherItems.reduce((sum, i) => sum + i.chance, 0);

                    for (let i = 0; i < result.length; i++) {
                        if (result[i].id !== changedItemId && result[i].chance > 0) {
                            const proportion = result[i].chance / totalOtherChance;
                            const adjustment = Math.round(diff * proportion);
                            result[i].chance = Math.max(1, result[i].chance - adjustment);
                        }
                    }
                }
            }
        }

        const currentTotal = result.reduce((sum, i) => sum + i.chance, 0);
        if (currentTotal !== 100 && result.length > 0) {
            const diff = 100 - currentTotal;
            const maxItem = result.reduce((max, item) => item.chance > max.chance ? item : max, result[0]);
            const idx = result.findIndex(i => i.id === maxItem.id);
            if (idx !== -1) {
                result[idx].chance = Math.max(1, result[idx].chance + diff);
            }
        }

        return result;
    }, []);

    const addItem = useCallback(() => {
        const newItem: CaseItem = {
            id: Date.now().toString(),
            name: 'New Item',
            displayType: 'emoji',
            image: '🎁',
            rarity: 'common',
            chance: 10
        };

        const newItems = items.map(item => ({
            ...item,
            chance: Math.max(1, Math.floor(item.chance * 0.9))
        }));

        const currentTotal = newItems.reduce((sum, i) => sum + i.chance, 0);
        newItem.chance = 100 - currentTotal;

        setItems(balancePercentages([...newItems, newItem]));
        setEditingItem(newItem);
        console.info(`[CaseOpening] Added new item: ${newItem.name}`);
    }, [items, balancePercentages]);

    const removeItem = useCallback((itemId: string) => {
        if (items.length <= 2) {
            console.warn('[CaseOpening] Cannot remove item: minimum 2 items required');
            return;
        }

        const removedItem = items.find(i => i.id === itemId);
        const remainingItems = items.filter(i => i.id !== itemId);
        const removedChance = removedItem?.chance || 0;

        const totalRemaining = remainingItems.reduce((sum, i) => sum + i.chance, 0);
        const newItems = remainingItems.map(item => ({
            ...item,
            chance: Math.round(item.chance + (item.chance / totalRemaining) * removedChance)
        }));

        setItems(balancePercentages(newItems));
        if (editingItem?.id === itemId) {
            setEditingItem(null);
        }
        console.info(`[CaseOpening] Removed item: ${removedItem?.name}`);
    }, [items, editingItem, balancePercentages]);

    const updateItem = useCallback((itemId: string, updates: Partial<CaseItem>) => {
        if ('chance' in updates && updates.chance !== undefined) {
            const newChance = Math.min(95, Math.max(1, updates.chance));
            setItems(prev => balancePercentages(prev, itemId, newChance));
        } else {
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            ));
            // Update editingItem if we're editing this item
            if (editingItem?.id === itemId) {
                setEditingItem(prev => prev ? { ...prev, ...updates } : null);
            }
        }
    }, [balancePercentages, editingItem]);

    // Handle file upload for textures/images
    const handleFileUpload = useCallback((itemId: string, field: 'image' | 'itemTexture' | 'gltfUrl', file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                if (field === 'gltfUrl') {
                    // For GLTF, create object URL
                    const url = URL.createObjectURL(file);
                    updateItem(itemId, { [field]: url });
                } else {
                    updateItem(itemId, { [field]: e.target.result as string });
                }
            }
        };

        if (field === 'gltfUrl') {
            // Don't read as data URL for GLTF
            const url = URL.createObjectURL(file);
            updateItem(itemId, { [field]: url });
        } else {
            reader.readAsDataURL(file);
        }
    }, [updateItem]);

    // Handle block texture upload
    const handleBlockTextureUpload = useCallback((itemId: string, face: keyof BlockTextures, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const item = items.find(i => i.id === itemId);
                const currentTextures = item?.blockTextures || {};
                updateItem(itemId, {
                    blockTextures: {
                        ...currentTextures,
                        [face]: e.target.result as string
                    }
                });
            }
        };
        reader.readAsDataURL(file);
    }, [items, updateItem]);

    const generateSpinItems = useCallback((winningItem: CaseItem): CaseItem[] => {
        const result: CaseItem[] = [];

        for (let i = 0; i < SPIN_ITEMS_COUNT; i++) {
            if (i === WINNING_INDEX) {
                result.push(winningItem);
            } else {
                const random = Math.random() * 100;
                let cumulative = 0;
                let selected = items[0];

                for (const item of items) {
                    cumulative += item.chance;
                    if (random <= cumulative) {
                        selected = item;
                        break;
                    }
                }
                result.push(selected);
            }
        }

        return result;
    }, [items]);

    const pickWinner = useCallback((): CaseItem => {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const item of items) {
            cumulative += item.chance;
            if (random <= cumulative) {
                return item;
            }
        }

        return items[items.length - 1];
    }, [items]);

    const spin = useCallback(async () => {
        if (isSpinning || isPreloading) return;

        console.info('[CaseOpening] Preparing to spin - preloading textures...');

        // Preload all textures first
        setIsPreloading(true);
        try {
            await preloadTextures();
        } catch (e) {
            console.error('[CaseOpening] Preload error:', e);
        }
        setIsPreloading(false);

        console.info('[CaseOpening] Starting spin animation');

        setShowResult(false);
        setWonItem(null);
        setTranslateX(0);
        setTickCount(0);
        setShowEditor(false);

        const winner = pickWinner();
        const newSpinItems = generateSpinItems(winner);
        setSpinItems(newSpinItems);

        setTimeout(() => {
            setIsSpinning(true);

            const centerOffset = (VISIBLE_ITEMS * ITEM_WIDTH) / 2 - ITEM_WIDTH / 2;
            const targetPosition = WINNING_INDEX * ITEM_WIDTH - centerOffset;
            const randomOffset = (Math.random() - 0.5) * 60;

            setTranslateX(-(targetPosition + randomOffset));

            if (soundEnabled) {
                let tickDelay = 50;
                let elapsed = 0;
                const totalDuration = 6000;

                const tick = () => {
                    if (elapsed < totalDuration - 500) {
                        playTick();
                        setTickCount(prev => prev + 1);

                        const progress = elapsed / totalDuration;
                        tickDelay = 50 + progress * 200;
                        elapsed += tickDelay;

                        tickIntervalRef.current = setTimeout(tick, tickDelay);
                    }
                };

                tick();
            }
        }, 50);

        setTimeout(() => {
            setIsSpinning(false);
            setWonItem(winner);
            setShowResult(true);

            if (tickIntervalRef.current) {
                clearTimeout(tickIntervalRef.current);
            }

            if (soundEnabled) {
                playWin(winner.rarity);
            }

            console.info(`[CaseOpening] Spin complete - Won: ${winner.name} (${winner.rarity})`);

            if (onResult) {
                onResult(winner);
            }
        }, 6000);

    }, [isSpinning, isPreloading, preloadTextures, pickWinner, generateSpinItems, onResult, soundEnabled, playTick, playWin]);

    const reset = useCallback(() => {
        setShowResult(false);
        setWonItem(null);
        setTranslateX(0);
        setSpinItems([]);
        setTickCount(0);
    }, []);

    useEffect(() => {
        return () => {
            if (tickIntervalRef.current) {
                clearTimeout(tickIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (spinItems.length === 0) {
            const previewItems: CaseItem[] = [];
            for (let i = 0; i < VISIBLE_ITEMS + 2; i++) {
                const random = Math.random() * 100;
                let cumulative = 0;
                let selected = items[0];

                for (const item of items) {
                    cumulative += item.chance;
                    if (random <= cumulative) {
                        selected = item;
                        break;
                    }
                }
                previewItems.push(selected);
            }
            setSpinItems(previewItems);
        }
    }, [items, spinItems.length]);

    if (!hasMounted) {
        return <div className="min-h-[600px] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="w-full flex flex-col items-center gap-6">
            {/* Case Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
                    {caseName}
                </h2>
                <p className="text-gray-400 text-sm">Press OPEN to reveal your reward!</p>
            </div>

            {/* Main Case Opening Container */}
            <div className="relative w-full max-w-[1000px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full" />

                {/* Top Controls */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {editable && (
                        <button
                            onClick={() => setShowEditor(!showEditor)}
                            className={`p-2 rounded-lg transition-all text-xl ${showEditor ? 'bg-green-500/30 text-green-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title="Edit items"
                        >
                            ⚙️
                        </button>
                    )}
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-xl"
                        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                    >
                        {soundEnabled ? '🔊' : '🔇'}
                    </button>
                </div>

                {/* Spin Strip Container */}
                <div className="relative h-[220px] overflow-hidden rounded-xl bg-black/50 border border-white/5 flex items-center">

                    <div className="absolute left-1/2 top-0 bottom-0 w-[4px] bg-yellow-500 -translate-x-1/2 z-20 shadow-[0_0_20px_rgba(234,179,8,0.8)]">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-yellow-500" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-yellow-500" />
                    </div>

                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-black/40 to-transparent z-10 pointer-events-none" />

                    {isSpinning && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-black/80 px-3 py-1 rounded-full">
                            <span className="text-yellow-400 text-xs font-mono animate-pulse">
                                🎰 {tickCount}
                            </span>
                        </div>
                    )}

                    <div
                        ref={stripRef}
                        className="flex gap-2 items-center absolute left-0"
                        style={{
                            transform: `translateX(${translateX}px)`,
                            transition: isSpinning
                                ? 'transform 6s cubic-bezier(0.15, 0.85, 0.25, 1)'
                                : 'none',
                            left: `calc(50% - ${(3 * 140)}px)`,
                        }}
                    >
                        {spinItems.map((spinItem, index) => {
                            // Important: Use the latest item data from state to get updated cachedPreview
                            const item = items.find(i => i.id === spinItem.id) || spinItem;
                            const rarityStyle = RARITY_COLORS[item.rarity];
                            return (
                                <div
                                    key={`${item.id}-${index}`}
                                    className="flex-shrink-0 w-[130px] h-[180px] rounded-lg overflow-hidden relative group transition-transform hover:scale-105"
                                    style={{
                                        background: rarityStyle.bg,
                                        border: `2px solid ${rarityStyle.border}`,
                                        boxShadow: rarityStyle.glow,
                                    }}
                                >
                                    {/* 3D/Image Content Area - use3D depends on settings */}
                                    <div className="w-full h-[130px] relative z-0">
                                        <ItemDisplay
                                            item={item}
                                            use3D={enable3DStrip}
                                        />
                                    </div>

                                    {/* Item Info - at the bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm px-2 py-2 z-10">
                                        <p className="text-xs font-bold text-white truncate text-center">
                                            {item.name}
                                        </p>
                                        <p
                                            className="text-[10px] text-center font-medium"
                                            style={{ color: rarityStyle.text }}
                                        >
                                            {RARITY_LABELS[item.rarity]}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={spin}
                        disabled={isSpinning || isPreloading}
                        className={`
                            px-10 py-4 rounded-xl font-bold text-lg uppercase tracking-wider
                            transition-all duration-300 transform
                            ${isSpinning || isPreloading
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed scale-95'
                                : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-95'
                            }
                        `}
                    >
                        {isPreloading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Loading...
                            </span>
                        ) : isSpinning ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Opening...
                            </span>
                        ) : (
                            '🎰 OPEN CASE'
                        )}
                    </button>

                    {showResult && (
                        <button
                            onClick={reset}
                            className="px-6 py-4 rounded-xl font-bold text-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                        >
                            🔄 Again
                        </button>
                    )}
                </div>
            </div>

            {/* Item Editor Panel */}
            {showEditor && editable && (
                <div className="w-full max-w-[1000px] bg-[#1a1a2e] rounded-xl p-6 border border-white/10 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">📦 Item Editor</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-mono mr-2 ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
                                Total: {totalPercentage}%
                            </span>
                            <button
                                onClick={addItem}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white text-xs transition-all"
                            >
                                + Add
                            </button>
                            <button
                                onClick={exportItems}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white text-xs transition-all"
                                title="Export items as JSON"
                            >
                                📥 Export
                            </button>
                            <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white text-xs transition-all cursor-pointer"
                                title="Import items from JSON">
                                📤 Import
                                <input type="file" accept=".json" className="hidden" onChange={importItems} />
                            </label>
                            <button
                                onClick={resetToDefault}
                                className="px-3 py-1.5 bg-red-600/50 hover:bg-red-500 rounded-lg font-bold text-white text-xs transition-all"
                                title="Reset to default items"
                            >
                                🔄 Reset
                            </button>
                            <button
                                onClick={() => {
                                    setItems(prev => prev.map(i => ({ ...i, cachedPreview: undefined })));
                                    console.info('[CaseOpening] Cleared all cached previews to force regeneration');
                                }}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-white text-xs transition-all"
                                title="Regenerate all 3D previews"
                            >
                                📸 Refresh 3D
                            </button>
                            <button
                                onClick={() => setEnable3DStrip(!enable3DStrip)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${enable3DStrip
                                    ? 'bg-purple-600 border-purple-400 text-white'
                                    : 'bg-transparent border-white/20 text-white/50 hover:bg-white/10'
                                    }`}
                                title="Warning: High Performance Cost! May crash on weak devices."
                            >
                                {enable3DStrip ? '⚡ 3D ON' : '🔋 3D OFF'}
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {items.map((item) => {
                            const rarityStyle = RARITY_COLORS[item.rarity];
                            const isEditing = editingItem?.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-lg transition-all ${isEditing ? 'bg-white/10 ring-2 ring-yellow-500/50' : 'bg-black/30 hover:bg-black/40'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Preview - larger when editing to match spin strip */}
                                        <div
                                            className={`rounded-lg flex-shrink-0 overflow-hidden transition-all ${isEditing ? 'w-[130px] h-[140px]' : 'w-16 h-16'}`}
                                            style={{ background: rarityStyle.bg, border: `2px solid ${rarityStyle.border}` }}
                                        >
                                            <ItemDisplay
                                                item={item}
                                                onCapture={(dataUrl) => {
                                                    // Only update if it actually changed to avoid infinite re-renders
                                                    if (item.cachedPreview !== dataUrl) {
                                                        updateItem(item.id, { cachedPreview: dataUrl });
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Basic Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                                        className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                                        placeholder="Item name"
                                                    />
                                                ) : (
                                                    <p className="text-white font-medium truncate">{item.name}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Rarity */}
                                                {isEditing ? (
                                                    <select
                                                        value={item.rarity}
                                                        onChange={(e) => updateItem(item.id, { rarity: e.target.value as Rarity })}
                                                        className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm"
                                                        style={{ color: rarityStyle.text }}
                                                    >
                                                        {RARITY_OPTIONS.map(r => (
                                                            <option key={r} value={r}>{RARITY_LABELS[r]}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs px-2 py-0.5 rounded" style={{ color: rarityStyle.text, background: 'rgba(255,255,255,0.1)' }}>
                                                        {RARITY_LABELS[item.rarity]}
                                                    </span>
                                                )}

                                                {/* Display Type */}
                                                {isEditing && (
                                                    <select
                                                        value={item.displayType}
                                                        onChange={(e) => updateItem(item.id, { displayType: e.target.value as DisplayType })}
                                                        className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white"
                                                    >
                                                        {DISPLAY_TYPE_OPTIONS.map(dt => (
                                                            <option key={dt} value={dt}>{DISPLAY_TYPE_LABELS[dt]}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {/* Chance Slider */}
                                        <div className="flex items-center gap-2 w-[150px]">
                                            <input
                                                type="range"
                                                min="1"
                                                max="95"
                                                value={item.chance}
                                                onChange={(e) => updateItem(item.id, { chance: parseInt(e.target.value) })}
                                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                            />
                                            <span className="text-yellow-400 font-mono text-sm w-10 text-right">
                                                {item.chance}%
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingItem(isEditing ? null : item)}
                                                className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-yellow-500/30 text-yellow-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                            >
                                                {isEditing ? '✓' : '✏️'}
                                            </button>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all disabled:opacity-50"
                                                disabled={items.length <= 2}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Edit Options */}
                                    {isEditing && (
                                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                            {/* Emoji Selector */}
                                            {item.displayType === 'emoji' && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">Select Emoji:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {EMOJI_OPTIONS.map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => updateItem(item.id, { image: emoji })}
                                                                className={`w-8 h-8 rounded text-lg hover:bg-white/20 transition-all ${item.image === emoji ? 'bg-white/30 ring-1 ring-white' : ''}`}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Image URL */}
                                            {item.displayType === 'image' && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">Image URL or Upload:</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item.image}
                                                            onChange={(e) => updateItem(item.id, { image: e.target.value })}
                                                            className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                                            placeholder="https://..."
                                                        />
                                                        <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm cursor-pointer">
                                                            Upload
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(item.id, 'image', e.target.files[0])}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Item 3D Texture */}
                                            {item.displayType === 'item3d' && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">Item Texture (16x16 or 32x32 PNG):</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item.itemTexture || ''}
                                                            onChange={(e) => updateItem(item.id, { itemTexture: e.target.value })}
                                                            className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                                            placeholder="https://... or upload"
                                                        />
                                                        <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm cursor-pointer">
                                                            Upload
                                                            <input
                                                                type="file"
                                                                accept="image/png"
                                                                className="hidden"
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(item.id, 'itemTexture', e.target.files[0])}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Block 3D Textures */}
                                            {item.displayType === 'block3d' && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">Block Textures:</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(['front', 'back', 'top', 'bottom', 'left', 'right'] as const).map(face => (
                                                            <label
                                                                key={face}
                                                                className="flex flex-col items-center p-2 bg-black/30 rounded cursor-pointer hover:bg-black/50"
                                                            >
                                                                <span className="text-xs text-gray-500 uppercase mb-1">{face}</span>
                                                                <div className="w-10 h-10 border border-dashed border-white/20 rounded flex items-center justify-center overflow-hidden">
                                                                    {item.blockTextures?.[face] ? (
                                                                        <img src={item.blockTextures[face]} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-gray-600">+</span>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    accept="image/png"
                                                                    className="hidden"
                                                                    onChange={(e) => e.target.files?.[0] && handleBlockTextureUpload(item.id, face, e.target.files[0])}
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* GLTF Model */}
                                            {item.displayType === 'gltf' && (
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-2">GLTF/GLB Model:</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item.gltfUrl || ''}
                                                            onChange={(e) => updateItem(item.id, { gltfUrl: e.target.value })}
                                                            className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                                            placeholder="https://... or upload"
                                                        />
                                                        <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm cursor-pointer">
                                                            Upload
                                                            <input
                                                                type="file"
                                                                accept=".gltf,.glb"
                                                                className="hidden"
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(item.id, 'gltfUrl', e.target.files[0])}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Model Adjustment Controls - Only for 3D types */}
                                            {(item.displayType === 'item3d' || item.displayType === 'block3d' || item.displayType === 'gltf') && (
                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                    <p className="text-xs text-gray-400 mb-3">🎛️ Model Adjustments:</p>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {/* Scale */}
                                                        <div>
                                                            <label className="text-xs text-gray-500 block mb-1">Scale</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="range"
                                                                    min="50"
                                                                    max="200"
                                                                    value={(item.modelScale ?? 1) * 100}
                                                                    onChange={(e) => updateItem(item.id, { modelScale: parseInt(e.target.value) / 100 })}
                                                                    className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                                />
                                                                <span className="text-cyan-400 font-mono text-xs w-10 text-right">
                                                                    {Math.round((item.modelScale ?? 1) * 100)}%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Y Offset */}
                                                        <div>
                                                            <label className="text-xs text-gray-500 block mb-1">Y Offset</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="range"
                                                                    min="-50"
                                                                    max="50"
                                                                    value={item.modelYOffset ?? 0}
                                                                    onChange={(e) => updateItem(item.id, { modelYOffset: parseInt(e.target.value) })}
                                                                    className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                                                />
                                                                <span className="text-green-400 font-mono text-xs w-10 text-right">
                                                                    {item.modelYOffset ?? 0}px
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Rotation Speed */}
                                                        <div>
                                                            <label className="text-xs text-gray-500 block mb-1">Rotation</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="500"
                                                                    value={(item.modelRotateSpeed ?? 1) * 100}
                                                                    onChange={(e) => updateItem(item.id, { modelRotateSpeed: parseInt(e.target.value) / 100 })}
                                                                    className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                                />
                                                                <span className="text-orange-400 font-mono text-xs w-10 text-right">
                                                                    {(item.modelRotateSpeed ?? 1).toFixed(1)}x
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div >
            )
            }

            {/* Win Result Modal */}
            {
                showResult && wonItem && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
                        onClick={reset}>
                        <div
                            className="relative p-8 rounded-2xl text-center transform animate-bounceIn min-w-[300px]"
                            style={{
                                background: RARITY_COLORS[wonItem.rarity].bg,
                                border: `3px solid ${RARITY_COLORS[wonItem.rarity].border}`,
                                boxShadow: `${RARITY_COLORS[wonItem.rarity].glow}, 0 25px 50px rgba(0,0,0,0.5)`
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(wonItem.rarity === 'legendary' || wonItem.rarity === 'mythic') && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                                    {[...Array(20)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-2 h-2 animate-confetti"
                                            style={{
                                                left: `${Math.random() * 100}%`,
                                                top: '-10px',
                                                background: ['#ffd700', '#ff6b6b', '#48dbfb', '#1dd1a1', '#ff9f43'][Math.floor(Math.random() * 5)],
                                                animationDelay: `${Math.random() * 2}s`,
                                                animationDuration: `${2 + Math.random() * 2}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            <p className="text-white/60 text-sm uppercase tracking-widest mb-4">You Won!</p>

                            <div className="w-32 h-32 mx-auto mb-4">
                                <ItemDisplay item={wonItem} />
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-2">{wonItem.name}</h3>
                            <p
                                className="text-lg font-semibold uppercase tracking-wider"
                                style={{ color: RARITY_COLORS[wonItem.rarity].text }}
                            >
                                {RARITY_LABELS[wonItem.rarity]}
                            </p>

                            <div className="flex gap-3 justify-center mt-6">
                                <button
                                    onClick={reset}
                                    className="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-white transition-all"
                                >
                                    Open Again
                                </button>
                                <button
                                    onClick={() => setShowResult(false)}
                                    className="px-8 py-3 bg-black/30 hover:bg-black/50 rounded-lg font-bold text-white/70 transition-all border border-white/10"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Drop Rates Info */}
            <div className="w-full max-w-[1000px] bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-3 text-center">Drop Rates</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border transition-all hover:scale-105 hover:bg-black/50 cursor-default"
                            style={{ borderColor: RARITY_COLORS[item.rarity].border + '50' }}
                        >
                            <span className="text-lg">
                                {item.displayType === 'emoji' ? item.image : '📦'}
                            </span>
                            <span className="text-white text-xs font-medium">{item.name}</span>
                            <span
                                className="text-xs font-bold"
                                style={{ color: RARITY_COLORS[item.rarity].text }}
                            >
                                {item.chance}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-[1000px] bg-[#1a1a2e]/50 rounded-xl p-4 border border-white/5">
                <p className="text-gray-500 text-xs text-center">
                    💡 Click ⚙️ to edit items • Supports: Emoji, Image, Item 3D, Block 3D, GLTF Models
                </p>
            </div>

            {/* Hidden Snapshot Renderer - used to generate previews for 3D items */}
            {
                currentSnapshotItem && (
                    <div className="fixed left-0 top-0 w-[500px] h-[500px] opacity-[0.05] pointer-events-none -z-50 overflow-hidden">
                        <ItemDisplay
                            item={currentSnapshotItem}
                            use3D={true}
                            onCapture={handleSnapshotCapture}
                        />
                    </div>
                )
            }
        </div >
    );
}
