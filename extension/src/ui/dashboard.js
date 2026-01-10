// dashboard.js - Dashboard Logic
let workflows = [];
let filteredWorkflows = [];

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    loadWorkflows();
    setupSearch();
});

chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'refresh_dashboard') {
        loadWorkflows();
    }
});

// ---------- Search ----------
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                filteredWorkflows = workflows.filter(wf =>
                    wf.name.toLowerCase().includes(query)
                );
            } else {
                filteredWorkflows = [...workflows];
            }
            renderWorkflows();
        });
    }
}

// ---------- Load ----------
function loadWorkflows() {
    chrome.runtime.sendMessage({ action: 'GET_WORKFLOWS' }, res => {
        if (res?.status === 'ok') {
            workflows = res.workflows || [];
            filteredWorkflows = [...workflows];
            renderWorkflows();
            updateStats();
        }
    });
}

// ---------- Stats ----------
function updateStats() {
    const totalWorkflows = workflows.length;
    const totalEvents = workflows.reduce((sum, wf) => sum + (wf.events?.length || 0), 0);

    document.getElementById('stat-workflows').textContent = totalWorkflows;
    document.getElementById('stat-events').textContent = totalEvents;
    document.getElementById('stat-automations').textContent = '0'; // Placeholder
}

// ---------- Render ----------
function renderWorkflows() {
    const list = document.getElementById('workflows-list');
    list.innerHTML = '';

    if (!filteredWorkflows.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>No workflows found</p>
            </div>
        `;
        return;
    }

    filteredWorkflows.forEach((w, idx) => {
        const eventCount = w.events?.length || 0;
        const date = new Date(w.createdAt).toLocaleDateString();
        const time = new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = 'workflow-card';
        card.innerHTML = `
            <div class="workflow-header">
                <div class="workflow-name">${escapeHtml(w.name)}</div>
                <div class="event-badge">${eventCount} events</div>
            </div>
            <div class="workflow-meta">${date} at ${time}</div>
            <div class="workflow-actions">
                <button class="btn btn-view" data-action="view">View</button>
                <button class="btn btn-automate" data-action="automate">Automate</button>
                <button class="btn btn-delete" data-action="delete">🗑</button>
            </div>
        `;

        // Event delegation for buttons
        card.querySelector('[data-action="view"]').onclick = () => viewWorkflow(w);
        card.querySelector('[data-action="automate"]').onclick = () => automateWorkflow(w);
        card.querySelector('[data-action="delete"]').onclick = () => deleteWorkflow(w);

        list.appendChild(card);
    });
}

// ---------- View Workflow ----------
function viewWorkflow(wf) {
    const events = wf.events || [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    content.innerHTML = `
        <h3>${escapeHtml(wf.name)}</h3>
        <p style="color: #6b7280; margin-bottom: 16px;">${events.length} events recorded</p>
        <pre>${JSON.stringify(events, null, 2)}</pre>
        <button>Close</button>
    `;

    content.querySelector('button').onclick = () => overlay.remove();
    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    document.body.appendChild(overlay);
}

// ---------- Automate Workflow ----------
async function automateWorkflow(wf) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content optimization-loading';
    content.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Starting automation...</p>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    try {
        const response = await fetch('http://localhost:5001/automate-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workflowId: wf.id,
                workflowName: wf.name,
                events: wf.events
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        overlay.remove();
        displayAutomationResult(wf.name, result);

    } catch (error) {
        overlay.remove();
        showError('Automation Failed', error.message, 'Make sure the backend server is running');
    }
}

function displayAutomationResult(workflowName, result) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const statusIcon = result.success ? '✅' : '❌';
    const statusText = result.success ? 'Automation Completed' : 'Automation Failed';

    content.innerHTML = `
        <h3>${statusIcon} ${statusText}</h3>
        <div class="optimization-section">
            <h4>Generated Task Description</h4>
            <p>${escapeHtml(result.task_description || 'No description generated')}</p>
        </div>
        ${result.error ? `
            <div class="optimization-section" style="border-color: #ef4444;">
                <h4 style="color: #f87171;">Error Details</h4>
                <p>${escapeHtml(result.error)}</p>
            </div>
        ` : ''}
        <button>Close</button>
    `;

    content.querySelector('button').onclick = () => overlay.remove();
    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    document.body.appendChild(overlay);
}

// ---------- Delete Workflow ----------
function deleteWorkflow(wf) {
    if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;

    chrome.runtime.sendMessage(
        { action: 'DELETE_WORKFLOW', id: wf.id },
        (res) => {
            if (res?.status === 'ok') {
                loadWorkflows();
            } else {
                showError('Delete Failed', 'Could not delete workflow');
            }
        }
    );
}

// ---------- Error Modal ----------
function showError(title, message, hint = '') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.innerHTML = `
        <h3>⚠️ ${title}</h3>
        <p style="color: #f87171; margin-bottom: 12px;">${escapeHtml(message)}</p>
        ${hint ? `<p style="color: #6b7280; font-size: 13px;">${escapeHtml(hint)}</p>` : ''}
        <button style="background: #ef4444;">Close</button>
    `;

    content.querySelector('button').onclick = () => overlay.remove();
    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    document.body.appendChild(overlay);
}

// ---------- Utils ----------
function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}