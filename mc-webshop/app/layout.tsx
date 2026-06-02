import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LanguageSwitcher from "./components/LanguageSwitcher";
import SeasonalEffects from "./components/SeasonalEffects";
import ConsoleSuppressor from "./components/ConsoleSuppressor";

import ThemeProvider from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import { API_URL } from './utils/config';

export const dynamic = 'force-dynamic';

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    const res = await fetch(`${apiUrl}/api/settings`, { cache: 'no-store' });
    
    if (!res.ok) {
      console.error(`[Metadata] Failed to fetch settings: ${res.status} ${res.statusText}`);
      throw new Error("API responded with an error");
    }

    const data = await res.json();

    return {
      title: data.siteTitle || "MC Webshop",
      description: "Premium Minecraft Shopping Experience",
      icons: {
        icon: data.faviconUrl
          ? (data.faviconUrl.startsWith('http')
            ? `${data.faviconUrl}?v=${Date.now()}`
            : `${apiUrl}${data.faviconUrl.startsWith('/') ? '' : '/'}${data.faviconUrl}?v=${Date.now()}`)
          : '/favicon.ico',
      },
    };
  } catch (error) {
    console.error("[Metadata] Error fetching settings for title/favicon:", error);
    return {
      title: "MC Webshop",
      description: "Premium Minecraft Shopping Experience",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${prompt.variable} font-sans antialiased bg-[#121212] text-white`}
      >
        <ConsoleSuppressor />
        <LanguageProvider>
          <ThemeProvider>
            <Navbar />
            <div className="pt-16">
              {children}
            </div>
            <Footer />
            <LanguageSwitcher />
            <SeasonalEffects />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html >
  );
}

