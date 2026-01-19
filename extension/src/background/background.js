// background.js (service worker)
// Manages workflow recording and storage (FIXED)

let recordingState = {
    isRecording: false,
    currentWorkflow: [],
    workflowName: null,
    startTime: null
};

// Buffer events that arrive before recording starts
let pendingEvents = [];

let dbInstance;

// ---------- IndexedDB ----------
function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open('AutomationDB', 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('workflows')) {
                db.createObjectStore('workflows', {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };

        request.onerror = () => reject(request.error);
    });
}

// ---------- Recording Control ----------
function startRecording(workflowName) {
    recordingState.isRecording = true;
    recordingState.workflowName = workflowName || `Workflow ${new Date().toLocaleString()}`;
    recordingState.startTime = Date.now();

    // Clear all previous events for a fresh start
    recordingState.currentWorkflow = [];
    pendingEvents = [];

    console.log('Recording started');
}

async function stopRecording() {
    if (!recordingState.isRecording) return null;

    recordingState.isRecording = false;

    const workflow = {
        name: recordingState.workflowName,
        createdAt: recordingState.startTime,
        events: recordingState.currentWorkflow,
        eventCount: recordingState.currentWorkflow.length,
        schema: 'workflow-v1'
    };

    const db = await getDB();
    const tx = db.transaction('workflows', 'readwrite');
    tx.objectStore('workflows').add(workflow);

    recordingState.currentWorkflow = [];
    recordingState.workflowName = null;
    recordingState.startTime = null;

    console.log('Workflow saved');
    return workflow;
}

// ---------- Messaging ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {

        if (msg.action === 'GET_RECORDING_STATE') {
            sendResponse({ isRecording: recordingState.isRecording });
            return;
        }

        if (msg.action === 'START_RECORDING') {
            startRecording(msg.workflowName);
            sendResponse({ status: 'ok' });
            return;
        }

        if (msg.action === 'STOP_RECORDING') {
            const workflow = await stopRecording();
            chrome.runtime.sendMessage({ action: 'refresh_dashboard' }).catch(() => {});
            sendResponse({ status: 'ok', workflow });
            return;
        }

        if (msg.action === 'RECORD_EVENT') {
            if (recordingState.isRecording) {
                recordingState.currentWorkflow.push(msg.event);
            } else {
                pendingEvents.push(msg.event);
            }
            sendResponse({ status: 'ok' });
            return;
        }

        if (msg.action === 'GET_WORKFLOWS') {
            const db = await getDB();
            const req = db.transaction('workflows', 'readonly')
                .objectStore('workflows')
                .getAll();

            req.onsuccess = () => {
                sendResponse({ status: 'ok', workflows: req.result });
            };
            return true;
        }

        if (msg.action === 'DELETE_WORKFLOW') {
            const db = await getDB();
            const tx = db.transaction('workflows', 'readwrite');
            tx.objectStore('workflows').delete(msg.id);
            tx.oncomplete = () => sendResponse({ status: 'ok' });
            return true;
        }

        if (msg.action === 'RENAME_WORKFLOW') {
            const db = await getDB();
            const store = db.transaction('workflows', 'readwrite').objectStore('workflows');
            const req = store.get(msg.id);

            req.onsuccess = () => {
                const wf = req.result;
                if (wf) {
                    wf.name = msg.newName;
                    store.put(wf);
                    sendResponse({ status: 'ok' });
                }
            };
            return true;
        }

    })();

    return true;
});
