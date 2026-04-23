'use client';

import { useState, ChangeEvent } from 'react';
import Item3DViewer from '../components/Item3DViewer';
import Block3DViewer from '../components/Block3DViewer';
import Model3DViewer from '../components/Model3DViewer';
import CaseOpening from '../components/CaseOpening';

export default function TestPage() {
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
    const [showAxes, setShowAxes] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [bgType, setBgType] = useState<'solid' | 'gradient'>('solid');
    const [bgColor, setBgColor] = useState('#121212');
    const [gradientStart, setGradientStart] = useState('#1e1e1e');
    const [gradientEnd, setGradientEnd] = useState('#3a3a3a');

    const [activeTab, setActiveTab] = useState<'item' | 'block' | 'gltf' | 'case'>('case');

    // GLTF State
    const [gltfUrl, setGltfUrl] = useState<string | undefined>(undefined);

    // Block State
    const [blockTextures, setBlockTextures] = useState<{
        front?: string;
        back?: string;
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
    }>({});


    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    setImageUrl(event.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBlockTextureChange = (face: keyof typeof blockTextures) => (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    setBlockTextures(prev => ({ ...prev, [face]: event.target?.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGltfChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setGltfUrl(url);
        }
    };

    const backgroundStyle = bgType === 'solid'
        ? bgColor
        : `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white font-sans">
            <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                Test Lab
            </h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-[#1e1e1e] p-1 rounded-xl border border-white/10 flex-wrap justify-center">
                <button
                    onClick={() => setActiveTab('case')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'case' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    🎰 Case Opening
                </button>
                <button
                    onClick={() => setActiveTab('item')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'item' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    Item Model
                </button>
                <button
                    onClick={() => setActiveTab('block')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'block' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    Block Model
                </button>
                <button
                    onClick={() => setActiveTab('gltf')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'gltf' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    GLTF Model
                </button>
            </div>

            {/* Case Opening Tab */}
            {activeTab === 'case' ? (
                <div className="w-full max-w-6xl">
                    <CaseOpening
                        caseName="Minecraft Mystery Box"
                        onResult={(item) => {
                            console.info(`[CaseOpening] User won: ${item.name} (${item.rarity})`);
                        }}
                    />
                </div>
            ) : (
                /* 3D Viewer Tabs */
                <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-white/10 w-full max-w-6xl shadow-2xl flex flex-col md:flex-row gap-8 items-start">

                    {/* Controls Side */}
                    <div className="flex flex-col gap-6 w-full md:w-1/3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">

                        {activeTab === 'item' ? (
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="mb-2 text-sm text-gray-400 group-hover:text-white transition-colors"><span className="font-semibold">Upload Texture</span></p>
                                        <p className="text-xs text-gray-500">PNG (16x16 or 32x32)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/png" onChange={handleFileChange} />
                                </label>
                            </div>
                        ) : activeTab === 'block' ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-300">Block Faces</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {(['front', 'back', 'top', 'bottom', 'left', 'right'] as const).map((face) => (
                                        <div key={face} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                            <p className="text-xs text-gray-400 font-bold uppercase mb-2">{face}</p>
                                            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/10 rounded cursor-pointer hover:bg-white/5 transition-colors group relative overflow-hidden">
                                                {blockTextures[face] ? (
                                                    <img src={blockTextures[face]} alt={face} className="absolute inset-0 w-full h-full object-contain p-1" />
                                                ) : (
                                                    <span className="text-2xl text-gray-600 group-hover:text-gray-400">+</span>
                                                )}
                                                <input type="file" className="hidden" accept="image/png" onChange={handleBlockTextureChange(face)} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="mb-2 text-sm text-gray-400 group-hover:text-white transition-colors"><span className="font-semibold">Upload Model</span></p>
                                        <p className="text-xs text-gray-500">.gltf or .glb</p>
                                    </div>
                                    <input type="file" className="hidden" accept=".gltf,.glb" onChange={handleGltfChange} />
                                </label>
                                {gltfUrl && <p className="text-xs text-green-400 mt-2 text-center">Model Loaded</p>}
                            </div>
                        )}

                        <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                            <h3 className="font-semibold text-gray-300 mb-2">Settings</h3>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showAxes}
                                    onChange={(e) => setShowAxes(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                                />
                                <span className="text-gray-300">Show Axes / Grid</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoRotate}
                                    onChange={(e) => setAutoRotate(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                                />
                                <span className="text-gray-300">Auto Rotate</span>
                            </label>

                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="text-gray-300 text-sm mt-2">Background</span>
                                    <div className="flex flex-col gap-2 items-end">
                                        {bgType === 'solid' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Color</span>
                                                <input
                                                    type="color"
                                                    value={bgColor}
                                                    onChange={(e) => setBgColor(e.target.value)}
                                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
                                                    title="Choose background color"
                                                />
                                            </div>
                                        )}
                                        {bgType === 'gradient' && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">Start</span>
                                                    <input
                                                        type="color"
                                                        value={gradientStart}
                                                        onChange={(e) => setGradientStart(e.target.value)}
                                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
                                                        title="Gradient Start Color"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">End</span>
                                                    <input
                                                        type="color"
                                                        value={gradientEnd}
                                                        onChange={(e) => setGradientEnd(e.target.value)}
                                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
                                                        title="Gradient End Color"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBgType('solid')}
                                        className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${bgType === 'solid' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        Solid
                                    </button>
                                    <button
                                        onClick={() => setBgType('gradient')}
                                        className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${bgType === 'gradient' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        Gradient
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Viewer Side */}
                    <div className="w-full md:w-2/3 h-[500px] bg-black/50 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
                        {activeTab === 'item' ? (
                            imageUrl ? (
                                <Item3DViewer
                                    imageUrl={imageUrl}
                                    showAxes={showAxes}
                                    autoRotate={autoRotate}
                                    backgroundStyle={backgroundStyle}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <div className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">+</span>
                                    </div>
                                    <p>Upload an image to preview</p>
                                </div>
                            )
                        ) : activeTab === 'block' ? (
                            <Block3DViewer
                                textures={blockTextures}
                                showAxes={showAxes}
                                autoRotate={autoRotate}
                                backgroundStyle={backgroundStyle}
                            />
                        ) : (
                            gltfUrl ? (
                                <Model3DViewer
                                    modelUrl={gltfUrl}
                                    showAxes={showAxes}
                                    autoRotate={autoRotate}
                                    backgroundStyle={backgroundStyle}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <div className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">+</span>
                                    </div>
                                    <p>Upload .gltf/.glb to preview</p>
                                </div>
                            )
                        )}

                        <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
                            <p className="text-xs text-white/30">
                                Left Click: Rotate • Right Click: Pan • Scroll: Zoom
                            </p>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
