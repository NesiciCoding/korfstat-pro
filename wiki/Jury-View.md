# Jury & Table Official View

The Jury View is designed specifically for the **official scorer's table**. It gives the jury official (timekeeper) dedicated, touch-friendly controls for managing the clocks and scoreboard.

---

## Who Should Use This View?

This view is intended for:
- The **official timekeeper** at the scorer's table.
- Any **jury member** responsible for the game clock and shot clock.
- A **second operator** running the timers independently from the stat recorder.

> **Tip:** Open the Jury View on a separate device from the Match Tracker. A touch-screen tablet is ideal. Use the URL `http://[your-ip]:3000/?view=JURY` to open it directly.

---

## Game Clock Controls

### Start / Stop
The large **START / STOP** button in the center of the Jury View controls the game clock. Tap it to start or pause the timer.

### Manual Time Correction
If the clock needs adjusting (e.g. due to a delay or an error), tap the clock display itself to enter a manual time.

### Half Time Management
When the first half ends:
1. Stop the clock.
2. Press the **Half Time** button to switch halves.
3. The clock resets for the second half.

---

## Shot Clock Controls

The **Shot Clock** (25 seconds by default) has its own set of dedicated buttons:

| Button | Action |
|---|---|
| ▶ / ⏸ | Start or pause the shot clock |
| Reset | Restart the shot clock at 25 seconds |

The shot clock operates **completely independently** of the game clock. You can start/stop one without affecting the other.

> **Why are they separate?** In Korfball, the shot clock may need to be reset or paused without pausing the overall game clock (e.g. after a foul, or during a dead ball). This design gives the jury full control.

---

## Scoreboard Management

The Jury View shows the live score for both teams. You can manually **adjust the score** if a correction is needed (e.g. if a goal was recorded incorrectly).

- Use the **+** and **-** buttons next to each team's score to correct it.
- Any correction is immediately broadcast to all connected devices.

---

## Disciplinary Cards

The Jury View includes buttons to **issue Yellow and Red Cards**:
1. Press the card button (Yellow or Red).
2. Select the team.
3. Select the player.
4. The card is logged and appears in the statistics.

---

## Timeout Controls

When a team requests a timeout:
1. Press the **Timeout** button for the requesting team.
2. A 60-second countdown begins.
3. A popup notification is sent to the referee's Wear OS watch and all other connected screens.
4. Remaining timeouts for each team are displayed.

---

## Viewing on a Second Monitor

The Jury View is designed to work great on a **touchscreen monitor** placed in front of the jury table. To set this up:

1. Connect a second monitor to your laptop.
2. Open a new browser window and drag it to the second screen.
3. Navigate to the Jury View in that window.
4. Go fullscreen (F11 on most browsers) for a clean, distraction-free interface.
