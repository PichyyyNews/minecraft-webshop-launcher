'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#121212] text-white pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--primary)]">{t('privacy.title')}</h1>
                <p className="text-gray-400 mb-12">{t('common.lastUpdated')}: {new Date().toLocaleDateString()}</p>

                <div className="space-y-12 text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. {t('privacy.collection')}</h2>
                        <p>
                            We collect information that you provide directly to us, such as when you create an account, make a purchase, or communicate with us. This information may include your Minecraft username, email address, and payment information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. {t('privacy.usage')}</h2>
                        <p>
                            We use the information we collect to provide, maintain, and improve our services, to process your transactions, and to communicate with you. We do not sell your personal information to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. {t('privacy.cookies')}</h2>
                        <p>
                            We use cookies and similar tracking technologies to track the activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. {t('privacy.security')}</h2>
                        <p>
                            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. {t('privacy.contact')}</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us via our support channels or Discord server.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
