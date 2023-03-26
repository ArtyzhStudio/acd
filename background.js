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

function getDomains(url) {
    let ind = url.indexOf('//');
    if (ind === -1)
        ind = -2;
    let dom = '';
    for (let i = ind + 2; i < url.length && url[i] != '/'; i++)
        dom += url[i];
    let flag = 0;
    let res = ["", ""];
    for (let i = dom.length - 1; i >= 0 && flag < 2; i--) {
        if (dom[i] === '.')
            flag++;
        else
            res[flag] = dom[i] + res[flag];
    }
    return res;
}

async function find(target, callback, trust = {}) {
    let minit = 1000000000000000;
    let oneYearAgo = 3600 * 24 * 366;
    let [first, second] = getDomains(target);
    //console.log(`${second}:${first}`);
    let res, dist;
    let historyItems = await chrome.history.search({
        'text': '',
        'maxResults': 100,
        'startTime': oneYearAgo
    });
    let url = "";
    //console.log(historyItems.length);
    for (let j = 0; j < historyItems.length; j++) {
        let i = historyItems[j];
        let [ifirst, isecond] = getDomains(i.url);
        if ((first === ifirst && isecond === second) || i.url.slice(0, 5) === "file:" || second === "" || trust.untrusted?.includes(isecond + '.' + ifirst))
            continue;
        let dim = Damerau_Levenshtejn(second, isecond);
        //console.log(`${isecond}:${ifirst}, ${i.url}, ${dim}`);
        if (dim < minit) {
            url = i.url;
            minit = dim;
        }
    }
    //console.log(`${url}, ${minit}`);
    res = url;
    dist = minit;
    return callback(url, minit, first, second);
}

// function print(url, minit) {
//     alert(`${url}, ${minit}`);
// }

// function init(item) {
//     let target = item.url;
//     find(target, print);
// }

var trust = {};
chrome.storage.local.get(callback = (e) => trust = e);

function userConfirm(url, id, suppose) {
    let projSec_extension_respose = confirm(`Please check URL link you are trying to connect to. I suppose it's wrong and you're going to get to ${suppose}. Do you want stay on this page?`);
    chrome.runtime.sendMessage({ id: id, url: url, projSec_extension_respose: projSec_extension_respose });
    //return { "id": id, "url": url, "projSec_extension_respose": projSec_extension_respose };
}

async function catchUrlAndConfirm(id, change, tab) {
    let URL = tab.url;
    let attention = await find(URL, (url, minit, first, second) => {
        console.log(url);
        let res = (first.length + second.length) * 0.333 >= minit;
        return { url: second + '.' + first, danger: res, suppose: url };
    }, trust);
    console.log(trust);
    if (trust.trusted?.includes(attention.url)) {
        console.log(2);
        attention.danger = false;
    }
    if (trust.untrusted?.includes(attention.url)) {
        console.log(2);
        attention.danger = true;
    }
    console.log(attention);
    if (attention.danger) {
        chrome.scripting.executeScript(
            {
                target: { tabId: id, frameIds: [0] },
                func: userConfirm,
                args: [attention.url, id, attention.suppose]
            }
        );
    }
}

chrome.tabs.onUpdated.addListener(
    catchUrlAndConfirm
);

chrome.runtime.onMessage.addListener(mes => {
    if (!mes.hasOwnProperty("projSec_extension_respose"))
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
