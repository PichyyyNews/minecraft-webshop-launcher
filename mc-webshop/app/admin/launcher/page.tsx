'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Download, FileText, Gamepad2, ImageUp, Palette, Plus, Save, Search, Trash2, Type, Upload } from 'lucide-react';
import { API_URL } from '../../utils/config';
import Modal from '../../components/Modal';

type LauncherConfig = {
    appName: string;
    headline: string;
    primaryColor: string;
    logoUrl: string;
    installType: 'vanilla' | 'modded';
    installFolderName: string;
    minecraftVersion: string;
    loaderType: 'Vanilla' | 'Fabric' | 'Forge' | 'Quilt';
    modLoaderVersion: string;
    optionsFileUrl: string;
    resourcePackUrl: string;
    mods: LauncherMod[];
    resourcePacks: LauncherMod[];
};

type LauncherMod = {
    projectId: string;
    slug: string;
    title: string;
    description: string;
    iconUrl: string;
    author: string;
    minecraftVersion: string;
    loader: string;
    versionId: string;
    versionNumber: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    sha1: string;
    downloads?: number;
};

type MinecraftVersionOption = {
    id: string;
    type: string;
    releaseTime: string;
};

type LoaderOption = {
    id: string;
    name: string;
};

type LoaderVersionOption = {
    id: string;
    stable?: boolean;
    channel?: string;
};

type ModCategoryOption = {
    name: string;
    displayName: string;
    icon?: string;
};

type SelectOption = {
    value: string;
    label: string;
};

type PresetSnapshot = {
    mods: LauncherMod[];
    resourcePacks: LauncherMod[];
    modResults: LauncherMod[];
    resourcePackResults: LauncherMod[];
    modSearch: string;
    resourcePackSearch: string;
    modCategory: string;
    resourcePackCategory: string;
};

