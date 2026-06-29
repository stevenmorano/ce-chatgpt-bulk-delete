# Architecture Document

## Overview

The ChatGPT Bulk Delete & Search extension is a Chrome Extension built on Manifest V3. It interacts directly with ChatGPT's backend APIs (`https://chatgpt.com/backend-api/*`) using the user's active session, providing a stable and fast way to manage conversations compared to fragile DOM automation.

## Components

### 1. Content Script (`content.js`)
- **Role:** Minimal UI injection.
- **Function:** Runs in the context of `https://chatgpt.com/*`. It waits for the ChatGPT sidebar to render and injects a "Bulk Manage" button. When clicked, it sends a message to the Background Worker to open the dashboard.

### 2. Background Worker (`background.js`)
- **Role:** Orchestration and secure context bridge.
- **Function:** Listens for messages from the content script and opens the `dashboard.html` in a new Chrome tab.

### 3. Local Database (`db.js`)
- **Role:** Data persistence and caching.
- **Function:** A wrapper around browser-native **IndexedDB**. 
- **Stores:**
  - `conversations`: Stores metadata (ID, title, update_time, create_time, raw_data). This allows the dashboard to function extremely fast without relying on the network once synced.

### 4. Dashboard App (`dashboard.html`, `dashboard.css`, `dashboard.js`)
- **Role:** The core application interface.
- **Function:** 
  - **Fast Syncing:** Compares local IndexedDB state with the latest conversation list from the ChatGPT API. It relies on a "Fast Sync" approach that only grabs metadata and hidden properties (like `gizmo_id` and `pinned_time`) to determine if a chat is in a Project, Custom GPT, or Main Workspace.
  - **Auto-Cleanup:** If a full sync is run, the dashboard automatically cross-references IDs and purges any local database entries that no longer exist on ChatGPT's servers (e.g. chats deleted natively).
  - **Deleting:** Manages a sequential queue of API `PATCH` requests to soft-delete conversations (`is_visible: false`), enforcing a strict delay between requests to avoid HTTP 429 Rate Limiting errors. Gracefully handles 404/Stale errors by purging local ghost data.

## Data Flow: Synchronization
1. Dashboard requests `/backend-api/conversations?limit=100&offset=0`.
2. Dashboard tracks all IDs returned by the API during the sync.
3. Dashboard identifies IDs not present in IndexedDB or with newer `update_time` stamps.
4. Dashboard saves the raw JSON metadata to IndexedDB.
5. If it's a full sync (reaching the end of history), the dashboard cross-references the tracked IDs with the local DB and deletes any orphaned records.

## Data Flow: Bulk Deletion
1. User selects IDs and clicks Delete.
2. Dashboard initiates a loop over selected IDs.
3. For each ID, sends `PATCH /backend-api/conversation/<id>` with payload `{"is_visible": false}`.
4. Dashboard awaits response, updates UI progress bar, waits briefly, and proceeds to next ID.
5. If a chat is stale and throws an error, the script warns the user but forcefully removes it from the local DB anyway to clear ghost chats.
