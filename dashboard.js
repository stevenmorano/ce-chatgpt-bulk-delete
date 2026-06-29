// dashboard.js

let accessToken = null;
let allChats = [];
let selectedIds = new Set();
let currentSort = { column: 'update_time', direction: 'desc' };
let isSyncing = false;

// DOM Elements
const syncBtn = document.getElementById('sync-btn');
const syncStatus = document.getElementById('sync-status');
const searchInput = document.getElementById('search-input');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const chatListBody = document.getElementById('chat-list-body');
const thSortable = document.querySelectorAll('th.sortable');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const hideProjectsToggle = document.getElementById('hide-projects-toggle');
const syncLimitInput = document.getElementById('sync-limit-input');
const clearDbBtn = document.getElementById('clear-db-btn');

// Banner Elements
const actionBanner = document.getElementById('action-banner');
const selectedCountText = document.getElementById('selected-count-text');
const deselectBtn = document.getElementById('deselect-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

// Modal Elements
const progressModal = document.getElementById('progress-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const progressBarFill = document.getElementById('progress-bar-fill');
const modalStatus = document.getElementById('modal-status');
const modalActions = document.getElementById('modal-actions');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// Initialize
async function init() {
  await chatDB.init();
  setupEventListeners();
  
  // Try to get token right away
  await fetchAccessToken();
  
  // Load local data and render
  await loadAndRender();
}

// Setup listeners
function setupEventListeners() {
  syncBtn.addEventListener('click', syncConversations);
  searchInput.addEventListener('input', loadAndRender);
  dateFrom.addEventListener('change', loadAndRender);
  dateTo.addEventListener('change', loadAndRender);
  hideProjectsToggle.addEventListener('change', loadAndRender);
  
  thSortable.forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
      }
      
      // Update icons
      thSortable.forEach(header => {
        header.querySelector('.sort-icon').textContent = '';
      });
      th.querySelector('.sort-icon').textContent = currentSort.direction === 'asc' ? '▲' : '▼';
      
      loadAndRender();
    });
  });
  
  clearDbBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to clear the local database?\n\nThis will instantly empty your dashboard, but it will NOT delete any chats on ChatGPT. They will return the next time you sync.")) {
      await chatDB.clearAll();
      await loadAndRender();
      syncStatus.textContent = "Data cleared.";
    }
  });

  selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = e.target.checked;
      if (e.target.checked) selectedIds.add(cb.value);
      else selectedIds.delete(cb.value);
    });
    updateActionBanner();
  });
  
  deselectBtn.addEventListener('click', () => {
    selectedIds.clear();
    selectAllCheckbox.checked = false;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
    updateActionBanner();
  });
  
  deleteSelectedBtn.addEventListener('click', confirmAndDelete);
  
  modalCancelBtn.addEventListener('click', () => {
    progressModal.classList.add('hidden');
    loadAndRender(); // Refresh UI after delete
  });
}

// Fetch ChatGPT session token
async function fetchAccessToken() {
  try {
    const res = await fetch('https://chatgpt.com/api/auth/session');
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    accessToken = data.accessToken;
    if (!accessToken) throw new Error("No token found");
  } catch (error) {
    console.error(error);
    syncStatus.textContent = "Error: Please log in to ChatGPT first.";
    syncStatus.style.color = "var(--danger-primary)";
  }
}

