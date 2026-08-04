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
  configFileUrl: string;
  resourcePackUrl: string;
  backgroundUrl: string;
  mods: LauncherMod[];
  resourcePacks: LauncherMod[];
  minLauncherVersion: string;
  latestLauncherVersion: string;
  launcherUpdateUrl: string;
  launcherUpdateNotes: string;
  optionsOverwriteMode?: "none" | "first-time" | "always";
  configOverwriteMode?: "none" | "first-time" | "always";
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

export function getLauncherAppName() {
  if (typeof import.meta.env.VITE_LAUNCHER_PRODUCT_NAME === "string" && import.meta.env.VITE_LAUNCHER_PRODUCT_NAME !== "") {
    return import.meta.env.VITE_LAUNCHER_PRODUCT_NAME;
  }
  return "Pixel-Kati";
}

export const defaultLauncherConfig: LauncherConfig = {
  appName: getLauncherAppName(),
  headline: "พร้อมเข้าเซิร์ฟเวอร์",
  primaryColor: "#8fde5d",
  logoUrl: "",
  installType: "vanilla",
  installFolderName: "minecraft-client",
  minecraftVersion: "1.21.8",
  loaderType: "Vanilla",
  modLoaderVersion: "",
  optionsFileUrl: "",
  configFileUrl: "",
  resourcePackUrl: "",
  backgroundUrl: "",
  mods: [],
  resourcePacks: [],
  minLauncherVersion: "0.1.3",
  latestLauncherVersion: "0.1.3",
  launcherUpdateUrl: "",
  launcherUpdateNotes: "",
  optionsOverwriteMode: "first-time",
  configOverwriteMode: "first-time",
};

export const LAUNCHER_VERSION = "0.1.10";

export const getBaseApiUrl = () => {
  if (typeof import.meta.env.VITE_LAUNCHER_API_URL === "string" && import.meta.env.VITE_LAUNCHER_API_URL !== "") {
    return import.meta.env.VITE_LAUNCHER_API_URL;
  }
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return "/api-backend";
  }
  return "http://localhost:5000";
};

let activeApiUrl = getBaseApiUrl().replace(/\/$/, "");

export const getApiUrl = () => activeApiUrl;

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = `${getApiUrl()}${cleanPath}`;
  try {
    const res = await fetch(primaryUrl, init);
    return res;
  } catch (err) {
    const fallbacks = [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://localhost/api-backend"
    ];
    for (const fallback of fallbacks) {
      if (activeApiUrl === fallback) continue;
      try {
        const fallbackUrl = `${fallback}${cleanPath}`;
        const res = await fetch(fallbackUrl, init);
        if (res.ok || res.status < 500) {
          activeApiUrl = fallback;
          return res;
        }
      } catch {
        // Try next fallback
      }
    }
    throw err;
  }
}

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
  const response = await fetchApi(`/api/launcher/config?_t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "x-launcher-version": LAUNCHER_VERSION
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ...defaultLauncherConfig,
    ...data,
  };
}

export async function getLauncherContent(): Promise<LauncherContent> {
  const response = await fetchApi(`/api/launcher/content?_t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "x-launcher-version": LAUNCHER_VERSION
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function loginLauncherUser(username: string, password: string): Promise<LauncherUser> {
  const response = await fetchApi(`/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-launcher-version": LAUNCHER_VERSION
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
    let token = localStorage.getItem("launcherToken");
    let needsRelogin = false;

    if (token) {
      const response = await fetchApi(`/api/launcher/auto-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-launcher-version': LAUNCHER_VERSION
        }
      });
      if (!response.ok) {
        needsRelogin = true;
      } else {
        console.log("Auto-login token requested successfully");
      }
    } else {
      needsRelogin = true;
    }

    if (needsRelogin) {
      const savedUsername = localStorage.getItem("launcherSavedUsername");
      const savedPassword = localStorage.getItem("launcherSavedPassword");
      if (savedUsername && savedPassword) {
        console.log("Token expired or missing, attempting re-login with saved credentials");
        await loginLauncherUser(savedUsername, savedPassword);
        token = localStorage.getItem("launcherToken");
        if (token) {
          const retryResponse = await fetch(`${getApiUrl()}/api/launcher/auto-login`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'x-launcher-version': LAUNCHER_VERSION
            }
          });
          if (retryResponse.ok) {
            console.log("Auto-login token requested successfully after re-login");
          } else {
            throw new Error("Failed to authenticate session even after re-login. Please login again.");
          }
        }
      } else if (token) {
        throw new Error("Session expired. Please logout and login again.");
      }
    }
  } catch (e) {
    console.error("Failed to request auto-login token", e);
    throw new Error(e instanceof Error ? e.message : "Failed to authenticate session");
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

export async function installUpdate(url: string): Promise<void> {
  return invoke<void>("install_update", { url });
}

export async function openUrl(url: string): Promise<void> {
  return invoke("open_url", { url });
}
