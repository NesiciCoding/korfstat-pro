# Director Dashboard

The Director Dashboard is the **broadcast control center** of KorfStat Pro. It is designed for a broadcast director or production manager who wants to control what graphic elements appear on the [Stream Overlay](Stream-Overlay) in real time.

---

## Opening the Director Dashboard

From the Home Dashboard, click **"Director"** or navigate to:
```
http://[your-ip]:3000/?view=DIRECTOR
```

---

## Layout Overview

The Director Dashboard is split into two main sections:

| Left Panel | Right Panel |
|---|---|
| Controls and settings | Live preview monitor |

The **preview monitor** shows exactly what the overlay looks like right now — before anything goes to the live stream. Changes you make appear instantly in the preview first.

---

## On-Air Status

At the top of the controls panel, the **On-Air Status** card shows:
- **"Override Active"** — if a custom graphic is currently being pushed to the overlay.
- **"Running Auto-Pilot"** — if the overlay is in automatic mode, responding to match events only.

You can hit **STOP OVERRIDE** at any time to clear any custom graphic.

---

## Tabs

### ⚡ Quick Tab

One-click buttons to instantly push the most common overlays:

| Button | Action |
|---|---|
| GOAL HOME | Shows a "GOAL!" popup for the Home team (auto-clears after 6 seconds) |
| GOAL AWAY | Shows a "GOAL!" popup for the Away team (auto-clears after 6 seconds) |
| TIMEOUT HOME | Shows a "TIME OUT" popup for the Home team |
| TIMEOUT AWAY | Shows a "TIME OUT" popup for the Away team |

These are perfect for quickly reacting to match events without typing anything.

---

### ✏️ Custom Tab

Build a completely custom graphic to push to the overlay. Options:

**Display Type:**
- **Lower 3rd** — a banner at the bottom of the screen (classic TV graphics style).
- **Ticker** — a scrolling text bar across the bottom.
- **Full Screen** — a full-screen graphic that takes over the overlay.

**Content:**
- **Main Text** — the headline (e.g. "GOAL!", "HALF TIME").
- **Sub Text / Detail** — the supporting text (e.g. player name, team name).
- **Accent Color** — choose a color for the graphic, including the home or away team color.

Once you are happy with the preview, press **GO LIVE** to push it to the overlay immediately.

---

### 🎨 Theme Tab

Control the visual style of the entire [Stream Overlay](Stream-Overlay):

**Visual Style:**
Choose from preset themes (Modern, Classic, Minimal, etc.) to match the feel of your broadcast.

**Typography:**
Select the font used in the overlay from several broadcast-friendly options.

**Show Shot Clock:**
Toggle whether the shot clock appears on the stream overlay or not.

> All theme changes apply instantly — no need to restart anything.

---

## AI Commentary Feed

The Director Dashboard includes a live **AI Commentary Feed** (if a Gemini API key is configured in [Settings](Settings)). This shows automatically generated commentary lines based on recent events — useful for inspiration or for texting to commentators during the broadcast.
