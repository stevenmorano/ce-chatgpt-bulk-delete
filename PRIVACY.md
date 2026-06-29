# Privacy Policy

**Steve's Tools: ChatGPT Bulk Delete**

This Privacy Policy describes how your data is handled when you use the "Steve's Tools: ChatGPT Bulk Delete" Chrome Extension.

## 1. Local Data Storage Only
This extension is designed to operate entirely locally on your device. We **do not** collect, transmit, store, or sell any of your personal data, chat history, or metadata on any external servers. 

All synchronization of your ChatGPT conversation history is performed directly between your browser and OpenAI's official servers. The resulting metadata is saved strictly within your browser's local `IndexedDB` storage.

## 2. API Usage
The extension interacts with `https://chatgpt.com/backend-api/*` using your active, authenticated session to fetch conversation metadata and perform deletion requests on your behalf. We do not access your password or authentication tokens.

## 3. Data Deletion
When you click "Clear Data" in the extension's dashboard, all locally cached metadata is permanently deleted from your browser. 
When you delete a conversation using the extension, the extension sends a standard deletion request to OpenAI's servers.

## 4. Analytics and Tracking
We do not include any third-party analytics, trackers, or telemetry within this extension.

## 5. Contact
If you have any questions or concerns about this privacy policy, please open an issue on the official GitHub repository.
