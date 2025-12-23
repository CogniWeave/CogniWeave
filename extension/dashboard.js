// ---------- IndexedDB Connection ----------
// listen for refresh and debounce reload
let refreshTimeout;
chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === 'refresh_dashboard') {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
            console.log('Dashboard: refreshing due to new events');
            start();
        }, 150);
    }
});

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("TaskMiningDB", 4);

        request.onupgradeneeded = (e) => {
            console.log("Dashboard upgrade needed — stores:", e.target.result.objectStoreNames);
            const db = e.target.result;
            if (!db.objectStoreNames.contains('events')) {
                const store = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                store.createIndex('event_ts', 'timestamp', { unique: false });
                store.createIndex('event_type', 'event', { unique: false });
                store.createIndex('url', 'url', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            console.log("Dashboard DB opened — stores:", db.objectStoreNames);
            resolve(db); 
        };

        request.onerror = () => reject("DB open failed");
    });
}



// ---------- Load All Events from DB ----------
async function loadEvents() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction("events", "readonly");
            const store = tx.objectStore("events");

            const req = store.getAll();

            req.onsuccess = () => {
                resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
            };

            req.onerror = () => {
                reject("Failed to read events");
            };

        } catch (error) {
            reject(error);
        }
    });
}



// ---------- Group Events Into Workflows ----------
function groupWorkflows(events) {
    if (!events.length) return [];

    events.sort((a, b) => a.timestamp - b.timestamp);

    const workflows = [];
    let current = [];

    const GAP = 5 * 60 * 1000; // 5 minutes

    events.forEach((event, idx) => {
        if (idx === 0) {
            current.push(event);
            return;
        }

        const timeDiff = event.timestamp - events[idx - 1].timestamp;

        if (timeDiff > GAP) {
            workflows.push(current);
            current = [event];
        } else {
            current.push(event);
        }
    });

    if (current.length > 0) workflows.push(current);

    return workflows;
}


// ---------- Render Sidebar List ----------
function renderWorkflowList(workflows) {
    const list = document.getElementById("workflow-list");
    list.innerHTML = "";

    if (!workflows.length) {
        list.innerHTML = "<p style='padding:10px;color:#aaa;'>No workflows found</p>";
        return;
    }

    workflows.forEach((wf, idx) => {
        const div = document.createElement("div");
        div.className = "workflow-item";
        div.textContent = `Workflow ${idx + 1} (${wf.length} events)`;

        div.onclick = () => renderWorkflowDetails(wf, idx + 1);

        list.appendChild(div);
    });
}


// ---------- Render Workflow Details ----------
function renderWorkflowDetails(workflow, number) {
    document.getElementById("workflow-title").textContent =
        `Workflow ${number}`;

    const container = document.getElementById("workflow-events");
    container.innerHTML = "";

    workflow.forEach((event, idx) => {
        const div = document.createElement("div");
        div.className = "event";

        const header = `
            <div style="font-weight:bold;">
                ${idx + 1}. ${event.event}
                <span style="color:#888;font-size:12px;">
                    (${new Date(event.timestamp).toLocaleTimeString()})
                </span>
            </div>
        `;

        const core = `
            <div style="margin-left:10px;">
                <div><strong>URL:</strong> ${event.url}</div>
                <div><strong>Title:</strong> ${event.title}</div>
                <div><strong>ScrollY:</strong> ${event.scrollY}</div>
                <div><strong>Viewport:</strong> ${JSON.stringify(event.viewport)}</div>
                <div><strong>Page Fingerprint:</strong> ${event.page_fingerprint}</div>
            </div>
        `;

        const data = event.data || {};

        const interaction = `
            <details style="margin-left:10px;margin-top:5px;">
                <summary>Interaction Data</summary>
                <pre>${JSON.stringify({
                    element_type: data.element_type,
                    field_name: data.field_name,
                    input: data.input,
                    x: data.x,
                    y: data.y,
                    bbox: data.bbox,
                    button: data.button,
                    aria_label: data.aria_label,
                    role: data.role,
                    tag: data.tag,
                    text: data.text
                }, null, 2)}</pre>
            </details>
        `;

        const dom = `
            <details style="margin-left:10px;margin-top:5px;">
                <summary>DOM / Selector Data</summary>
                <pre>${JSON.stringify({
                    css_selector: data.css_selector,
                    xpath: data.xpath,
                    dom_context: data.dom_context
                }, null, 2)}</pre>
            </details>
        `;

        div.innerHTML = header + core + interaction + dom;
        container.appendChild(div);
    });
}



// ---------- INIT ----------
async function start() {
    try {
        console.log("Loading events...");
        const events = await loadEvents();

        console.log("Loaded events:", events);

        const workflows = groupWorkflows(events);

        console.log("Grouped workflows:", workflows);

        renderWorkflowList(workflows);
    } catch (err) {
        console.error("Error loading dashboard:", err);
        const list = document.getElementById("workflow-list");
        if (list) {
            list.innerHTML = `<p style='padding:10px;color:red;'>Error loading data: ${err.message || err}</p>`;
        }
    }
}

start();
