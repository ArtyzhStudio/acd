var out = document.getElementById("idid");
var inp = document.getElementById("textid");

var btn = document.getElementById("but");
btn.addEventListener("click", main);

function print(url, minit) {
    out.innerHTML = `<h1>${url}</h1><h1>${minit}</h1>`;
}

function main() {
    let target = inp.value;
    find(target, print);
}
