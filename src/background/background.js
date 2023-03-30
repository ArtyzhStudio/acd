function Damerau_Levenshtejn(s1, s2) {
    let lenstr1 = s1.length;
    let lenstr2 = s2.length;
    let d = Array(Array());
    for (let i = 0; i <= lenstr1; i++) {
        d[i] = [];
        d[i][0] = i + 1;
    }
    for (let i = 0; i <= lenstr2; i++)
        d[0][i] = i + 1;
    for (let i = 1; i <= lenstr1; i++) {
        for (let j = 1; j <= lenstr2; j++) {
            let cost = 1;
            if (s1[i - 1] == s2[j - 1])
                cost = 0;
            d[i][j] = Math.min(
                d[i - 1][j] + 1, // deletion
                d[i][j - 1] + 1, // insertion
                d[i - 1][j - 1] + cost, // substitution
            );
            if (i && j && s1[i - 1] == s2[j - 2] && s1[i - 2] == s2[j - 1])
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
        }
    }
    return d[lenstr1][lenstr2] - 1;
}

function getClearUrl(urll, c) {
    let ind = c;
    if (ind === -1)
        ind = -2;
    let dom = "";
    for (let i = ind + 2; i < urll.length && urll[i] != '/'; i++)
        dom += urll[i];
    if (dom.slice(0, 4) === "www.")
        dom = dom.slice(4);
    return dom;
}

function getDomains(urll) {
    let c = urll.indexOf('//');
    let dom = getClearUrl(urll, c);
    let flag = 0;
    let res = [""];
    for (let i = dom.length - 1; i >= 0; i--) {
        if (dom[i] === '.') {
            flag++;
            res.push("");
        } else {
            res[flag] = dom[i] + res[flag];
        }
    }
    return res;
}

async function find(target, callback, trust = {}) {
    target = getClearUrl(target, target.indexOf('//'));
    if (target.indexOf('.') === -1)
        return callback(1000000000000000, target, "");

    let minit = 1000000000000000;
    let oneYearAgo = 3600 * 24 * 366;
    let historyItems = await chrome.history.search({
        "text": '',
        "maxResults": 100,
        "startTime": oneYearAgo
    });

    let suppose = "";
    for (let j = 0; j < historyItems.length; j++) {
        let i = historyItems[j];

        i.url = getClearUrl(i.url, i.url.indexOf('//'));
        if (i.url.indexOf('.') === -1 || i.url.slice(0, 5) === "file:" || trust.untrusted?.includes(i.url))
            continue;
        let dim = Damerau_Levenshtejn(target, i.url);

        if (dim !== 0 && dim < minit) {
            suppose = i.url;
            minit = dim;
        }
    }
    return callback(minit, target, suppose);
}

var workingState = true;
chrome.runtime.sendMessage({ "type": "turning", "state": workingState });

var trust = {};
chrome.storage.local.get(callback = (e) => trust = e);

function userConfirm(url, id, suppose) {
    let projSec_extension_respose = confirm(`Please check URL link you are trying to connect to. It might be wrong and you supposed to get to ${suppose}. Do you want to stay on this page?`);
    chrome.runtime.sendMessage({ "type": "userconfirm", "id": id, "url": url, "projSec_extension_respose": projSec_extension_respose });
}

function userConfirmBlackList(url, id) {
    let projSec_extension_respose = confirm("Please check URL link you are trying to connect to. It's in your black list. Do you want to stay on this page and remove it from black list?");
    chrome.runtime.sendMessage({ "type": "userconfirm", "id": id, "url": url, "projSec_extension_respose": projSec_extension_respose });
}

async function catchUrlAndConfirm(id, change, tab) {
    if (workingState === false)
        return;
    let URL = tab.url;
    let attention = await find(URL, (minit, target, suppose) => {
        console.log(minit);
        let res = Math.ceil((target.length + suppose.length) / 8) >= minit;
        return { "url": target, "danger": res, "suppose": suppose };
    }, trust);
    console.log(trust);
    if (trust.trusted?.includes(attention.url)) {
        attention.danger = false;
    }
    if (trust.untrusted?.includes(attention.url)) {
        attention.danger = true;
        console.log(attention);
        chrome.scripting.executeScript(
            {
                "target": { tabId: id },
                "func": userConfirmBlackList,
                "args": [attention.url, id]
            }
        );
        return;
    }
    console.log(attention);
    if (attention.danger) {
        chrome.scripting.executeScript(
            {
                "target": { tabId: id },
                "func": userConfirm,
                "args": [attention.url, id, attention.suppose]
            }
        );
    }
}

chrome.tabs.onUpdated.addListener(
    catchUrlAndConfirm
);

