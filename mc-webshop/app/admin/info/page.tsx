'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';
import ImageWithSkeleton from '../../components/ImageWithSkeleton';
import { Users, Plus, Trash2, Edit, X, Save, Search } from 'lucide-react';

const DEFAULT_SETTINGS = {
    heroTitle: 'ELEVATE YOUR GAMEPLAY',
    heroDescription: 'The ultimate destination for premium Minecraft ranks, exclusive items, and legendary keys. Start your journey with the best gear today.',
    heroButtonText: 'Copy IP',
    heroButtonAction: 'copy_ip', // 'copy_ip' | 'link'
    heroButtonLink: '',
    serverIp: 'play.example.com',
    isMobile: false,
    serverPort: '19132',
    latestArticlesTitle: 'Latest Articles',
    whyChooseUsTitle: 'Why Choose Us?',
    primaryColor: '#55FF55',
    teamTitle: 'Meet The Team',
    teamSubtitle: 'Learn about the people who make us amazing!',
    socialTitle: 'Let\'s Be Social!',
    socialDescription: 'Here on our server we think communication is the key to an amazing community.',
    socialButtonText: 'JOIN OUR DISCORD',
    socialButtonLink: 'https://discord.gg/example',
    seasonal_christmas: false,
    seasonal_mourning: false,
    seasonal_newyear: false,
    seasonal_halloween: false,
    seasonal_valentine: false,
    slipCheckMode: 'manual',
    slip2goApiKey: ''
};

interface Card {
    _id: string;
    title: string;
    description: string;
    imageUrl?: string;
    color: string;
}

interface Social {
    _id: string;
    platform: string;
    url: string;
    icon: string;
}

interface TeamMember {
    _id?: string;
    name: string;
    role: string;
    description: string;
    image: string;
    avatar: string;
    order: number;
}

