/*Copyright Mathias Bynens <https://mathiasbynens.be/>


'use strict';

/** Highest positive signed 32-bit float value */
const maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

/** Bootstring parameters */
const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128; // 0x80
const delimiter = '-'; // '\x2D'

/** Regular expressions */
const regexPunycode = /^xn--/;
const regexNonASCII = /[^\0-\x7F]/; // Note: U+007F DEL is excluded too.
const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

/** Error messages */
const errors = {
    'overflow': 'Overflow: input needs wider integers to process',
    'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
    'invalid-input': 'Invalid input'
};

/** Convenience shortcuts */
const baseMinusTMin = base - tMin;
const floor = Math.floor;
const stringFromCharCode = String.fromCharCode;

/*--------------------------------------------------------------------------*/

/**
 * A generic error utility function.
 * @private
 * @param {String} type The error type.
 * @returns {Error} Throws a `RangeError` with the applicable error message.
 */
function error(type) {
    throw new RangeError(errors[type]);
}

/**
 * A generic `Array#map` utility function.
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} callback The function that gets called for every array
 * item.
 * @returns {Array} A new array of values returned by the callback function.
 */
function map(array, callback) {
    const result = [];
    let length = array.length;
    while (length--) {
        result[length] = callback(array[length]);
    }
    return result;
}

/**
 * A simple `Array#map`-like wrapper to work with domain name strings or email
 * addresses.
 * @private
 * @param {String} domain The domain name or email address.
 * @param {Function} callback The function that gets called for every
 * character.
 * @returns {String} A new string of characters returned by the callback
 * function.
 */
function mapDomain(domain, callback) {
    const parts = domain.split('@');
    let result = '';
    if (parts.length > 1) {
        // In email addresses, only the domain name should be punycoded. Leave
        // the local part (i.e. everything up to `@`) intact.
        result = parts[0] + '@';
        domain = parts[1];
    }
    // Avoid `split(regex)` for IE8 compatibility. See #17.
    domain = domain.replace(regexSeparators, '\x2E');
    const labels = domain.split('.');
    const encoded = map(labels, callback).join('.');
    return result + encoded;
}

/**
 * Creates an array containing the numeric code points of each Unicode
 * character in the string. While JavaScript uses UCS-2 internally,
 * this function will convert a pair of surrogate halves (each of which
 * UCS-2 exposes as separate characters) into a single code point,
 * matching UTF-16.
 * @see `punycode.ucs2.encode`
 * @see <https://mathiasbynens.be/notes/javascript-encoding>
 * @memberOf punycode.ucs2
 * @name decode
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
function ucs2decode(string) {
    const output = [];
    let counter = 0;
    const length = string.length;
    while (counter < length) {
        const value = string.charCodeAt(counter++);
        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
            // It's a high surrogate, and there is a next character.
            const extra = string.charCodeAt(counter++);
            if ((extra & 0xFC00) == 0xDC00) { // Low surrogate.
                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
            } else {
                // It's an unmatched surrogate; only append this code unit, in case the
                // next code unit is the high surrogate of a surrogate pair.
                output.push(value);
                counter--;
            }
        } else {
            output.push(value);
        }
    }
    return output;
}

/**
 * Creates a string based on an array of numeric code points.
 * @see `punycode.ucs2.decode`
 * @memberOf punycode.ucs2
 * @name encode
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
const ucs2encode = codePoints => String.fromCodePoint(...codePoints);

/**
 * Converts a basic code point into a digit/integer.
 * @see `digitToBasic()`
 * @private
 * @param {Number} codePoint The basic numeric code point value.
 * @returns {Number} The numeric value of a basic code point (for use in
 * representing integers) in the range `0` to `base - 1`, or `base` if
 * the code point does not represent a value.
 */
const basicToDigit = function (codePoint) {
    if (codePoint >= 0x30 && codePoint < 0x3A) {
        return 26 + (codePoint - 0x30);
    }
    if (codePoint >= 0x41 && codePoint < 0x5B) {
        return codePoint - 0x41;
    }
    if (codePoint >= 0x61 && codePoint < 0x7B) {
        return codePoint - 0x61;
    }
    return base;
};

/**
 * Converts a digit/integer into a basic code point.
 * @see `basicToDigit()`
 * @private
 * @param {Number} digit The numeric value of a basic code point.
 * @returns {Number} The basic code point whose value (when used for
 * representing integers) is `digit`, which needs to be in the range
 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
 * used; else, the lowercase form is used. The behavior is undefined
 * if `flag` is non-zero and `digit` has no uppercase form.
 */
