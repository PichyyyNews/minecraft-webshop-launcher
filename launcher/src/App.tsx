import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent } from "react";
import {
  ArrowLeft,
  FolderOpen,
  Gamepad2,
  HardDrive,
  ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Minus,
  Square,
  Trash2,
  X,
  ShoppingCart,
  CreditCard,
  UserPlus,
  Download,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  defaultLauncherConfig,
  getLauncherConfig,
  getLauncherContent,
  loginLauncherUser,
  openGameFolder,
  prepareAndLaunch,
  reinstallGame,
  resolveAssetUrl,
  uninstallGame,
  installUpdate,
  getApiUrl,
  openUrl,
  type LauncherConfig,
  type LauncherContent,
  type LauncherStatus,
  type LauncherUser,
} from "./tauri";
import { getLauncherStatus } from "./tauri";
import SkinAvatar from "./SkinAvatar";
import { listen } from "@tauri-apps/api/event";

type CarouselItem = {
  id: string;
  section: string;
  title: string;
  description: string;
  imageUrl?: string;
};

type AppView = "home" | "settings";
type SettingsCategory = "performance" | "account" | "game";

const defaultContent: LauncherContent = {
  latestArticlesTitle: "Latest Articles",
  whyChooseUsTitle: "Why Choose Us?",
  latestArticles: [],
  cards: [],
};

