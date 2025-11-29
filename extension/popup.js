document.getElementById("download").onclick = async () => {
    chrome.storage.local.get(["task_logs"], (res) => {
        const blob = new Blob([JSON.stringify(res.task_logs, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "task_logs.json";
        a.click();
    });
};
document.getElementById("open-dashboard").onclick = () => {
    chrome.tabs.create({
        url: "dashboard.html"
    });
};
