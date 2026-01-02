let workflows = [];

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    loadWorkflows();
});

chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'refresh_dashboard') {
        loadWorkflows();
    }
});

// ---------- Load ----------
function loadWorkflows() {
    chrome.runtime.sendMessage({ action: 'GET_WORKFLOWS' }, res => {
        if (res?.status === 'ok') {
            workflows = res.workflows || [];
            renderWorkflows();
        }
    });
}

// ---------- Render ----------
function renderWorkflows() {
    const list = document.getElementById('workflows-list');
    list.innerHTML = '';

    if (!workflows.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <span class="empty-state-icon">📭</span>
            <p>No workflows recorded yet. Start by opening the extension popup!</p>
        `;
        list.appendChild(emptyState);
        updateStats({ workflows: 0 });
        return;
    }

    workflows.forEach((w, idx) => {
        const div = document.createElement('div');
        div.className = 'workflow-card';
        
        const title = document.createElement('h3');
        title.textContent = w.name;
        
        const date = document.createElement('small');
        date.textContent = new Date(w.createdAt).toLocaleString();
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.textContent = 'View';
        viewBtn.onclick = (e) => {
            e.preventDefault();
            viewWorkflow(idx);
        };
        
        const automateBtn = document.createElement('button');
        automateBtn.className = 'btn-automate';
        automateBtn.textContent = 'Automate';
        automateBtn.onclick = (e) => {
            e.preventDefault();
            // Functionality to be added later
        };

        const optimizeBtn = document.createElement('button');
        optimizeBtn.className = 'btn-optimize';
        optimizeBtn.textContent = 'Optimize';
        optimizeBtn.onclick = (e) => {
            e.preventDefault();
            optimizeWorkflow(idx);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            deleteWorkflow(idx);
        };
        
        const actions = document.createElement('div');
        actions.className = 'workflow-actions';
        actions.appendChild(viewBtn);
        actions.appendChild(automateBtn);
        actions.appendChild(optimizeBtn);
        actions.appendChild(deleteBtn);
        
        div.appendChild(title);
        div.appendChild(date);
        div.appendChild(actions);
        list.appendChild(div);
    });

    updateStats({ workflows: workflows.length });
}


// ---------- Stats ----------
function updateStats(stats) {
    document.getElementById('stat-workflows').textContent = stats.workflows || 0;
}

// ---------- Actions ----------
function viewWorkflow(idx) {
    const wf = workflows[idx];
    if (!wf) {
        console.error('Workflow not found at index', idx);
        return;
    }

    const events = wf.events || [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const title = document.createElement('h3');
    title.textContent = wf.name;
    
    const eventInfo = document.createElement('p');
    eventInfo.innerHTML = `Events: ${events.length}`;
    
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(events, null, 2);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => overlay.remove();
    
    content.appendChild(title);
    content.appendChild(eventInfo);
    content.appendChild(pre);
    content.appendChild(closeBtn);
    
    overlay.appendChild(content);
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    document.body.appendChild(overlay);
}



function deleteWorkflow(idx) {
    const wf = workflows[idx];
    if (!wf) {
        console.error('Workflow not found at index', idx);
        return;
    }

    if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;

    chrome.runtime.sendMessage(
        { action: 'DELETE_WORKFLOW', id: wf.id },
        (res) => {
            if (res?.status === 'ok') {
                loadWorkflows();
            } else {
                alert('Failed to delete workflow');
            }
        }
    );
}


// ---------- Utils ----------
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ---------- Optimize Workflow ----------
async function optimizeWorkflow(idx) {
    const wf = workflows[idx];
    if (!wf) {
        console.error('Workflow not found at index', idx);
        return;
    }

    // Show loading modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content optimization-loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    const message = document.createElement('p');
    message.textContent = 'Analyzing workflow with AI...';
    
    content.appendChild(spinner);
    content.appendChild(message);
    overlay.appendChild(content);
    
    overlay.onclick = (e) => {
        if (e.target === overlay) return; // Prevent closing during analysis
    };
    
    document.body.appendChild(overlay);

    try {
        // Call backend API
        const response = await fetch('http://localhost:5001/optimize-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                workflowId: wf.id,
                workflowName: wf.name,
                events: wf.events
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Remove loading modal
        overlay.remove();

        // Show result modal
        displayOptimizationResult(wf.name, result);

    } catch (error) {
        console.error('Optimization failed:', error);
        overlay.remove();
        
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'modal-overlay';
        
        const errorContent = document.createElement('div');
        errorContent.className = 'modal-content';
        
        const title = document.createElement('h3');
        title.textContent = '⚠️ Optimization Failed';
        
        const msg = document.createElement('p');
        msg.textContent = error.message;
        msg.style.color = '#e74c3c';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => errorOverlay.remove();
        closeBtn.style.background = '#e74c3c';
        
        errorContent.appendChild(title);
        errorContent.appendChild(msg);
        errorContent.appendChild(closeBtn);
        
        errorOverlay.appendChild(errorContent);
        
        errorOverlay.onclick = (e) => {
            if (e.target === errorOverlay) errorOverlay.remove();
        };
        
        document.body.appendChild(errorOverlay);
    }
}


function displayOptimizationResult(workflowName, result) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content optimization-result';
    
    // Title
    const title = document.createElement('h3');
    title.innerHTML = '✨ Workflow Optimization Result';
    
    // Goal section
    if (result.goal) {
        const goalSection = document.createElement('div');
        goalSection.className = 'optimization-section';
        
        const goalTitle = document.createElement('h4');
        goalTitle.textContent = 'Inferred Goal';
        
        const goalText = document.createElement('p');
        goalText.textContent = result.goal;
        
        goalSection.appendChild(goalTitle);
        goalSection.appendChild(goalText);
        content.appendChild(goalSection);
    }
    
    // Original steps
    if (result.originalSteps && result.originalSteps.length > 0) {
        const origSection = document.createElement('div');
        origSection.className = 'optimization-section';
        
        const origTitle = document.createElement('h4');
        origTitle.textContent = `Original Steps (${result.originalSteps.length})`;
        
        const origList = document.createElement('ol');
        origList.className = 'steps-list';
        result.originalSteps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            origList.appendChild(li);
        });
        
        origSection.appendChild(origTitle);
        origSection.appendChild(origList);
        content.appendChild(origSection);
    }
    
    // Optimized steps
    if (result.optimizedSteps && result.optimizedSteps.length > 0) {
        const optSection = document.createElement('div');
        optSection.className = 'optimization-section';
        optSection.style.borderLeftColor = '#4caf50';
        
        const optTitle = document.createElement('h4');
        optTitle.textContent = `Optimized Steps (${result.optimizedSteps.length})`;
        optTitle.style.color = '#4caf50';
        
        const optList = document.createElement('ol');
        optList.className = 'steps-list';
        result.optimizedSteps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            optList.appendChild(li);
        });
        
        optSection.appendChild(optTitle);
        optSection.appendChild(optList);
        content.appendChild(optSection);
    }
    
    // Removed steps
    if (result.removedSteps && result.removedSteps.length > 0) {
        const remSection = document.createElement('div');
        remSection.className = 'optimization-section removed-steps';
        
        const remTitle = document.createElement('h4');
        remTitle.textContent = `Removed Steps (${result.removedSteps.length})`;
        
        const remList = document.createElement('ul');
        remList.style.listStyle = 'none';
        result.removedSteps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = '• ' + step;
            li.style.padding = '4px 0';
            li.style.color = '#2c3e50';
            remList.appendChild(li);
        });
        
        remSection.appendChild(remTitle);
        remSection.appendChild(remList);
        content.appendChild(remSection);
    }
    
    // Explanation
    if (result.explanation) {
        const explSection = document.createElement('div');
        explSection.className = 'optimization-section';
        explSection.style.borderLeftColor = '#2196f3';
        
        const explTitle = document.createElement('h4');
        explTitle.textContent = 'Optimization Explanation';
        explTitle.style.color = '#2196f3';
        
        const explText = document.createElement('p');
        explText.textContent = result.explanation;
        
        explSection.appendChild(explTitle);
        explSection.appendChild(explText);
        content.appendChild(explSection);
    }
    
    // Confidence
    if (result.confidence !== undefined) {
        const confSection = document.createElement('div');
        confSection.className = 'optimization-section';
        
        const confTitle = document.createElement('h4');
        confTitle.textContent = 'AI Confidence Score';
        
        const confBar = document.createElement('div');
        confBar.className = 'confidence-bar';
        
        const confFill = document.createElement('div');
        confFill.className = 'confidence-fill';
        confFill.style.width = '0%';
        
        confBar.appendChild(confFill);
        
        const confText = document.createElement('div');
        confText.className = 'confidence-text';
        confText.textContent = `${result.confidence}% confident in this optimization`;
        
        confSection.appendChild(confTitle);
        confSection.appendChild(confBar);
        confSection.appendChild(confText);
        content.appendChild(confSection);
        
        // Animate confidence bar
        setTimeout(() => {
            confFill.style.width = result.confidence + '%';
        }, 100);
    }
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => overlay.remove();
    closeBtn.style.marginTop = '24px';
    closeBtn.style.width = '100%';
    
    content.appendChild(title);
    content.insertBefore(title, content.firstChild);
    content.appendChild(closeBtn);
    
    overlay.appendChild(content);
    
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    document.body.appendChild(overlay);
}