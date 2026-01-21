// popup.js - Workflow Recording Control

let isRecording = false;

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    const startBtn = document.getElementById('start-recording');
    const stopBtn = document.getElementById('stop-recording');
    const dashboardBtn = document.getElementById('open-dashboard');
    const workflowNameInput = document.getElementById('workflow-name');
    const statusText = document.getElementById('recording-status');
    const statusBadge = document.getElementById('status-badge');

    // Check current recording state
    chrome.runtime.sendMessage({ action: 'GET_RECORDING_STATE' }, (response) => {
        if (response && response.isRecording) {
            setRecordingUI(true);
        }
    });

    // Load recent workflows
    loadRecentWorkflows();

    startBtn.onclick = () => {
        const workflowName = workflowNameInput.value.trim() || `Workflow ${new Date().toLocaleString()}`;
        chrome.runtime.sendMessage({
            action: 'START_RECORDING',
            workflowName: workflowName
        }, (response) => {
            if (response && response.status === 'ok') {
                setRecordingUI(true);
                workflowNameInput.value = '';
            }
        });
    };

    stopBtn.onclick = () => {
        chrome.runtime.sendMessage({
            action: 'STOP_RECORDING'
        }, (response) => {
            if (response && response.status === 'ok') {
                setRecordingUI(false);
                loadRecentWorkflows();
            }
        });
    };

    dashboardBtn.onclick = () => {
        chrome.tabs.create({
            url: 'src/ui/dashboard.html'
        });
    };
});

function setRecordingUI(recording) {
    isRecording = recording;
    const startBtn = document.getElementById('start-recording');
    const stopBtn = document.getElementById('stop-recording');
    const workflowNameInput = document.getElementById('workflow-name');
    const statusText = document.getElementById('recording-status');
    const statusBadge = document.getElementById('status-badge');

    if (recording) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        workflowNameInput.disabled = true;
        statusText.textContent = 'Recording...';
        statusBadge.classList.add('recording');
    } else {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        workflowNameInput.disabled = false;
        statusText.textContent = 'Stopped';
        statusBadge.classList.remove('recording');
    }
}

function loadRecentWorkflows() {
    chrome.runtime.sendMessage({ action: 'GET_WORKFLOWS' }, (response) => {
        const container = document.getElementById('recent-workflows');

        if (!response || response.status !== 'ok' || !response.workflows || response.workflows.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div>No workflows yet</div>
                </div>
            `;
            return;
        }

        // Show last 3 workflows
        const recent = response.workflows.slice(-3).reverse();

        container.innerHTML = recent.map(wf => {
            const eventCount = wf.events ? wf.events.length : 0;
            const date = new Date(wf.createdAt).toLocaleDateString();
            const time = new Date(wf.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="workflow-item" data-id="${wf.id}">
                    <div class="workflow-info">
                        <div class="workflow-name">${escapeHtml(wf.name)}</div>
                        <div class="workflow-meta">${date} at ${time}</div>
                    </div>
                    <div class="workflow-events">${eventCount} events</div>
                </div>
            `;
        }).join('');

        // Add click handlers to open dashboard
        container.querySelectorAll('.workflow-item').forEach(item => {
            item.onclick = () => {
                chrome.tabs.create({
                    url: 'src/ui/dashboard.html'
                });
            };
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