function CompactSelect({
    value,
    options,
    placeholder,
    onChange,
    className = '',
}: {
    value: string;
    options: SelectOption[];
    placeholder: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find(option => option.value === value);

    return (
        <div
            className={`relative ${className}`}
            tabIndex={0}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent flex items-center justify-between gap-3 text-left"
            >
                <span className={selected ? 'truncate' : 'truncate text-gray-500'}>
                    {selected?.label || placeholder}
                </span>
                <span className="text-gray-500 text-xs">▼</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl">
                    <div className="max-h-[240px] overflow-y-auto py-1">
                        {options.map(option => (
                            <button
                                key={option.value || '__empty'}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/10 ${option.value === value ? 'text-[var(--primary)] bg-white/5' : 'text-gray-200'
                                    }`}
                            >
                                <span className="block truncate">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const defaultConfig: LauncherConfig = {
    appName: 'MC Launcher',
    headline: 'พร้อมเข้าเซิร์ฟเวอร์',
    primaryColor: '#8fde5d',
    logoUrl: '',
    installType: 'vanilla',
    installFolderName: 'minecraft-client',
    minecraftVersion: '1.21.8',
    loaderType: 'Vanilla',
    modLoaderVersion: '',
    optionsFileUrl: '',
    resourcePackUrl: '',
    mods: [],
    resourcePacks: [],
};

const resolveUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = (API_URL || 'http://localhost:5000').replace(/\/$/, '');
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function AdminLauncherPage() {
    const router = useRouter();
    const [config, setConfig] = useState<LauncherConfig>(defaultConfig);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [optionsFile, setOptionsFile] = useState<File | null>(null);
    const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersionOption[]>([]);
    const [loaders, setLoaders] = useState<LoaderOption[]>([]);
    const [loaderVersions, setLoaderVersions] = useState<LoaderVersionOption[]>([]);
    const [metadataLoading, setMetadataLoading] = useState(false);
    const [modSearch, setModSearch] = useState('');
    const [modSearchLoading, setModSearchLoading] = useState(false);
    const [modResults, setModResults] = useState<LauncherMod[]>([]);
    const [modCategories, setModCategories] = useState<ModCategoryOption[]>([]);
    const [modCategory, setModCategory] = useState('');
    const [resourcePackSearch, setResourcePackSearch] = useState('');
    const [resourcePackSearchLoading, setResourcePackSearchLoading] = useState(false);
    const [resourcePackResults, setResourcePackResults] = useState<LauncherMod[]>([]);
    const [resourcePackCategories, setResourcePackCategories] = useState<ModCategoryOption[]>([]);
    const [resourcePackCategory, setResourcePackCategory] = useState('');
    const [customModUploading, setCustomModUploading] = useState(false);
    const [customResourcePackUploading, setCustomResourcePackUploading] = useState(false);
    const [presetCache, setPresetCache] = useState<Record<string, PresetSnapshot>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    useEffect(() => {
        fetchConfig();
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (config.installType === 'modded' && config.loaderType && config.minecraftVersion) {
            fetchLoaderVersions(config.loaderType, config.minecraftVersion);
        } else {
            setLoaderVersions([]);
        }
    }, [config.installType, config.loaderType, config.minecraftVersion]);

    useEffect(() => {
        if (config.installType === 'modded' && config.minecraftVersion && config.loaderType && config.loaderType !== 'Vanilla') {
            searchMods({ query: modSearch, category: modCategory, silent: true });
        }
    }, [config.installType, config.minecraftVersion, config.loaderType, modCategory]);

    useEffect(() => {
        if (config.minecraftVersion) {
            searchResourcePacks({ query: resourcePackSearch, category: resourcePackCategory, silent: true });
        }
    }, [config.minecraftVersion, resourcePackCategory]);

    const closeModal = () => {
        setModalProps(prev => ({ ...prev, isOpen: false }));
    };

    const getPresetKey = (minecraftVersion = config.minecraftVersion, loaderType = config.loaderType) => {
        return `${minecraftVersion || 'unknown'}::${loaderType || 'Vanilla'}`;
    };

    const getCurrentPresetSnapshot = (): PresetSnapshot => ({
        mods: config.mods,
        resourcePacks: config.resourcePacks,
        modResults,
        resourcePackResults,
        modSearch,
        resourcePackSearch,
        modCategory,
        resourcePackCategory,
    });

    const cacheCurrentPreset = () => {
        const key = getPresetKey();
        setPresetCache(prev => ({
            ...prev,
            [key]: getCurrentPresetSnapshot(),
        }));
    };

    const switchPreset = (updates: Partial<LauncherConfig>) => {
        const nextMinecraftVersion = updates.minecraftVersion ?? config.minecraftVersion;
        const nextLoaderType = updates.loaderType ?? config.loaderType;
        const nextKey = getPresetKey(nextMinecraftVersion, nextLoaderType);
        const nextSnapshot = presetCache[nextKey];

        cacheCurrentPreset();
        setConfig(prev => ({
            ...prev,
            ...updates,
            mods: nextSnapshot?.mods || [],
            resourcePacks: nextSnapshot?.resourcePacks || [],
        }));
        setModResults(nextSnapshot?.modResults || []);
        setResourcePackResults(nextSnapshot?.resourcePackResults || []);
        setModSearch(nextSnapshot?.modSearch || '');
        setResourcePackSearch(nextSnapshot?.resourcePackSearch || '');
        setModCategory(nextSnapshot?.modCategory || '');
        setResourcePackCategory(nextSnapshot?.resourcePackCategory || '');
    };

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setModalProps({
            isOpen: true,
            title,
            message,
            type,
            mode: 'alert',
            onConfirm: () => { },
        });
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/launcher/config`);
            if (!res.ok) throw new Error('Failed to load config');
            const data = await res.json();
            setConfig(prev => ({ ...prev, ...data }));
            setPresetCache(prev => ({
                ...prev,
                [`${data.minecraftVersion || defaultConfig.minecraftVersion}::${data.loaderType || defaultConfig.loaderType}`]: {
                    mods: data.mods || [],
                    resourcePacks: data.resourcePacks || [],
                    modResults: [],
                    resourcePackResults: [],
                    modSearch: '',
                    resourcePackSearch: '',
                    modCategory: '',
                    resourcePackCategory: '',
                },
            }));
        } catch (error) {
            showModal('Error', 'Failed to load launcher config', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        setMetadataLoading(true);
        try {
            const [versionRes, loaderRes, categoryRes, resourcePackCategoryRes] = await Promise.all([
                fetch(`${API_URL}/api/launcher/metadata/minecraft-versions`),
                fetch(`${API_URL}/api/launcher/metadata/mod-loaders`),
                fetch(`${API_URL}/api/launcher/modrinth/categories?projectType=mod`),
                fetch(`${API_URL}/api/launcher/modrinth/categories?projectType=resourcepack`),
            ]);

            if (versionRes.ok) {
                const data = await versionRes.json();
                setMinecraftVersions(data.versions || []);
            }

            if (loaderRes.ok) {
                setLoaders(await loaderRes.json());
            }

            if (categoryRes.ok) {
                setModCategories(await categoryRes.json());
            }

            if (resourcePackCategoryRes.ok) {
                setResourcePackCategories(await resourcePackCategoryRes.json());
            }
        } catch (error) {
            showModal('Error', 'Failed to load launcher metadata', 'error');
        } finally {
            setMetadataLoading(false);
        }
    };

    const fetchLoaderVersions = async (loader: string, minecraftVersion: string) => {
        setMetadataLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/launcher/metadata/mod-loader-versions/${loader}?minecraftVersion=${encodeURIComponent(minecraftVersion)}`);
            if (!res.ok) throw new Error('Failed to load loader versions');
            const data = await res.json() as LoaderVersionOption[];
            setLoaderVersions(data);
            setConfig(prev => {
                if (
                    prev.installType !== 'modded' ||
                    prev.loaderType !== loader ||
                    prev.minecraftVersion !== minecraftVersion ||
                    data.length === 0
                ) {
                    return prev;
                }

                const currentVersionExists = data.some(version => version.id === prev.modLoaderVersion);
                if (currentVersionExists) return prev;

                return {
                    ...prev,
                    modLoaderVersion: data[0].id,
                };
            });
        } catch (error) {
            setLoaderVersions([]);
        } finally {
            setMetadataLoading(false);
        }
    };

    const searchMods = async (options?: { query?: string; category?: string; silent?: boolean }) => {
        const query = options?.query ?? modSearch;
        const category = options?.category ?? modCategory;
        if (config.installType !== 'modded' || !config.minecraftVersion || !config.loaderType || config.loaderType === 'Vanilla') {
            if (!options?.silent) {
                showModal('Select modded preset', 'Choose Minecraft version and mod loader before searching mods.', 'warning');
            }
            return;
        }

        setModSearchLoading(true);
        try {
            const params = new URLSearchParams({
                minecraftVersion: config.minecraftVersion,
                loader: config.loaderType,
            });
            if (query.trim()) params.set('query', query.trim());
            if (category) params.set('category', category);
            const res = await fetch(`${API_URL}/api/launcher/modrinth/search?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to search mods');
            const data = await res.json();
            const hits = data.hits || [];
            setModResults(hits);
            setPresetCache(prev => ({
                ...prev,
                [getPresetKey()]: {
                    ...getCurrentPresetSnapshot(),
                    modResults: hits,
                    modSearch: query,
                    modCategory: category,
                },
            }));
        } catch (error) {
            if (!options?.silent) {
                showModal('Error', 'Failed to search Modrinth mods', 'error');
            }
        } finally {
            setModSearchLoading(false);
        }
    };

    const searchResourcePacks = async (options?: { query?: string; category?: string; silent?: boolean }) => {
        const query = options?.query ?? resourcePackSearch;
        const category = options?.category ?? resourcePackCategory;
        if (!config.minecraftVersion) {
            if (!options?.silent) {
                showModal('Select Minecraft version', 'Choose Minecraft version before searching resource packs.', 'warning');
            }
            return;
        }

        setResourcePackSearchLoading(true);
        try {
            const params = new URLSearchParams({
                minecraftVersion: config.minecraftVersion,
                projectType: 'resourcepack',
            });
            if (query.trim()) params.set('query', query.trim());
            if (category) params.set('category', category);
            const res = await fetch(`${API_URL}/api/launcher/modrinth/search?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to search resource packs');
            const data = await res.json();
            const hits = data.hits || [];
            setResourcePackResults(hits);
            setPresetCache(prev => ({
                ...prev,
                [getPresetKey()]: {
                    ...getCurrentPresetSnapshot(),
                    resourcePackResults: hits,
                    resourcePackSearch: query,
                    resourcePackCategory: category,
                },
            }));
        } catch (error) {
            if (!options?.silent) {
                showModal('Error', 'Failed to search Modrinth resource packs', 'error');
            }
        } finally {
            setResourcePackSearchLoading(false);
        }
    };

    const addMod = (mod: LauncherMod) => {
        setConfig(prev => {
            if (prev.mods.some(item => item.projectId === mod.projectId)) return prev;
            const mods = [...prev.mods, mod];
            setPresetCache(cache => ({
                ...cache,
                [getPresetKey(prev.minecraftVersion, prev.loaderType)]: {
                    ...getCurrentPresetSnapshot(),
                    mods,
                },
            }));
            return { ...prev, mods };
        });
    };

    const removeMod = (projectId: string) => {
        setConfig(prev => {
            const mods = prev.mods.filter(mod => mod.projectId !== projectId);
            setPresetCache(cache => ({
                ...cache,
                [getPresetKey(prev.minecraftVersion, prev.loaderType)]: {
                    ...getCurrentPresetSnapshot(),
                    mods,
                },
            }));
            return { ...prev, mods };
        });
    };

    const addResourcePack = (resourcePack: LauncherMod) => {
        setConfig(prev => {
            if (prev.resourcePacks.some(item => item.projectId === resourcePack.projectId)) return prev;
            const resourcePacks = [...prev.resourcePacks, resourcePack];
            setPresetCache(cache => ({
                ...cache,
                [getPresetKey(prev.minecraftVersion, prev.loaderType)]: {
                    ...getCurrentPresetSnapshot(),
                    resourcePacks,
                },
            }));
            return { ...prev, resourcePacks };
        });
    };

    const removeResourcePack = (projectId: string) => {
        setConfig(prev => {
            const resourcePacks = prev.resourcePacks.filter(resourcePack => resourcePack.projectId !== projectId);
            setPresetCache(cache => ({
                ...cache,
                [getPresetKey(prev.minecraftVersion, prev.loaderType)]: {
                    ...getCurrentPresetSnapshot(),
                    resourcePacks,
                },
            }));
            return { ...prev, resourcePacks };
        });
    };

    const resetModsForPreset = (updates: Partial<LauncherConfig>) => {
        switchPreset(updates);
    };

    const saveLogo = async (token: string) => {
        if (!logoFile) return config.logoUrl;

        const formData = new FormData();
        formData.append('logo', logoFile);

        const res = await fetch(`${API_URL}/api/admin/launcher/logo`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) throw new Error('Failed to upload logo');
        const data = await res.json();
        return data.url as string;
    };

    const uploadLauncherFile = async (token: string, type: 'options', file: File | null) => {
        if (!file) {
            return config.optionsFileUrl;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/admin/launcher/files/${type}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) throw new Error('Failed to upload launcher file');
        const data = await res.json();
        return data.url as string;
    };

    const uploadCustomPresetFile = async (type: 'mod' | 'resourcePack', files: FileList | File[]) => {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('Missing admin token');

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }
        formData.append('minecraftVersion', config.minecraftVersion);
        formData.append('loader', config.loaderType);

        const res = await fetch(`${API_URL}/api/admin/launcher/preset-files/${type}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            if (res.status === 401) {
                localStorage.removeItem('adminToken');
                router.push('/admin/login');
                throw new Error('Admin session expired. Please log in again before uploading.');
            }
            throw new Error(errorData.message || 'Failed to upload preset file');
        }

        return await res.json() as LauncherMod[];
    };

    const handleCustomModUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (config.installType !== 'modded' || !config.loaderType || config.loaderType === 'Vanilla') {
            showModal('Select modded preset', 'Choose Minecraft version and mod loader before uploading custom mods.', 'warning');
            return;
        }

        setCustomModUploading(true);
        try {
            const uploadedMods = await uploadCustomPresetFile('mod', files);
            uploadedMods.forEach(mod => addMod(mod));
        } catch (error) {
            showModal('Error', error instanceof Error ? error.message : 'Failed to upload custom mods', 'error');
        } finally {
            setCustomModUploading(false);
        }
    };

    const handleCustomResourcePackUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!config.minecraftVersion) {
            showModal('Select Minecraft version', 'Choose Minecraft version before uploading custom resource packs.', 'warning');
            return;
        }

        setCustomResourcePackUploading(true);
        try {
            const uploadedResourcePacks = await uploadCustomPresetFile('resourcePack', files);
            uploadedResourcePacks.forEach(pack => addResourcePack(pack));
        } catch (error) {
            showModal('Error', error instanceof Error ? error.message : 'Failed to upload custom resource packs', 'error');
        } finally {
            setCustomResourcePackUploading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setMessage('');

        if (config.installType === 'modded' && (!config.loaderType || config.loaderType === 'Vanilla' || !config.modLoaderVersion)) {
            showModal('Select loader version', 'Choose a mod loader and loader version before saving a modded launcher preset.', 'warning');
            return;
        }

        setSaving(true);

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) throw new Error('Missing admin token');

            const logoUrl = await saveLogo(token);
            const optionsFileUrl = await uploadLauncherFile(token, 'options', optionsFile);
            const payload = { ...config, logoUrl, optionsFileUrl, resourcePackUrl: '' };

            const res = await fetch(`${API_URL}/api/admin/launcher/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                    throw new Error('Admin session expired. Please log in again before saving.');
                }
                throw new Error(errorData.message || 'Failed to save config');
            }
            const data = await res.json();
            setConfig(prev => ({ ...prev, ...data.config }));
            setLogoFile(null);
            setOptionsFile(null);
            setMessage('Launcher config saved');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            showModal('Error', error instanceof Error ? error.message : 'Failed to save launcher config', 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = 'w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none';
    const labelClass = 'block text-sm font-medium text-gray-400 mb-2';
    const previewLogo = logoFile ? URL.createObjectURL(logoFile) : resolveUrl(config.logoUrl);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-[var(--primary)]" />
                        Launcher
                    </h1>
                    <p className="text-gray-400 mt-2">ตั้งค่าหน้าหลัก launcher แบบสั้น ๆ สำหรับผู้เล่น</p>
                </div>
                <button
                    form="launcher-config-form"
                    type="submit"
                    disabled={saving || loading}
                    className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold py-3 px-5 rounded-xl transition-all disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {message && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6">
                    {message}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                </div>
            ) : (
                <form id="launcher-config-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
                    <section className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-6 text-[var(--primary)] flex items-center gap-2">
                                <ImageUp className="w-5 h-5" />
                                Branding
                            </h2>
                            <label className={labelClass}>Launcher Name</label>
                            <input
                                value={config.appName}
                                onChange={(event) => setConfig(prev => ({ ...prev, appName: event.target.value }))}
                                className={`${inputClass} mb-6`}
                                placeholder="MC Launcher"
                            />

                            <label className={labelClass}>Logo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:font-bold file:text-black hover:file:brightness-110"
                            />
                        </div>

                        <div>
                            <label className={`${labelClass} flex items-center gap-2`}>
                                <Type className="w-4 h-4" />
                                Headline
                            </label>
                            <input
                                value={config.headline}
                                onChange={(event) => setConfig(prev => ({ ...prev, headline: event.target.value }))}
                                className={inputClass}
                                placeholder="พร้อมเข้าเซิร์ฟเวอร์"
                            />
                        </div>

                        <div>
                            <label className={`${labelClass} flex items-center gap-2`}>
                                <Palette className="w-4 h-4" />
                                Play Button Color
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={(event) => setConfig(prev => ({ ...prev, primaryColor: event.target.value }))}
                                    className="h-11 w-16 rounded-lg bg-[#121212] border border-white/10"
                                />
                                <input
                                    value={config.primaryColor}
                                    onChange={(event) => setConfig(prev => ({ ...prev, primaryColor: event.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h2 className="text-xl font-bold mb-6 text-[var(--primary)] flex items-center gap-2">
                                <Box className="w-5 h-5" />
                                Game Install Profile
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Install Folder Name</label>
                                    <input
                                        required
                                        value={config.installFolderName}
                                        onChange={(event) => setConfig(prev => ({ ...prev, installFolderName: event.target.value }))}
                                        className={inputClass}
                                        placeholder="minecraft-client"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">Launcher will create this folder under its app data directory.</p>
                                </div>

                                <div>
                                    <label className={labelClass}>Minecraft Version <span className="text-red-400">*</span></label>
                                    <CompactSelect
                                        value={config.minecraftVersion}
                                        onChange={(value) => resetModsForPreset({ minecraftVersion: value })}
                                        placeholder="Select version"
                                        options={[
                                            { value: '', label: 'Select version' },
                                            ...minecraftVersions.map(version => ({ value: version.id, label: version.id })),
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Client Type <span className="text-red-400">*</span></label>
                                    <CompactSelect
                                        value={config.installType}
                                        onChange={(value) => {
                                            const installType = value as 'vanilla' | 'modded';
                                            resetModsForPreset({
                                                installType,
                                                loaderType: installType === 'vanilla' ? 'Vanilla' : config.loaderType === 'Vanilla' ? 'Fabric' : config.loaderType,
                                            });
                                        }}
                                        placeholder="Select client type"
                                        options={[
                                            { value: 'vanilla', label: 'Vanilla' },
                                            { value: 'modded', label: 'Modded' },
                                        ]}
                                    />
                                </div>

                                {config.installType === 'modded' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>Mod Loader</label>
                                            <CompactSelect
                                                value={config.loaderType}
                                                onChange={(value) => resetModsForPreset({
                                                    loaderType: value as LauncherConfig['loaderType'],
                                                    modLoaderVersion: '',
                                                })}
                                                placeholder="Select mod loader"
                                                options={loaders.map(loader => ({ value: loader.id, label: loader.name }))}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>Mod Loader Version</label>
                                            <CompactSelect
                                                value={config.modLoaderVersion}
                                                onChange={(value) => setConfig(prev => ({ ...prev, modLoaderVersion: value }))}
                                                placeholder="Select loader version"
                                                options={[
                                                    { value: '', label: 'Select loader version' },
                                                    ...loaderVersions.map(version => ({
                                                        value: version.id,
                                                        label: `${version.id}${version.channel ? ` (${version.channel})` : version.stable === false ? ' (unstable)' : ''}`,
                                                    })),
                                                ]}
                                            />
                                            {metadataLoading && <p className="mt-2 text-xs text-gray-500">Loading versions...</p>}
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className={`${labelClass} flex items-center gap-2`}>
                                        <FileText className="w-4 h-4" />
                                        Options File
                                    </label>
                                    <input
                                        type="file"
                                        accept=".txt,.json"
                                        onChange={(event) => setOptionsFile(event.target.files?.[0] || null)}
                                        className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-white/15"
                                    />
                                    {config.optionsFileUrl && <p className="mt-2 text-xs text-gray-500">{config.optionsFileUrl}</p>}
                                </div>

                            </div>
                        </div>
                    </section>

                    <aside className="bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl h-fit">
                        <div className="text-sm text-gray-400 mb-4">Preview</div>
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-[#111] p-5">
                            <div className="h-20 flex items-center justify-center mb-5">
                                {previewLogo ? (
                                    <img src={previewLogo} alt="" className="max-h-20 max-w-full object-contain" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                                        <Gamepad2 className="w-8 h-8 text-white" />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-white text-center mb-6">{config.headline}</h3>
                            <div
                                className="rounded-lg px-4 py-3 text-center text-black font-bold"
                                style={{ background: config.primaryColor }}
                            >
                                Play
                            </div>
                            <div className="mt-4 rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-gray-300">
                                <div className="flex justify-between gap-4">
                                    <span>Folder</span>
                                    <strong className="text-white">{config.installFolderName}</strong>
                                </div>
                                <div className="flex justify-between gap-4 mt-2">
                                    <span>Version</span>
                                    <strong className="text-white">{config.minecraftVersion}</strong>
                                </div>
                                <div className="flex justify-between gap-4 mt-2">
                                    <span>Client</span>
                                    <strong className="text-white">
                                        {config.installType === 'vanilla' ? 'Vanilla' : `${config.loaderType}${config.modLoaderVersion ? ` ${config.modLoaderVersion}` : ''}`}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="lg:col-span-2 bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-2 text-[var(--primary)] flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Mod Preset
                        </h2>
                        <p className="text-sm text-gray-400 mb-6">
                            Search Modrinth mods for the selected Minecraft version and mod loader. Changing the preset clears this list so players always download matching files.
                        </p>

                        {config.installType !== 'modded' ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                                Switch Client Type to Modded to manage Modrinth mods.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 min-w-0">
                                    <div className="text-sm font-bold text-gray-300 mb-3">Search Mods</div>
                                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                value={modSearch}
                                                onChange={(event) => setModSearch(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') {
                                                        event.preventDefault();
                                                        searchMods();
                                                    }
                                                }}
                                                className={`${inputClass} pl-10`}
                                                placeholder={`Search ${config.loaderType} ${config.minecraftVersion} mods`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => searchMods()}
                                            disabled={modSearchLoading}
                                            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold py-2 px-5 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            <Search className="w-4 h-4" />
                                            {modSearchLoading ? 'Searching...' : 'Search'}
                                        </button>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
                                        <CompactSelect
                                            value={modCategory}
                                            onChange={setModCategory}
                                            placeholder="Popular / All categories"
                                            options={[
                                                { value: '', label: 'Popular / All categories' },
                                                ...modCategories.map(category => ({
                                                    value: category.name,
                                                    label: category.displayName,
                                                })),
                                            ]}
                                        />
                                    </div>

                                    <div className="grid gap-3 max-h-[456px] overflow-y-auto overflow-x-hidden pr-1">
                                        {modResults.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-500">
                                                {modSearchLoading ? 'Loading popular mods...' : 'Popular compatible mods will appear here.'}
                                            </div>
                                        ) : (
                                            modResults.map(mod => {
                                                const added = config.mods.some(item => item.projectId === mod.projectId);
                                                return (
                                                    <div key={mod.projectId} className="grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-3 rounded-xl border border-white/10 bg-[#151515] p-3 min-h-[64px]">
                                                        {mod.iconUrl ? (
                                                            <img src={mod.iconUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/10" />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                                                                <Download className="w-5 h-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 overflow-hidden">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <strong className="text-white truncate">{mod.title}</strong>
                                                                <span className="text-xs text-gray-500 shrink-0">{mod.downloads?.toLocaleString() || 0}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-400 truncate">{mod.description}</p>
                                                            <p className="text-xs text-gray-500 truncate">{mod.versionNumber || mod.fileName}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => addMod(mod)}
                                                            disabled={added}
                                                            className="inline-flex w-full items-center justify-center gap-1 bg-[var(--primary)] text-black font-bold py-2 px-2 rounded-lg disabled:opacity-40"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            {added ? 'Added' : 'Add'}
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 min-w-0">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="text-sm font-bold text-gray-300">
                                            Installed Preset ({config.mods.length})
                                        </div>
                                        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15 ${customModUploading ? 'pointer-events-none opacity-50' : ''}`}>
                                            <Upload className="w-4 h-4" />
                                            {customModUploading ? 'Uploading...' : 'Upload .jar'}
                                            <input
                                                type="file"
                                                accept=".jar"
                                                className="hidden"
                                                multiple
                                                disabled={customModUploading}
                                                onChange={(event) => {
                                                    handleCustomModUpload(event.target.files);
                                                    event.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <div className="grid gap-3 max-h-[456px] overflow-y-auto overflow-x-hidden pr-1">
                                        {config.mods.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-500">
                                                No mods selected for this preset yet. Search Modrinth or upload a .jar file.
                                            </div>
                                        ) : (
                                            config.mods.map(mod => (
                                                <div key={mod.projectId} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 min-h-[64px]">
                                                    {mod.iconUrl ? (
                                                        <img src={mod.iconUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/10 shrink-0" />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-lg bg-white/10 shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <strong className="text-white block truncate">{mod.title}</strong>
                                                        <span className="text-xs text-gray-500 block truncate">
                                                            {mod.versionNumber || mod.fileName}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMod(mod.projectId)}
                                                        className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 shrink-0"
                                                        title="Remove mod"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="lg:col-span-2 bg-[#1e1e1e] rounded-2xl p-6 border border-white/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-2 text-[var(--primary)] flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Resource Pack
                        </h2>
                        <p className="text-sm text-gray-400 mb-6">
                            Search Modrinth resource packs for the selected Minecraft version. Players download these packs into the resourcepacks folder when they launch.
                        </p>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 min-w-0">
                                <div className="text-sm font-bold text-gray-300 mb-3">Search Resource Packs</div>
                                <div className="flex flex-col md:flex-row gap-3 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            value={resourcePackSearch}
                                            onChange={(event) => setResourcePackSearch(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    searchResourcePacks();
                                                }
                                            }}
                                            className={`${inputClass} pl-10`}
                                            placeholder={`Search ${config.minecraftVersion} resource packs`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => searchResourcePacks()}
                                        disabled={resourcePackSearchLoading}
                                        className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold py-2 px-5 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <Search className="w-4 h-4" />
                                        {resourcePackSearchLoading ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
                                    <CompactSelect
                                        value={resourcePackCategory}
                                        onChange={setResourcePackCategory}
                                        placeholder="Popular / All categories"
                                        options={[
                                            { value: '', label: 'Popular / All categories' },
                                            ...resourcePackCategories.map(category => ({
                                                value: category.name,
                                                label: category.displayName,
                                            })),
                                        ]}
                                    />
                                </div>

                                <div className="grid gap-3 max-h-[456px] overflow-y-auto overflow-x-hidden pr-1">
                                    {resourcePackResults.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-500">
                                            {resourcePackSearchLoading ? 'Loading popular resource packs...' : 'Popular compatible resource packs will appear here.'}
                                        </div>
                                    ) : (
                                        resourcePackResults.map(resourcePack => {
                                            const added = config.resourcePacks.some(item => item.projectId === resourcePack.projectId);
                                            return (
                                                <div key={resourcePack.projectId} className="grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-3 rounded-xl border border-white/10 bg-[#151515] p-3 min-h-[64px]">
                                                    {resourcePack.iconUrl ? (
                                                        <img src={resourcePack.iconUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/10" />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                                                            <Download className="w-5 h-5 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 overflow-hidden">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <strong className="text-white truncate">{resourcePack.title}</strong>
                                                            <span className="text-xs text-gray-500 shrink-0">{resourcePack.downloads?.toLocaleString() || 0}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 truncate">{resourcePack.description}</p>
                                                        <p className="text-xs text-gray-500 truncate">{resourcePack.versionNumber || resourcePack.fileName}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => addResourcePack(resourcePack)}
                                                        disabled={added}
                                                        className="inline-flex w-full items-center justify-center gap-1 bg-[var(--primary)] text-black font-bold py-2 px-2 rounded-lg disabled:opacity-40"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        {added ? 'Added' : 'Add'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 min-w-0">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="text-sm font-bold text-gray-300">
                                        Installed Resource Packs ({config.resourcePacks.length})
                                    </div>
                                    <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15 ${customResourcePackUploading ? 'pointer-events-none opacity-50' : ''}`}>
                                        <Upload className="w-4 h-4" />
                                        {customResourcePackUploading ? 'Uploading...' : 'Upload .zip'}
                                        <input
                                            type="file"
                                            accept=".zip"
                                            className="hidden"
                                            multiple
                                            disabled={customResourcePackUploading}
                                            onChange={(event) => {
                                                handleCustomResourcePackUpload(event.target.files);
                                                event.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="grid gap-3 max-h-[456px] overflow-y-auto overflow-x-hidden pr-1">
                                    {config.resourcePacks.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-500">
                                            No resource packs selected yet. Search Modrinth or upload a .zip file.
                                        </div>
                                    ) : (
                                        config.resourcePacks.map(resourcePack => (
                                            <div key={resourcePack.projectId} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 min-h-[64px]">
                                                {resourcePack.iconUrl ? (
                                                    <img src={resourcePack.iconUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/10 shrink-0" />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-lg bg-white/10 shrink-0" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <strong className="text-white block truncate">{resourcePack.title}</strong>
                                                    <span className="text-xs text-gray-500 block truncate">
                                                        {resourcePack.versionNumber || resourcePack.fileName}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeResourcePack(resourcePack.projectId)}
                                                    className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 shrink-0"
                                                    title="Remove resource pack"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </form>
            )}
        </div>
    );
}
