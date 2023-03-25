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

async function find(target, callback) {
    let minit = 1000000000000000;
    let oneYearAgo = 3600 * 24 * 366;
    let [first, second] = getDomains(target);
    //console.log(`${second}:${first}`);
    let res, dist;
    historyItems = await chrome.history.search({
        'text': '',
        'maxResults': 100,
        'startTime': oneYearAgo
    });
    let url = "";
    //console.log(historyItems.length);
    for (let j = 0; j < historyItems.length; j++) {
        let i = historyItems[j];
        let [ifirst, isecond] = getDomains(i.url);
        if ((first === ifirst && isecond === second) || i.url.slice(0, 5) === "file:")
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

async function comparation(url1, url2) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url1, false);
    //xhr.responseType = 'document';
    xhr.send();
    let doc1 = xhr.responseText;
    //xhr.open("GET", url2, false);
    //xhr.send();
    //let doc2 = xhr.responseXML;
    //console.log(doc1);
    e = getStyles(doc1)
    return e;
    //console.log(doc2);
}

function getStyles(string) {
    let dom = (new DOMParser()).parseFromString(string, "text/html");
    console.log(typeof dom);
    let styles = [];
    dom.querySelectorAll("[style]").forEach(e => {
        styles = [...styles, ...e.getAttribute("style").split(';')];
    });
    dom.querySelectorAll("style").forEach(e => {
        styles = [...styles, ...e.innerHTML.match(/\{.+?\}/sgi).map(r => r.slice(1, r.length - 1).split(";").flat()).flat()]
    });
    return styles;
}
