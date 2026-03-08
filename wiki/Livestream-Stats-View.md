# Livestream Statistics View

The Livestream Statistics View is a specialised screen designed for **broadcasters, commentators, and analysts**. It shows rich, detailed data about the current match in a layout that is easy to read on a secondary monitor or share with a production team.

---

## Opening This View

From the Home Dashboard, click **"Livestream Stats"**. You can also open it directly via:
```
http://[your-ip]:3000/?view=LIVESTREAM_STATS
```

---

## What's Inside

The Livestream Statistics View is split into three sub-panels. These can be useful on separate monitors side by side for a broadcaster setup.

---

### Panel 1: Shot Analysis & Heatmap

This panel shows a visual representation of every shot taken during the match:

- **Heatmap Mode** — shows where shots are clustering on the field. Red/orange areas indicate zones with many attempts.
- **Shot Dot Mode** — shows every individual shot as a dot on the field, colour-coded by result (Goal, Saved, Missed).

Use this to quickly understand which areas of the field are being targeted and where goals are coming from.

---

### Panel 2: Current Match Statistics Table

A live, updating table of key stats for the current match:

| Stat | Description |
|---|---|
| Goals | Total goals scored by each team |
| Shots | Total attempts on target |
| Accuracy | Shot accuracy percentage |
| Cards | Yellow and red cards issued |
| Timeouts Used | Timeouts taken so far |
| Possession Events | Number of recorded possession changes |

This panel is designed so commentators can refer to it at a glance during a broadcast.

---

### Panel 3: Historic Match Statistics Table

Shows data aggregated across **this match and all past recorded matches** between these two teams (or from the entire database). Useful for context:

- Head-to-head record.
- Season totals.
- Historic shot accuracy trends.

---

## Tips for Broadcasters

- Keep this view open on a laptop next to your commentary position.
- The data updates automatically — no need to refresh.
- Combine this with the [Stream Overlay](Stream-Overlay) and [Director Dashboard](Director-Dashboard) for a full professional broadcast setup.
