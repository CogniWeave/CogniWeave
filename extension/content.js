// content.js - Advanced Task Mining + Expanded UI Capture
// ---------------------------------------------------------

const CAPTURE_INPUT_VALUE = false;
const CAPTURE_INPUT_HASH = true;

// ------------------ Safe Send ------------------
function safeSend(msg) {
    try {
        chrome.runtime.sendMessage(msg, () => {
            if (chrome.runtime.lastError) {}
        });
    } catch (e) {}
}

// ------------------ Helpers ------------------
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function getCssSelector(el) {
    if (!el) return null;
    if (el.id) return `#${el.id}`;
    const parts = [];
    while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== "html") {
        let part = el.tagName.toLowerCase();
        if (el.className) {
            const cls = String(el.className).trim().split(/\s+/)[0];
            if (cls) part += `.${cls}`;
        }
        const parent = el.parentNode;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                (e) => e.tagName === el.tagName
            );
            if (siblings.length > 1) {
                const idx = Array.from(parent.children).indexOf(el) + 1;
                part += `:nth-child(${idx})`;
            }
        }
        parts.unshift(part);
        el = el.parentNode;
    }
    return parts.length ? parts.join(" > ") : null;
}

function getXPath(el) {
    if (!el) return null;
    let xpath = "";
    for (; el && el.nodeType === 1; el = el.parentNode) {
        let idx = 1;
        for (let sib = el.previousSibling; sib; sib = sib.previousSibling) {
            if (sib.nodeType === 1 && sib.nodeName === el.nodeName) idx++;
        }
        xpath = "/" + el.nodeName.toLowerCase() + "[" + idx + "]" + xpath;
    }
    return xpath || null;
}

function shortText(s, n = 120) {
    if (!s) return "";
    let t = String(s).trim();
    return t.length > n ? t.slice(0, n) + "…" : t;
}

// ------------------ SHA-256 hashing ------------------
async function sha256Hex(str) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------ DOM-TREE CAPTURE ------------------
function getDomContext(el) {
    if (!el) return {};

    const parent = el.parentElement
        ? {
              tag: el.parentElement.tagName,
              id: el.parentElement.id,
              classes: el.parentElement.className,
          }
        : null;

    const siblings = el.parentElement
        ? Array.from(el.parentElement.children)
              .slice(0, 7)
              .map((e) => ({
                  tag: e.tagName,
                  id: e.id,
                  classes: e.className,
                  text: shortText(e.innerText),
              }))
        : [];

    const ancestors = [];
    let p = el.parentElement;
    while (p && p.tagName !== "HTML") {
        ancestors.push({
            tag: p.tagName,
            id: p.id,
            classes: p.className,
        });
        p = p.parentElement;
    }

    return { parent, siblings, ancestors };
}

// ------------------ Semantic Classification ------------------
function classifyElement(el, meta) {
    const text = (meta.text || "").toLowerCase();
    const id = (meta.id || "").toLowerCase();
    const cls = String(meta.classes || "").toLowerCase();
    const ph = (el.placeholder || "").toLowerCase();

    if (text.includes("login") || id.includes("login")) return "login_button";
    if (text.includes("submit") || id.includes("submit")) return "submit_button";

    if (meta.tag === "INPUT") {
        if ((el.type || "").toLowerCase() === "password") return "password_field";
        if ((el.type || "").toLowerCase() === "email") return "email_field";
        if (ph.includes("search") || id.includes("search")) return "search_box";
    }

    if (meta.tag === "A") return "link";
    if (cls.includes("btn") || cls.includes("button")) return "button";

    return "generic_element";
}

// ------------------ Build Event ------------------
async function buildEventObject(type, extra = {}) {
    return {
        event: type,
        timestamp: Date.now(),
        url: location.href,
        title: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollY: window.scrollY || window.pageYOffset || 0,
        page_fingerprint: [
            location.hostname,
            location.pathname.split("/")[1] || "",
            document.body.children.length,
        ].join("|"),
        ...extra,
    };
}

// ------------------ Rich Element Metadata ------------------
function extractSemanticMetadata(el) {
    if (!el) return {};

    return {
        tag: el.tagName,
        id: el.id || null,
        classes: el.className || null,

        aria_label: el.getAttribute("aria-label"),
        role: el.getAttribute("role"),
        name: el.getAttribute("name"),
        title: el.getAttribute("title"),
        placeholder: el.getAttribute("placeholder"),

        text: (el.innerText || "").slice(0, 80),

        icon_class: (() => {
            const icon = el.querySelector("i, svg");
            if (!icon) return null;
            if (icon.tagName === "SVG") return "svg-icon";
            return icon.className || null;
        })(),
    };
}

// ------------------ Meta From Element ------------------
async function metaFromElement(el) {
    if (!el) return {};

    const semantic = extractSemanticMetadata(el);
    const domCtx = getDomContext(el);

    return {
        ...semantic,
        css_selector: getCssSelector(el),
        xpath: getXPath(el),
        dom_context: domCtx,
        element_type: classifyElement(el, semantic),
    };
}

