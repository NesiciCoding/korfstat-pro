# KorfStat Pro 🏀

[![CI/CD Pipeline](https://github.com/NesiciCoding/korfstat-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/NesiciCoding/korfstat-pro/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/NesiciCoding/korfstat-pro/branch/main/graph/badge.svg)](https://codecov.io/gh/NesiciCoding/korfstat-pro)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**The Ultimate Korfball Statistics & Management Tool**

Welcome to **KorfStat Pro**, a professional-grade application designed to help Korfball teams, coaches, and officials track match statistics, manage game clocks, and visualize performance in real-time. Whether you are a coach looking for detailed insights or a table official managing the scoreboard, KorfStat Pro makes it simple.

---

## 🚀 Getting Started (For Beginners)

Running KorfStat Pro is as easy as 1-2-3. You don't need to be a programmer to use this!

First, download and install [Node.js](https://nodejs.org/) (the "LTS" version is recommended).

### 1. Installation
Open your computer's terminal (Command Prompt on Windows, Terminal on Mac, Dealer's choice on Linux) and navigate to the project folder. Then run:

```bash
npm install
```
*This command downloads all the necessary "ingredients" the app needs to run.*

### 2. Environment Setup (Optional - for AI Features)

To use AI-powered features (match analysis, strategy reports, live commentary), you'll need a Gemini API key:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. Open the `.env` file and replace `your_api_key_here` with your actual API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

> **Note:** The app works perfectly without an API key! You'll still have full access to match tracking, statistics, timers, and all core features. AI features will simply be disabled.

### 3. Start the App
To launch the application, run:

```bash
npm run dev:multi
```
Once you see a message saying "Local: http://localhost:3000", open your web browser (Chrome, Edge, Safari) and go to:
**`http://localhost:3000`**

If you want to use the app on another device on the same network, you can access it by navigating to the IP address of the device running the app in a browser. This can be found in the terminal output by looking for "Network: http://**[[your ip address]]**:3000".

This can be useful when you have multiple devices needed to record statistics during a match, and use the game and shot clock at the same time. This is all synced up, so you can use the app on multiple devices at the same time, also allowing you to show the statistics **LIVE** on a livestream or screens around the hall.
 
When launching using the app will automatically start in the background and you can access it by navigating to the IP address of the device running the app in a browser. 

---

## 📱 Key Features & Modules

KorfStat Pro has grown into a comprehensive suite of tools for all aspects of managing, officiating, and broadcasting Korfball. The application is divided into several powerful modules:

### ⚙️ Core Management
- **Home Dashboard**: Central hub for accessing all features.
- **Match & Season Manager**: Set up matches, group them into seasons, and manage club details/team rosters.
- **Tournament Formats**: Automatically generate Leagues, Knockout Brackets, and Group Stages with printable PDF exports.

### ⏱️ Live Tracking & Officiating
- **Match Tracker**: Real-time input of goals, fouls, substitutions, and timeouts with full Undo/Redo support.
- **Jury & Spotter Views**: Dedicated remote interfaces for table officials and designated spotters.
- **Precision Clocks**: Professional-grade Game Clock and a decoupled 25s Shot Clock.

### 📺 Broadcasting & Display
- **Stream Overlays & Director**: Fully customizable graphics (gradients, team logos) for OBS/vMix, controlled via a dedicated Director dashboard.
- **Live Stats (Big Screen)**: Formatted views optimized for in-arena displays and livestreams.

### 📊 Analysis & Integrations
- **Extensive Stats & AI**: Automated insights, Strategy Planner whiteboard, and PDF/Excel/JSON data exports.
- **Social Media Graphics**: Rapid export tool to create beautifully formatted score graphics for social media.
- **Hardware & App Integrations**: Native Tauri desktop builds, full Bitfocus Companion API support (Stream Deck), and a companion Wear OS referee watch app.

> 📚 **Want to learn more?** For in-depth explanations of every feature, how to use them, and our future roadmap, please check out the **[KorfStat Pro Wiki](korfstat-pro.wiki/Home.md)**! Specifically, our [Feature Lock and Roadmap](korfstat-pro.wiki/Feature-Lock-and-Roadmap.md) outlines the full extent of the application's capabilities.

---

## 🚀 Deployment Guide

### Building for Production

To create an optimized production build:

```bash
npm run build
```

This creates a `dist` folder with optimized, minified files ready for deployment.

### Preview Production Build

To test the production build locally:

```bash
npm run preview
```

### Deployment Options

**Option 1: Static Hosting (Netlify, Vercel, GitHub Pages)**
1. Run `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Set environment variables in your hosting dashboard

**Option 2: VPS/Server Deployment**
1. Clone the repository on your server
2. Run `npm install`  
3. Create `.env` file with your configuration
4. Run `npm run dev:multi` or use a process manager like `pm2`:
   ```bash
   npm install -g pm2
   pm2 start npm --name "korfstat" -- run dev:multi
   ```

**Environment Variables for Production:**
- `VITE_GEMINI_API_KEY` - Your Gemini API key
- Configure CORS in `server/index.js` for your domain

---

## 🛠 Troubleshooting

**"The build failed!"**
If you see errors about "npm run build" failing, it usually means there is a conflict in the files. 
- Try deleting `node_modules` and running `npm install` again.
- Ensure you have the latest version of Node.js installed (LTS version recommended).
- Check that all dependencies in `package.json` are compatible.

**"The clock looks weird"**
- The app uses advanced syncing. If the clock seems stuck, try refreshing the page. Your match state is saved automatically!

**"npm: command not found"**
- You need to install Node.js first. Download it from [nodejs.org](https://nodejs.org/).

**"concurrently: command not found" or "vitest: command not found"**
- Run `npm install` to install all dependencies before starting the app.

**"WebSocket connection failed"**
- Ensure the server is running (this should start automatically with `npm run dev:multi`).
- Check your firewall settings if using multiple devices on the network.

**"AI features not working"**
- Verify your `VITE_GEMINI_API_KEY` is set correctly in the `.env` file.
- Ensure the `.env` file is in the root directory of the project.
- Restart the dev server after changing environment variables.

**"App not accessible from other devices"**
- Ensure all devices are on the same network.
- Check firewall settings to allow connections on port 3000 and 3002.
- Try accessing via the IP address shown in the terminal (Network: http://x.x.x.x:3000).

**"Match data lost after refresh"**
- Match data is stored in browser localStorage. Clearing browser data will erase matches.
- Use the export features (PDF, Excel, JSON) to backup important matches.

**Need more help?**
- Check the [GitHub Issues](https://github.com/yourusername/korfstat-pro/issues) page
- Review the code documentation in the source files
- Create a new issue with details about your problem

---

*Built with ❤️ for the Korfball community.*
