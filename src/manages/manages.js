var trust = {};

function updateBlack() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "black" }).then(e => {
        console.log("get response arrived");
        console.log(e.response);
        blacklist.innerHTML = e.response;
    });
}

function updateWhite() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "white" }).then(e => {
        console.log("get response arrived");
        console.log(e.response);
        whitelist.innerHTML = e.response;
    });
}

function addWhite() {
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "white", "url": newWhite.innerText }).then(e => {
        if (e === "success")
            updateWhite();
    });
}

function addBlack() {
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "black", "url": newBlack.innerText }).then(e => {
        if (e === "success")
            updateBlack();
    });
}

updateBlack();
updateWhite();