chrome.runtime.onMessage.addListener(mes => {
    if (workingState === false)
        return;
    if (mes.type !== "userconfirm")
        return;
    console.log(mes);
    let result = mes.projSec_extension_respose;
    let id = mes.id;
    let url = mes.url;
    console.log(result);
    if (!trust.hasOwnProperty("untrusted")) {
        trust.untrusted = [];
    }
    if (!trust.hasOwnProperty("trusted")) {
        trust.trusted = [];
    }
    if (!result) {
        console.log(id);
        if (!trust.untrusted.includes(url)) {
            trust.untrusted.push(url);
            if (trust.trusted.includes(url)) {
                trust.trusted.splice(trust.trusted.indexOf(url), 1);
            }
        }
        chrome.tabs.remove(id);
    } else {
        console.log(id);
        if (!trust.trusted.includes(url)) {
            trust.trusted.push(url);
            if (trust.untrusted.includes(url)) {
                trust.untrusted.splice(trust.untrusted.indexOf(url), 1);
            }
        }
    }
    console.log(trust);
    chrome.storage.local.set(trust);
});

chrome.runtime.onMessage.addListener((mes, sender, response) => {
    if (mes.type !== "turn")
        return;
    if (mes.method === "get") {
        response({ "type": "turning", "state": workingState });
    } else {
        workingState = !workingState;
        console.log(workingState);
        response({ "type": "turning", "state": workingState });
    }
});

function updateBL() {
    let blacklist = "";
    for (let i = 0; i < trust.untrusted?.length; i++) {
        blacklist += `<tr>
    <td id="burl${i}">${trust.untrusted[i]}</td>
    <td class="close">
        <button class="btn burl" onclick="removeFromBlack(${i})">X</button>
    </td>
</tr>`;
    }
    blacklist += `<tr>
    <td>
        <input type="text" id="newBlack">
    </td>
    <td class="close">
        <button id="newBlackSubbmit" class="btn" onclick="addBlack">+</button>
    </td>
</tr>`;
    return blacklist;
}

function updateWL() {
    let whitelist = "";
    for (let i = 0; i < trust.trusted?.length; i++) {
        whitelist += `<tr>
    <td id="wurl${i}">${trust.trusted[i]}</td>
    <td class="close">
        <button class="btn wurl" onclick="removeFromWhite(${i})">X</button>
    </td>
</tr>`;
    }
    whitelist += `<tr>
    <td>
        <input type="text" id="newWhite">
    </td>
    <td class="close">
        <button id="newWhiteSubbmit" class="btn" onclick="addWhite">+</button>
    </td>
</tr>`;
    return whitelist;
}

chrome.runtime.onMessage.addListener((mes, sender, response) => {
    if (mes.type !== "list")
        return;
    if (mes.method === "get") {
        console.log("get manages worked")
        let result = "";
        if (mes.target === "black") {
            result = updateBL();
        } else {
            result = updateWL();
        }
        response({ "type": "listing", "response": result });
    } else if (mes.method === "set") {
        console.log("set manages worked")
        if (mes.target === "black") {
            if (!trust.hasOwnProperty("untrusted")) {
                trust.untrusted = [];
            }
            trust.untrusted.push(mes.url);
            if (trust.trusted?.includes(mes.url)) {
                trust.trusted.splice(trust.trusted.indexOf(mes.url), 1);
            }
            response({ "type": "listing", "response": "success" });
        } else {
            if (!trust.hasOwnProperty("trusted")) {
                trust.trusted = [];
            }
            trust.trusted.push(mes.url);
            if (trust.untrusted?.includes(mes.url)) {
                trust.untrusted.splice(trust.untrusted.indexOf(mes.url), 1);
            }
            response({ "type": "listing", "response": "success" });
        }
        console.log(trust);
        chrome.storage.local.set(trust);
    } else { // mes.method === "del"
        console.log("del manages worked")
        if (mes.target === "black") {
            if (trust.untrusted?.includes(mes.url)) {
                trust.untrusted.splice(trust.untrusted.indexOf(mes.url), 1);
            }
            response({ "type": "listing", "response": "success" });
        } else {
            if (trust.trusted?.includes(mes.url)) {
                trust.trusted.splice(trust.trusted.indexOf(mes.url), 1);
            }
            response({ "type": "listing", "response": "success" });
        }
        console.log(trust);
        chrome.storage.local.set(trust);
    }
});

chrome.runtime.onMessage.addListener((mes, sender, response) => {
    if (mes.type !== "open")
        return;
    chrome.tabs.create({
        "url": mes.target,
        "active": true
    });
});
