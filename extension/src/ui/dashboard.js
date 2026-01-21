// dashboard.js - Dashboard Logic
const API_BASE_URL = 'http://localhost:5001';

let workflows = [];
let filteredWorkflows = [];

// Helper function to refresh Lucide icons after dynamic content
function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    refreshIcons();
    
    initMermaid();
    loadWorkflows();
    setupSearch();
});

// Initialize Mermaid with dark theme
function initMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#667eea',
                primaryTextColor: '#e8e8e8',
                primaryBorderColor: '#764ba2',
                lineColor: '#9ca3af',
                secondaryColor: '#1a1a2e',
                tertiaryColor: '#16213e',
                background: '#0f0f1a',
                mainBkg: '#1a1a2e',
                nodeBorder: '#667eea',
                clusterBkg: 'rgba(102, 126, 234, 0.1)',
                titleColor: '#a5b4fc',
                edgeLabelBackground: '#1a1a2e'
            },
            flowchart: {
                curve: 'basis',
                padding: 20,
                nodeSpacing: 50,
                rankSpacing: 50,
                htmlLabels: true
            }
        });
        console.log('Mermaid initialized');
    } else {
        console.warn('Mermaid library not loaded');
    }
}

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
                <div class="empty-icon"><i data-lucide="inbox" style="width:48px;height:48px;"></i></div>
                <p>No workflows found</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    // Create table structure
    const table = document.createElement('table');
    table.className = 'workflows-table';
    
    // Table header
    table.innerHTML = `
        <thead>
            <tr>
                <th>Workflow</th>
                <th>Events</th>
                <th>Created</th>
                <th style="text-align: right;">Actions</th>
            </tr>
        </thead>
        <tbody id="workflows-tbody"></tbody>
    `;
    
    list.appendChild(table);
    const tbody = table.querySelector('#workflows-tbody');

    filteredWorkflows.forEach((w, idx) => {
        const eventCount = w.events?.length || 0;
        const date = new Date(w.createdAt).toLocaleDateString();
        const time = new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Description status badge
        let statusBadge = '';
        if (w.descriptionStatus === 'pending') {
            statusBadge = '<span class="description-status pending">⏳ Analyzing</span>';
        } else if (w.descriptionStatus === 'success') {
            statusBadge = '<span class="description-status success"><i data-lucide="check" style="width:12px;height:12px;"></i> AI Ready</span>';
        } else if (w.descriptionStatus === 'failed') {
            statusBadge = '<span class="description-status failed"><i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> Failed</span>';
        } else {
            statusBadge = '<span class="description-status" style="color: #6b7280;">—</span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="table-workflow-name">${escapeHtml(w.aiTitle || w.name)}</div>
                ${w.description ? `<div class="table-workflow-desc">${escapeHtml(w.description)}</div>` : ''}
            </td>
            <td><span class="event-badge">${eventCount}</span></td>
            <td style="color: #9ca3af; font-size: 13px;">${date}<br>${time}</td>
            <td>
                <div class="table-actions">
                    <button class="table-btn table-btn-view" data-action="view" title="View workflow"><i data-lucide="eye"></i></button>
                    ${w.steps && w.steps.length > 0 ? 
                        `<button class="table-btn table-btn-edit" data-action="edit" title="Edit workflow"><i data-lucide="pencil"></i></button>` : ''}
                    <button class="table-btn table-btn-run" data-action="run" title="Run automation"><i data-lucide="play"></i> Run</button>
                    <button class="table-btn table-btn-delete" data-action="delete" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;

        // Event delegation for buttons
        row.querySelector('[data-action="view"]').onclick = () => viewWorkflow(w);
        if (row.querySelector('[data-action="edit"]')) {
            row.querySelector('[data-action="edit"]').onclick = () => openWorkflowEditor(w);
        }
        row.querySelector('[data-action="run"]').onclick = () => {
            if (w.steps && w.steps.length > 0) {
                runWorkflowDirectly(w);
            } else {
                automateWorkflow(w);
            }
        };
        row.querySelector('[data-action="delete"]').onclick = () => deleteWorkflow(w);

        tbody.appendChild(row);
    });
    
    // Refresh Lucide icons after dynamic content
    refreshIcons();
}

