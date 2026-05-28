import { invoke } from "@tauri-apps/api/core";

export type LauncherStatus = {
  appName: string;
  version: string;
  platform: string;
};

export type LauncherConfig = {
  appName: string;
  headline: string;
  primaryColor: string;
  logoUrl: string;
  installType: "vanilla" | "modded";
  installFolderName: string;
  minecraftVersion: string;
  loaderType: "Vanilla" | "Fabric" | "Forge" | "Quilt";
  modLoaderVersion: string;
  optionsFileUrl: string;
  resourcePackUrl: string;
  mods: LauncherMod[];
  resourcePacks: LauncherMod[];
};

export type LauncherMod = {
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
};

export const defaultLauncherConfig: LauncherConfig = {
  appName: "MC Launcher",
  headline: "พร้อมเข้าเซิร์ฟเวอร์",
  primaryColor: "#8fde5d",
  logoUrl: "",
  installType: "vanilla",
  installFolderName: "minecraft-client",
  minecraftVersion: "1.21.8",
  loaderType: "Vanilla",
  modLoaderVersion: "",
  optionsFileUrl: "",
  resourcePackUrl: "",
  mods: [],
  resourcePacks: [],
};

const getBaseApiUrl = () => {
  if (import.meta.env.VITE_LAUNCHER_API_URL) {
    return import.meta.env.VITE_LAUNCHER_API_URL;
  }
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return "/api-backend";
  }
  return "http://localhost:5000";
};

const apiUrl = getBaseApiUrl();

export const getApiUrl = () => apiUrl.replace(/\/$/, "");

export type LauncherArticle = {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author?: string;
};

export type LauncherCard = {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  color?: string;
};

export type LauncherContent = {
  latestArticlesTitle: string;
  whyChooseUsTitle: string;
  latestArticles: LauncherArticle[];
  cards: LauncherCard[];
};

export type LauncherUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

export type LaunchResult = {
  installDir: string;
  launched: boolean;
  message: string;
};

export type MaintenanceResult = {
  installDir: string;
  message: string;
};

export async function getLauncherStatus(): Promise<LauncherStatus> {
  try {
    return await invoke<LauncherStatus>("get_launcher_status");
  } catch {
    return {
      appName: "MC Launcher",
      version: "web-preview",
      platform: "browser",
    };
  }
}

export async function getLauncherConfig(): Promise<LauncherConfig> {
  const response = await fetch(`${apiUrl}/api/launcher/config?_t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load launcher config");
  }

  const data = await response.json();
  return {
    ...defaultLauncherConfig,
    ...data,
  };
}

export async function getLauncherContent(): Promise<LauncherContent> {
  const response = await fetch(`${apiUrl}/api/launcher/content?_t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load launcher content");
  }

  return response.json();
}

export async function loginLauncherUser(username: string, password: string): Promise<LauncherUser> {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Login failed");
  }

  localStorage.setItem("launcherToken", data.token);
  localStorage.setItem("launcherUser", JSON.stringify(data.user));
  return data.user;
}

export function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${getApiUrl()}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function prepareAndLaunch(config: LauncherConfig, username: string, ramGb: number): Promise<LaunchResult> {
  // Call backend to generate auto-login token before launching
  try {
    const token = localStorage.getItem("launcherToken");
    if (token) {
      await fetch(`${getApiUrl()}/api/launcher/auto-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log("Auto-login token requested");
    }
  } catch (e) {
    console.error("Failed to request auto-login token", e);
  }

  return invoke<LaunchResult>("prepare_and_launch", {
    config,
    apiBaseUrl: getApiUrl(),
    username,
    ramGb,
  });
}

export async function openGameFolder(config: LauncherConfig): Promise<MaintenanceResult> {
  return invoke<MaintenanceResult>("open_game_folder", { config });
}

export async function reinstallGame(config: LauncherConfig): Promise<MaintenanceResult> {
  return invoke<MaintenanceResult>("reinstall_game", { config });
}

export async function uninstallGame(config: LauncherConfig): Promise<MaintenanceResult> {
  return invoke<MaintenanceResult>("uninstall_game", { config });
}
