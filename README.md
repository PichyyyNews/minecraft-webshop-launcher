# 🎮 Minecraft Webshop & Desktop Launcher System

A modern, full-featured web shop and custom desktop launcher system for Minecraft servers. Built with Next.js, Express, MongoDB, Tauri (Rust), and Caddy Reverse Proxy.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-green?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-green?logo=mongodb)
![Tauri](https://img.shields.io/badge/Tauri-2-blue?logo=tauri)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)
![Caddy](https://img.shields.io/badge/Caddy-2-green?logo=caddy)

---

## ✨ Features

- 🛒 **Store System** — Buy and sell items, rank packages, and custom RCON command triggers.
- 🚀 **Automatic Launcher Download Mode** — Serves fresh Launcher builds (setup.exe, .msi, .exe) directly to players without external Google Drive links.
- 🖥️ **Custom Desktop Launcher (Tauri + Rust)** — Auto mod-loader installation, options/config overwrite control, and seamless web authentication.
- 🔑 **AES-256 RCON Encryption** — Encrypts Minecraft server RCON credentials at rest in MongoDB.
- 📝 **Admin Audit Logging System** — Tracks all administrative actions (settings updates, RCON commands, points modification).
- 🛡️ **AuthMe MySQL Integration** — Synchronizes user registrations and passwords directly with Minecraft server AuthMe database.
- 💳 **Payment & Slip Verification** — PromptPay QR code generation and Slip2Go verification.
- 🌐 **Caddy Reverse Proxy with Auto SSL** — Automatic Let's Encrypt / ZeroSSL HTTPS certificates and Cloudflare Proxy support.

---

## 📁 Project Structure

`	ext
mcwebshop/
├── docker-compose.yml       # Production container orchestration
├── .env                     # Centralized environment configuration
├── Caddyfile                # Reverse proxy & SSL configuration
├── Document/                # System documentation & security audit reports
│
├── mc-webshop/              # Web Frontend (Next.js 16 + TailwindCSS)
│   ├── app/                 # App Router pages & admin panel
│   └── ...
│
├── server/                  # Backend API (Node.js Express + MongoDB)
│   ├── controllers/         # API Controllers & RCON logic
│   ├── models/              # Mongoose schemas (User, Product, AuditLog, etc.)
│   ├── routes/              # Express API routes
│   └── utils/               # AES-256 encryption, Audit logger & AuthMe DB
│
└── launcher/                # Desktop Application (Tauri 2 + Vite + Rust)
    ├── src/                 # React UI frontend
    └── src-tauri/           # Rust native launcher backend
`

---

## 🐳 Step-by-Step Production Deployment Guide (Docker)

Follow these steps to deploy the complete system to a production server (Ubuntu Server 22.04/24.04 LTS or Windows Server).

### 1. Prerequisites
- **Server**: Ubuntu 22.04/24.04 LTS or Windows Server with Docker Engine & Docker Compose installed.
- **Domain Name**: Domain pointing (A Record) to your server's public IP address.
- **Port Access**: Open ports 80, 443, and 25565 in your server firewall.

---

### 2. Step 1: Clone Repository & Configure Environment

Clone the repository to your production server:

`ash
git clone https://github.com/PichyyyNews/minecraft-webshop-launcher.git
cd minecraft-webshop-launcher
`

Copy .env.example to .env:

`ash
cp .env.example .env
`

Edit .env for production:

`env
# Domain settings
DOMAIN=yourdomain.com

# Production Security Secrets (generate via: openssl rand -hex 32)
JWT_SECRET=your_super_secret_jwt_key_here_must_be_32_bytes_long
ADMIN_ROOT_USER=root
ADMIN_ROOT_PASS=YourStrongAdminPasswordHere!

# Launcher Environment
VITE_LAUNCHER_PRODUCT_NAME=Pixel-Kati
VITE_LAUNCHER_API_URL=https://yourdomain.com/api-backend
VITE_LAUNCHER_WEBSITE_URL=https://yourdomain.com

# AuthMe MySQL Sync (Optional)
AUTHME_MYSQL_HOST=127.0.0.1
AUTHME_MYSQL_PORT=3306
AUTHME_MYSQL_USER=authme_user
AUTHME_MYSQL_PASSWORD=authme_password
AUTHME_MYSQL_DATABASE=authme_db
`

---

### 3. Step 2: Build Launcher Release Executables

Build the launcher binary with production domain URLs:

`ash
cd launcher
npm install
npm run build
cd ..
`

The compiled binaries will be generated at:
- launcher/src-tauri/target/release/bundle/nsis/Pixel-Kati_0.1.10_x64-setup.exe
- launcher/src-tauri/target/release/bundle/msi/Pixel-Kati_0.1.10_x64_en-US.msi
- launcher/src-tauri/target/release/pixel-kati.exe

These executables are automatically mounted into the ackend container so players can download them directly from the homepage!

---

### 4. Step 3: Launch Docker Containers

Start all services using Docker Compose:

`ash
docker compose up -d --build
`

Verify that all containers are running:

`ash
docker compose ps
`

Expected output:
- mc-webshop-db: MongoDB (Running)
- mc-webshop-backend: Express API (Running)
- mc-webshop-frontend: Next.js Web App (Running)
- mc-webshop-proxy: Caddy Reverse Proxy (Running - Port 80/443)

---

## 🔒 Port Minimization & Firewall Strategy

For maximum security, only expose necessary public ports on your server firewall.

| Port | Protocol | Firewall Status | Purpose |
| :--- | :--- | :--- | :--- |
| **80** | TCP | 🟢 **Public** | HTTP Traffic (Auto-redirect to HTTPS) |
| **443** | TCP | 🟢 **Public** | HTTPS Traffic (Next.js Web & Backend API via Caddy Proxy) |
| **25565** | TCP | 🟢 **Public** | Minecraft Java Game Server |
| **19132** | UDP | 🟢 **Public (Optional)** | Minecraft Bedrock Server (GeyserMC) |
| **5000** | TCP | 🔴 **Internal Only** | Express Backend API (Accessed strictly through Caddy) |
| **3000** | TCP | 🔴 **Internal Only** | Next.js Frontend Web (Accessed strictly through Caddy) |
| **27017** | TCP | 🔴 **Internal Only** | MongoDB Database (Never expose publicly) |
| **25575** | TCP | 🔴 **Internal Only** | RCON Command Port |

---

## 📄 Documentation & System Audit Reports

Detailed architectural documentation and vulnerability reports are stored in the Document/ directory:

- 📜 **Document/SYS-001_production-deployment-audit-security-report_P0-CRITICAL_20260804_1546_system-infra.md**

---

## 📄 License

This project is licensed under the ISC License.

