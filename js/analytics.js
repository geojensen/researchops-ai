(() => {
    const trackedPath = "/qualitative-analysis-agent-manifest/";
    if (window.location.pathname !== trackedPath || navigator.doNotTrack === "1") return;

    fetch("/analytics/record.php", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            path: trackedPath,
            referrer: document.referrer,
        }),
    }).catch(() => {});
})();
