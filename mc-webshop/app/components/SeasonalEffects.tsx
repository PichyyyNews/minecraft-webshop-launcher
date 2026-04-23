'use client';

import { API_URL } from '../utils/config';
import { useEffect, useState } from 'react';
import batImage from '../image/bat.png';

interface SeasonalSettings {
    seasonal_christmas?: boolean | string;
    seasonal_newyear?: boolean | string;
    seasonal_halloween?: boolean | string;
    seasonal_valentine?: boolean | string;
    seasonal_mourning?: boolean | string;
}

export default function SeasonalEffects() {
    const [settings, setSettings] = useState<SeasonalSettings>({});

    useEffect(() => {
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                setSettings(data);
            })
            .catch(err => console.error('Failed to fetch seasonal settings:', err));
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            <style jsx global>{`
                @keyframes snow {
                    0% { transform: translateY(-10px) rotate(0deg); }
                    100% { transform: translateY(100vh) rotate(360deg); }
                }
                @keyframes confetti {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes float-bat {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(20px, -20px) rotate(5deg); }
                    50% { transform: translate(0, -40px) rotate(0deg); }
                    75% { transform: translate(-20px, -20px) rotate(-5deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes heart-fall {
                    0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
                }
                .animate-snow { animation: snow linear infinite; }
                .animate-confetti { animation: confetti linear infinite; }
                .animate-bat { animation: float-bat 5s ease-in-out infinite; }
                .animate-heart { animation: heart-fall linear infinite; }
            `}</style>

            {/* Christmas Snow */}
            {String(settings.seasonal_christmas) === 'true' && (
                <div className="absolute inset-0">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full opacity-80 animate-snow"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10px`,
                                width: `${Math.random() * 5 + 2}px`,
                                height: `${Math.random() * 5 + 2}px`,
                                animationDuration: `${Math.random() * 5 + 5}s`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* New Year Confetti */}
            {String(settings.seasonal_newyear) === 'true' && (
                <div className="absolute inset-0">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-4 animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10px`,
                                backgroundColor: ['#FFD700', '#FF0000', '#00FF00', '#0000FF', '#FF00FF'][Math.floor(Math.random() * 5)],
                                animationDuration: `${Math.random() * 3 + 2}s`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Halloween Bats */}
            {String(settings.seasonal_halloween) === 'true' && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bat opacity-80"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 60}%`,
                                animationDuration: `${Math.random() * 5 + 5}s`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                        >
                            <img
                                src={batImage.src}
                                alt="Bat"
                                className="w-12 h-auto"
                                style={{ filter: 'brightness(0)' }}
                            />
                        </div>
                    ))}
                    <div className="absolute inset-0 bg-orange-900/10 mix-blend-overlay pointer-events-none"></div>
                </div>
            )}

            {/* Valentine Hearts */}
            {String(settings.seasonal_valentine) === 'true' && (
                <div className="absolute inset-0">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-pink-500 animate-heart opacity-70"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-20px`,
                                fontSize: `${Math.random() * 20 + 10}px`,
                                animationDuration: `${Math.random() * 5 + 5}s`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                        >
                            ❤️
                        </div>
                    ))}
                </div>
            )}

            {/* Mourning Ribbon */}
            {String(settings.seasonal_mourning) === 'true' && (
                <>
                    {/* Black Ribbon (Top Right) - Increased Size */}
                    <div className="absolute top-0 right-0 w-96 h-96 overflow-hidden z-[10000]">
                        <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 rotate-45 bg-black text-white text-center py-4 w-[600px] border-b-4 border-white/20 shadow-2xl">
                            <span className="text-2xl font-bold uppercase tracking-[0.3em] drop-shadow-md">Mourning</span>
                        </div>
                    </div>
                    {/* Grayscale Filter Overlay */}
                    <div className="absolute inset-0 bg-gray-900/40 mix-blend-saturation pointer-events-none backdrop-grayscale-[1]"></div>
                </>
            )}
        </div>
    );
}
