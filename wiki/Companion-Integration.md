# Bitfocus Companion Integration

KorfStat Pro can connect to **Bitfocus Companion** — a popular automation tool used in professional live production. This lets you control KorfStat Pro actions and display live match data on **hardware button boxes** (such as an Elgato Stream Deck).

---

## What is Bitfocus Companion?

Bitfocus Companion is a free software that acts as a bridge between your computer and hardware control surfaces. With it, you can:
- Assign physical buttons to actions in KorfStat Pro (e.g. press a button on your Stream Deck to trigger a "Goal" animation).
- Display live data (like the current score) directly on the buttons' screens.

Download it for free from [bitfocus.io/companion](https://bitfocus.io/companion).

---

## Accessing the Setup

1. Open **Settings** (gear icon).
2. Scroll to the **Integrations** section.
3. Click **"Bitfocus Companion / Button-Box"** → **"Configure →"**.

---

## Setup Guide (Step by Step)

### Step 1: Check Server Status
The status bar at the top shows whether the KorfStat Pro local server is running:
- ✅ **Server online** — you are ready to proceed.
- ❌ **Server offline** — make sure you started the app with `npm run dev:multi` (not just the frontend).

### Step 2: Install Bitfocus Companion
Download from [bitfocus.io/companion](https://bitfocus.io/companion) and install it on the **same computer** (or any computer on the same local network).

### Step 3: Add a "Generic HTTP" Connection in Companion
1. Open Companion's web interface (usually at `http://localhost:8888`).
2. Go to **Connections → Add**.
3. Search for **"Generic HTTP"** and add it.
4. Set the **Base URL** to the Server URL shown in the KorfStat Pro Companion setup panel (e.g. `http://192.168.1.10:3002`).
5. Add a default header: `X-Companion-Token` = (the token shown in the panel).

You can copy these values directly from the setup panel — each value has a copy button.

### Step 4: Import the KorfStat Profile
1. In the Companion setup panel, click **"Download Companion Profile"**.
2. In Companion, go to **Settings → Import/Export → Import** and select the downloaded file.
3. You will get a ready-made 15-button layout with common actions like Goal, Timeout, Start/Stop clock, and more.

### Step 5 (Optional): Set Up Push Variables
For **instant, zero-delay** live data on your button labels (like the current score always updating on a button):
1. In the setup panel, enter your **Companion URL** (e.g. `http://localhost:8888`).
2. Click **Save**.
3. KorfStat Pro will now push updated variables to Companion on every match event, with no polling delay.

### Test Without Hardware
In Companion, click the **Emulator** (grid icon) to see and click virtual buttons on screen. No physical Stream Deck required to test.

---

## Live Variables Reference

Once connected, these variables are available in Companion to display on button labels:

| Variable | Description |
|---|---|
| `scoreDisplay` | e.g. "3 – 2" |
| `homeTeamName` | Home team name |
| `awayTeamName` | Away team name |
| `clockDisplay` | Game clock in MM:SS format |
| `shotClockDisplay` | Shot clock in MM:SS format |
| `period` | Current period number |
| `isRunning` | Whether the game clock is running |
| `scoreHome` | Home team score (number) |

---

## Scanning With QR Code

The setup panel displays a **QR code** you can scan from within Companion's mobile companion app or setup tool to automatically configure the connection URL and token.
