# Stream Overlay

The Stream Overlay is a **transparent, browser-source-ready overlay** designed to be used inside **OBS Studio** (or any other streaming software that supports browser sources). It displays the live scoreboard, clocks, and event graphics directly on top of your video feed.

---

## Opening This View

Open the overlay URL in your browser or add it as a browser source in OBS:
```
http://[your-ip]:3000/?view=STREAM_OVERLAY
```

---

## What It Shows

The Stream Overlay displays only the essential information a broadcast audience needs, with the rest of the screen being **transparent** (so your camera feed shows through):

### Scoreboard
- Home and Away team names.
- Current scores (e.g. **3 – 2**).
- Team colors are used as accents.

### Game Clock
- The running game timer displayed in MM:SS format.

### Shot Clock (Optional)
- The 25-second shot clock can be shown or hidden via the [Director Dashboard](Director-Dashboard).

### Event Popups
- When a goal is scored, a branded popup animation appears at the bottom of the screen (or another corner depending on the theme).
- Other significant events (timeouts, cards) can trigger popups via the Director Dashboard.

---

## Setting Up in OBS

1. In OBS, add a new **Browser Source**.
2. Set the URL to `http://localhost:3000/?view=STREAM_OVERLAY` (or the network IP).
3. Set the width to **1920** and height to **1080** (or match your stream resolution).
4. Check **"Custom CSS"** if you need additional transparency adjustments.
5. Place this source **on top of** your camera or gameplay source in OBS.

> **Important:** OBS Browser Sources support transparent backgrounds automatically. All areas that are not scoreboard/overlay graphics will be transparent.

---

## Customising the Overlay

The overlay's visual style is controlled from the [Director Dashboard](Director-Dashboard), which has a **Theme** settings panel. Options include:
- Different **visual styles** (Modern, Classic, Minimal, etc.).
- Multiple **typography / font options**.
- Toggle for showing or hiding the shot clock on the overlay.

All theme changes are applied **instantly** and update live on the overlay without any delays.

---

## Advanced: Multiple Overlays

You can open multiple browser sources from KorfStat Pro in OBS, for example one for the scoreboard and another from the [Livestream Stats View](Livestream-Stats-View), and mix them together on your OBS scene as desired.
