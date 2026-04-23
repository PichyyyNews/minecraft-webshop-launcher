'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function TermsPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#121212] text-white pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--primary)]">{t('terms.title')}</h1>
                <p className="text-gray-400 mb-12">{t('common.lastUpdated')}: {new Date().toLocaleDateString()}</p>

                <div className="space-y-12 text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. {t('terms.acceptance')}</h2>
                        <p>
                            By accessing and using this website and our Minecraft server, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. {t('terms.usage')}</h2>
                        <p>
                            You agree to use our services only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the website and server. Prohibited behavior includes harassing or causing distress or inconvenience to any other user, transmitting obscene or offensive content or disrupting the normal flow of dialogue within our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. {t('terms.purchases')}</h2>
                        <p>
                            All purchases made on our store are final and non-refundable. By making a purchase, you agree that you are over 18 years of age or have parental consent. We reserve the right to change the price of any product or service at any time without prior notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. {t('terms.termination')}</h2>
                        <p>
                            We may terminate or suspend access to our services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. {t('terms.changes')}</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