const digitToBasic = function (digit, flag) {
    //  0..25 map to ASCII a..z or A..Z
    // 26..35 map to ASCII 0..9
    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
};

/**
 * Bias adaptation function as per section 3.4 of RFC 3492.
 * https://tools.ietf.org/html/rfc3492#section-3.4
 * @private
 */
const adapt = function (delta, numPoints, firstTime) {
    let k = 0;
    delta = firstTime ? floor(delta / damp) : delta >> 1;
    delta += floor(delta / numPoints);
    for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
        delta = floor(delta / baseMinusTMin);
    }
    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};

/**
 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
 * symbols.
 * @memberOf punycode
 * @param {String} input The Punycode string of ASCII-only symbols.
 * @returns {String} The resulting string of Unicode symbols.
 */
const decode = function (input) {
    // Don't use UCS-2.
    const output = [];
    const inputLength = input.length;
    let i = 0;
    let n = initialN;
    let bias = initialBias;

    // Handle the basic code points: let `basic` be the number of input code
    // points before the last delimiter, or `0` if there is none, then copy
    // the first basic code points to the output.

    let basic = input.lastIndexOf(delimiter);
    if (basic < 0) {
        basic = 0;
    }

    for (let j = 0; j < basic; ++j) {
        // if it's not a basic code point
        if (input.charCodeAt(j) >= 0x80) {
            error('not-basic');
        }
        output.push(input.charCodeAt(j));
    }

    // Main decoding loop: start just after the last delimiter if any basic code
    // points were copied; start at the beginning otherwise.

    for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

        // `index` is the index of the next character to be consumed.
        // Decode a generalized variable-length integer into `delta`,
        // which gets added to `i`. The overflow checking is easier
        // if we increase `i` as we go, then subtract off its starting
        // value at the end to obtain `delta`.
        const oldi = i;
        for (let w = 1, k = base; /* no condition */; k += base) {

            if (index >= inputLength) {
                error('invalid-input');
            }

            const digit = basicToDigit(input.charCodeAt(index++));

            if (digit >= base) {
                error('invalid-input');
            }
            if (digit > floor((maxInt - i) / w)) {
                error('overflow');
            }

            i += digit * w;
            const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

            if (digit < t) {
                break;
            }

            const baseMinusT = base - t;
            if (w > floor(maxInt / baseMinusT)) {
                error('overflow');
            }

            w *= baseMinusT;

        }

        const out = output.length + 1;
        bias = adapt(i - oldi, out, oldi == 0);

        // `i` was supposed to wrap around from `out` to `0`,
        // incrementing `n` each time, so we'll fix that now:
        if (floor(i / out) > maxInt - n) {
            error('overflow');
        }

        n += floor(i / out);
        i %= out;

        // Insert `n` at position `i` of the output.
        output.splice(i++, 0, n);

    }

    return String.fromCodePoint(...output);
};

/**
 * Converts a Punycode string representing a domain name or an email address
 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
 * it doesn't matter if you call it on a string that has already been
 * converted to Unicode.
 * @memberOf punycode
 * @param {String} input The Punycoded domain name or email address to
 * convert to Unicode.
 * @returns {String} The Unicode representation of the given Punycode
 * string.
 */
const toUnicode = function (input) {
    return mapDomain(input, function (string) {
        return regexPunycode.test(string)
            ? decode(string.slice(4).toLowerCase())
            : string;
    });
};

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
    let dom = "";
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
    target = toUnicode(target);
    let eng = true;
    for (let i = 0; i < target.length; i++) {
        let e = target.charCodeAt(i);
        if (e >= 97 && e <= 122)
            continue;
        if (e >= 48 && e <= 57)
            continue;
        if (e === 45 || e === 46)
            continue;
        eng = false;
        break;
    }
    if (!eng)
        target = phoneticTranslate(target);
    let [first, second] = getDomains(target);

    let minit = 1000000000000000;
    let oneYearAgo = 3600 * 24 * 366;
    //console.log(`${second}:${first}`);
    let historyItems = await chrome.history.search({
        "text": '',
        "maxResults": 100,
        "startTime": oneYearAgo
    });

    let first2 = "";
    let second2 = "";
    //console.log(historyItems.length);
    for (let j = 0; j < historyItems.length; j++) {
        let i = historyItems[j];

        let [ifirst, isecond] = getDomains(i.url);
        ifirst = toUnicode(ifirst)
        isecond = toUnicode(isecond)
        if ((first === ifirst && isecond === second) || i.url.slice(0, 5) === "file:" || second === "" || trust.untrusted?.includes(isecond + '.' + ifirst))
            continue;
        let dim = Damerau_Levenshtejn(second, isecond);
        //console.log(`${isecond}:${ifirst}, ${i.url}, ${dim}`);
        if (dim < minit) {
            first2 = ifirst;
            second2 = isecond;
            minit = dim;
        }
    }
    //console.log(`${url}, ${minit}`);
    return callback(minit, first, second, first2, second2);
}