// Sync conversations from ChatGPT
async function syncConversations() {
  if (isSyncing || !accessToken) return;
  isSyncing = true;
  syncBtn.disabled = true;
  syncStatus.textContent = "Syncing... Please wait.";
  syncStatus.style.color = "var(--accent-primary)";
  
  try {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let newOrUpdatedCount = 0;
    
    const seenIds = new Set();
    
    while (hasMore) {
      // 1. Fetch list of conversations
      const listRes = await fetch(`https://chatgpt.com/backend-api/conversations?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!listRes.ok) throw new Error("Failed to fetch list");
      const listData = await listRes.json();
      const items = listData.items || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }
      
      // 2. Compare with local DB and save metadata directly
      for (const item of items) {
        seenIds.add(item.id);
        const localItem = await chatDB.getConversation(item.id);
        
        // If we don't have it, it's missing raw_data, or it was updated recently, save it
        if (!localItem || !localItem.raw_data || new Date(item.update_time).getTime() > new Date(localItem.update_time).getTime()) {
          await chatDB.saveConversation({
            id: item.id,
            title: item.title,
            create_time: item.create_time,
            update_time: item.update_time,
            full_text: item.title.toLowerCase(),
            raw_data: item
          });
          newOrUpdatedCount++;
        }
      }
      
      syncStatus.textContent = `Fetching page ${Math.floor(offset / limit) + 1}...`;
      
      offset += limit;
      
      // Stop if API returns fewer items than limit, or if user-defined max limit is reached
      const maxSync = parseInt(syncLimitInput.value);
      if (items.length < limit || (!isNaN(maxSync) && maxSync > 0 && offset >= maxSync)) {
        hasMore = false;
        
        // If we reached the true end of the history (not stopped by max limit), we can safely 
        // cross-reference and delete any local chats that no longer exist on ChatGPT's servers.
        if (items.length < limit) {
          syncStatus.textContent = "Cleaning up deleted chats...";
          const allLocal = await chatDB.getAllConversations();
          for (const local of allLocal) {
            if (!seenIds.has(local.id)) {
              await chatDB.deleteConversation(local.id);
            }
          }
        }
      }
    }
    
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    syncStatus.textContent = `Last synced: ${timeNow}`;
    syncStatus.style.color = "var(--text-secondary)";
    
    await loadAndRender();
    
  } catch (error) {
    console.error(error);
    syncStatus.textContent = "Sync failed. Try reloading.";
    syncStatus.style.color = "var(--danger-primary)";
  } finally {
    isSyncing = false;
    syncBtn.disabled = false;
  }
}

function getLocation(chat) {
  if (!chat.raw_data) return "Unknown";
  let loc = [];
  
  // Custom GPTs and Projects
  if (chat.raw_data.gizmo_id) {
    if (chat.raw_data.gizmo_id.startsWith('g-p-')) loc.push("Project");
    else loc.push("Custom GPT");
  }
  
  if (chat.raw_data.pinned_time !== null) loc.push("Pinned");
  
  return loc.length > 0 ? loc.join(", ") : "Main Chats";
}

// Load from DB and render
async function loadAndRender() {
  allChats = await chatDB.getAllConversations();
  
  let filtered = allChats;

  // Apply Hide Projects Filter
  if (hideProjectsToggle && hideProjectsToggle.checked) {
    filtered = filtered.filter(c => {
      const loc = getLocation(c);
      return loc === "Main Chats" || loc === "Unknown";
    });
  }

  // Apply Search
  const query = searchInput.value.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(c => c.full_text && c.full_text.includes(query));
  }
  
  // Apply Date Filters
  const dFrom = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
  const dTo = dateTo.value ? new Date(dateTo.value).getTime() : null;
  
  if (dFrom || dTo) {
    filtered = filtered.filter(c => {
      const cTime = new Date(c.create_time).getTime();
      if (dFrom && cTime < dFrom) return false;
      if (dTo && cTime > dTo + 86400000) return false; // add 1 day
      return true;
    });
  }
  
  // Apply Sort
  filtered.sort((a, b) => {
    let valA, valB;
    if (currentSort.column === 'title') {
      valA = a.title.toLowerCase();
      valB = b.title.toLowerCase();
    } else if (currentSort.column === 'location') {
      valA = getLocation(a).toLowerCase();
      valB = getLocation(b).toLowerCase();
    } else if (currentSort.column === 'created') {
      valA = new Date(a.create_time).getTime();
      valB = new Date(b.create_time).getTime();
    } else if (currentSort.column === 'updated') {
      valA = new Date(a.update_time).getTime();
      valB = new Date(b.update_time).getTime();
    }
    
    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderTable(filtered);
}

function renderTable(chats) {
  chatListBody.innerHTML = '';
  
  chats.forEach(chat => {
    const isChecked = selectedIds.has(chat.id) ? 'checked' : '';
    
    const createdObj = new Date(chat.create_time);
    const createdStr = createdObj.toLocaleDateString() + ' ' + createdObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const updatedObj = new Date(chat.update_time);
    const updatedStr = updatedObj.toLocaleDateString() + ' ' + updatedObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const locStr = getLocation(chat);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" value="${chat.id}" ${isChecked} /></td>
      <td>
        <div class="chat-title">
          <a href="https://chatgpt.com/c/${chat.id}" target="_blank">${escapeHtml(chat.title)}</a>
        </div>
        <div class="chat-snippet">${escapeHtml(chat.full_text.substring(0, 150))}...</div>
      </td>
      <td>
        <span class="location-badge" style="font-size: 0.75rem; background: var(--bg-hover); padding: 4px 8px; border-radius: 4px; color: ${locStr === 'Main Chats' ? 'var(--text-secondary)' : 'var(--accent-primary)'};">${escapeHtml(locStr)}</span>
      </td>
      <td><span class="date-text">${createdStr}</span></td>
      <td><span class="date-text">${updatedStr}</span></td>
      <td>
        <button class="btn btn-ghost single-delete-btn" data-id="${chat.id}">Delete</button>
        <button class="btn btn-ghost debug-btn" style="font-size:10px; padding: 2px 4px; margin-top:4px;" data-id="${chat.id}">Copy Data</button>
      </td>
    `;
    chatListBody.appendChild(tr);
  });
  
  // Attach listeners to newly rendered rows
  document.querySelectorAll('.debug-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const chat = await chatDB.getConversation(id);
      navigator.clipboard.writeText(JSON.stringify(chat.raw_data, null, 2));
      e.target.textContent = "Copied!";
      setTimeout(() => e.target.textContent = "Copy Data", 2000);
    });
  });

  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) selectedIds.add(e.target.value);
      else selectedIds.delete(e.target.value);
      updateActionBanner();
    });
  });
  
  document.querySelectorAll('.single-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedIds.clear();
      selectedIds.add(e.target.getAttribute('data-id'));
      confirmAndDelete();
    });
  });
  
  updateActionBanner();
}

