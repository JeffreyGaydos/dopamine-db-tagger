console.log("Sequence form");

document.querySelector("#tag-type").addEventListener("change", (e) => {
    var revealOption = e.target.value;
    console.log(revealOption);
    var selector = '.revealable[by="' + revealOption + '"]';
    // document.querySelector(selector)?.style.display = "block";
});