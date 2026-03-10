# Feature Lock and Roadmap

This document serves as a reference to lock in the **current mandated feature-set** of KorfStat Pro. These features are considered core to the application and must not be removed or broken during future development. It also outlines a **roadmap** for future features, prioritized by impact and implementation time.

## 🔒 Locked Feature-Set (Do Not Remove)

The following features are currently implemented and are critical to the operation of KorfStat Pro:

### Core Application & Management
- **Home Dashboard**: Central hub for accessing all features.
- **Match Setup & Management**: Ability to create and configure new matches.
- **Season Manager**: Grouping matches and statistics into seasons.
- **Club Manager**: Managing club details, teams, and player rosters.
- **Settings & Configuration**: App-wide configuration, including keyboard shortcuts.
- **Tournament Formats & Brackets**: Scalable tools for Leagues, Knockouts, and Group Stages, featuring visual generation and PDF bracket exports.

### Live Tracking & Officiating
- **Match Tracker**: Real-time input of goals, fouls, substitutions, and timeouts.
- **Jury & Table Official View**: Dedicated view for the jury table.
- **Shot Clock View**: Standalone display for the shot clock.
- **Spotter View**: Simplified interface for spotters calling out events.
- **Undo/Redo System**: Robust system to undo the last recorded event in the Match Tracker.

### Broadcasting & Display
- **Live Stats View (Big Screen)**: Optimized for in-arena displays and spectators.
- **Livestream Statistics View**: Formatting stats for stream integration.
- **Stream Overlay**: Fully customizable graphics with gradients, team logos, and themes for OBS/Vmix.
- **Director Dashboard**: Control center for toggling stream graphics.

### Analysis & Statistics
- **Statistics View**: Detailed breakdown of match statistics, including **Interactive Court Heatmaps** (Precise vs. Heatmap vs. Zone Efficiency).
- **Match Analysis (AI)**: Automated insights and match narratives using Google Gemini.
- **Overall Statistics**: Aggregated stats across multiple seasons and matches.
- **Match History**: Log of past games with searchable events.
- **Strategy Planner**: Interactive whiteboard for tactical planning.
- **Export/Share Match Reports**: Export finished match statistics to PDF, Excel, and JSON formats for external analysis.
- **Social Media Graphic Generator**: Rapid export tool to create 1080x1080 / 1080x1920 PNG graphics for sharing Final and Halftime scores online.

### Integrations
- **Bitfocus Companion Integration**: API and controls for Elgato Stream Decks and other hardware.
- **Wear OS Integration**: Companion watch app for referees and officials. Supports direct Wi-Fi connection (configurable IP/port on the watch), bidirectional sync in write mode, and enhanced haptic comm signals — distinct patterns for timeouts, substitutions, shot clock, and game clock buzzes.
- **Live API Webhooks**: Push-to-Companion webhook system for real-time match state publishing.

### Infrastructure & Deployment
- **Automated Cross-Platform Builds**: GitHub Actions workflow to automatically build and release `.dmg`, `.msi`, `.exe`, `.AppImage`, and `.deb` installers for macOS, Windows, and Linux.
- **Auto-Updater**: Integrated Tauri v2 updater system for seamless application updates across all supported platforms.
- **Stabilized CI/CD**: Robust Git configuration in CI (full clones, safe directory trust) to ensure reliable automated releases.

---

## 🚀 Future Feature Roadmap

The following features have been drafted for future implementation, ordered by their potential **impact** and estimated **time to implement**.

### High Impact, High Time to Implement (Future Big Features)
These are game-changing features that require significant architectural work.

5. **Cloud Sync / Multi-Device Database**
   - **Description**: Transition from purely local-network real-time sync to a cloud-backed system (e.g., Supabase/Firebase) where multiple users can log in from anywhere to view or manage the same club data.
   - **Impact**: Very High (Enables remote analysts and persistent cross-device storage).
   - **Time**: Very High (Requires backend infra and auth).

