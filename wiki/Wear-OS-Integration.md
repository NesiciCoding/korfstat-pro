# Wear OS Watch Integration

KorfStat Pro includes native integration with the **Korfball Ref Watch** — a Wear OS smartwatch application that gives the **referee** a live display on their wrist throughout the match.

---

## What the Watch Does

The watch app mirrors the live game state from KorfStat Pro, showing:
- **Current Score** (Home – Away)
- **Game Clock** (countdown timer)
- **Shot Clock** (25-second countdown, turns red under 5 seconds)
- **Current Period** (Half 1 or Half 2)
- **Substitution Notifications** — a full-screen popup with the player numbers and names going in and out.
- **Timeout Notifications** — a full-screen alert showing which team called the timeout.

---

## Control Modes

The watch can operate in one of two modes, set via [Settings](Settings) or the **Wear OS Control Mode** dropdown:

### 🔒 Read-Only Mode (default)
In this mode, the referee can **only see** the data — they cannot control anything from their wrist. All clock control stays with the jury official at the scorer's table.

When active, the watch displays a small **"READ-ONLY"** label at the top of the screen.

### ✏️ Write Mode
In this mode, the referee has **full control** over the timers from their wrist:
- **Tap the Game Clock** to start/stop it.
- **Double-tap the Shot Clock** to reset it to 25 seconds.
- **Long press anywhere** to toggle between Read-Only and Write Mode.

---

## Haptic (Vibration) Feedback

The watch automatically vibrates in response to important events, even if the referee is not looking at the screen:

| Event | Vibration Pattern |
|---|---|
| Shot clock expires (0 seconds) | Single long buzz |
| Substitution pending | Double buzz pattern (buzz-pause-buzz) |
| Timeout requested | Double buzz pattern |

---

## For Developers: Setting Up the Connection

The watch app communicates with KorfStat Pro via the **Wear OS Data Layer** (using a `WearableListenerService`). During development, the connection is established over ADB (Android Debug Bridge):

1. Launch the Wear OS Emulator (or pair a physical Wear OS watch) via Android Studio.
2. Install the Korfball Ref Watch app on the emulator/watch.
3. Start KorfStat Pro: `npm run dev:multi`
4. The app automatically sends game state updates to the watch via a custom Vite plugin that bridges to ADB.

The watch app listens on the path `/korfball_game_state` for data map updates containing fields like `homeScore`, `awayScore`, `gameTime`, `shotClock`, `period`, `subPending`, `subOut`, `subIn`, `timeoutTeam`, and `isReadOnly`.

---

## Related Resources

- [Korfball Ref Watch Wiki](https://github.com/NesiciCoding/Korfball-Ref-Watch-Link/wiki) — Full documentation for the watch app itself.
- [Settings](Settings) — Where to set the default Wear OS control mode.
