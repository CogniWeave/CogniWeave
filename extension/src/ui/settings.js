/**
 * Settings management for AutoPattern dashboard.
 * Handles loading and saving settings from/to the backend API.
 */

const API_BASE = 'http://localhost:5001';

// Cached settings
let currentSettings = null;
let availableModels = [];

/**
 * Initialize settings module.
 */
async function initSettings() {
    // Setup navigation
    setupNavigation();
    
    // Check backend status
    await checkBackendStatus();
    
    // Load settings from backend
    await loadSettings();
    
    // Setup save button
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
}

/**
 * Setup sidebar navigation.
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show/hide views
            document.querySelectorAll('.view-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            
            const targetView = document.getElementById(`view-${viewName}`);
            if (targetView) {
                targetView.style.display = 'flex';
            }
            
            // Load settings when switching to settings view
            if (viewName === 'settings') {
                loadSettings();
            }
        });
    });
}

/**
 * Check if backend is running.
 */
async function checkBackendStatus() {
    const statusEl = document.getElementById('backend-status');
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('span:last-child');
    
    try {
        const response = await fetch(`${API_BASE}/api/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            dot.classList.add('connected');
            dot.classList.remove('disconnected');
            text.textContent = 'Backend: Connected';
        } else {
            throw new Error('Backend not healthy');
        }
    } catch (err) {
        dot.classList.add('disconnected');
        dot.classList.remove('connected');
        text.textContent = 'Backend: Offline';
    }
}

/**
 * Load settings from backend.
 */
async function loadSettings() {
    const statusEl = document.getElementById('settings-status');
    
    try {
        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.status}`);
        }
        
        const data = await response.json();
        currentSettings = data.settings;
        availableModels = data.available_models || [];
        
        // Populate dropdowns with available models
        populateModelDropdowns();
        
        // Apply settings to UI
        applySettingsToUI();
        
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('error');
        }
        
    } catch (err) {
        console.error('Failed to load settings:', err);
        if (statusEl) {
            statusEl.textContent = 'Could not load settings from backend';
            statusEl.classList.add('error');
        }
    }
}

/**
 * Populate model dropdowns with available models.
 */
function populateModelDropdowns() {
    const analysisSelect = document.getElementById('setting-analysis-model');
    const llmSelect = document.getElementById('setting-llm-model');
    
    if (analysisSelect && availableModels.length > 0) {
        analysisSelect.innerHTML = availableModels.map(model => 
            `<option value="${model}">${model}</option>`
        ).join('');
    }
    
    if (llmSelect && availableModels.length > 0) {
        llmSelect.innerHTML = availableModels.map(model => 
            `<option value="${model}">${model}</option>`
        ).join('');
    }
}

/**
 * Apply loaded settings to UI elements.
 */
function applySettingsToUI() {
    if (!currentSettings) return;
    
    // Model selections
    const analysisModelEl = document.getElementById('setting-analysis-model');
    const llmModelEl = document.getElementById('setting-llm-model');
    const headlessEl = document.getElementById('setting-headless');
    const humanLoopEl = document.getElementById('setting-human-loop');
    
    if (analysisModelEl) {
        analysisModelEl.value = currentSettings.analysis_model || 'gemini-pro-latest';
    }
    
    if (llmModelEl) {
        llmModelEl.value = currentSettings.llm_model || 'gemini-flash-latest';
    }
    
    if (headlessEl) {
        headlessEl.checked = currentSettings.headless || false;
    }
    
    if (humanLoopEl) {
        humanLoopEl.checked = currentSettings.enable_human_in_loop || false;
    }
}

/**
 * Gather settings from UI.
 */
function gatherSettingsFromUI() {
    return {
        analysis_model: document.getElementById('setting-analysis-model')?.value || 'gemini-pro-latest',
        llm_model: document.getElementById('setting-llm-model')?.value || 'gemini-flash-latest',
        headless: document.getElementById('setting-headless')?.checked || false,
        enable_human_in_loop: document.getElementById('setting-human-loop')?.checked || false,
    };
}

/**
 * Save settings to backend.
 */
async function saveSettings() {
    const statusEl = document.getElementById('settings-status');
    const saveBtn = document.getElementById('save-settings-btn');
    
    const settings = gatherSettingsFromUI();
    
    // Disable button during save
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save settings: ${response.status}`);
        }
        
        const data = await response.json();
        currentSettings = data.settings;
        
        if (statusEl) {
            statusEl.textContent = 'Settings saved successfully';
            statusEl.classList.remove('error');
            
            // Clear message after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        }
        
    } catch (err) {
        console.error('Failed to save settings:', err);
        if (statusEl) {
            statusEl.textContent = 'Failed to save settings';
            statusEl.classList.add('error');
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Save Settings';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

// Periodically check backend status
setInterval(checkBackendStatus, 30000);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSettings);