function App() {
  const [status, setStatus] = useState<LauncherStatus>({
    appName: "MC Launcher",
    version: "loading",
    platform: "desktop",
  });
  const [config, setConfig] = useState<LauncherConfig>(defaultLauncherConfig);
  const [content, setContent] = useState<LauncherContent>(defaultContent);
  const [activeSlide, setActiveSlide] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<LauncherUser | null>(null);
  const [loginState, setLoginState] = useState<"idle" | "loading" | "error">("idle");
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [configState, setConfigState] = useState<"loading" | "ready" | "error">("loading");
  const [launchState, setLaunchState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [launchMessage, setLaunchMessage] = useState("Waiting for launch task");
  const [launchPercent, setLaunchPercent] = useState(0);
  const [view, setView] = useState<AppView>("home");
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>("performance");
  const [ramGb, setRamGb] = useState(() => Number(localStorage.getItem("launcherRamGb") || "2"));
  const [rememberPassword, setRememberPassword] = useState(() => localStorage.getItem("launcherRememberPassword") === "true");
  const [keepLoggedIn, setKeepLoggedIn] = useState(() => localStorage.getItem("launcherKeepLoggedIn") !== "false");
  const [settingsMessage, setSettingsMessage] = useState("Settings are saved on this device");

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateState, setUpdateState] = useState<"idle" | "downloading" | "error">("idle");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isVersionNewer = (latest: string, current: string) => {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      const vL = l[i] || 0;
      const vC = c[i] || 0;
      if (vL > vC) return true;
      if (vL < vC) return false;
    }
    return false;
  };

  const loadLauncherData = useCallback(async () => {
    setConfigState("loading");
    try {
      const [nextConfig, nextContent] = await Promise.all([
        getLauncherConfig(),
        getLauncherContent(),
      ]);
      setConfig(nextConfig);
      setContent(nextContent);
      setConfigState("ready");
      setIsInitialLoad(false);
      if (status.version !== "loading" && isVersionNewer(nextConfig.latestLauncherVersion, status.version)) {
        setUpdateAvailable(true);
      }
    } catch {
      setConfig(defaultLauncherConfig);
      setContent(defaultContent);
      setConfigState("error");
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    getLauncherStatus().then(setStatus);
    loadLauncherData();

    const intervalId = setInterval(() => {
      loadLauncherData();
    }, 5 * 60 * 1000);

    const storedUser = localStorage.getItem("launcherUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("launcherUser");
      }
    }

    const savedUsername = localStorage.getItem("launcherSavedUsername");
    const savedPassword = localStorage.getItem("launcherSavedPassword");
    if (savedUsername) setUsername(savedUsername);
    if (savedPassword) setPassword(savedPassword);

    return () => clearInterval(intervalId);
  }, [loadLauncherData]);

  useEffect(() => {
    if (status.version !== "loading" && configState === "ready" && config.latestLauncherVersion) {
      if (isVersionNewer(config.latestLauncherVersion, status.version)) {
        setUpdateAvailable(true);
      }
    }
  }, [status.version, configState, config.latestLauncherVersion]);

  useEffect(() => {
    localStorage.setItem("launcherRamGb", String(ramGb));
  }, [ramGb]);

  useEffect(() => {
    localStorage.setItem("launcherRememberPassword", String(rememberPassword));
    if (!rememberPassword) {
      localStorage.removeItem("launcherSavedPassword");
    }
  }, [rememberPassword]);

  useEffect(() => {
    localStorage.setItem("launcherKeepLoggedIn", String(keepLoggedIn));
    if (!keepLoggedIn) {
      localStorage.removeItem("launcherToken");
      localStorage.removeItem("launcherUser");
    } else if (user) {
      localStorage.setItem("launcherUser", JSON.stringify(user));
    }
  }, [keepLoggedIn, user]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<{ stage: string; message: string; percent: number }>("launch-progress", (event) => {
      setLaunchMessage(event.payload.message);
      setLaunchPercent(event.payload.percent);
      setLaunchState(event.payload.percent >= 100 ? "done" : "loading");
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const carouselItems = useMemo<CarouselItem[]>(() => {
    const articles = content.latestArticles.map((article) => ({
      id: `article-${article._id}`,
      section: content.latestArticlesTitle,
      title: article.title,
      description: article.content,
      imageUrl: article.imageUrl,
    }));

    const cards = content.cards.map((card) => ({
      id: `card-${card._id}`,
      section: content.whyChooseUsTitle,
      title: card.title,
      description: card.description,
      imageUrl: card.imageUrl,
    }));

    const items = [...articles, ...cards];
    return items.length > 0
      ? items
      : [
          {
            id: "empty",
            section: "Launcher",
            title: "No website content yet",
            description: "เพิ่ม Latest Articles หรือ Why Choose Us บนเว็บ แล้ว launcher จะแสดงตรงนี้",
          },
        ];
  }, [content]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % carouselItems.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [carouselItems.length]);

  const activeItem = carouselItems[activeSlide % carouselItems.length];
  const logoUrl = resolveAssetUrl(config.logoUrl);
  const activeImageUrl = resolveAssetUrl(activeItem.imageUrl);
  const clientLabel =
    config.installType === "vanilla"
      ? "Vanilla"
      : `${config.loaderType}${config.modLoaderVersion ? ` ${config.modLoaderVersion}` : ""}`;

  const shellStyle = {
    "--launcher-primary": config.primaryColor || defaultLauncherConfig.primaryColor,
  } as CSSProperties;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginState("loading");
    setLoginErrorMessage("");

    try {
      const nextUser = await loginLauncherUser(username, password);
      setUser(nextUser);
      localStorage.setItem("launcherSavedUsername", username);
      if (rememberPassword) {
        localStorage.setItem("launcherSavedPassword", password);
      }
      if (!keepLoggedIn) {
        localStorage.removeItem("launcherToken");
        localStorage.removeItem("launcherUser");
      }
      setPassword("");
      setLoginState("idle");
    } catch (error: any) {
      setLoginState("error");
      setLoginErrorMessage(error.message || "Username หรือ password ไม่ถูกต้อง");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("launcherToken");
    localStorage.removeItem("launcherUser");
    setUser(null);
  };

  const handlePlay = async () => {
    if (!user) return;

    setLaunchState("loading");
    setLaunchMessage("Refreshing launcher profile");
    setLaunchPercent(3);

    try {
      const latestConfig = await getLauncherConfig();
      setConfig(latestConfig);

      if (
        latestConfig.installType === "modded" &&
        (!latestConfig.loaderType ||
          latestConfig.loaderType === "Vanilla" ||
          !latestConfig.modLoaderVersion)
      ) {
        setLaunchState("error");
        setLaunchMessage("Select a mod loader version in admin before launching");
        setLaunchPercent(100);
        return;
      }

      setLaunchMessage("Preparing launcher profile");

      const result = await prepareAndLaunch(latestConfig, user.name, ramGb);
      setLaunchState(result.launched ? "done" : "error");
      setLaunchMessage(result.message);
      setLaunchPercent(100);

      if (result.launched) {
        window.setTimeout(() => {
          handleWindowAction("close");
        }, 500);
      }
    } catch (error) {
      setLaunchState("error");
      setLaunchMessage(error instanceof Error ? error.message : typeof error === "string" ? error : "Launch failed");
      setLaunchPercent(100);
    }
  };

  const handleWindowAction = async (action: "minimize" | "maximize" | "close") => {
    try {
      const appWindow = getCurrentWindow();
      if (action === "minimize") await appWindow.minimize();
      if (action === "maximize") await appWindow.toggleMaximize();
      if (action === "close") await appWindow.close();
    } catch {
      // Browser preview has no native window controls.
    }
  };

  const handleTitlebarDrag = async (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".window-controls")) return;

    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Browser preview has no native drag region.
    }
  };

  const handleMaintenance = async (action: "open" | "reinstall" | "uninstall") => {
    setLaunchState("loading");
    setLaunchMessage(`Starting ${action}...`);
    try {
      if (action === "open") await openGameFolder(config);
      if (action === "reinstall") await reinstallGame(config);
      if (action === "uninstall") await uninstallGame(config);
      setLaunchState("idle");
    } catch (e: any) {
      setLaunchMessage(`Error: ${e.message || String(e)}`);
      setLaunchState("error");
    }
  };

  const handleUpdate = async () => {
    setUpdateState("downloading");
    try {
      await installUpdate(resolveAssetUrl(config.launcherUpdateUrl) || config.launcherUpdateUrl);
      // Backend will exit the app, but just in case:
      setUpdateState("idle");
    } catch (e: any) {
      setUpdateState("error");
      setLaunchMessage(`Update failed: ${e.message || String(e)}`);
      setLaunchState("error"); // Show error in the main screen's error modal
    }
  };

  if (isInitialLoad && !updateAvailable) {
    return (
      <div
        className="update-screen"
        style={{ ...shellStyle, backgroundImage: `url('${resolveAssetUrl(config.backgroundUrl) || "default-bg.jpg"}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="update-backdrop"></div>
        <div className="update-card-container">
          <div className="update-card">
            <div className="update-icon-wrapper">
              <div className="update-icon-ring">
                <div className="update-icon-inner">
                  <Loader2 className="animate-spin" style={{width: 40, height: 40, color: 'var(--launcher-primary)'}} />
                </div>
              </div>
            </div>
            <h1 className="update-title">Checking for Updates...</h1>
            <p className="update-description">
              กำลังตรวจสอบข้อมูลเวอร์ชันจากเซิร์ฟเวอร์
            </p>
            <div className="update-current-version">
              Launcher Version: {status.version !== "loading" ? status.version : "..."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div
        className="update-screen"
        style={{ ...shellStyle, backgroundImage: `url('${resolveAssetUrl(config.backgroundUrl) || "default-bg.jpg"}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="update-backdrop"></div>
        <div className="update-card-container">
          <div className="update-card-glow"></div>
          <div className="update-card">
            <div className="update-icon-wrapper">
              <div className="update-icon-ring">
                <div className="update-icon-inner">
                  <Download style={{width: 40, height: 40, color: 'var(--launcher-primary)'}} className="pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="update-title">อัปเดตเวอร์ชันใหม่!</h1>
            <p className="update-description">
              พบ Launcher เวอร์ชันใหม่ <strong>{config.latestLauncherVersion}</strong><br/>
              จำเป็นต้องอัปเดตเพื่อเข้าเล่นเกมและรับฟีเจอร์ล่าสุด
            </p>
            
            {config.launcherUpdateNotes && (
              <div className="update-notes-box">
                <h3 className="update-notes-title">
                  <span className="update-notes-dot"></span>
                  Patch Notes
                </h3>
                <div className="update-notes-content">
                  {config.launcherUpdateNotes}
                </div>
              </div>
            )}

            <button
              onClick={handleUpdate}
              disabled={updateState === "downloading"}
              className="update-button"
            >
              <div className="update-button-bg"></div>
              <span className="update-button-text">
                {updateState === "downloading" ? (
                  <>
                    <Loader2 className="spin" size={24} />
                    <span>กำลังดาวน์โหลด...</span>
                  </>
                ) : (
                  <>
                    <Download size={24} />
                    <span>อัปเดตทันที</span>
                  </>
                )}
              </span>
            </button>
            
            {updateState === "error" && (
              <p className="update-error">
                อัปเดตล้มเหลว กรุณาลองใหม่อีกครั้ง
              </p>
            )}
            
            <div className="update-current-version">
              Current Version: {status.version}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const settingsCategories: Array<{
    id: SettingsCategory;
    label: string;
    icon: typeof HardDrive;
  }> = [
    { id: "performance", label: "Performance", icon: HardDrive },
    { id: "account", label: "Account", icon: KeyRound },
    { id: "game", label: "Game Files", icon: FolderOpen },
  ];

  const openExternalUrl = async (path: string) => {
    let baseUrl = getApiUrl();
    baseUrl = baseUrl.replace(/\/api$/, "").replace(/\/api-backend$/, "");
    const url = `${baseUrl}${path}`;
    try {
      await openUrl(url);
    } catch (e) {
      console.error("Native open_url failed:", e);
      const newWin = window.open(url, "_blank");
      if (!newWin) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <main className="launcher-shell" style={shellStyle}>
      <header className="titlebar" data-tauri-drag-region onMouseDown={handleTitlebarDrag}>
        <div className="titlebar-game-meta" aria-label="Game version">
          <span>{config.minecraftVersion}</span>
          <strong>{clientLabel}</strong>
          {status.version !== "loading" && (
            <span style={{ marginLeft: "6px", opacity: 0.6, fontSize: "0.9em" }}>
              (v{status.version})
            </span>
          )}
        </div>
        <div className="window-controls">
          <button onClick={() => handleWindowAction("minimize")} title="Minimize">
            <Minus size={15} />
          </button>
          <button onClick={() => handleWindowAction("maximize")} title="Maximize">
            <Square size={13} />
          </button>
          <button className="close-button" onClick={() => handleWindowAction("close")} title="Close">
            <X size={16} />
          </button>
        </div>
      </header>

      <nav className="launcher-nav">
        <div className="nav-brand">
          <div className="nav-logo">
            {logoUrl ? <img src={logoUrl} alt="" /> : <Gamepad2 size={28} />}
          </div>
          <div>
            <strong>{config.appName || status.appName}</strong>
            <span>{config.headline}</span>
          </div>
        </div>
        <div className="nav-actions">
          <button
            className="nav-icon-button"
            onClick={() => openExternalUrl("/shop")}
            title="Shop"
          >
            <ShoppingCart size={19} />
          </button>
          <button
            className="nav-icon-button"
            onClick={() => openExternalUrl("/shop/topup")}
            title="Topup"
          >
            <CreditCard size={19} />
          </button>
          <button
            className={configState === "error" ? "nav-icon-button error" : "nav-icon-button"}
            onClick={loadLauncherData}
            title={configState === "loading" ? "Syncing config" : configState === "error" ? "Refresh config failed" : "Refresh config"}
          >
            <RefreshCw className={configState === "loading" ? "spin" : ""} size={19} />
          </button>
          <button
            className={view === "settings" ? "nav-icon-button active" : "nav-icon-button"}
            onClick={() => setView("settings")}
            title="Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </nav>

      {view === "settings" ? (
        <section className="settings-layout" aria-label="Launcher settings">
          <aside className="settings-sidebar">
            <button className="settings-back" onClick={() => setView("home")} title="Back to launcher">
              <ArrowLeft size={18} />
              <span>Launcher</span>
            </button>
            <div className="settings-nav-list">
              {settingsCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={settingsCategory === item.id ? "settings-nav-item active" : "settings-nav-item"}
                    onClick={() => setSettingsCategory(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="settings-panel">
            <div className="settings-header">
              <p className="eyebrow">Settings</p>
              <h2>
                {settingsCategory === "performance"
                  ? "Performance"
                  : settingsCategory === "account"
                    ? "Account"
                    : "Game Files"}
              </h2>
            </div>

            {settingsCategory === "performance" && (
              <div className="settings-stack">
                <div className="setting-row">
                  <div>
                    <strong>RAM Allocation</strong>
                    <span>{ramGb} GB will be used when launching Minecraft</span>
                  </div>
                  <div className="ram-control">
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={ramGb}
                      onChange={(event) => setRamGb(Number(event.target.value))}
                    />
                    <output>{ramGb} GB</output>
                  </div>
                </div>
              </div>
            )}

            {settingsCategory === "account" && (
              <div className="settings-stack">
                <label className="toggle-row">
                  <div>
                    <strong>Remember password</strong>
                    <span>Keep the saved password on this device for the login form</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(event) => setRememberPassword(event.target.checked)}
                  />
                </label>
                <label className="toggle-row">
                  <div>
                    <strong>Stay logged in</strong>
                    <span>Restore the current account when the launcher opens</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(event) => setKeepLoggedIn(event.target.checked)}
                  />
                </label>
              </div>
            )}

            {settingsCategory === "game" && (
              <div className="settings-stack">
                <button className="setting-action" onClick={() => handleMaintenance("open")}>
                  <FolderOpen size={20} />
                  <div>
                    <strong>Open game folder</strong>
                    <span>Open the current installation folder</span>
                  </div>
                </button>
                <button className="setting-action" onClick={() => handleMaintenance("reinstall")}>
                  <RotateCcw size={20} />
                  <div>
                    <strong>Reinstall</strong>
                    <span>Clear installed files so the next Play installs fresh files</span>
                  </div>
                </button>
                <button className="setting-action danger" onClick={() => handleMaintenance("uninstall")}>
                  <Trash2 size={20} />
                  <div>
                    <strong>Uninstall</strong>
                    <span>Remove the installed game files for this profile</span>
                  </div>
                </button>
              </div>
            )}

            <div className="settings-status">
              <ShieldCheck size={17} />
              <span>{settingsMessage}</span>
            </div>
          </section>
        </section>
      ) : (
      <section className="main-layout">
        <section className="carousel-panel" aria-label="Website content carousel">
          <div 
            className="carousel-image" 
            onClick={() => openExternalUrl("/")}
            style={{ cursor: "pointer" }}
            title="Go to website"
          >
            {activeImageUrl ? <img src={activeImageUrl} alt="" /> : <ImageIcon size={64} />}
          </div>
          <div className="carousel-content">
            <div className="carousel-kicker">{activeItem.section}</div>
            <h2>{activeItem.title}</h2>
            <p>{activeItem.description.replace(/<[^>]*>/g, "").slice(0, 260)}</p>
            <div className="dots" aria-label="Carousel slides">
              {carouselItems.map((item, index) => (
                <button
                  key={item.id}
                  className={index === activeSlide ? "dot active" : "dot"}
                  onClick={() => setActiveSlide(index)}
                  title={item.title}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="auth-panel">
          {user ? (
            <div className="play-state">
              <SkinAvatar username={user.name} />
              <p className="eyebrow">Logged in</p>
              <h2>{user.name}</h2>
              <button className="primary-button" onClick={handlePlay} disabled={launchState === "loading" || launchState === "done"}>
                {launchState === "loading" ? <Loader2 className="spin" size={22} /> : <Play size={22} fill="currentColor" />}
                <span>{launchState === "loading" ? "Loading" : "Play"}</span>
              </button>
              <button className="text-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="lock-icon">
                <Lock size={26} />
              </div>
              <h2>Login</h2>
              <p>ใช้ username หรือ email จากเว็บเพื่อเข้า launcher</p>

              <label>
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="playername"
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="password"
                />
              </label>

              {loginState === "error" && (
                <div className="login-error">{loginErrorMessage || "Username หรือ password ไม่ถูกต้อง"}</div>
              )}

              <button className="primary-button" disabled={loginState === "loading"}>
                {loginState === "loading" ? <Loader2 className="spin" size={20} /> : <LogIn size={20} />}
                <span>{loginState === "loading" ? "Checking" : "Login"}</span>
              </button>

              <button 
                type="button" 
                className="text-button" 
                onClick={() => openExternalUrl("/register")}
              >
                <UserPlus size={18} />
                <span>Register</span>
              </button>
            </form>
          )}
        </aside>
      </section>
      )}

      <footer className="download-bar">
        <div>
          <strong>{launchState === "loading" ? "Loading" : launchState === "error" ? "Error" : "Ready"}</strong>
          <span>{launchMessage}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${launchPercent}%` }} />
        </div>
        <span className="progress-value">{launchPercent}%</span>
      </footer>
    </main>
  );
}

export default App;
