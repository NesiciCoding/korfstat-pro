# Launching the Application

Once you have completed the [Installation & Setup](Installation-and-Setup) steps, you are ready to start KorfStat Pro.

---

## Starting the App

Open your Terminal (Mac/Linux) or Command Prompt (Windows), navigate to the KorfStat Pro folder, and run:

```bash
npm run dev:multi
```

After a few seconds, you will see a message like:

```
Local:   http://localhost:3000
Network: http://192.168.1.10:3000
```

Now open your preferred web browser (Chrome, Edge, or Firefox are recommended) and go to:

**`http://localhost:3000`**

The KorfStat Pro application will load, and you are ready to go!

---

## Accessing from Other Devices on Your Network

KorfStat Pro is built to be used on **multiple devices at the same time**. Phones, tablets, and other laptops on the same Wi-Fi network can all open the app simultaneously.

Instead of `localhost`, they should use the **Network address** shown in the terminal output. For example:

```
http://192.168.1.10:3000
```

Each device can open a different "view" (Match Tracker, Jury View, Live Stats, etc.) and they all stay in sync automatically.

---

## Opening Specific Views Directly

You can open any view directly by adding `?view=VIEWNAME` to the URL. This is useful for:
- Opening the Jury or Shot Clock view on a separate device or monitor automatically on startup.
- Bookmarking specific views in your browser.

| View | URL Parameter |
|---|---|
| Home Dashboard | `?view=HOME` |
| Match Tracker | `?view=TRACK` |
| Jury View | `?view=JURY` |
| Live Stats (Big Screen) | `?view=LIVE` |
| Shot Clock | `?view=SHOT_CLOCK` |
| Stream Overlay | `?view=STREAM_OVERLAY` |
| Director Dashboard | `?view=DIRECTOR` |
| Spotter View | `?view=SPOTTER` |
| Livestream Stats | `?view=LIVESTREAM_STATS` |

**Example:** `http://192.168.1.10:3000/?view=JURY` would open the Jury View directly on another device.

---

## Stopping the App

To stop the application, go back to the terminal window where you ran `npm run dev:multi` and press **Ctrl + C**.

---

## Running for a Real Match (Production Mode)

If you are running the app at an official venue and want a more stable setup, you can use a process manager. See the [Deployment section of the README](../README.md) for more details on using `pm2` or static hosting options.
