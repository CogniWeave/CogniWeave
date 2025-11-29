//this file is to store recorded activity into log

// background.js (service worker)

// --------- IndexedDB helper ----------
let dbInstance;
function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open('TaskMiningDB', 4); // version 4 to force schema update

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('events')) {
                const store = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                // useful indexes for queries
                store.createIndex('event_ts', 'timestamp', { unique: false });
                store.createIndex('event_type', 'event', { unique: false });
                store.createIndex('url', 'url', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };

        request.onerror = (e) => reject(e);
    });
}

// write + notify
chrome.runtime.onMessage.addListener(async (msg, sender) => {
    try {
        const db = await getDB();
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const req = store.add(msg);

        tx.oncomplete = () => {
            console.log('WRITE COMPLETE:', msg);
            // notify dashboards to refresh (non-blocking)
            chrome.runtime.sendMessage({ action: 'refresh_dashboard' });
        };

        tx.onerror = (err) => {
            console.error('WRITE FAILED', err);
        };
    } catch (err) {
        console.error('DB write failed', err);
    }
    // Return false to indicate asynchronous response not used
    return false;
});