// ---------- View Workflow ----------
async function viewWorkflow(wf) {
    const events = wf.events || [];
    const steps = wf.steps || [];
    const hasFlowchart = steps.length > 0;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content view-modal';

    content.innerHTML = `
        <h3>${escapeHtml(wf.name)}</h3>
        <p style="color: #6b7280; margin-bottom: 16px;">
            ${events.length} events recorded
            ${wf.description ? ` • ${escapeHtml(wf.description)}` : ''}
        </p>
        
        <div class="view-toggle">
            <button class="toggle-btn ${hasFlowchart ? 'active' : ''}" data-view="flowchart" ${!hasFlowchart ? 'disabled' : ''}>
                <i data-lucide="git-branch"></i> Flowchart
            </button>
            <button class="toggle-btn ${!hasFlowchart ? 'active' : ''}" data-view="raw">
                <i data-lucide="file-text"></i> Raw Events
            </button>
        </div>
        
        <div class="view-content">
            ${hasFlowchart ? 
                `<div class="view-flowchart" id="view-flowchart-container">
                    <div id="view-mermaid-chart"></div>
                </div>` : 
                `<div class="view-raw">
                    <pre>${JSON.stringify(events, null, 2)}</pre>
                </div>`
            }
        </div>
        
        <div class="modal-actions">
            <button class="btn-secondary" id="view-close-btn">Close</button>
        </div>
    `;

    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    
    // Refresh Lucide icons for dynamic content
    refreshIcons();

    // Setup toggle buttons
    const toggleBtns = content.querySelectorAll('.toggle-btn');
    const viewContent = content.querySelector('.view-content');
    
    toggleBtns.forEach(btn => {
        btn.onclick = async () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const viewType = btn.dataset.view;
            if (viewType === 'flowchart' && hasFlowchart) {
                viewContent.innerHTML = `
                    <div class="view-flowchart" id="view-flowchart-container">
                        <div id="view-mermaid-chart"></div>
                    </div>
                `;
                await renderViewFlowchart(steps);
            } else {
                viewContent.innerHTML = `
                    <div class="view-raw">
                        <pre>${JSON.stringify(events, null, 2)}</pre>
                    </div>
                `;
            }
        };
    });

    content.querySelector('#view-close-btn').onclick = () => overlay.remove();

    // Render initial flowchart if available
    if (hasFlowchart) {
        await renderViewFlowchart(steps);
    }
}

