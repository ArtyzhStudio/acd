document.getElementById("lang").addEventListener("click", () => {
    let frame = document.getElementById("inner");
    if (frame.src.indexOf("engman.html") >= 0)
        frame.src = "./ruman.html";
    else
        frame.src = "./engman.html";
});
