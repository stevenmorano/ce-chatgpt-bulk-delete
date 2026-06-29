// content.js
// Injected into https://chatgpt.com/*

function injectBulkManageButton() {
  // Check if button already exists
  if (document.getElementById('chatgpt-bulk-manage-btn')) return;

  // Create the button
  const btn = document.createElement('button');
  btn.id = 'chatgpt-bulk-manage-btn';
  btn.innerHTML = `
    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
    Bulk Manage
  `;
  
  // Style the button
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    zIndex: '9999',
    backgroundColor: '#10a37f', // ChatGPT green
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif'
  });

  // Hover effects
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = '#0e906f';
    btn.style.transform = 'translateY(-1px)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = '#10a37f';
    btn.style.transform = 'translateY(0)';
  });

  // Click event: Tell background script to open dashboard
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'open_dashboard' });
  });

  document.body.appendChild(btn);
}

// Use a MutationObserver to ensure the button stays injected even if React re-renders the DOM
const observer = new MutationObserver(() => {
  if (!document.getElementById('chatgpt-bulk-manage-btn')) {
    injectBulkManageButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial injection attempt
injectBulkManageButton();
