# Pixel Kati Launcher

A modern, fast, and feature-rich Minecraft Launcher built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/). Designed specifically for Minecraft server operators who want to provide a seamless, professional experience for their players.

## 🚀 Features

- **Blazing Fast Performance**: Built with Rust backend (Tauri) to consume minimal system resources compared to traditional Electron apps.
- **Smart Java Management (Zero-Touch Setup)**:
  - Automatically identifies the required Java version based on the Minecraft version (Java 8, 17, or 21).
  - Dynamically searches the system for an existing, compatible Java installation.
  - If missing or corrupt, it automatically downloads and extracts a portable Java Runtime Environment.
  - Self-healing: Recovers from broken Java installations automatically.
- **Seamless System Dependency Installer**:
  - Automatically checks for missing Microsoft Visual C++ Redistributable (`VCRUNTIME140.dll`) and installs it silently in the background. Players simply click "Yes" on the UAC prompt—no external downloads required.
- **Smart Mod & Resource Pack Synchronization**:
  - Verifies local mods and resource packs against the server using SHA-1 hashing.
  - Automatically downloads missing or updated files and deletes outdated ones, ensuring every player is always using the exact same modpack configuration as the server.
- **Modern UI & Aesthetics**:
  - A premium, responsive interface that provides an exceptional user experience.
- **Auto-Updater Mechanism**:
  - Force updates the launcher smoothly. The client regularly checks for backend updates and prompts the user without breaking existing game installations.
- **Multi-Loader Support**:
  - Supports Vanilla, Forge, Fabric, and Quilt out of the box.

## 🛠️ Tech Stack

- **Backend**: Rust (Tauri API)
- **Frontend**: React (Vite), TypeScript
- **Styling**: Vanilla CSS / Modules
- **Package Manager**: npm
- **Game Engine Handling**: Direct execution of Minecraft arguments, asset downloading, and JVM orchestration via Rust.

## 📦 Prerequisites for Development

1. **Node.js** (v18 or higher)
2. **Rust** (Latest stable toolchain)
3. **Microsoft Visual Studio C++ Build Tools** (For compiling the Windows backend)

## 🏗️ Getting Started

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and configure your backend API endpoint:
```env
VITE_LAUNCHER_API_URL=https://your-api.com/api
```

### 3. Run in Development Mode
To spin up both the Vite frontend and the Rust backend:
```bash
npm run tauri dev
```

### 4. Build for Production
To compile the standalone portable executable (`.exe`) and the installer (`setup.exe`):
```bash
npm run build
```
Compiled binaries will be available in `src-tauri/target/release/bundle/nsis/` and `src-tauri/target/release/`.

## ⚙️ How the Java Auto-Installer Works

When a player clicks "Play", the Rust backend (`lib.rs`) triggers the following sequence:
1. Evaluates the target `minecraftVersion` (e.g., `1.21`).
2. Determines the JVM requirement (Java 21).
3. Executes `ensure_msvc_redist` to silently prepare Windows system libraries.
4. Searches standard directories and environment variables for Java 21.
5. If absent, it queries Adoptium APIs (Temurin) to download the correct JRE portable zip, extracts it locally, and launches the game.

## 📜 License
Private Software. All rights reserved.