// Render flowchart for view modal
async function renderViewFlowchart(steps) {
    const container = document.getElementById('view-mermaid-chart');
    if (!container || typeof mermaid === 'undefined') {
        if (container) {
            container.innerHTML = '<p style="color: #f87171;">Flowchart unavailable</p>';
        }
        return;
    }

    // Build Mermaid flowchart syntax
    let mermaidCode = 'flowchart TD\n';
    mermaidCode += '    START([🚀 Start])\n';

    if (steps.length === 0) {
        mermaidCode += '    START --> END([✅ End])\n';
    } else {
        steps.forEach((step, index) => {
            const nodeId = `step${index + 1}`;
            const label = (step.label || `Step ${index + 1}`).replace(/"/g, "'").replace(/[[\]()]/g, '');
            mermaidCode += `    ${nodeId}["${index + 1}. ${label}"]\n`;
        });

        // Connect nodes
        mermaidCode += `    START --> step1\n`;
        for (let i = 0; i < steps.length - 1; i++) {
            mermaidCode += `    step${i + 1} --> step${i + 2}\n`;
        }
        mermaidCode += `    step${steps.length} --> END([✅ End])\n`;
    }

    try {
        container.innerHTML = '';
        const id = 'view-mermaid-' + Date.now();
        const { svg } = await mermaid.render(id, mermaidCode);
        container.innerHTML = svg;
    } catch (error) {
        console.error('Mermaid render error:', error);
        container.innerHTML = `<p style="color: #f87171; text-align: center;">Failed to render flowchart</p>`;
    }
}

// ---------- Run Workflow Directly ----------
async function runWorkflowDirectly(wf) {
    // Build task description from steps
    let taskDescription = wf.description || 'Execute the following workflow';
    taskDescription += '\n\nSteps to perform:\n';
    (wf.steps || []).forEach((step, index) => {
        taskDescription += `${index + 1}. ${step.label}\n`;
    });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content optimization-loading';
    content.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Running automation...</p>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    refreshIcons();

    try {
        const response = await fetch(`${API_BASE_URL}/api/automate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workflow_id: wf.id?.toString() || '1',
                events: [],
                task_description: taskDescription,
                headless: false
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
    refreshIcons();

    try {
        const response = await fetch(`${API_BASE_URL}/api/automate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workflow_id: wf.id?.toString() || '1',
                events: wf.events || [],
                task_description: wf.description || null,
                headless: false
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

    const statusIcon = result.success ? '<i data-lucide="check-circle" style="width:20px;height:20px;color:#10b981;"></i>' : '<i data-lucide="x-circle" style="width:20px;height:20px;color:#ef4444;"></i>';
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
    refreshIcons();
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
        <h3><i data-lucide="alert-triangle" style="width:20px;height:20px;color:#f59e0b;display:inline-block;vertical-align:middle;margin-right:8px;"></i>${title}</h3>
        <p style="color: #f87171; margin-bottom: 12px;">${escapeHtml(message)}</p>
        ${hint ? `<p style="color: #6b7280; font-size: 13px;">${escapeHtml(hint)}</p>` : ''}
        <button style="background: #ef4444;">Close</button>
    `;

    content.querySelector('button').onclick = () => overlay.remove();
    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    document.body.appendChild(overlay);
    refreshIcons();
}

// ---------- Workflow Editor Modal ----------
let currentEditorWorkflow = null;
let currentEditorSteps = [];
let currentEditorDescription = '';
let currentEditorTitle = '';

// Re-analyze workflow with AI
async function reanalyzeWorkflow(wf) {
    const reanalyzeBtn = document.getElementById('reanalyze-btn');
    if (!reanalyzeBtn) return;
    
    // Show loading state
    reanalyzeBtn.disabled = true;
    reanalyzeBtn.innerHTML = '⏳ Analyzing...';
    
    try {
        // Determine start URL from first navigation event or first event's URL
        let startUrl = '';
        const events = wf.events || [];
        if (events.length > 0) {
            const firstNav = events.find(e => e.event_type === 'navigation' || e.event === 'navigation');
            startUrl = firstNav?.url || events[0]?.url || '';
        }
        
        // Call /api/describe to get new analysis
        const response = await fetch(`${API_BASE_URL}/api/describe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                events: events,
                start_url: startUrl
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update current editor state
        currentEditorTitle = result.title || '';
        currentEditorDescription = result.description;
        currentEditorSteps = result.steps || [];
        
        // Update the UI
        document.getElementById('editor-title').value = currentEditorTitle;
        document.getElementById('editor-description').value = currentEditorDescription;
        renderEditorSteps();
        renderFlowchart();
        
        // Update in IndexedDB
        chrome.runtime.sendMessage({
            action: 'UPDATE_WORKFLOW',
            id: wf.id,
            updates: {
                aiTitle: result.title,
                description: result.description,
                steps: result.steps,
                descriptionStatus: 'success'
            }
        }, () => {
            loadWorkflows();
        });
        
        reanalyzeBtn.innerHTML = '<i data-lucide="check"></i> Re-analyzed!';
        setTimeout(() => {
            reanalyzeBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Re-analyze with AI';
            reanalyzeBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Re-analysis failed:', error);
        reanalyzeBtn.innerHTML = '<i data-lucide="x"></i> Failed';
        showError('Re-analysis Failed', error.message, 'Make sure the backend server is running');
        setTimeout(() => {
            reanalyzeBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Re-analyze with AI';
            reanalyzeBtn.disabled = false;
        }, 2000);
    }
}

function openWorkflowEditor(wf) {
    currentEditorWorkflow = wf;
    currentEditorSteps = JSON.parse(JSON.stringify(wf.steps || []));
    currentEditorDescription = wf.description || '';
    currentEditorTitle = wf.aiTitle || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'workflow-editor-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content workflow-editor-modal';

    content.innerHTML = `
        <div class="workflow-editor-header">
            <h3><i data-lucide="file-edit" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:8px;"></i>Edit Workflow: ${escapeHtml(wf.name)}</h3>
            <button class="btn-secondary" id="reanalyze-btn" style="padding: 8px 16px; font-size: 13px;">
                <i data-lucide="refresh-cw"></i> Re-analyze with AI
            </button>
        </div>
        
        <div class="editor-layout">
            <div class="editor-panel">
                <div class="panel-title">AI Generated Title</div>
                <input type="text" class="description-input" id="editor-title" placeholder="Short workflow title..." value="${escapeHtml(currentEditorTitle)}" style="min-height: auto; height: 42px; resize: none;">
                
                <div class="panel-title" style="margin-top: 16px;">Task Description</div>
                <textarea class="description-input" id="editor-description" placeholder="Describe the overall goal...">${escapeHtml(currentEditorDescription)}</textarea>
                
                <div class="panel-title">Steps</div>
                <div class="steps-list" id="editor-steps-list"></div>
                <button class="add-step-btn" id="add-step-btn">+ Add Step</button>
            </div>
            
            <div class="editor-panel">
                <div class="panel-title">Flowchart Preview</div>
                <div class="flowchart-container" id="flowchart-container">
                    <div class="mermaid" id="mermaid-chart"></div>
                </div>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn-secondary" id="editor-cancel">Cancel</button>
            <button class="btn-secondary" id="editor-save">Save Changes</button>
            <button class="btn-primary" id="editor-run"><i data-lucide="play"></i> Run Automation</button>
        </div>
    `;

    overlay.appendChild(content);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    
    // Refresh Lucide icons for dynamic content
    refreshIcons();

    // Setup event listeners
    document.getElementById('editor-cancel').onclick = () => overlay.remove();
    document.getElementById('reanalyze-btn').onclick = () => reanalyzeWorkflow(wf);
    document.getElementById('editor-save').onclick = () => saveWorkflowChanges(wf.id, overlay);
    document.getElementById('editor-run').onclick = () => runEditedWorkflow(overlay);
    document.getElementById('add-step-btn').onclick = addNewStep;
    document.getElementById('editor-title').oninput = (e) => {
        currentEditorTitle = e.target.value;
    };
    document.getElementById('editor-description').oninput = (e) => {
        currentEditorDescription = e.target.value;
    };

    // Render steps and flowchart
    renderEditorSteps();
    renderFlowchart();
}

function renderEditorSteps() {
    const container = document.getElementById('editor-steps-list');
    if (!container) return;

    container.innerHTML = '';

    currentEditorSteps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'step-item';
        stepEl.draggable = true;
        stepEl.dataset.index = index;

        stepEl.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <span class="step-number">${index + 1}</span>
            <input type="text" class="step-input" value="${escapeHtml(step.label)}" data-index="${index}">
            <div class="step-actions">
                <button class="step-btn" data-action="move-up" title="Move up">↑</button>
                <button class="step-btn" data-action="move-down" title="Move down">↓</button>
                <button class="step-btn delete" data-action="delete" title="Delete">×</button>
            </div>
        `;

        // Input change handler
        stepEl.querySelector('.step-input').oninput = (e) => {
            currentEditorSteps[index].label = e.target.value;
            renderFlowchart();
        };

        // Action buttons
        stepEl.querySelector('[data-action="move-up"]').onclick = () => moveStep(index, -1);
        stepEl.querySelector('[data-action="move-down"]').onclick = () => moveStep(index, 1);
        stepEl.querySelector('[data-action="delete"]').onclick = () => deleteStep(index);

        // Drag and drop
        stepEl.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', index);
            stepEl.classList.add('dragging');
        };
        stepEl.ondragend = () => stepEl.classList.remove('dragging');
        stepEl.ondragover = (e) => e.preventDefault();
        stepEl.ondrop = (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                const [moved] = currentEditorSteps.splice(fromIndex, 1);
                currentEditorSteps.splice(toIndex, 0, moved);
                renumberSteps();
                renderEditorSteps();
                renderFlowchart();
            }
        };

        container.appendChild(stepEl);
    });
}

function addNewStep() {
    const newId = currentEditorSteps.length + 1;
    currentEditorSteps.push({ id: newId, label: 'New step' });
    renderEditorSteps();
    renderFlowchart();
    
    // Focus the new input
    const inputs = document.querySelectorAll('.step-input');
    if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
        inputs[inputs.length - 1].select();
    }
}

function moveStep(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentEditorSteps.length) return;
    
    [currentEditorSteps[index], currentEditorSteps[newIndex]] = 
    [currentEditorSteps[newIndex], currentEditorSteps[index]];
    
    renumberSteps();
    renderEditorSteps();
    renderFlowchart();
}

function deleteStep(index) {
    currentEditorSteps.splice(index, 1);
    renumberSteps();
    renderEditorSteps();
    renderFlowchart();
}

function renumberSteps() {
    currentEditorSteps.forEach((step, i) => {
        step.id = i + 1;
    });
}

async function renderFlowchart() {
    const container = document.getElementById('mermaid-chart');
    if (!container) return;

    // Build Mermaid flowchart syntax
    let mermaidCode = 'flowchart TD\n';
    mermaidCode += '    START([🚀 Start])\n';

    if (currentEditorSteps.length === 0) {
        mermaidCode += '    START --> END([✅ End])\n';
    } else {
        currentEditorSteps.forEach((step, index) => {
            const nodeId = `step${index + 1}`;
            const label = step.label.replace(/"/g, "'").replace(/[[\]()]/g, '');
            mermaidCode += `    ${nodeId}["${index + 1}. ${label}"]\n`;
        });

        // Connect nodes
        mermaidCode += `    START --> step1\n`;
        for (let i = 0; i < currentEditorSteps.length - 1; i++) {
            mermaidCode += `    step${i + 1} --> step${i + 2}\n`;
        }
        mermaidCode += `    step${currentEditorSteps.length} --> END([✅ End])\n`;
    }

    try {
        // Clear previous chart
        container.innerHTML = '';
        
        // Generate unique ID for this render
        const id = 'mermaid-' + Date.now();
        
        // Render new chart
        const { svg } = await mermaid.render(id, mermaidCode);
        container.innerHTML = svg;
    } catch (error) {
        console.error('Mermaid render error:', error);
        container.innerHTML = `<p style="color: #f87171; text-align: center;">Failed to render flowchart</p>`;
    }
}

async function saveWorkflowChanges(workflowId, overlay) {
    // Save changes to IndexedDB
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'GET_WORKFLOWS' }, async (res) => {
            if (res?.status === 'ok') {
                const workflow = res.workflows.find(w => w.id === workflowId);
                if (workflow) {
                    workflow.aiTitle = currentEditorTitle;
                    workflow.description = currentEditorDescription;
                    workflow.steps = currentEditorSteps;
                    
                    // Update via background script
                    chrome.runtime.sendMessage({
                        action: 'UPDATE_WORKFLOW',
                        id: workflowId,
                        updates: {
                            aiTitle: currentEditorTitle,
                            description: currentEditorDescription,
                            steps: currentEditorSteps
                        }
                    }, () => {
                        loadWorkflows();
                        overlay.remove();
                        resolve();
                    });
                }
            }
        });
    });
}

async function runEditedWorkflow(overlay) {
    // Build task description from the edited steps
    let taskDescription = currentEditorDescription + '\n\nSteps to perform:\n';
    currentEditorSteps.forEach((step, index) => {
        taskDescription += `${index + 1}. ${step.label}\n`;
    });

    overlay.remove();

    // Show loading modal
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'modal-overlay';

    const loadingContent = document.createElement('div');
    loadingContent.className = 'modal-content optimization-loading';
    loadingContent.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Running automation with your edited plan...</p>
    `;

    loadingOverlay.appendChild(loadingContent);
    document.body.appendChild(loadingOverlay);

    try {
        const response = await fetch(`${API_BASE_URL}/api/automate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workflow_id: currentEditorWorkflow.id?.toString() || '1',
                events: [],
                task_description: taskDescription,
                headless: false
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        loadingOverlay.remove();
        displayAutomationResult(currentEditorWorkflow.name, result);

    } catch (error) {
        loadingOverlay.remove();
        showError('Automation Failed', error.message, 'Make sure the backend server is running');
    }
}

// ---------- Utils ----------
function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}