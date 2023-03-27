let onoff = document.getElementById("onoff");

chrome.runtime.sendMessage({ "type": "turn", "method": "get" })
    .then(e => onoff.checked = e.state);

onoff.addEventListener("click", () => {
    chrome.runtime.sendMessage({ "type": "turn", "method": "change" })
        .then(e => onoff.checked = e.state);
});


chrome.runtime.onMessage.addEventListener(mes => {
    if (mes.type !== "turning")
        return;
    onoff.checked = mes.state;
    console.log(onoff.checked);
});
