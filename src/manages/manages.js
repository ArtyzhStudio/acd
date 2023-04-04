let newBlack = null;
let newWhite = null;

let newBlackSubbmit = null;
let newWhiteSubbmit = null;

function updateBlack() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "black" }).then(e => {
        console.log("get response arrived");
        blacklist.innerHTML = e.response;
        Array.from(document.getElementsByClassName("burl")).forEach((e, i) => { e.addEventListener("click", () => removeFromBlack(i)) });
        newBlack = document.getElementById("newBlack");
        newBlackSubbmit = document.getElementById("newBlackSubbmit");
        newBlackSubbmit.addEventListener("click", addBlack);
        newBlack.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addBlack();
        });
    });
}

function updateWhite() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "white" }).then(e => {
        console.log("get response arrived");
        whitelist.innerHTML = e.response;
        Array.from(document.getElementsByClassName("wurl")).forEach((e, i) => { e.addEventListener("click", () => removeFromWhite(i)) });
        newWhite = document.getElementById("newWhite");
        newWhiteSubbmit = document.getElementById("newWhiteSubbmit");
        newWhiteSubbmit.addEventListener("click", addWhite);
        newWhite.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addWhite();
        });
    });
}

function addBlack() {
    let cur = newBlack.value.trim();
    if (cur === "")
        return;
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "black", "url": cur }).then(e => {
        console.log("set response arrived");
        console.log(e);
        if (e.response === "success")
            update();
    });
}

function addWhite() {
    let cur = newWhite.value.trim();
    if (cur === "")
        return;
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "white", "url": cur }).then(e => {
        console.log("set response arrived");
        console.log(e);
        if (e.response === "success")
            update();
    });
}

function removeFromBlack(ind) {
    let cur = document.getElementById("burl" + String(ind));
    chrome.runtime.sendMessage({ "type": "list", "method": "del", "target": "black", "url": cur.innerText }).then(e => {
        console.log("det response arrived");
        console.log(e);
        if (e.response === "success")
            updateBlack();
    });
}
function removeFromWhite(ind) {
    let cur = document.getElementById("wurl" + String(ind));
    chrome.runtime.sendMessage({ "type": "list", "method": "del", "target": "white", "url": cur.innerText }).then(e => {
        console.log("del response arrived");
        console.log(e);
        if (e.response === "success")
            updateWhite();
    });
}

function update() {
    updateBlack();
    updateWhite();
}

update();
