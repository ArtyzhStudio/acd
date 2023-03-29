chrome.runtime.sendMessage({ "type": "turn", "method": "get" })
    .then(e => onoff.checked = e.state);

onoff.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "turn", "method": "change" })
        .then(e => onoff.checked = e.state);
});

bwlists.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "./src/manages/manages.html" });
});

github.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "https://github.com/ArtyzhStudio/acd" });
});
