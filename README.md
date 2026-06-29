# ChatGPT Bulk Delete & Search Extension

A Chrome Extension (Manifest V3) that adds a premium, fast, and local-first dashboard to your ChatGPT interface for managing your conversation history. 

With this extension, you can easily filter, locate, and bulk-delete thousands of chats efficiently without triggering rate limits.

## Features

- **Blazing Fast Sync:** Downloads metadata for thousands of chats in seconds, safely identifying whether chats belong to Projects, Folders, or Custom GPTs.
- **Bulk Deletion:** Safely delete dozens of old chats sequentially with a visual progress bar.
- **Advanced Filtering & Sorting:** Instantly filter out "Projects" and "Folders" so you only delete one-off chats. Sort by Created At, Last Updated, Title, or Location.
- **Local First:** All your chat metadata is synced and cached locally in your browser's IndexedDB. Your private data never leaves your browser.
- **Sync Limits & DB Management:** Define exactly how deep into your history you want to sync, and instantly wipe the local database clean whenever needed.
- **Native Integration:** Injects a "Bulk Manage" button directly into the ChatGPT interface. The button is **fully draggable**—you can move it anywhere on your screen and it will remember its position!

## Installation

Since this extension is in development, you can load it manually in Chrome:

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click the **Load unpacked** button.
4. Select the directory containing this extension (`ce-chatgpt-bulk-delete`).
5. The extension is now installed!

## Usage

1. Go to [ChatGPT](https://chatgpt.com) and log in.
2. Look for the **Bulk Manage** button injected into the sidebar.
3. Click it to open the Dashboard in a new tab.
4. Click **Sync Now** to download your chat history. Leave "Max chats" blank to fetch your entire history.
5. Search, select, and delete! 

## Development

The extension is built using vanilla web technologies (HTML, CSS, JavaScript) to keep the footprint lightweight and fast.

- `manifest.json`: Configuration and permissions.
- `content.js`: UI injection into ChatGPT.
- `background.js`: Service worker for messaging.
- `db.js`: IndexedDB local storage wrapper.
- `dashboard.html/css/js`: The main application interface.
