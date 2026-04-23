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
    const res = await fetch(`${API_URL}/api/settings`, { cache: 'no-store' });
    const data = await res.json();

    return {
      title: data.siteTitle || "MC Webshop",
      description: "Premium Minecraft Shopping Experience",
      icons: {
        icon: data.faviconUrl
          ? (data.faviconUrl.startsWith('http')
            ? `${data.faviconUrl}?v=${Date.now()}`
            : `${API_URL}${data.faviconUrl.startsWith('/') ? '' : '/'}${data.faviconUrl}?v=${Date.now()}`)
          : '/favicon.ico',
      },
    };
  } catch {
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