function phoneticTranslate(str, lang = "ru", target = "en") {
    const ENG = ["a", "b", "v", "g", "d", "e", "yo", "zh", "z", "i", "i", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "y", "y", "i", "e", "yu", "ya"];
    const KEYS = {
        "ru": {
            "а": 0,
            "б": 1,
            "в": 2,
            "г": 3,
            "д": 4,
            "е": 5,
            "ё": 6,
            "ж": 7,
            "з": 8,
            "и": 9,
            "й": 10,
            "к": 11,
            "л": 12,
            "м": 13,
            "н": 14,
            "о": 15,
            "п": 16,
            "р": 17,
            "с": 18,
            "т": 19,
            "у": 20,
            "ф": 21,
            "х": 22,
            "ц": 23,
            "ч": 24,
            "ш": 25,
            "щ": 26,
            "ъ": 27,
            "ы": 28,
            "ь": 29,
            "э": 30,
            "ю": 31,
            "я": 32
        }
    };

    let res = Array.from(str).map(e => {
        if (KEYS[lang].hasOwnProperty(e))
            return ENG[KEYS[lang][e]];
        else
            return e;
    });
    return res.join("");
}

var workingState = true;
chrome.runtime.sendMessage({ "type": "turning", "state": workingState });

var trust = {};
chrome.storage.local.get(callback = (e) => trust = e);

function userConfirm(url, id, suppose) {
    let projSec_extension_respose = confirm(`Please check URL link you are trying to connect to. I suppose it's wrong and you're going to get to ${suppose}. Do you want stay on this page?`);
    chrome.runtime.sendMessage({ "type": "userconfirm", "id": id, "url": url, "projSec_extension_respose": projSec_extension_respose });
    //return { "id": id, "url": url, "projSec_extension_respose": projSec_extension_respose };
}

async function catchUrlAndConfirm(id, change, tab) {
    if (workingState === false)
        return;
    let URL = tab.url;
    let attention = await find(URL, (minit, first, second, first2, second2) => {
        console.log("====" + second2 + '.' + first2);
        console.log(second + '.' + first);
        let res = (second.length + second2.length) * (1 / 6) >= minit;
        return { "url": second + '.' + first, "danger": res, "suppose": second2 + '.' + first2 };
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
                "target": { tabId: id, frameIds: [0] },
                "func": userConfirm,
                "args": [attention.url, id, attention.suppose]
            }
        );
    }
}

function updateBL() {
    let blacklist = "";
    for (let i = 0; i < trust.untrusted?.length; i++) {
        blacklist += `<tr>
    <td>${trust.untrusted[i]}</td>
    <td class="close">
        <button class="btn" onclick="removeFromBlack(${i})">X</button>
    </td>
</tr>`;
    }
    blacklist += `<tr>
    <td>
        <input type="text" id="newBlack">
    </td>
    <td class="close">
        <button class="btn" onclick="addBlack">+</button>
    </td>
</tr>`;
    return blacklist;
}

function updateWL() {
    let whitelist = "";
    for (let i = 0; i < trust.trusted?.length; i++) {
        whitelist += `<tr>
    <td>${trust.trusted[i]}</td>
    <td class="close">
        <button class="btn" onclick="removeFromWhite(${i})">X</button>
    </td>
</tr>`;
    }
    whitelist += `<tr>
    <td>
        <input type="text" id="newWhite">
    </td>
    <td class="close">
        <button class="btn" onclick="addWhite">+</button>
    </td>
</tr>`;
    return whitelist;
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
        console.log(result);
        response({ "type": "listing", "response": result });
    } else {
        if (mes.target === "black") {
            trust.untrusted.push(mes.url)
        } else {
            trust.trusted.push(mes.url)
        }
        response("success");
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