function updateActionBanner() {
  if (selectedIds.size > 0) {
    selectedCountText.textContent = `${selectedIds.size} conversations selected`;
    actionBanner.classList.remove('hidden');
    actionBanner.classList.add('visible');
  } else {
    actionBanner.classList.remove('visible');
    actionBanner.classList.add('hidden');
    selectAllCheckbox.checked = false;
  }
}

async function confirmAndDelete() {
  if (selectedIds.size === 0) return;
  const count = selectedIds.size;
  
  if (!confirm(`Are you sure you want to permanently delete ${count} conversations?\n\nThis cannot be undone.`)) {
    return;
  }
  
  // Show modal
  progressModal.classList.remove('hidden');
  modalActions.classList.add('hidden');
  modalTitle.textContent = "Deleting Conversations...";
  modalDesc.textContent = "Please do not close this tab. Waiting 500ms between deletes to avoid rate limits.";
  progressBarFill.style.width = "0%";
  modalStatus.textContent = `0 / ${count}`;
  
  const idsArray = Array.from(selectedIds);
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < idsArray.length; i++) {
    const id = idsArray[i];
    
    try {
      const res = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_visible: false }) // ChatGPT's way to delete
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      // Remove from DB
      await chatDB.deleteConversation(id);
      successCount++;
    } catch (e) {
      // Use warn instead of error to prevent Chrome Extension Manager error popups
      console.warn("Delete failed for", id, e.message);
      
      // Force remove from local DB to clear stale "ghost" chats.
      // If the chat still truly exists on ChatGPT's servers, it will safely return on the next sync.
      await chatDB.deleteConversation(id);
      
      failCount++;
    }
    
    // Update progress
    const progress = Math.round(((i + 1) / count) * 100);
    progressBarFill.style.width = `${progress}%`;
    modalStatus.textContent = `${i + 1} / ${count} (${successCount} successful, ${failCount} failed)`;
    
    // Wait 500ms before next delete
    if (i < idsArray.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Done
  selectedIds.clear();
  modalTitle.textContent = "Deletion Complete";
  modalDesc.textContent = "All selected conversations have been processed.";
  modalActions.classList.remove('hidden');
}

// Utilities
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Start
init();
