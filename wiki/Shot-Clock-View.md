# Shot Clock View

The Shot Clock View is a **dedicated, standalone display** for the 25-second shot clock. It is designed to be shown on a separate screen — for example, a monitor visible to players and officials on the field.

---

## Opening This View

From the Home Dashboard, click **"Shot Clock"** or navigate to:
```
http://[your-ip]:3000/?view=SHOT_CLOCK
```

---

## What It Shows

- A large, full-screen **countdown timer** starting from 25 seconds.
- The timer **turns red** when fewer than 5 seconds remain, providing a clear visual warning.
- When the shot clock expires (reaches 0), an alert is shown.

---

## Control

The shot clock is **controlled from the [Jury View](Jury-View)** or the [Match Tracker](Match-Tracker). The Shot Clock View is display-only — it does not have its own input controls.

This keeps things simple: **one person controls** the shot clock (the jury official), and it is mirrored on all screens automatically.

---

## Setup Tips

- Mount a small monitor or tablet facing the players so they can always see the shot clock countdown.
- Use the network URL to load the Shot Clock View on a second device without any physical cables.

> **Example:** Open `http://192.168.1.10:3000/?view=SHOT_CLOCK` on a tablet mounted on a stand at the side of the field.