// ------------------ CLICK ------------------
document.addEventListener(
    "click",
    async (e) => {
        const el = e.target;
        const meta = await metaFromElement(el);
        const rect = el.getBoundingClientRect();

        safeSend(
            await buildEventObject("click", {
                data: {
                    ...meta,
                    x: e.clientX,
                    y: e.clientY,
                    bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
                    button: e.button,
                },
            })
        );
    },
    true
);

// ------------------ RIGHT CLICK ------------------
document.addEventListener(
    "contextmenu",
    async (e) => {
        safeSend(
            await buildEventObject("right_click", {
                data: await metaFromElement(e.target),
            })
        );
    },
    true
);

// ------------------ DRAG ------------------
document.addEventListener(
    "dragstart",
    async (e) => {
        safeSend(
            await buildEventObject("drag_start", {
                data: await metaFromElement(e.target),
            })
        );
    },
    true
);

document.addEventListener(
    "drop",
    async (e) => {
        safeSend(
            await buildEventObject("drop", {
                data: await metaFromElement(e.target),
            })
        );
    },
    true
);

// ------------------ INPUT ------------------
function fieldNameForInput(el) {
    return (
        el.name ||
        el.getAttribute("id") ||
        el.getAttribute("aria-label") ||
        el.placeholder ||
        ""
    );
}

async function handleInputEvent(e) {
    const el = e.target;
    const meta = await metaFromElement(el);

    let inputInfo = { length: (el.value || "").length };
    if (CAPTURE_INPUT_VALUE && CAPTURE_INPUT_HASH) {
        inputInfo.hash = await sha256Hex(el.value);
    }

    safeSend(
        await buildEventObject("input", {
            data: {
                ...meta,
                field_type: el.type || el.tagName,
                field_name: fieldNameForInput(el),
                input: inputInfo,
            },
        })
    );
}

document.addEventListener("input", debounce(handleInputEvent, 300), true);
document.addEventListener("change", handleInputEvent, true);

// ------------------ FOCUS ------------------
document.addEventListener(
    "focusin",
    async (e) => {
        safeSend(
            await buildEventObject("focus", {
                data: await metaFromElement(e.target),
            })
        );
    },
    true
);

document.addEventListener(
    "focusout",
    async (e) => {
        safeSend(
            await buildEventObject("blur", {
                data: await metaFromElement(e.target),
            })
        );
    },
    true
);

// ------------------ SCROLL ------------------
function onScroll() {
    buildEventObject("scroll", {
        data: {
            scrollY: window.scrollY,
            viewport: { w: window.innerWidth, h: window.innerHeight },
        },
    }).then(safeSend);
}
window.addEventListener("scroll", debounce(onScroll, 300), { passive: true });

// ------------------ NAVIGATION ------------------
buildEventObject("page_visit", {
    data: {
        url: location.href,
        title: document.title,
        referrer: document.referrer || "",
    },
}).then(safeSend);

window.addEventListener("popstate", () => {
    buildEventObject("navigation", {
        data: { url: location.href, title: document.title },
    }).then(safeSend);
});

// ------------------ SPA pushState ------------------
(function () {
    const _pushState = history.pushState;
    history.pushState = function () {
        _pushState.apply(history, arguments);
        safeSend({
            type: "navigation",
            url: location.href,
            title: document.title,
            timestamp: Date.now(),
        });
    };
})();

// ------------------ HEARTBEAT ------------------
setInterval(() => {
    buildEventObject("heartbeat", { data: { url: location.href } }).then(
        safeSend
    );
}, 60 * 1000);

// ------------------ Visibility ------------------
document.addEventListener("visibilitychange", () => {
    safeSend({
        type: "visibility_change",
        visibility: document.visibilityState,
        timestamp: Date.now(),
    });
});

// ------------------ UI State Observer ------------------
(function () {
    let timer = null;
    const observer = new MutationObserver((muts) => {
        if (
            muts.some(
                (m) =>
                    m.type === "childList" &&
                    (m.addedNodes.length > 3 || m.removedNodes.length > 3)
            )
        ) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                safeSend({
                    type: "ui_state_change",
                    hint:
                        document.querySelector('[role="dialog"], .modal')
                            ? "modal_opened"
                            : "dom_updated",
                    timestamp: Date.now(),
                });
            }, 400);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// ------------------ Page Structure ------------------
(function () {
    function emit() {
        safeSend({
            type: "page_structure",
            containers: Array.from(document.body.children)
                .slice(0, 5)
                .map((e) => e.id || e.tagName),
            route: location.pathname,
            timestamp: Date.now(),
        });
    }
    emit();
    let last = location.pathname;
    setInterval(() => {
        if (location.pathname !== last) {
            last = location.pathname;
            emit();
        }
    }, 500);
})();

console.log("CONTENT SCRIPT LOADED — FINAL, PATCHED, STABLE");
