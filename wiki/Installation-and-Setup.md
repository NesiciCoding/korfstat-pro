# Installation & Setup

This page will guide you through everything you need to do before you run KorfStat Pro for the first time.

---

## What You Need

Before you start, you need to install one piece of software on your computer: **Node.js**.

> **What is Node.js?** Think of it as the engine that powers KorfStat Pro. You don't need to know how it works — just install it.

1. Go to [nodejs.org](https://nodejs.org/)
2. Click the big green button labelled **LTS** (Long-Term Support) — this is the recommended, most stable version.
3. Follow the installer instructions for your operating system.

---

## Step 1: Download KorfStat Pro

Download or clone the KorfStat Pro repository to a folder on your computer. If you received it as a ZIP file, extract it somewhere easy to find, like your Desktop or Documents folder.

---

## Step 2: Install Dependencies

Open your computer's **Terminal** (on Mac/Linux) or **Command Prompt / PowerShell** (on Windows).

Navigate to the KorfStat Pro folder. For example, if you extracted it to your Documents, you would type something like:

```
cd Documents/korfstat-pro
```

Then run the following command:

```bash
npm install
```

This downloads all the libraries and tools that KorfStat Pro needs. It may take a minute or two. You will see a lot of text on the screen — this is normal!

---

## Step 3: (Optional) Set Up AI Features

KorfStat Pro has powerful AI features, such as live commentary and tactical match analysis. These require a **Google Gemini API key**.

> **Good news:** The app works perfectly without an API key. All timing, scoring, statistics, and streaming features are fully available. AI features are a bonus!

If you want to enable AI features:

1. Copy the example configuration file:
   ```bash
   cp .env.example .env
   ```
   *(On Windows, you can also just duplicate the `.env.example` file and rename the copy to `.env`)*

2. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

3. Open the `.env` file in any text editor (like Notepad) and change this line:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   Replace `your_api_key_here` with the actual key you received from Google.

---

## Step 4: Launch the App

See the [Launching the Application](Launching-the-Application) page to start using KorfStat Pro.

---

## Troubleshooting Installation

**"npm: command not found"**
→ Node.js is not installed yet, or was not installed correctly. Go back to [nodejs.org](https://nodejs.org/) and re-install it.

**"concurrently: command not found" or similar errors**
→ The `npm install` step was skipped or failed. Run `npm install` again in the project folder.

**"npm install" fails with errors**
→ Try deleting the `node_modules` folder (if it exists) and running `npm install` again. Make sure you have a stable internet connection.
