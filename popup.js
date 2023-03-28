chrome.runtime.sendMessage({ "type": "turn", "method": "get" })
    .then(e => onoff.checked = e.state);

onoff.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "turn", "method": "change" })
        .then(e => onoff.checked = e.state);
});

bwlists.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "./manages.html" });
});

github.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "open", "target": "https://github.com/ArtyzhStudio/form-filler" });
});

// chrome.runtime.onMessage.addEventListener(mes => {
//     if (mes.type !== "turning")
//         return;
//     onoff.checked = mes.state;
//     console.log(onoff.checked);
// });
