# KorfStat Pro 🏀

**The Ultimate Korfball Statistics & Management Tool**

Welcome to **KorfStat Pro**, a professional-grade application designed to help Korfball teams, coaches, and officials track match statistics, manage game clocks, and visualize performance in real-time. Whether you are a coach looking for detailed insights or a table official managing the scoreboard, KorfStat Pro makes it simple.

---

## 🚀 Getting Started (For Beginners)

Running KorfStat Pro is as easy as 1-2-3. You don't need to be a programmer to use this!

First, download and install [Node.js](https://nodejs.org/) (the "LTS" version is recommended).

### 1. Installation
Open your computer's terminal (Command Prompt on Windows, Terminal on Mac, Dealer's choice on Linux) and navigate to the project folder. Then run:

```bash
npm install
```
*This command downloads all the necessary "ingredients" the app needs to run.*

### 2. Start the App
To launch the application, run:

```bash
npm run dev:multi
```
Once you see a message saying "Local: http://localhost:3000", open your web browser (Chrome, Edge, Safari) and go to:
**`http://localhost:3000`**

If you want to use the app on another device on the same network, you can access it by navigating to the IP address of the device running the app in a browser. This can be found in the terminal output by looking for "Network: http://**[[your ip address]]**:3000".

This can be useful when you have multiple devices needed to record statistics during a match, and use the game and shot clock at the same time. This is all synced up, so you can use the app on multiple devices at the same time, also allowing you to show the statistics **LIVE** on a livestream or screens around the hall.
 
When launching using the app will automatically start in the background and you can access it by navigating to the IP address of the device running the app in a browser. 

---

## 📱 How to Use KorfStat Pro

The application is divided into several powerful views, each designed for a specific role.

### 🏠 Home Dashboard
The central hub where you can:
- **Start a New Match**: Set up teams and players.
- **View History**: Look back at previous match results.
- **Analyze Stats**: See overall player and team performance.
- **Plan Strategy**: Use the whiteboard feature to draw plays. Save your plays and load them later.

### ⚙️ Setting Up a Match
Before the game starts, you'll need to configure the teams:
1.  **Select Teams**: Enter team names and choose their colors.
2.  **Add Players**: List players with their numbers and gender.
3.  **Lineup**: Select who starts on the field (Attack/Defense).
4.  Click **"Start Match"** to enter the tracking interface.

### 📊 Match Tracker (The Main Screen)
This is where the statistics magic happens during the game.
- **Live Clock**: Manage the Game Clock and Shot Clock.
- **Track Events**: Click on the field to record shots, goals, turnovers, and fouls.
- **Substitutions**: Manage player changes easily.
- **Undo**: Made a mistake? Quickly undo the last action.

### 👨‍⚖️ Jury / Table Official Interface
*Designed for the official scorer's table.*
Run this view on a separate laptop or tab for the officials or a dedicated timekeeper
- **Game Clock Control**: Start/Stop the main timer independently.
- **Shot Clock Control**: Start/Stop/Reset the 25-second clock.
- **Scoreboard Management**: Correct scores if needed.
- **Disciplinary**: Issue / Register Yellow/Red cards.

> **Tip:** Open this link in a new window and drag it to a second (touch-screen) monitor if you have one!

> **Tip** Open this link on a separate device to use it as a dedicated timekeeper and jury interface!

### 📺 Live Stream Statistics
Shows you three subscreens that you can use for a livestream. It shows useful data for commentators and analysts.
1. **Shot Analysis**: Shows you either a heat map of all shots taken or an exact view of every goal/shot taken
2. **Current Match Statistics**: Shows you the performance of both teams during this game in a table
3. **Historic Match Statistics**: Shows you all the historic data and performance of both teams during this and previous games in a table

### 📺 Live Stats View (The Big Screen)
*Designed for spectators and live streams.*
Connect a large TV or projector to your computer and open this view.
- Displays a real-time scoreboard.
- Shows the Game Clock and Shot Clock clearly.
- Animates latest events (Goals, Cards) for the audience.

---

## ⏱️ Managing the Clocks
KorfStat Pro features professional-grade timing tools:
- **Shot Clock Decoupled**: The Shot Clock (25s) operates independently of the Game Clock. Starting the game doesn't force the shot clock to run, giving officials full control.
- **Precision Timing**: The clocks are calibrated to be accurate to the second, matching "physics time" perfectly.

---

## 🛠 Troubleshooting

**"The build failed!"**
If you see errors about "npm run build" failing, it usually means there is a conflict in the files. 
- Try running `npm install` again.
- Ensure you have the latest version of the code.

**"The clock looks weird"**
- The app uses advanced syncing. If the clock seems stuck, try refreshing the page. Your match state is saved automatically!

---

*Built with ❤️ for the Korfball community.*
