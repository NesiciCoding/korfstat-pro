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
- **Statistics View**: Detailed breakdown of match statistics.
- **Match Analysis (AI)**: Automated insights and match narratives.
- **Overall Statistics**: Aggregated stats across multiple matches.
- **Match History**: Log of past games.
- **Strategy Planner**: Interactive whiteboard for tactical planning.
- **Export/Share Match Reports**: Export finished match statistics to PDF, Excel, and JSON formats for external analysis.
- **Social Media Graphic Generator**: Rapid export tool to create 1080x1080 / 1080x1920 PNG graphics for sharing Final and Halftime scores online.

### Integrations
- **Bitfocus Companion Integration**: API and controls for Elgato Stream Decks and other hardware.
- **Wear OS Integration**: Companion watch app for referees and officials. Supports direct Wi-Fi connection (configurable IP/port on the watch), bidirectional sync in write mode, and enhanced haptic comm signals — distinct patterns for timeouts, substitutions, shot clock, and game clock buzzes.
- **Live API Webhooks**: Push-to-Companion webhook system for real-time match state publishing.

---

## 🚀 Future Feature Roadmap

The following features have been drafted for future implementation, ordered by their potential **impact** and estimated **time to implement**.

### High Impact, High Time to Implement
These are game-changing features that require significant architectural work.

5. **Cloud Sync / Multi-Device Database**
   - **Description**: Transition from purely local-network real-time sync to a cloud-backed system where multiple users can log in from anywhere to view or manage the same club data.
   - **Impact**: Very High (Enables remote analysts and persistent cross-device storage without manual backups).
   - **Time**: Very High (Requires backend infrastructure, authentication, and conflict resolution).

6. **Automated Video Clipping (Highlight Generation)**
   - **Description**: Integration with local video feeds or OBS to automatically save a video replay/clip 10 seconds before and after a goal is recorded in the Match Tracker.
   - **Impact**: Very High (Massive value for social media and video analysis).
   - **Time**: High (Requires complex WebSocket communication with OBS/vMix and timestamp synchronization).

7. **Advanced Player Profiles & Career Statistics**
   - **Description**: A dedicated section to click on a player and see their cumulative statistics across all seasons, line graphs of their shooting percentage, and personal bests.
   - **Impact**: High (Engaging for players and deep analysis for coaches).
   - **Time**: High (Complex database queries and new UI charts).

### Medium Impact, Low/Medium Time to Implement
Nice-to-have features that polish the experience.
