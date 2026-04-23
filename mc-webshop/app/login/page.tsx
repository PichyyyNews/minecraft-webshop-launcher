'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../utils/config';

export default function LoginPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg');
  const [backgroundUrl, setBackgroundUrl] = useState('/defaults/bg.png');
  const router = useRouter();

  // Helper to prepend API_URL to relative paths
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.backgroundUrl) setBackgroundUrl(data.backgroundUrl);
      })
      .catch(err => console.error('Failed to fetch settings:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('storage')); // Trigger update for Navbar
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('An error occurred:', error);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4 font-sans relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getFullUrl(backgroundUrl)})` }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>
      <div className="w-full max-w-md bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={getFullUrl(logoUrl)} alt="Logo" className="h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="username">
              {t('login.username')} / {t('login.email')}
            </label>
            <input
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
              id="username"
              type="text"
              placeholder={`${t('login.username')} / ${t('login.email')}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="cyberpunk-checkbox-label flex items-center text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
              <input type="checkbox" className="cyberpunk-checkbox" />
              {t('login.rememberMe')}
            </label>
            <Link href="/forgot-password" className="text-[var(--primary)] hover:brightness-110 transition-colors font-medium">
              {t('login.forgotPassword')}
            </Link>
          </div>

          {/* Cyberpunk Checkbox Styles */}
          <style jsx>{`
            .cyberpunk-checkbox {
              appearance: none;
              width: 20px;
              height: 20px;
              border: 2px solid var(--primary);
              border-radius: 5px;
              background-color: transparent;
              display: inline-block;
              position: relative;
              margin-right: 10px;
              cursor: pointer;
              transition: all 0.3s ease-in-out;
            }

            .cyberpunk-checkbox:before {
              content: "";
              background-color: var(--primary);
              display: block;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(0);
              width: 10px;
              height: 10px;
              border-radius: 3px;
              transition: all 0.3s ease-in-out;
            }

            .cyberpunk-checkbox:checked:before {
              transform: translate(-50%, -50%) scale(1);
            }

            .cyberpunk-checkbox:hover {
              box-shadow: 0 0 8px var(--primary);
            }

            .cyberpunk-checkbox-label {
              font-size: 14px;
              color: #9ca3af;
              cursor: pointer;
              user-select: none;
              display: flex;
              align-items: center;
            }
          `}</style>

          <button
            className={`w-full py-3.5 px-4 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] focus:ring-offset-[#1e1e1e] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('login.submit')}...
              </span>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-400 text-sm">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-[var(--primary)] font-semibold hover:underline transition-all">
            {t('login.signUp')}
          </Link>
        </div>
      </div>
    </div>
  );
}
