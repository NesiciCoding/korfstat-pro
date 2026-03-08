# Troubleshooting

This page covers the most common problems and how to fix them.

---

## Installation Problems

### "npm: command not found"
**Cause:** Node.js is not installed (or not in your PATH).  
**Fix:** Download and install Node.js from [nodejs.org](https://nodejs.org/). Choose the **LTS** version. Then restart your terminal.

### "npm install fails with errors"
**Fix:**
1. Delete the `node_modules` folder if it exists.
2. Run `npm install` again.
3. Make sure you have a stable internet connection during install.
4. Ensure you are using Node.js v20 or higher (`node --version` to check).

### "concurrently: command not found" or "vitest: command not found"
**Cause:** `npm install` was not run, or it failed partway through.  
**Fix:** Run `npm install` in the project folder first.

---

## App Won't Start

### The app doesn't open in the browser
1. Check the terminal — wait for the message `Local: http://localhost:3000` to appear.
2. Make sure you ran `npm run dev:multi` (not just `npm run dev`).
3. Try opening `http://localhost:3000` manually in your browser.

### "WebSocket connection failed"
**Cause:** The server part of the app is not running, or a firewall is blocking it.  
**Fix:**
- Ensure you used `npm run dev:multi` — this starts both the frontend AND the sync server together.
- Check your firewall settings and allow connections on ports **3000** and **3002**.

---

## Clock / Timer Problems

### The clock looks wrong or is running too fast/slow
The clocks are calculated based on real time, not tick-based. If a refresh was needed:
- **Refresh the page** — your match state is saved and will be restored automatically.

### The shot clock won't start
- Make sure you are in the [Jury View](Jury-View) or [Match Tracker](Match-Tracker) and pressing the shot clock's own start button, not the game clock button.

---

## Sync / Multi-Device Problems

### App is not accessible from another device on the network
1. All devices must be on the **same Wi-Fi network**.
2. Use the **Network IP** address shown in the terminal (e.g. `http://192.168.1.10:3000`), not `localhost`.
3. Check the firewall on the host computer allows inbound connections on ports 3000 and 3002.

### Changes on one device are not appearing on another
- Both devices must be running with an active network connection.
- Try refreshing the secondary device's browser.
- The sync uses your local network — if Wi-Fi is unstable, updates may be delayed.

---

## Data Problems

### "My match data is gone after I refreshed"
- Match data is stored in your browser's **localStorage**.
- Clearing browser history/data will erase it.
- **Always export important match results** as PDF or Excel from the Statistics View.

### "AI features are not working"
1. Check that a valid Gemini API key is set in [Settings](Settings) (under Integrations).
2. Ensure the `.env` file is in the **root directory** of the project.
3. Restart the dev server after changing the `.env` file.
4. Check the key is valid on [Google AI Studio](https://makersuite.google.com/).

---

## Getting More Help

- Check the [GitHub Issues](https://github.com/NesiciCoding/korfstat-pro/issues) page.
- Open a new issue with:
  - A description of the problem.
  - What steps you took before it happened.
  - Any error messages from the browser console (press F12 → Console tab).
