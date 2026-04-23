'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './contexts/LanguageContext';
import { API_URL } from './utils/config';
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImageWithSkeleton from './components/ImageWithSkeleton';
import SkinViewer from './components/SkinViewer';
import Item3DViewer from './components/Item3DViewer';
import Block3DViewer from './components/Block3DViewer';
import Model3DViewer from './components/Model3DViewer';
import ScrollAnimation from './components/ScrollAnimation';

interface Card {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  color: string;
}

interface Wiki {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  tag?: string;
  tagColor?: string;
  displayType?: 'image' | '3d' | 'block' | 'model';
  modelSettings?: {
    showAxes: boolean;
    autoRotate: boolean;
    bgType: 'solid' | 'gradient';
    bgColor: string;
    gradientStart: string;
    gradientEnd: string;
  };
  blockTextures?: {
    front: string;
    back: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  gltfModel?: string;
}

interface Donor {
  _id: string;
  name: string;
  totalAmount: number;
  uuid?: string;
}

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  avatar: string;
  order: number;
}

export default function Home() {
  const { t } = useLanguage();
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroButtonText, setHeroButtonText] = useState('');
  const [heroButtonAction, setHeroButtonAction] = useState('copy_ip');
  const [heroButtonLink, setHeroButtonLink] = useState('');
  const [serverIp, setServerIp] = useState('play.example.com');
  const [isMobile, setIsMobile] = useState(false);
  const [serverPort, setServerPort] = useState('19132');
  const [latestArticlesTitle, setLatestArticlesTitle] = useState('');
  const [whyChooseUsTitle, setWhyChooseUsTitle] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('/default-bg.png');
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [wikis, setWikis] = useState<Wiki[]>([]);
  const [loadingWikis, setLoadingWikis] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [topDonors, setTopDonors] = useState<Donor[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [teamTitle, setTeamTitle] = useState('');
  const [teamSubtitle, setTeamSubtitle] = useState('');
  const [socialTitle, setSocialTitle] = useState('');
  const [socialDescription, setSocialDescription] = useState('');
  const [socialButtonText, setSocialButtonText] = useState('');
  const [socialButtonLink, setSocialButtonLink] = useState('');
  const [socialImageUrl, setSocialImageUrl] = useState('');

  const getBackgroundStyle = (settings: Product['modelSettings']) => {
    if (!settings) return '#1e1e1e'; // Default to card background
    if (settings.bgType === 'solid') return settings.bgColor;
    return `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientEnd} 100%)`;
  };

  const resolveUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
      const effectiveApiUrl = API_URL || 'http://localhost:5000';
      const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      return `${baseUrl}${cleanUrl}`;
    }
    return url;
  };

  useEffect(() => {
    // Fetch settings
    fetch(`${API_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.heroTitle) setHeroTitle(data.heroTitle);
        if (data.heroDescription) setHeroDescription(data.heroDescription);
        if (data.heroButtonText) setHeroButtonText(data.heroButtonText);
        if (data.heroButtonAction) setHeroButtonAction(data.heroButtonAction);
        if (data.heroButtonLink) setHeroButtonLink(data.heroButtonLink);
        if (data.serverIp) setServerIp(data.serverIp);
        if (data.isMobile !== undefined) setIsMobile(String(data.isMobile) === 'true');
        if (data.serverPort) setServerPort(data.serverPort);
        if (data.latestArticlesTitle) setLatestArticlesTitle(data.latestArticlesTitle);
        if (data.whyChooseUsTitle) setWhyChooseUsTitle(data.whyChooseUsTitle);
        if (data.backgroundUrl) setBackgroundUrl(data.backgroundUrl);
        if (data.teamTitle) setTeamTitle(data.teamTitle);
        if (data.teamSubtitle) setTeamSubtitle(data.teamSubtitle);
        if (data.socialTitle) setSocialTitle(data.socialTitle);
        if (data.socialDescription) setSocialDescription(data.socialDescription);
        if (data.socialButtonText) setSocialButtonText(data.socialButtonText);
        if (data.socialButtonLink) setSocialButtonLink(data.socialButtonLink);
        if (data.socialImageUrl) setSocialImageUrl(data.socialImageUrl);

        // Fetch server status if IP is set
        if (data.serverIp) {
          setServerIp(data.serverIp);
          fetch(`${API_URL}/api/server/ping?ip=${data.serverIp}`)
            .then(res => res.json())
            .then(statusData => setServerStatus(statusData))
            .catch(err => console.error('Failed to ping server:', err));
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err));

    // Fetch team members
    fetch(`${API_URL}/api/team`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTeamMembers(data);
        } else {
          console.error('Team data is not an array:', data);
          setTeamMembers([]);
        }
      })
      .catch(err => console.error('Failed to fetch team members:', err));

    // Fetch cards
    fetch(`${API_URL}/api/cards`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCards(data);
        } else {
          console.error('Cards data is not an array:', data);
          setCards([]);
        }
        setLoadingCards(false);
      })
      .catch(err => {
        console.error('Failed to fetch cards:', err);
        setLoadingCards(false);
      });

    // Fetch wikis
    fetch(`${API_URL}/api/wiki/latest`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setWikis(data.slice(0, 5)); // Get latest 5 wikis
        } else {
          console.error('Wikis data is not an array:', data);
          setWikis([]);
        }
        setLoadingWikis(false);
      })
      .catch(err => {
        console.error('Failed to fetch wikis:', err);
        setLoadingWikis(false);
      });

    // Fetch products
    fetch(`${API_URL}/api/products/featured`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data.slice(0, 5)); // Get latest 5 products
        } else {
          console.error('Products data is not an array:', data);
          setProducts([]);
        }
        setLoadingProducts(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoadingProducts(false);
      });

    // Fetch top donors
    fetch(`${API_URL}/api/users/top-donors?limit=3&period=all`)
      .then(res => res.json())
      .then(async (data) => {
        // Fetch UUIDs for each donor
        const donorsWithUuid = await Promise.all(data.map(async (donor: Donor) => {
          try {
            const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${donor.name}`);
            const mojangData = await res.json();
            return { ...donor, uuid: mojangData.uuid };
          } catch (err) {
            console.error(`Failed to fetch UUID for ${donor.name}:`, err);
            return donor;
          }
        }));
        setTopDonors(donorsWithUuid);
        setLoadingDonors(false);
      })
      .catch(err => {
        console.error('Failed to fetch top donors:', err);
        setLoadingDonors(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[var(--primary)] selection:text-black">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ImageWithSkeleton
            src={backgroundUrl}
            alt="Minecraft Landscape"
            objectFit="cover"
            className="w-full h-full opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/30 via-transparent to-[#121212]"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <ScrollAnimation animation="fade-up">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight drop-shadow-2xl">
              {(heroTitle || t('home.heroTitle')).split(' ').map((word, i) =>
                word.toUpperCase() === 'GAMEPLAY' || word.toUpperCase() === 'MINECRAFT' ?
                  <span key={i} className="text-[var(--primary)]">{word} </span> :
                  <span key={i}>{word} </span>
              )}
            </h1>
          </ScrollAnimation>

          <ScrollAnimation animation="fade-up" delay={200}>
            <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-md font-light">
              {heroDescription || t('home.heroDescription')}
            </p>
          </ScrollAnimation>

          <ScrollAnimation animation="fade-up" delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 items-start w-full sm:w-auto">
              {/* Buttons content remains the same */}
              <Link
                href="/shop"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center min-w-[160px]"
              >
                {t('home.browseShop')}
              </Link>
              <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
                {heroButtonAction === 'link' ? (
                  <Link
                    href={heroButtonLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-4 bg-[var(--primary)] text-black font-bold text-lg rounded-full hover:brightness-110 transition-all transform hover:scale-105 shadow-xl hover:shadow-[var(--primary)]/20 active:scale-95 min-w-[160px] flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {heroButtonText || t('common.download')}
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(serverIp);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-[var(--primary)] text-black font-bold text-lg rounded-full hover:brightness-110 transition-all transform hover:scale-105 shadow-xl hover:shadow-[var(--primary)]/20 active:scale-95 min-w-[160px] flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {t('common.copied')}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        {heroButtonText || t('home.copyIp')}
                      </>
                    )}
                  </button>
                )}

                {isMobile && (
                  <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <span className="text-gray-300 text-sm font-medium">{t('admin.server.port')}:</span>
                    <span className="text-[var(--primary)] font-mono font-bold">{serverPort}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(serverPort);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Copy Port"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ScrollAnimation>

          {/* Server Status Pill */}
          {serverStatus && (
            <div className="inline-flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full animate-in fade-in zoom-in duration-500 delay-300">
              <div className="relative">
                <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-[var(--primary)] rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('home.serverOnline')}</p>
                <p className="text-sm font-bold text-white">
                  <span className="text-[var(--primary)]">{serverStatus.players?.online || 0}</span> {t('admin.server.onlinePlayers')}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>



      {/* Wiki Carousel Section */}
      {!loadingWikis && wikis.length > 0 && (
        <ScrollAnimation animation="fade-up" className="py-16 px-6 max-w-7xl mx-auto">
          {/* <section className="py-16 px-6 max-w-7xl mx-auto"> */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{latestArticlesTitle || t('home.latestArticles')}</h2>
            <div className="w-20 h-1 bg-[var(--primary)] mx-auto rounded-full"></div>
          </div>

          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            spaceBetween={30}
            slidesPerView={1}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
              bulletActiveClass: 'swiper-pagination-bullet-active',
            }}
            navigation={true}
            loop={true}
            className="wiki-carousel"
          >
            {wikis.map((wiki) => (
              <SwiperSlide key={wiki._id}>
                <Link href={`/wiki/${wiki._id}`}>
                  <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Image Section */}
                      <div className="relative h-64 md:h-96 bg-[#121212] overflow-hidden">
                        <ImageWithSkeleton
                          src={wiki.imageUrl}
                          alt={wiki.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent opacity-60"></div>
                      </div>

                      {/* Content Section */}
                      <div className="p-8 md:p-12 flex flex-col justify-center">
                        <div className="mb-4">
                          <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold uppercase rounded-full">
                            {t('common.article')}
                          </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-[var(--primary)] transition-colors">
                          {wiki.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed mb-6 line-clamp-3">
                          {wiki.content.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {wiki.author}
                          </span>
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {new Date(wiki.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-6">
                          <span className="text-[var(--primary)] font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                            {t('common.readMore')}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          <style jsx global>{`
              .wiki-carousel .swiper-pagination-bullet {
                background: #666;
                opacity: 0.5;
                width: 12px;
                height: 12px;
              }
              .wiki-carousel .swiper-pagination-bullet-active {
                background: var(--primary);
                opacity: 1;
              }
              .wiki-carousel .swiper-button-next,
              .wiki-carousel .swiper-button-prev {
                color: var(--primary);
                background: rgba(0, 0, 0, 0.5);
                width: 50px;
                height: 50px;
                border-radius: 50%;
              }
              .wiki-carousel .swiper-button-next:after,
              .wiki-carousel .swiper-button-prev:after {
                font-size: 20px;
              }
            `}</style>
          {/* </section> */}
        </ScrollAnimation>
      )}

      {/* Features Grid */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <ScrollAnimation animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{whyChooseUsTitle || t('home.whyChooseUs')}</h2>
            <div className="w-20 h-1 bg-[var(--primary)] mx-auto rounded-full"></div>
          </div>
        </ScrollAnimation>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card: any, index: number) => (
            <ScrollAnimation key={card._id} animation="fade-up" delay={index * 150}>
              <div className="bg-[#1e1e1e] rounded-2xl hover:bg-[#252525] transition-all duration-300 hover:-translate-y-2 border border-white/5 shadow-lg hover:shadow-xl group overflow-hidden flex flex-col h-full">
                {/* Image Section */}
                <div className="w-full h-80 relative bg-[#121212]">
                  <ImageWithSkeleton
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent opacity-60"></div>
                </div>

                {/* Content Section */}
                <div className="p-8 relative">
                  <h3 className="text-xl font-bold mb-3 text-white" style={{ color: card.color }}>{card.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{card.description}</p>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </section>

      {/* Featured Products Section (Masonry) */}
      {!loadingProducts && products.length > 0 && (
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <ScrollAnimation animation="fade-up">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.products.title')}</h2>
              <div className="w-20 h-1 bg-[var(--primary)] mx-auto rounded-full"></div>
            </div>
          </ScrollAnimation>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px]">
            {products.map((product, index) => {
              // Determine grid span based on index for masonry effect
              // Item 0: Large (2x2)
              // Others: Standard (1x1)
              // This creates a perfect 4x2 grid for 5 items:
              // [ 0 0 1 2 ]
              // [ 0 0 3 4 ]
              let gridClass = "md:col-span-1 md:row-span-1";
              if (index === 0) gridClass = "md:col-span-2 md:row-span-2";

              return (
                <ScrollAnimation
                  key={product._id}
                  animation={index === 0 ? "scale-up" : "fade-up"}
                  delay={index * 100}
                  className={`${gridClass} h-full`}
                >
                  <Link
                    href="/shop"
                    className={`relative block h-full group overflow-hidden rounded-2xl bg-[#1e1e1e] border border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 w-full`}
                  >
                    {/* Image */}
                    <div className="absolute inset-0">
                      {product.displayType === '3d' && product.imageUrl ? (
                        <Item3DViewer
                          imageUrl={(() => {
                            let src = product.imageUrl;
                            if (src.startsWith('/uploads')) {
                              const effectiveApiUrl = API_URL || 'http://localhost:5000';
                              const baseUrl = effectiveApiUrl.endsWith('/') ? effectiveApiUrl.slice(0, -1) : effectiveApiUrl;
                              return `${baseUrl}${src}`;
                            }
                            return src;
                          })()}
                          backgroundStyle={getBackgroundStyle(product.modelSettings)}
                          showAxes={false} // Hide axes on home page for cleaner look
                          autoRotate={true} // Always rotate on home page
                          className="w-full h-full"
                          enableZoom={false}
                          yOffset={3}
                        />
                      ) : product.displayType === 'block' && product.blockTextures ? (
                        <Block3DViewer
                          textures={{
                            front: resolveUrl(product.blockTextures.front),
                            back: resolveUrl(product.blockTextures.back),
                            top: resolveUrl(product.blockTextures.top),
                            bottom: resolveUrl(product.blockTextures.bottom),
                            left: resolveUrl(product.blockTextures.left),
                            right: resolveUrl(product.blockTextures.right),
                          }}
                          backgroundStyle={getBackgroundStyle(product.modelSettings)}
                          showAxes={false}
                          autoRotate={true}

                          className="w-full h-full"
                        />
                      ) : product.displayType === 'model' && product.gltfModel ? (
                        <Model3DViewer
                          modelUrl={resolveUrl(product.gltfModel) || ''}
                          backgroundStyle={getBackgroundStyle(product.modelSettings)}
                          showAxes={false}
                          autoRotate={true}
                          className="w-full h-full"
                        />
                      ) : (
                        <ImageWithSkeleton
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent ${product.displayType === '3d' || product.displayType === 'model' ? 'opacity-40' : 'opacity-80'} group-hover:opacity-70 transition-opacity pointer-events-none`}></div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end z-20 pointer-events-none">
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        {product.tag && (
                          <span
                            className="inline-block px-2 py-1 text-xs font-bold uppercase rounded mb-2"
                            style={{
                              backgroundColor: (product.tagColor || '#3b82f6') + '33', // 20% opacity
                              color: product.tagColor || '#3b82f6'
                            }}
                          >
                            {product.tag}
                          </span>
                        )}
                        <h3 className={`font-bold text-white mb-1 ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                          {product.name}
                        </h3>
                        <p className="text-[var(--primary)] font-bold mb-2">
                          {product.price.toLocaleString()} {t('shop.points')}
                        </p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-sm text-gray-300 flex items-center gap-2">
                            {t('home.browseShop')}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollAnimation>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#1e1e1e] text-white font-bold rounded-full border border-white/10 hover:bg-[#2a2a2a] hover:border-[var(--primary)] transition-all"
            >
              {t('home.products.viewAll')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </section>
      )}

      {/* Top Donors Section */}
      {!loadingDonors && topDonors.length > 0 && (
        <section className="py-16 px-4 md:px-6 max-w-7xl mx-auto">
          <div className="bg-[#1e1e1e] rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <ScrollAnimation animation="fade-up">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg">{t('home.topDonors.title')}</h2>
                  <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent mx-auto rounded-full"></div>
                </div>
              </ScrollAnimation>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end justify-center max-w-5xl mx-auto">
                {/* Reorder for visual hierarchy: 2nd, 1st, 3rd */}
                {[
                  { donor: topDonors[1], rank: 2 },
                  { donor: topDonors[0], rank: 1 },
                  { donor: topDonors[2], rank: 3 }
                ].map(({ donor, rank }) => {
                  const isFirst = rank === 1;
                  const isPlaceholder = !donor;

                  return (
                    <ScrollAnimation
                      key={rank}
                      animation="fade-up"
                      delay={rank === 1 ? 200 : rank === 2 ? 0 : 400}
                      className={`relative group ${isFirst ? 'order-2 md:-mt-12' : rank === 2 ? 'order-1' : 'order-3'}`}
                    >
                      <Link href="/rank" className={`block ${isPlaceholder ? 'pointer-events-none' : ''}`}>
                        <div className={`
                          relative rounded-2xl p-6 text-center transform transition-all duration-500 
                          ${!isPlaceholder && 'hover:-translate-y-3'}
                          ${isFirst
                            ? 'bg-gradient-to-b from-yellow-900/40 to-black/60 border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]'
                            : 'bg-black/40 border-white/10 hover:bg-black/60'}
                          border backdrop-blur-sm
                        `}>

                          {/* Rank Badge */}
                          <div className={`
                            absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg z-20
                            ${isFirst
                              ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black ring-4 ring-black/50'
                              : rank === 2
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black ring-4 ring-black/50'
                                : 'bg-gradient-to-br from-orange-400 to-orange-700 text-white ring-4 ring-black/50'}
                          `}>
                            {rank}
                          </div>

                          {/* Crown for 1st place */}
                          {isFirst && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
                              👑
                            </div>
                          )}

                          {/* Skin Image */}
                          <div className={`relative mx-auto mb-6 mt-4 ${isFirst ? 'w-32 h-64' : 'w-24 h-48'}`}>
                            {isFirst ? (
                              <div className="w-full h-full flex items-center justify-center -mt-8">
                                <SkinViewer
                                  uuid={donor?.uuid}
                                  width={150}
                                  height={280}
                                  className=""
                                  autoRotate={true}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center -mt-4">
                                <SkinViewer
                                  uuid={donor?.uuid}
                                  width={100}
                                  height={200}
                                  className=""
                                  autoRotate={true}
                                />
                              </div>
                            )}

                            {/* Pedestal Effect */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/50 blur-md rounded-full"></div>
                          </div>

                          {/* Name & Amount */}
                          <h3 className={`font-bold text-white mb-2 truncate ${isFirst ? 'text-2xl' : 'text-xl'}`}>
                            {donor ? donor.name : '---'}
                          </h3>
                          <div className={`inline-block px-4 py-1 rounded-full ${isFirst ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                            <p className="font-bold font-mono">
                              {donor ? `${donor.totalAmount.toLocaleString()} THB` : '0 THB'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </ScrollAnimation>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Meet The Team Section */}
      {teamMembers.length > 0 && (
        <section className="py-20 px-6 bg-[#121212]">
          <div className="max-w-7xl mx-auto">
            <div className="bg-[#1e1e1e] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden min-h-[600px] flex flex-col md:flex-row items-center shadow-2xl transition-all duration-500 ease-in-out">
              {/* Background Effects */}
              <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary)]/5 rounded-full blur-3xl"></div>

              {/* Left Side: Text */}
              <div className="w-full md:w-1/2 z-10 text-white flex flex-col justify-start h-full pt-8 md:pt-12">
                <ScrollAnimation key={teamMembers[activeTeamIndex]._id} animation="slide-in-left">
                  <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">{teamTitle || t('admin.settings.teamTitle')}</h2>
                  <p className="text-gray-400 mb-8">{teamSubtitle || t('admin.settings.teamSubtitle')}</p>

                  <div className="mb-6 flex items-center gap-3">
                    <span className="text-3xl font-bold text-white">{teamMembers[activeTeamIndex].name}</span>
                    <span className="px-3 py-1 bg-[var(--primary)] text-black text-xs font-bold uppercase rounded-md">
                      {teamMembers[activeTeamIndex].role}
                    </span>
                  </div>

                  <div className="mb-12 max-w-lg">
                    <p className="text-gray-300 leading-8 font-medium text-lg break-words text-justify">
                      {teamMembers[activeTeamIndex].description}
                    </p>
                  </div>
                </ScrollAnimation>

                {/* Avatar Carousel */}
                <ScrollAnimation animation="fade-up" delay={300} className="flex items-center gap-4 mt-auto pb-8 md:pb-12">
                  <button
                    onClick={() => setActiveTeamIndex(prev => prev === 0 ? teamMembers.length - 1 : prev - 1)}
                    className="p-3 bg-black/20 hover:bg-black/40 rounded-full transition-colors border border-white/5"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  {/* Added scroll-smooth for smoother scrolling */}
                  <div className="flex gap-4 overflow-x-auto py-4 scrollbar-hide max-w-[300px] px-4 scroll-smooth">
                    {teamMembers.map((member, idx) => (
                      <button
                        key={member._id}
                        onClick={() => setActiveTeamIndex(idx)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-500 ease-out flex-shrink-0 border-2 ${activeTeamIndex === idx ? 'border-[var(--primary)] scale-110 z-10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                      >
                        <ImageWithSkeleton src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTeamIndex(prev => prev === teamMembers.length - 1 ? 0 : prev + 1)}
                    className="p-3 bg-black/20 hover:bg-black/40 rounded-full transition-colors border border-white/5"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </ScrollAnimation>
              </div>

              {/* Right Side: Character Image */}
              <div className="w-full md:w-1/2 h-[400px] md:h-full relative md:absolute md:right-0 md:bottom-0 flex items-center justify-center md:justify-end p-8 md:pr-48 order-first md:order-last">
                <ScrollAnimation animation="slide-in-right" className="w-full h-full flex items-center justify-center">
                  <SkinViewer
                    key={teamMembers[activeTeamIndex]._id}
                    uuid={teamMembers[activeTeamIndex].name}
                    isResponsive={true}
                    autoRotate={true}
                    animation="walk"
                    className="drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                  />
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Social Section */}
      <section className="py-20 px-6 bg-[#121212] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#1e1e1e] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12 shadow-2xl">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary)]/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

            {/* Left Side: Floating Image */}
            <div className="w-full md:w-1/2 relative z-10 flex justify-center md:justify-start">
              <ScrollAnimation animation="scale-up" className="relative w-full max-w-md aspect-square animate-float">
                <ImageWithSkeleton
                  src={socialImageUrl}
                  alt="Social"
                  objectFit="contain"
                  className="w-full h-full drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                />
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg animate-bounce delay-100">
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" /></svg>
                </div>
              </ScrollAnimation>
            </div>

            {/* Right Side: Content */}
            <div className="w-full md:w-1/2 z-10 text-center md:text-left">
              <ScrollAnimation animation="fade-up" delay={200}>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                  {socialTitle || t('social.title')}
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                  {socialDescription || t('social.description')}
                </p>
                <a
                  href={socialButtonLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-lg rounded-full transition-all transform hover:scale-105 shadow-xl hover:shadow-[#5865F2]/20"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" /></svg>
                  {socialButtonText || t('social.joinDiscord')}
                </a>
              </ScrollAnimation>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
