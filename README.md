# 🎮 MineCraft WebShop

A full-featured web shop system for Minecraft servers, complete with a store management system, membership system, and Admin Dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-green?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-green?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## ✨ Features

- 🛒 **Store System** — Buy and sell items, packages, and services
- 💳 **Payment System** — Supports PromptPay QR Code and Slip Verification
- 👤 **Membership System** — Registration, Login, and Profile Management
- 🎁 **Angpao System** — Lucky-draw reward envelopes for players
- 📊 **Admin Dashboard** — Manage the store, users, and view statistics
- 🌐 **Minecraft Server Integration** — Connect and interact with your Minecraft server

## 📁 Project Structure

```
mcwebshop2/
├── mc-webshop/          # Frontend (Next.js 16 + TailwindCSS)
│   ├── app/             # App Router pages & components
│   ├── public/          # Static assets
│   └── ...
│
├── server/              # Backend (Express.js + MongoDB)
│   ├── controllers/     # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & other middlewares
│   └── utils/           # Utility functions
│
└── launcher/            # Desktop Launcher (Tauri + Vite)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn
- Rust + Tauri CLI (for the desktop launcher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PichyyyNews/minecraft-webshop-launcher.git
   cd mcwebshop2
   ```

2. **Setup Backend Server**
   ```bash
   cd server
   npm install
   ```

   Create a `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

3. **Setup Web Client**
   ```bash
   cd mc-webshop
   npm install
   ```

   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### Running the Application

**Development:**

```bash
# Terminal 1 — Start Backend Server
cd server
npm start

# Terminal 2 — Start Web Client
cd mc-webshop
npm run dev
```

- **Web Client**: http://localhost:3000
- **API Server**: http://localhost:5000

## 🖥️ Desktop Launcher

This repository also includes a Tauri-based desktop launcher located in `launcher/`.

### Local Development

```bash
cd launcher
npm install
npm run dev
```

The Tauri app runs a Vite frontend on `http://localhost:1420` and opens the native desktop window.

### Web Preview Only

```bash
cd launcher
npm run dev:web
```

### Build Checks

```bash
cd launcher
npm run build:web
cd src-tauri
cargo check
```

### Docker

The Docker image serves the launcher frontend preview through nginx. Desktop packaging should still be done on the target OS using Tauri.

```bash
docker compose up -d launcher
```

Launcher preview: `http://localhost:1420`

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** — React framework with App Router
- **TailwindCSS 4** — Utility-first CSS framework
- **Lucide React** — Icon library
- **Recharts** — Charts & Analytics
- **SkinView3D** — Minecraft skin viewer

### Backend
- **Express.js 5** — Web framework
- **MongoDB + Mongoose 9** — Database
- **JWT** — Authentication
- **Nodemailer** — Email service
- **Sharp** — Image processing

### Desktop Launcher
- **Tauri** — Native desktop application framework
- **Vite** — Fast frontend build tool
- **Rust** — Backend systems language for Tauri

## 👥 Contributors

- **PichyyyNews** — Developer

## 📄 License

This project is licensed under the ISC License.