6. **Automated Video Clipping (Highlight Generation)**
   - **Description**: Integration with local video feeds or OBS to automatically save a video replay 10 seconds before/after a goal is recorded.
   - **Impact**: Very High (Massive value for social media and analysis).
   - **Time**: High (Requires complex WebSocket communication with streaming software).

7. **Advanced Player Profiles & Career Statistics**
   - **Description**: A dedicated section to see cumulative statistics across seasons, line graphs of shooting percentages, and personal bests.
   - **Impact**: High (Engaging for players and deep analysis for coaches).
   - **Time**: High (Complex database queries and new UI charts).

### Medium Impact, Medium Time to Implement (The "Next Level" Features)
Features that add professional-grade depth to the analysis.

8. **Advanced Analytics: Lineup Impact (+/- per 4-pack)**
   - **Description**: Korfball is played 4v4 in divisions. This feature tracks which specific combination of 4 players has the highest goal difference while on the court together.
   - **Impact**: Very High (Crucial for tactical substitutions).
   - **Time**: Medium/High (Requires tracking sub timings precisely in the DB).

9. **AI Scouting Report Generator**
   - **Description**: Analyze an opponent's last 3 matches and generate a "Smart Scout" PDF. Highlights their top scorers, preferred shot zones, and common foul triggers.
   - **Impact**: High (Massive advantage for coaching staff).
   - **Time**: Medium (Leverages existing Gemini integration to analyze batch match data).

10. **Interactive Shot Timeline / Replay**
    - **Description**: Add a "Scrubbable Timeline" to the Shot Map. Allows coaches to see the *flow* of the game (e.g., "We shot much closer to the post in the first 10 minutes").
    - **Impact**: High (Better understanding of game momentum).
    - **Time**: Medium (Already have the data, needs a UI slider and time-filtering logic).

### High Impact, Low/Medium Time to Implement (The "Quick Wins")
High-value additions that leverage existing infrastructure for maximum gain.

11. **Full Dutch Localization (NL/BE)**
    - **Description**: Complete translation of the UI to Dutch. Since Korfball is most popular in the Netherlands and Belgium, this is a core requirement for wide adoption.
    - **Impact**: Very High (Essential for the target demographic).
    - **Time**: Low (Already set up with `i18next`, just needs translation keys).

12. **Sponsor Overlay & Graphic Rotation**
    - **Description**: A management UI to upload sponsor banners that rotate on the Live Stats and Stream Overlay views, allowing clubs to monetize their matches.
    - **Impact**: High (Adds direct financial value for clubs/leagues).
    - **Time**: Low (Simple timer-based image rotation system).

13. **Match Templates / Quick-Start**
    - **Description**: Save "Favorite Matchups" (e.g., "1st Team vs Rivals") with pre-filled rosters, themes, and stream settings to start a match in seconds.
    - **Impact**: Medium/High (Reduces stress and prep time on match day).
    - **Time**: Low (Small DB expansion and a "Save Template" feature).

14. **Public Live-Ticker Widget**
    - **Description**: An embeddable iframe or JS snippet that clubs can put on their own website to show a live-updating score and game clock for their active matches.
    - **Impact**: Medium/High (Drives traffic to club sites and engages fans).
    - **Time**: Low/Medium (Requires a simplified public view of the match state).

15. **Match Day Program Generator (PDF)**
    - **Description**: Automatically generate a "Match Day Program" PDF with the rosters, season stats, and last match recap that fans can print or download via QR code at the arena.
    - **Impact**: High (Professionalizes the match day experience).
    - **Time**: Medium (Uses existing PDF export engine).

16. **Spectator "Goal of the Match" Voting**
    - **Description**: A phone-optimized link for spectators to vote on the best goal, with live results shown on the "Big Screen" during player awards.
    - **Impact**: High (Interactive fan engagement).
    - **Time**: Low/Medium (Requires a simple voting backend and UI).