export default function InfoPage() {
    const { t } = useLanguage();
    const [logo, setLogo] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const [background, setBackground] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [bgUploading, setBgUploading] = useState(false);

    const [favicon, setFavicon] = useState<File | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
    const [faviconUploading, setFaviconUploading] = useState(false);



    const [socialImage, setSocialImage] = useState<File | null>(null);
    const [socialImagePreview, setSocialImagePreview] = useState<string | null>(null);
    const [socialImageUploading, setSocialImageUploading] = useState(false);

    const [siteTitle, setSiteTitle] = useState('MC Webshop');
    const [savingTitle, setSavingTitle] = useState(false);

    // Card Settings State
    const [cards, setCards] = useState<Card[]>([]);
    const [newCard, setNewCard] = useState({ title: '', description: '', color: '#55FF55' });
    const [cardImage, setCardImage] = useState<File | null>(null);
    const [cardImagePreview, setCardImagePreview] = useState<string | null>(null);
    const [creatingCard, setCreatingCard] = useState(false);

    // Social Settings State
    const [socials, setSocials] = useState<Social[]>([]);
    const [newSocial, setNewSocial] = useState({ platform: 'Facebook', url: '', icon: 'facebook' });

    // Team State
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [minecraftName, setMinecraftName] = useState('');
    const [formData, setFormData] = useState<TeamMember>({
        name: '',
        role: '',
        description: '',
        image: '',
        avatar: '',
        order: 0
    });

    // Hero File Upload State
    const [heroFile, setHeroFile] = useState<File | null>(null);
    const [heroFileUploading, setHeroFileUploading] = useState(false);
    const heroFileInputRef = useRef<HTMLInputElement>(null);

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({
            isOpen: true,
            title,
            message,
            type,
            mode,
            onConfirm: onConfirm || (() => { }),
        });
    };

    const closeModal = () => {
        setModalProps(prev => ({ ...prev, isOpen: false }));
    };

    // Text Settings State
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [savingSettings, setSavingSettings] = useState(false);
    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings`);
            const data = await res.json();
            setSettings({
                heroTitle: data.heroTitle || DEFAULT_SETTINGS.heroTitle,
                heroDescription: data.heroDescription || DEFAULT_SETTINGS.heroDescription,
                heroButtonText: data.heroButtonText || DEFAULT_SETTINGS.heroButtonText,
                heroButtonAction: data.heroButtonAction || DEFAULT_SETTINGS.heroButtonAction,
                heroButtonLink: data.heroButtonLink || DEFAULT_SETTINGS.heroButtonLink,
                serverIp: data.serverIp || DEFAULT_SETTINGS.serverIp,
                isMobile: data.isMobile !== undefined ? String(data.isMobile) === 'true' : DEFAULT_SETTINGS.isMobile,
                serverPort: data.serverPort || DEFAULT_SETTINGS.serverPort,
                latestArticlesTitle: data.latestArticlesTitle || DEFAULT_SETTINGS.latestArticlesTitle,
                whyChooseUsTitle: data.whyChooseUsTitle || DEFAULT_SETTINGS.whyChooseUsTitle,
                primaryColor: data.primaryColor || DEFAULT_SETTINGS.primaryColor,
                teamTitle: data.teamTitle || DEFAULT_SETTINGS.teamTitle,
                teamSubtitle: data.teamSubtitle || DEFAULT_SETTINGS.teamSubtitle,
                socialTitle: data.socialTitle || DEFAULT_SETTINGS.socialTitle,
                socialDescription: data.socialDescription || DEFAULT_SETTINGS.socialDescription,
                socialButtonText: data.socialButtonText || DEFAULT_SETTINGS.socialButtonText,
                socialButtonLink: data.socialButtonLink || DEFAULT_SETTINGS.socialButtonLink,
                seasonal_christmas: data.seasonal_christmas !== undefined ? String(data.seasonal_christmas) === 'true' : DEFAULT_SETTINGS.seasonal_christmas,
                seasonal_mourning: data.seasonal_mourning !== undefined ? String(data.seasonal_mourning) === 'true' : DEFAULT_SETTINGS.seasonal_mourning,
                seasonal_newyear: data.seasonal_newyear !== undefined ? String(data.seasonal_newyear) === 'true' : DEFAULT_SETTINGS.seasonal_newyear,
                seasonal_halloween: data.seasonal_halloween !== undefined ? String(data.seasonal_halloween) === 'true' : DEFAULT_SETTINGS.seasonal_halloween,
                seasonal_valentine: data.seasonal_valentine !== undefined ? String(data.seasonal_valentine) === 'true' : DEFAULT_SETTINGS.seasonal_valentine,
                slipCheckMode: data.slipCheckMode || DEFAULT_SETTINGS.slipCheckMode,
                slip2goApiKey: data.slip2goApiKey || DEFAULT_SETTINGS.slip2goApiKey,
            });
            if (data.logoUrl) setPreview(data.logoUrl);
            if (data.backgroundUrl) setBgPreview(data.backgroundUrl);
            if (data.faviconUrl) setFaviconPreview(data.faviconUrl);

            if (data.socialImageUrl) setSocialImagePreview(data.socialImageUrl);
            if (data.siteTitle) setSiteTitle(data.siteTitle);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchCards = async () => {
        try {
            const res = await fetch(`${API_URL}/api/cards`);
            const data = await res.json();
            setCards(data);
        } catch (error) {
            console.error('Error fetching cards:', error);
        }
    };

    const fetchSocials = async () => {
        try {
            const res = await fetch(`${API_URL}/api/socials`);
            const data = await res.json();
            setSocials(data);
        } catch (error) {
            console.error('Error fetching socials:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/team`);
            const data = await res.json();
            setTeamMembers(data);
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchCards();
        fetchSocials();
        fetchTeamMembers();
    }, []);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            showModal(t('common.success'), t('admin.settings.saved'), 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showModal(t('common.error'), t('admin.settings.saveFailed'), 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogo(e.target.files[0]);
            setPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBackground(e.target.files[0]);
            setBgPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCardImage(e.target.files[0]);
            setCardImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleUpload = async () => {
        if (!logo) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('logo', logo);

        try {
            const res = await fetch(`${API_URL}/api/settings/logo`, {
                method: 'POST',
                body: formData,
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Server returned non-JSON response:', text);
                throw new Error('Server returned invalid response');
            }

            if (res.ok) {
                setPreview(data.url);
                showModal(t('common.success'), t('admin.settings.logoUploaded'), 'success');
                window.dispatchEvent(new Event('storage'));
            } else {
                showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleBgUpload = async () => {
        if (!background) return;
        setBgUploading(true);
        const formData = new FormData();
        formData.append('background', background);

        try {
            const res = await fetch(`${API_URL}/api/settings/background`, {
                method: 'POST',
                body: formData,
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Server returned non-JSON response:', text);
                throw new Error('Server returned invalid response');
            }

            if (res.ok) {
                setBgPreview(data.url);
                showModal(t('common.success'), t('admin.settings.bgUploaded'), 'success');
            } else {
                showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
            }
        } catch (error) {
            console.error('Error uploading background:', error);
            showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
        } finally {
            setBgUploading(false);
        }
    };

    const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFavicon(e.target.files[0]);
            setFaviconPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleFaviconUpload = async () => {
        if (!favicon) return;
        setFaviconUploading(true);
        const formData = new FormData();
        formData.append('favicon', favicon);

        try {
            const res = await fetch(`${API_URL}/api/settings/favicon`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setFaviconPreview(data.url);
                showModal(t('common.success'), t('admin.settings.faviconUploaded'), 'success');
                window.location.reload(); // Reload to update favicon
            } else {
                showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
            }
        } catch (error) {
            console.error('Error uploading favicon:', error);
            showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
        } finally {
            setFaviconUploading(false);
        }
    };



    const handleSocialImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSocialImage(e.target.files[0]);
            setSocialImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSocialImageUpload = async () => {
        if (!socialImage) return;
        setSocialImageUploading(true);
        const formData = new FormData();
        formData.append('socialImage', socialImage);

        try {
            const res = await fetch(`${API_URL}/api/settings/social-image`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setSocialImagePreview(data.url);
                showModal(t('common.success'), t('admin.settings.socialImageUploaded'), 'success');
            } else {
                showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
            }
        } catch (error) {
            console.error('Error uploading social image:', error);
            showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
        } finally {
            setSocialImageUploading(false);
        }
    };

    const saveSiteTitle = async () => {
        setSavingTitle(true);
        try {
            await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteTitle }),
            });
            showModal(t('common.success'), t('admin.settings.titleSaved'), 'success');
            window.location.reload(); // Reload to update title
        } catch (error) {
            console.error('Error saving title:', error);
            showModal(t('common.error'), t('admin.settings.saveFailed'), 'error');
        } finally {
            setSavingTitle(false);
        }
    };

    const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setHeroFile(file);
            setHeroFileUploading(true);

            const formData = new FormData();
            formData.append('heroFile', file);

            try {
                const res = await fetch(`${API_URL}/api/settings/hero-file`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (res.ok) {
                    setSettings(prev => ({ ...prev, heroButtonLink: `${API_URL}${data.url}` }));
                    showModal(t('common.success'), 'File uploaded successfully! Do not forget to Save Changes.', 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
                }
            } catch (error) {
                console.error('Error uploading hero file:', error);
                showModal(t('common.error'), t('admin.settings.uploadFailed'), 'error');
            } finally {
                setHeroFileUploading(false);
                if (heroFileInputRef.current) {
                    heroFileInputRef.current.value = '';
                }
            }
        }
    };

    const handleReset = () => {
        showModal(t('admin.settings.confirmReset'), t('admin.settings.confirmReset'), 'warning', 'confirm', () => {
            setSettings(DEFAULT_SETTINGS);
        });
    };

    const handleCreateCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingCard(true);

        const formData = new FormData();
        formData.append('title', newCard.title);
        formData.append('description', newCard.description);
        formData.append('color', newCard.color);
        if (cardImage) {
            formData.append('image', cardImage);
        }

        try {
            const res = await fetch(`${API_URL}/api/cards`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setNewCard({ title: '', description: '', color: '#55FF55' });
                setCardImage(null);
                setCardImagePreview(null);
                fetchCards();
                showModal(t('common.success'), t('admin.settings.cardCreated'), 'success');
            } else {
                showModal(t('common.error'), t('admin.settings.createFailed'), 'error');
            }
        } catch (error) {
            console.error('Error creating card:', error);
            showModal(t('common.error'), t('admin.settings.createFailed'), 'error');
        } finally {
            setCreatingCard(false);
        }
    };

    const handleDeleteCard = async (id: string) => {
        showModal(t('admin.settings.confirmDeleteCard'), t('admin.settings.confirmDeleteCard'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/cards/${id}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    fetchCards();
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
                }
            } catch (error) {
                console.error('Error deleting card:', error);
                showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
            }
        });
    };

    const handleAddSocial = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/socials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSocial),
            });

            if (res.ok) {
                setNewSocial({ platform: 'Facebook', url: '', icon: 'facebook' });
                fetchSocials();
                showModal(t('common.success'), t('admin.settings.socialAdded'), 'success');
            } else {
                showModal(t('common.error'), t('admin.settings.addFailed'), 'error');
            }
        } catch (error) {
            console.error('Error adding social:', error);
            showModal(t('common.error'), t('admin.settings.addFailed'), 'error');
        }
    };

    const handleDeleteSocial = async (id: string) => {
        showModal(t('admin.settings.confirmDeleteSocial'), t('admin.settings.confirmDeleteSocial'), 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/socials/${id}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    fetchSocials();
                    showModal(t('common.success'), t('common.success'), 'success');
                } else {
                    showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
                }
            } catch (error) {
                console.error('Error deleting social:', error);
                showModal(t('common.error'), t('admin.settings.deleteFailed'), 'error');
            }
        });
    };

    // Team Member Handlers
    const handleAddMember = () => {
        setEditingMember(null);
        setMinecraftName('');
        setFormData({
            name: '',
            role: '',
            description: '',
            image: '',
            avatar: '',
            order: teamMembers.length
        });
        setIsFormOpen(true);
    };

    const handleEditMember = (member: TeamMember) => {
        setEditingMember(member);
        setMinecraftName(''); // Reset, or could try to extract from image URL if needed
        setFormData(member);
        setIsFormOpen(true);
    };

    const handleDeleteMember = (id: string) => {
        showModal(t('admin.settings.confirmDeleteMember'), '', 'warning', 'confirm', async () => {
            try {
                const res = await fetch(`${API_URL}/api/team/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    }
                });

                if (res.ok) {
                    fetchTeamMembers();
                    showModal('Success', 'Member deleted successfully', 'success');
                }
            } catch (error) {
                console.error('Error deleting member:', error);
                showModal('Error', 'Failed to delete member', 'error');
            }
        });
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'order' ? parseInt(value) : value }));
    };

    const handleFetchMinecraftSkin = () => {
        if (!minecraftName) return;

        // Use name directly as requested
        setFormData(prev => ({
            ...prev,
            image: `https://api.mineatar.io/body/full/${minecraftName}`,
            avatar: `https://api.mineatar.io/face/${minecraftName}`,
            name: prev.name || minecraftName // Auto-fill name if empty
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingMember
                ? `${API_URL}/api/team/${editingMember._id}`
                : `${API_URL}/api/team`;

            const method = editingMember ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchTeamMembers();
                setIsFormOpen(false);
                showModal('Success', `Member ${editingMember ? 'updated' : 'added'} successfully`, 'success');
            } else {
                showModal('Error', 'Failed to save member', 'error');
            }
        } catch (error) {
            console.error('Error saving member:', error);
            showModal('Error', 'Failed to save member', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('admin.settings.title')}</h1>
                    <p className="text-gray-400 mt-2">{t('admin.settings.subtitle')}</p>
                </div>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-lg transition-colors border border-red-500/20 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {t('admin.settings.resetDefaults')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Content (Span 2) */}
                <div className="space-y-8 lg:col-span-2">
                    {/* Home Page Content Section */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            {t('admin.settings.homeContent')}
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.heroTitle')}</label>
                                <input
                                    type="text"
                                    name="heroTitle"
                                    value={settings.heroTitle}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                    placeholder="E.g., ELEVATE YOUR GAMEPLAY"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.heroDescription')}</label>
                                <textarea
                                    name="heroDescription"
                                    value={settings.heroDescription}
                                    onChange={handleSettingsChange}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none resize-none"
                                    placeholder="Enter the description for the hero section..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.buttonText')}</label>
                                    <input
                                        type="text"
                                        name="heroButtonText"
                                        value={settings.heroButtonText}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="E.g., Copy IP"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-400">{t('admin.settings.buttonAction')}</label>
                                    <div className="grid grid-cols-3 bg-[#2a2a2a] p-1 rounded-lg gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, heroButtonAction: 'copy_ip' }))}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${settings.heroButtonAction === 'copy_ip'
                                                ? 'bg-[var(--primary)] text-black shadow-md font-bold'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            Copy IP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, heroButtonAction: 'link' }))}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${settings.heroButtonAction === 'link'
                                                ? 'bg-[var(--primary)] text-black shadow-md font-bold'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            Custom Link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, heroButtonAction: 'auto_launcher' }))}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${settings.heroButtonAction === 'auto_launcher'
                                                ? 'bg-[var(--primary)] text-black shadow-md font-bold'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            Auto Launcher
                                        </button>
                                    </div>

                                    {settings.heroButtonAction === 'auto_launcher' && (
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs text-emerald-300">
                                            <div className="font-semibold text-emerald-400 flex items-center gap-2">
                                                <span>🚀 Auto Launcher Download Active</span>
                                            </div>
                                            <p>
                                                ระบบจะแจกไฟล์ติดตั้ง (.setup.exe, .msi, .exe) ให้ผู้เล่นกดเลือกดาวน์โหลดโดยตรงจากตัวเกมที่ Build ไว้โดยอัตโนมัติ ไม่ต้องใส่ลิงก์ภายนอก
                                            </p>
                                        </div>
                                    )}

                                    {settings.heroButtonAction === 'link' && (
                                        <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    name="heroButtonLink"
                                                    value={settings.heroButtonLink || ''}
                                                    onChange={handleSettingsChange}
                                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                                    placeholder="https://example.com/download"
                                                />
                                                <button
                                                    onClick={() => heroFileInputRef.current?.click()}
                                                    disabled={heroFileUploading}
                                                    className="shrink-0 px-4 py-3 bg-[#333] hover:bg-[#444] text-white font-medium rounded-lg transition-colors border border-white/10 flex items-center gap-2"
                                                >
                                                    {heroFileUploading ? (
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    )}
                                                    Upload
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={heroFileInputRef}
                                                    className="hidden"
                                                    onChange={handleHeroFileUpload}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                You can paste a link manually, or click Upload to upload a file directly to the server.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.serverIp')}</label>
                                    <input
                                        type="text"
                                        name="serverIp"
                                        value={settings.serverIp}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="E.g., play.example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.latestArticlesTitle')}</label>
                                    <input
                                        type="text"
                                        name="latestArticlesTitle"
                                        value={settings.latestArticlesTitle}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="Latest Articles"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.whyChooseUsTitle')}</label>
                                    <input
                                        type="text"
                                        name="whyChooseUsTitle"
                                        value={settings.whyChooseUsTitle}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="Why Choose Us?"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingSettings ? t('common.saving') : t('common.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Seasonal Settings Section */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t('admin.settings.seasonalSettings')}
                        </h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Christmas Toggle */}
                                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5 cursor-pointer group hover:border-[var(--primary)]/50 transition-all">
                                    <span className="text-white font-medium">{t('admin.settings.seasonal.christmas')}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.seasonal_christmas}
                                            onChange={(e) => setSettings({ ...settings, seasonal_christmas: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.seasonal_christmas ? 'bg-[var(--primary)]' : 'bg-[#333]'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.seasonal_christmas ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>

                                {/* Mourning Toggle */}
                                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5 cursor-pointer group hover:border-[var(--primary)]/50 transition-all">
                                    <span className="text-white font-medium">{t('admin.settings.seasonal.mourning')}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.seasonal_mourning}
                                            onChange={(e) => setSettings({ ...settings, seasonal_mourning: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.seasonal_mourning ? 'bg-[var(--primary)]' : 'bg-[#333]'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.seasonal_mourning ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>

                                {/* New Year Toggle */}
                                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5 cursor-pointer group hover:border-[var(--primary)]/50 transition-all">
                                    <span className="text-white font-medium">{t('admin.settings.seasonal.newyear')}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.seasonal_newyear}
                                            onChange={(e) => setSettings({ ...settings, seasonal_newyear: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.seasonal_newyear ? 'bg-[var(--primary)]' : 'bg-[#333]'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.seasonal_newyear ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>

                                {/* Halloween Toggle */}
                                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5 cursor-pointer group hover:border-[var(--primary)]/50 transition-all">
                                    <span className="text-white font-medium">{t('admin.settings.seasonal.halloween')}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.seasonal_halloween}
                                            onChange={(e) => setSettings({ ...settings, seasonal_halloween: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.seasonal_halloween ? 'bg-[var(--primary)]' : 'bg-[#333]'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.seasonal_halloween ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>

                                {/* Valentine Toggle */}
                                <label className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5 cursor-pointer group hover:border-[var(--primary)]/50 transition-all">
                                    <span className="text-white font-medium">{t('admin.settings.seasonal.valentine')}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.seasonal_valentine}
                                            onChange={(e) => setSettings({ ...settings, seasonal_valentine: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${settings.seasonal_valentine ? 'bg-[var(--primary)]' : 'bg-[#333]'}`}></div>
                                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.seasonal_valentine ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingSettings ? t('common.saving') : t('common.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Meet The Team Section */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <Users className="w-5 h-5 text-[var(--primary)]" />
                                {t('admin.settings.meetTheTeam')}
                            </h2>
                            <button
                                onClick={handleAddMember}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('admin.settings.addMember')}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Section Title & Subtitle */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.teamTitle')}
                                    </label>
                                    <input
                                        type="text"
                                        name="teamTitle"
                                        value={settings.teamTitle || ''}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="Meet The Team"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        {t('admin.settings.teamSubtitle')}
                                    </label>
                                    <input
                                        type="text"
                                        name="teamSubtitle"
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="Learn about the people who make us amazing!"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
                                >
                                    {savingSettings ? t('common.saving') : t('common.saveChanges')}
                                </button>
                            </div>

                            {/* Team Members List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                {teamMembers.map((member) => (
                                    <div key={member._id} className="bg-[#2a2a2a] border border-white/5 rounded-xl p-4 flex items-center gap-4 group">
                                        <ImageWithSkeleton src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate">{member.name}</h4>
                                            <p className="text-gray-400 text-sm truncate">{member.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditMember(member)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => member._id && handleDeleteMember(member._id)}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Social Section */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                            {t('admin.settings.socialSection')}
                        </h2>
                        <div className="space-y-6">
                            {/* Social Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.socialImage')}</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-[#2a2a2a] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                                        {socialImagePreview ? (
                                            <ImageWithSkeleton src={socialImagePreview} alt="Social Preview" objectFit="cover" className="w-full h-full" />
                                        ) : (
                                            <span className="text-gray-600 text-xs">{t('admin.settings.noImage')}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSocialImageChange}
                                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 transition-all"
                                        />
                                        <button
                                            onClick={handleSocialImageUpload}
                                            disabled={!socialImage || socialImageUploading}
                                            className="mt-2 px-4 py-2 bg-[var(--primary)] text-black text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                                        >
                                            {socialImageUploading ? t('common.uploading') : t('common.upload')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.socialTitle')}</label>
                                <input
                                    type="text"
                                    name="socialTitle"
                                    value={settings.socialTitle}
                                    onChange={handleSettingsChange}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                    placeholder="Let's Be Social!"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.socialDescription')}</label>
                                <textarea
                                    name="socialDescription"
                                    value={settings.socialDescription}
                                    onChange={handleSettingsChange}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none resize-none"
                                    placeholder="Enter social description..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.socialButtonText')}</label>
                                    <input
                                        type="text"
                                        name="socialButtonText"
                                        value={settings.socialButtonText}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="JOIN OUR DISCORD"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.socialButtonLink')}</label>
                                    <input
                                        type="text"
                                        name="socialButtonLink"
                                        value={settings.socialButtonLink}
                                        onChange={handleSettingsChange}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none"
                                        placeholder="https://discord.gg/..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingSettings ? t('common.saving') : t('common.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Team Member Form Modal */}
                    {isFormOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">
                                        {editingMember ? 'Edit Member' : t('admin.settings.addMember')}
                                    </h3>
                                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    {/* Minecraft Name Input */}
                                    <div className="bg-[#2a2a2a] p-4 rounded-xl border border-white/5 mb-4">
                                        <label className="block text-sm font-medium text-[var(--primary)] mb-2">
                                            Minecraft Username
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={minecraftName}
                                                onChange={(e) => setMinecraftName(e.target.value)}
                                                placeholder="Enter Minecraft Username"
                                                className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!minecraftName) return;
                                                    try {
                                                        const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${minecraftName}`);
                                                        if (res.ok) {
                                                            const data = await res.json();
                                                            const uuid = data.uuid;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                image: `https://api.mineatar.io/body/full/${uuid}?scale=16`,
                                                                avatar: `https://api.mineatar.io/head/${uuid}`,
                                                                name: data.username
                                                            }));
                                                        } else {
                                                            // Fallback to name if UUID fetch fails, but user specifically asked for UUID.
                                                            // We'll try to use the name but warn or just use it.
                                                            // Given the request, let's stick to the requested format if possible, 
                                                            // but if API fails, name is the only backup.
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                image: `https://api.mineatar.io/body/full/${minecraftName}?scale=16`,
                                                                avatar: `https://api.mineatar.io/head/${minecraftName}`,
                                                                name: minecraftName
                                                            }));
                                                        }
                                                    } catch (error) {
                                                        console.error('Error fetching UUID:', error);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            image: `https://api.mineatar.io/body/full/${minecraftName}?scale=16`,
                                                            avatar: `https://api.mineatar.io/head/${minecraftName}`,
                                                            name: minecraftName
                                                        }));
                                                    }
                                                }}
                                                className="px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <Search className="w-5 h-5" />
                                                <span className="text-sm font-bold">Load</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Click "Load" to fetch the UUID and generate images.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            {t('admin.settings.memberName')} (Display Name)
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            {t('admin.settings.memberRole')}
                                        </label>
                                        <input
                                            type="text"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            {t('admin.settings.memberDesc')}
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleFormChange}
                                            required
                                            rows={3}
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none resize-none"
                                        />
                                    </div>

                                    {/* Hidden URL inputs to ensure state is kept but not shown */}
                                    <input type="hidden" name="image" value={formData.image} />
                                    <input type="hidden" name="avatar" value={formData.avatar} />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            {t('admin.settings.memberOrder')}
                                        </label>
                                        <input
                                            type="number"
                                            name="order"
                                            value={formData.order}
                                            onChange={handleFormChange}
                                            className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-[var(--primary)] hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all mt-4"
                                    >
                                        {editingMember ? 'Update Member' : 'Add Member'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                    {/* Feature Cards Section */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            {t('admin.settings.featureCards')}
                        </h2>

                        {/* Create New Card */}
                        <div className="bg-[#2a2a2a] rounded-xl p-6 mb-8 border border-white/5">
                            <h3 className="text-white font-bold mb-4">{t('admin.settings.addNewCard')}</h3>
                            <form onSubmit={handleCreateCard} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder={t('admin.settings.cardTitle')}
                                        value={newCard.title}
                                        onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                                        className="px-4 py-2 bg-[#1e1e1e] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                        required
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newCard.color}
                                            onChange={(e) => setNewCard({ ...newCard, color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-gray-400 text-sm">{t('admin.settings.cardColor')}</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder={t('admin.settings.cardDescription')}
                                    value={newCard.description}
                                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#1e1e1e] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none resize-none"
                                    rows={3}
                                    required
                                />
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer px-4 py-2 bg-[#1e1e1e] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-white/10 text-center">
                                        {cardImagePreview ? t('admin.settings.changeImage') : t('admin.settings.uploadImage')}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleCardImageChange} />
                                    </label>
                                    {cardImagePreview && (
                                        <ImageWithSkeleton src={cardImagePreview} alt="Preview" objectFit="cover" className="w-10 h-10 rounded" />
                                    )}
                                    <button
                                        type="submit"
                                        disabled={creatingCard}
                                        className="px-6 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {creatingCard ? t('common.adding') : t('admin.settings.addCard')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* List Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cards.map((card) => (
                                <div key={card._id} className="bg-[#2a2a2a] rounded-xl border border-white/5 relative group overflow-hidden flex flex-col h-full">
                                    <button
                                        onClick={() => handleDeleteCard(card._id)}
                                        className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>

                                    {/* Image Section */}
                                    <div className="w-full h-48 relative bg-[#121212]">
                                        <ImageWithSkeleton src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2a2a] to-transparent opacity-60"></div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-4 relative">
                                        <h4 className="font-bold mb-1 text-sm" style={{ color: card.color }}>{card.title}</h4>
                                        <p className="text-gray-400 text-xs line-clamp-2">{card.description}</p>
                                    </div>
                                </div>
                            ))}
                            {cards.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500">
                                    {t('admin.settings.noCards')}
                                </div>
                            )}
                        </div>
                    </div>

                </div>


                {/* Right Column: Feature Cards, Social, Media */}
                <div className="space-y-8">
                    {/* Feature Cards Section */}
                    {/* Theme Settings */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-2 h-8 bg-[var(--primary)] rounded-full"></span>
                            {t('admin.settings.themeSettings')}
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wider">{t('admin.settings.primaryColor')}</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        name="primaryColor"
                                        value={settings.primaryColor}
                                        onChange={handleSettingsChange}
                                        className="w-16 h-16 rounded-lg cursor-pointer bg-transparent border-none p-0"
                                    />
                                    <input
                                        type="text"
                                        name="primaryColor"
                                        value={settings.primaryColor}
                                        onChange={handleSettingsChange}
                                        className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#2a2a2a] text-white placeholder-gray-500 transition-all outline-none font-mono"
                                        placeholder="#55FF55"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                    className="w-full px-6 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingSettings ? t('common.saving') : t('admin.settings.applyTheme')}
                                </button>
                            </div>
                        </div>
                    </div>



                    {/* Social Media Settings */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            {t('admin.settings.socialMedia')}
                        </h2>

                        <div className="space-y-6">
                            <form onSubmit={handleAddSocial} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.platform')}</label>
                                    <select
                                        value={newSocial.icon}
                                        onChange={(e) => setNewSocial({ ...newSocial, icon: e.target.value, platform: e.target.options[e.target.selectedIndex].text })}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white outline-none"
                                    >
                                        <option value="facebook">Facebook</option>
                                        <option value="twitter">Twitter (X)</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="discord">Discord</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="twitch">Twitch</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.url')}</label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={newSocial.url}
                                        onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white font-bold rounded-lg transition-colors border border-white/10"
                                >
                                    {t('admin.settings.addSocial')}
                                </button>
                            </form>

                            <div className="space-y-3 pt-4 border-t border-white/5">
                                {socials.map((social) => (
                                    <div key={social._id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-gray-400">
                                                {/* Simple icon mapping based on social.icon string */}
                                                <span className="capitalize text-xs">{social.icon[0]}</span>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-white text-sm font-medium capitalize">{social.icon}</p>
                                                <p className="text-gray-500 text-xs truncate max-w-[150px]">{social.url}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSocial(social._id)}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                                {socials.length === 0 && (
                                    <p className="text-center text-gray-500 text-sm py-2">{t('admin.settings.noSocials')}</p>
                                )}
                            </div>
                        </div>
                    </div>



                    {/* Media Settings */}
                    <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {t('admin.settings.mediaAssets')}
                        </h2>

                        <div className="space-y-8">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.websiteLogo')}</label>
                                <div className="flex flex-col gap-4">
                                    <div className="w-full h-32 bg-[#2a2a2a] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {preview ? (
                                            <ImageWithSkeleton src={preview} alt="Logo Preview" objectFit="contain" className="h-full p-4" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <span className="text-xs text-gray-500">{t('admin.settings.noLogo')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-white/10 text-center">
                                            {t('admin.settings.chooseFile')}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                        {logo && (
                                            <button
                                                onClick={handleUpload}
                                                disabled={uploading}
                                                className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.upload')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Background Upload */}
                            <div className="pt-6 border-t border-white/5">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.heroBackground')}</label>
                                <div className="flex flex-col gap-4">
                                    <div className="w-full h-32 bg-[#2a2a2a] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {bgPreview ? (
                                            <ImageWithSkeleton src={bgPreview} alt="Background Preview" objectFit="cover" className="w-full h-full" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <span className="text-xs text-gray-500">{t('admin.settings.noImage')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-white/10 text-center">
                                            {t('admin.settings.chooseFile')}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleBgFileChange} />
                                        </label>
                                        {background && (
                                            <button
                                                onClick={handleBgUpload}
                                                disabled={bgUploading}
                                                className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.upload')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>



                            {/* Favicon Upload */}
                            <div className="pt-6 border-t border-white/5">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.websiteFavicon')}</label>
                                <div className="flex flex-col gap-4">
                                    <div className="w-32 h-32 bg-[#2a2a2a] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {faviconPreview ? (
                                            <ImageWithSkeleton src={faviconPreview} alt="Favicon Preview" objectFit="contain" className="w-16 h-16" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <span className="text-xs text-gray-500">{t('admin.settings.noFavicon')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors border border-white/10 text-center">
                                            {t('admin.settings.chooseFile')}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFaviconFileChange} />
                                        </label>
                                        {favicon && (
                                            <button
                                                onClick={handleFaviconUpload}
                                                disabled={faviconUploading}
                                                className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.upload')}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">{t('admin.settings.faviconHint')}</p>
                                </div>
                            </div>

                            {/* Site Title */}
                            <div className="pt-6 border-t border-white/5">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('admin.settings.websiteTitle')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={siteTitle}
                                        onChange={(e) => setSiteTitle(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] text-white placeholder-gray-500 outline-none"
                                        placeholder="MC Webshop"
                                    />
                                    <button
                                        onClick={saveSiteTitle}
                                        disabled={savingTitle}
                                        className="px-6 py-2 bg-[var(--primary)] hover:brightness-110 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingTitle ? t('common.saving') : t('common.save')}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{t('admin.settings.titleHint')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </div>
    );
}
