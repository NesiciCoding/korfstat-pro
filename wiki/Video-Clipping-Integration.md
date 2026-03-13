# Research Notes: Automated Video Clipping Integration

Investigating the technical requirements for integrating OBS and vMix for automated highlight generation in KorfStat Pro.

## Goal
Automatically trigger a "Replay Save" or "Highlight Clip" when a significant event (GOAL, CARD) is recorded in KorfStat Pro.

## 🎥 OBS Studio (via obs-websocket 5.x)

### Technical Approach
OBS uses the "Replay Buffer" feature. The buffer must be started at the beginning of the match. When a goal is scored, KorfStat sends a `SaveReplayBuffer` request.

### API Commands (OpCode 6 - Request)
- `GetReplayBufferStatus`: Check if the buffer is active.
- `StartReplayBuffer`: Start the recording buffer.
- `SaveReplayBuffer`: Save the current buffer to disk (typically the last 20-60 seconds as configured in OBS).
- `GetLastReplayBufferReplay`: Returns the physical file path of the saved clip.

### Pros
- **Free & Open Source**: No additional cost for the user.
- **Robust Protocol**: OBS Websocket 5.x is well-documented and uses standard JSON.
- **Low Overhead**: Replay buffer uses GPU memory, minimal CPU impact.

### Cons
- **Fixed Duration**: The save duration is fixed in OBS settings; KorfStat cannot easily say "save the last 15 seconds" vs "last 30 seconds" per request (it saves whatever is in the buffer).
- **Setup Complexity**: Users must remember to "Start Replay Buffer" manually or KorfStat must manage the state.
- **Categorization**: Native tagging is limited. KorfStat must handle file organization (e.g., prefixing filenames with `GOAL_` or `FOUL_`) to manage different highlight categories.

## 🎬 vMix (via HTTP API)

### Technical Approach
vMix has a high-end "Instant Replay" system (Pro/4K editions). vMix provides an HTTP API (default port 8088) that accepts function calls.

### API Commands (Core Functions)
- `ReplayStartStopRecording`: Ensure capture is running.
- `ReplayMarkInOut`: Mark the last X seconds (parameter `Value`) as a highlight event.
- `ReplaySetLastEventText`: Add event description (e.g., "Goal by #10 Smith").
- `ReplayPlayLastEventToOutput`: Automatically play the highlight on the stream after capture.

### Pros
- **Professional Grade**: Designed for live sports broadcasting.
- **Dynamic Duration**: Parameterized `ReplayMarkInOut` allows precise timing.
- **Multi-Angle**: Supports up to 8 camera angles simultaneously.
- **Advanced Tagging**: vMix supports multiple "Event Lists" (up to 20). KorfStat can push clips to specific lists (e.g., List 1 for Goals, List 2 for Fouls) to build automatic themed highlight reels.
- **Live Labeling**: `ReplaySetLastEventText` allows real-time metadata tagging for easier post-match editing.

### Cons
- **Expensive**: Requires vMix 4K or Pro (USD $700+).
- **Windows Only**: vMix only runs on Windows, limiting KorfStat's cross-platform utility.

## ⚖️ Comparison & Development Impact

| Feature | OBS Studio | vMix |
|---------|------------|------|
| **Cost** | $0 | $700 - $1200 |
| **API Type** | WebSocket (JSON) | HTTP (GET) |
| **Clip Control** | Buffer-based (Fixed) | Event-based (Dynamic) |
| **Metadata** | Filename only | Description + Filename |
| **Categorization** | File Prefixes | Dedicated Event Lists |
| **Complexity** | Medium | Low (HTTP is easier) |

## 🧩 OBS Plugin vs. Browser Dock

### Option A: Native OBS Plugin (C++)
- **Pros**: High performance, direct access to OBS memory and scene data.
- **Cons**: Extremely high development cost, platform-dependent builds, needs separate installation from KorfStat.
- **Verdict**: Not recommended for this stage.

### Option B: KorfStat "Broadcaster Dock" (Recommended)
- **Concept**: A specialized web view within KorfStat Pro that the user adds as a "Custom Browser Dock" in OBS.
- **Mechanism**: Use `obs-websocket-js` from the dock to control OBS directly.
- **Pros**: Zero installation (standard web tech), unified UI with KorfStat, can display real-time match stats and controls right inside the OBS interface.
- **Modularity**: Keeps the core logic in KorfStat while providing a seamless "bridge" inside OBS.

## Implementation Roadmap (Extensive Plan)

### Phase 1: Integration Layer
- Create a `BroadcasterService` module in `server/services/`.
- Support for `BroadcasterProvider` interface with `triggerHighlight(description)` method.
- Implementation for `OBSProvider` and `VMixProvider`.

### Phase 2: Server-Side Event Hub
- The `server/index.js` currently receives `match-update`.
- It will now deep-compare the previous event log with the new one.
- If a new `GOAL` or `CARD` event is found, it calls `BroadcasterService.triggerHighlight()`.

### Phase 3: Setup UI
- Add a "Broadcaster Integration" tab in the `MatchSetup` or `Settings` view.
- Input fields for IP, Port, Password, and "Pre-roll/Post-roll" seconds.

## 🚀 Advanced Workflow Enhancements

Beyond simple clipping, KorfStat Pro can orchestrate a professional broadcast through these integrations:

### 1. Scene Automation (The "Goal Sequence")
- **Workflow**: When a goal is scored, KorfStat triggers a sequence:
    1. Switch Broadcaster scene to a "Goal Animation" or "Celebration" camera.
    2. Wait 3-5 seconds.
    3. Trigger the Replay Capture.
    4. Automatically play the last replay captured to the Program Output.
    5. Switch back to the main "Game Camera" scene after the replay ends.

### 2. Audio Triggers
- **vMix/OBS Feature**: Play specific audio files (Goal Horn, Crowd Cheer) on match events.
- **KorfStat Role**: Send `Play` command to specific audio inputs in the broadcaster.

### 3. Smart "Substitution" Graphics
- **Workflow**: When a sub is recorded in KorfStat:
    1. Show a "Split Screen" or "Sub" graphic input in the broadcaster.
    2. Push the player names/photos via API to the broadcaster's title inputs.
    3. Dismiss the graphic after 10 seconds automatically.

### 4. Tally & Multiview Integration
- **Concept**: If the broadcaster supports it (vMix/NDI), KorfStat can show which camera is currently "Live" (Program) on the Spotter's UI. 
- **Benefit**: Helps spotters know which player is currently on screen for more accurate event logging.
