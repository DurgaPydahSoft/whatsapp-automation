# 🚀 WhatsApp CRM & Automation Dashboard

A professional, high-performance WhatsApp automation service featuring a stunning modern web dashboard. Built for speed, reliability, and visual excellence.

![Modern UI Dashboard](https://img.shields.io/badge/UI-Modern_Dark-00a884?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-Node.js%20|%20Socket.io%20|%20WA--Web.js-blue?style=for-the-badge)

## ✨ Premium Features

### 🖥️ Modern Workspace (UI/UX)
- **Glassmorphic Design**: A sleek, dark-themed interface with high-contrast elements and smooth transitions.
- **Responsive Layout**: Optimized for both small and large screens with a persistent, scrollable sidebar.
- **Dynamic Connection Header**: Real-time status badges (Connected/Disconnected) that update instantly.
- **Profile Integration**: Syncs your WhatsApp name and profile picture automatically.

### ⚡ Performance & Reliability
- **Fast Parallel Sync**: Fetches contact details and profile pictures simultaneously, making the dashboard load **3x faster**.
- **Crash-Proof Storage**: Error-resistant "Safe Read" logic for `messages.json`—the server recovers automatically if storage files are corrupted.
- **Zero-Wait QR Login**: Caches the latest QR code to ensure it appears instantly on the dashboard upon scan request.
- **Smart Session Management**: Redesigned Logout/Switch logic that fully destroys the session and recreates it for a fresh connection.

### 💬 Advanced Messaging
- **Real-Time Chat**: Send and receive messages instantly with live delivery/read ticks (✓✓).
- **Media Support**: Full image support including previews, captions, and receiving incoming images.
- **Bulk Sender 2.0**: Send messages and images to multiple numbers with built-in rate-limiting to protect your account.
- **Automatic Formatting**: Smart number detection handles international formats and adds `@c.us` automatically.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **Real-time** | Socket.io |
| **Library** | whatsapp-web.js (with LocalAuth) |
| **Frontend** | Vanilla JavaScript, HTML5, CSS3 (Modular) |
| **Storage** | Robust JSON file storage |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- Chrome/Chromium installed (Required by Puppeteer)

### 2. Installation
```bash
# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
```

### 4. Running the App
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

---

## 📖 Usage Guide

1. **Login**: Open `http://localhost:3000` in your browser. A large QR code will appear in the center. Scan it using your phone's WhatsApp LinkedIn devices.
2. **Chatting**: Once connected, your recent chats will sync automatically. Click any chat to view history and reply.
3. **Sending Media**: Click the **(+)** or paperclip icon in the chat bar to select an image. You can add a caption before sending.
4. **Bulk Mode**: Click the **Bulk Mode** button to open the mass-sender. Enter comma-separated numbers and your message.
5. **Switching Accounts**: Click the **Logout** icon next to your name in the sidebar. The session will clear, and a new QR will appear for a different account.

---

## 📁 Project Structure
- `server.js`: Web server and Socket.io orchestration.
- `whatsappClient.js`: Core WhatsApp automation logic and lifecycle management.
- `storage.js`: Robust JSON-based data persistence.
- `public/`: Modern frontend assets (HTML, CSS, JS).
- `messages.json`: Persistent chat and contact storage.

---

> [!IMPORTANT]
> This project is designed for automation. Please ensure you comply with WhatsApp's Terms of Service when sending bulk messages.
