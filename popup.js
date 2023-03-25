btn.addEventListener("click", main);

function print(text) {
    idid.innerHTML = `<h1>${text}</h1>`;
}

function main() {
    comparation(url1.value, url2.value).then(e => {
        console.log(e);
    });
}
