// content.js — Simplified, automation-ready recorder

// Initialize noise reducer (loaded from noiseReduction.js)
const noiseReducer = new NoiseReducer();

function recordEvent(event) {
    const processed = noiseReducer.processEvent(event);
    if (!processed) return; // Filtered out by noise reducer

    chrome.runtime.sendMessage({
        action: 'RECORD_EVENT',
        event: processed
    });
}

// ---------- Helpers ----------
function debounce(fn, delay) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function getXPath(el) {
    if (!el) return null;
    let path = '';
    while (el && el.nodeType === 1) {
        let idx = 1;
        let sib = el.previousSibling;
        while (sib) {
            if (sib.nodeType === 1 && sib.nodeName === el.nodeName) idx++;
            sib = sib.previousSibling;
        }
        path = `/${el.nodeName.toLowerCase()}[${idx}]` + path;
        el = el.parentNode;
    }
    return path;
}

function getSelector(el) {
    if (!el) return null;
    if (el.id) return `#${el.id}`;
    if (el.getAttribute && el.getAttribute('data-testid')) {
        return `[data-testid="${el.getAttribute('data-testid')}"]`;
    }
    return null;
}

// ---------- Event Builder ----------
function buildEvent(type, el, extra = {}) {
    return {
        event: type,
        timestamp: Date.now(),
        url: location.href,
        title: document.title,

        automation: {
            selector: getSelector(el),
            xpath: getXPath(el),
            tag: el?.tagName || null,
            inputType: el?.getAttribute?.('type') || null
        },

        raw: extra
    };
}

// ---------- CLICK ----------
document.addEventListener('click', e => {
    recordEvent(buildEvent('click', e.target, {
        text: e.target.innerText?.slice(0, 80) || null
    }));
}, true);

// ---------- INPUT ----------
document.addEventListener('input', debounce(e => {
    const isPassword = e.target.type === 'password';
    recordEvent(buildEvent('input', e.target, {
        value: isPassword ? '[MASKED]' : (e.target.value || ''),
        length: e.target.value?.length || 0,
        fieldName: e.target.name || e.target.id || e.target.placeholder || null
    }));
}, 300), true);

// ---------- SCROLL ----------
let lastScroll = window.scrollY;
const scrollHandler = debounce(() => {
    const delta = Math.abs(window.scrollY - lastScroll);
    if (delta > 120) {
        lastScroll = window.scrollY;
        recordEvent(buildEvent('scroll', null, {
            y: window.scrollY
        }));
    }
}, 200);
window.addEventListener('scroll', scrollHandler, { passive: true });

// ---------- NAVIGATION ----------
if (!window.__pageVisitRecorded) {
    window.__pageVisitRecorded = true;
    recordEvent(buildEvent('page_visit', null));
}

(function () {
    const push = history.pushState;
    history.pushState = function () {
        push.apply(history, arguments);
        recordEvent(buildEvent('navigation', null));
    };
})();
