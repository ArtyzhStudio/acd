let newBlack = null;
let newWhite = null;

let newBlackSubbmit = null;
let newWhiteSubbmit = null;

function updateBlack() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "black" }).then(e => {
        console.log("get response arrived");
        console.log(e.response);
        blacklist.innerHTML = e.response;
        newBlack = document.getElementById("newBlack");
        newBlackSubbmit = document.getElementById("newBlackSubbmit");
        newBlackSubbmit.addEventListener("click", addBlack);
    });
}

function updateWhite() {
    chrome.runtime.sendMessage({ "type": "list", "method": "get", "target": "white" }).then(e => {
        console.log("get response arrived");
        console.log(e.response);
        whitelist.innerHTML = e.response;
        newWhite = document.getElementById("newWhite");
        newWhiteSubbmit = document.getElementById("newWhiteSubbmit");
        newWhiteSubbmit.addEventListener("click", addWhite);
    });
}

function addBlack() {
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "black", "url": newBlack.value }).then(e => {
        console.log("set response arrived");
        console.log(e);
        if (e.response === "success")
            updateBlack();
    });
}

function addWhite() {
    chrome.runtime.sendMessage({ "type": "list", "method": "set", "target": "white", "url": newWhite.value }).then(e => {
        console.log("set response arrived");
        console.log(e);
        if (e.response === "success")
            updateWhite();
    });
}

function removeFromWhite() { }
function removeFromBlack() { }

updateBlack();
updateWhite();
