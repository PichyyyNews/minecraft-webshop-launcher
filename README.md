# 🎮 MineCraft WebShop

ระบบเว็บช็อปสำหรับเซิร์ฟเวอร์ Minecraft พร้อมระบบจัดการร้านค้า, ระบบสมาชิก และ Admin Dashboard

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-green?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-green?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

## ✨ Features

- 🛒 **ระบบร้านค้า** - ซื้อขายไอเทม, แพ็คเกจ, และบริการต่างๆ
- 💳 **ระบบชำระเงิน** - รองรับ PromptPay QR Code และ Slip Verification
- 👤 **ระบบสมาชิก** - Registration, Login, Profile Management
- 🎁 **ระบบ Angpao** - แจกของรางวัลด้วยระบบซองอั่งเปา
- 📊 **Admin Dashboard** - จัดการร้านค้า, ผู้ใช้ และดูสถิติ
- 🌐 **Minecraft Server Integration** - เชื่อมต่อกับเซิร์ฟเวอร์ Minecraft

## 📁 Project Structure

```
mcwebshop2/
├── mc-webshop/          # Frontend (Next.js 16 + TailwindCSS)
│   ├── app/             # App Router pages & components
│   ├── public/          # Static assets
│   └── ...
│
└── server/              # Backend (Express.js + MongoDB)
    ├── controllers/     # Route controllers
    ├── models/          # Mongoose models
    ├── routes/          # API routes
    ├── middleware/      # Auth & other middlewares
    └── utils/           # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pichayut01/MineCraft-WebShop.git
   cd mcwebshop2
   ```

2. **Setup Server**
   ```bash
   cd server
   npm install
   ```
   
   Create `.env` file:
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
   
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### Running the Application

**Development:**

```bash
# Terminal 1 - Start Server
cd server
npm start

# Terminal 2 - Start Web Client
cd mc-webshop
npm run dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:5000

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TailwindCSS 4** - Utility-first CSS
- **Lucide React** - Icons
- **Recharts** - Charts & Analytics
- **SkinView3D** - Minecraft skin viewer

### Backend
- **Express.js 5** - Web framework
- **MongoDB + Mongoose 9** - Database
- **JWT** - Authentication
- **Nodemailer** - Email service
- **Sharp** - Image processing

## 👥 Contributors

- **Pichayut01** - Developer

## 📄 License

This project is licensed under the ISC License.

## MC Launcher Desktop Service

This repository also includes a separate Tauri desktop launcher in `launcher/`.

### Local development

```bash
cd launcher
npm install
npm run dev
```

The Tauri app runs a Vite frontend on `http://localhost:1420` and opens the native desktop window.

### Web preview only

```bash
cd launcher
npm run dev:web
```

### Build checks

```bash
cd launcher
npm run build:web
cd src-tauri
cargo check
```

### Docker

The Docker image serves the launcher frontend preview through nginx. Desktop packaging should still be built on the target OS with Tauri.

```bash
docker compose up -d launcher
```

Launcher preview: `http://localhost:1420`
