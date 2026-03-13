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
- **Multi-language Support (Dutch/English)**: Full UI localization for the core Korfball demo-graphic (NL/BE), integrated throughout the application and automated tests.
- **Global Navigation Framework**: Robust click-through traceability across all views, supported by a global 'Home' floater and persistent Settings/Shortcuts access. Verified 100% reachable.

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
- **Sponsor Management**: Rotating banner system for stream overlays and live stats.
- **Sponsor Overlay & Graphic Rotation**: A management UI to upload sponsor banners that rotate on the Live Stats and Stream Overlay views, allowing clubs to monetize their matches.
- **Public Live-Ticker Widget**: Embeddable real-time match scores and clock for external club websites, featuring automatic Web Socket updates.
- **Match Day Program Generator (PDF)**: Automatically generate professional "Match Day Program" PDFs with rosters, season stats, and match previews for fans to print or download.
- **Spectator "Goal of the Match" Voting**: Interactive fan engagement system allowing spectators to vote for their favorite goal via mobile, with live results displayed on stream and big screens.
- **Match Templates / Quick-Start**: Ability to save and load "Favorite Matchups" with pre-filled rosters, themes, and stream settings to start a match in seconds.

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

### Quality Assurance & Testing
- **Comprehensive Test Suite**: Over 110+ automated Vitest cases covering core utilities and components.
- **Mocked Ecosystem**: Robust service mocking to allow high-fidelity UI testing without backend dependencies.
- **Phase 13: Test Coverage Expansion (Finalized)**: Achieved >50% line coverage for both `App.tsx` (55.78%) and `MatchTracker.tsx` (54.56%). Secured keyboard shortcut stability and navigation traceability through robust Vitest suites.

---

## 🚀 Future Feature Roadmap

The following features have been drafted for future implementation, ordered by their potential **impact** and estimated **time to implement**.

### High Impact, High Time to Implement (Future Big Features)
These are game-changing features that require significant architectural work.

5. **Cloud Sync / Multi-Device Database**
   - **Description**: Transition from purely local-network real-time sync to a cloud-backed system (e.g., Supabase/Firebase) where multiple users can log in from anywhere to view or manage the same club data.
   - **Drafted Research**: [Cloud Sync Integration](cloud_sync_research.md)
   - **Impact**: Very High (Enables remote analysts and persistent cross-device storage).
   - **Time**: Very High (Requires backend infra and auth).

6. **Automated Video Clipping (Highlight Generation)**
   - **Video Clipping & Broadcaster Integration**: Full-scale integration with OBS and vMix to automate highlight generation, scene changes, and broadcast graphics.
    - **Drafted Research**: [Video Clipping Integration](Video-Clipping-Integration.md)
    - **Impact**: Very High (Enables TV-quality automated production).
    - **Time**: High (Requires multi-protocol support and robust event-triggering logic).

7. **Advanced Player Profiles & Career Statistics**
   - **Description**: A dedicated section to see cumulative statistics across seasons, line graphs of shooting percentages, and personal bests.
   - **Drafted Research**: [Player Profiles Integration](player_profiles_research.md)
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