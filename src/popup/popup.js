chrome.runtime.sendMessage({ "type": "turn", "method": "get" })
    .then(e => onoff.checked = e.state);

onoff.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "turn", "method": "change" })
        .then(e => onoff.checked = e.state);
});

bwlists.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "./src/manages/manages.html" });
});

manuals.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "./src/manuals/manuals.html" });
});

github.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "https://github.com/ArtyzhStudio/acd" });
});
