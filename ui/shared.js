function SanitizeArtistName(raw) {
    let trimmed = raw.replaceAll(/^;|;$/g, "");
    let eachArtist = trimmed.split(";;");
    if(eachArtist.length === 1) {
        return trimmed;
    }
    if(eachArtist.length === 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(" ");
    }
    if(eachArtist.length > 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(", ");
    }
}

function CreateTag(tagName, color, isArtist, enableHtml=false, additionalClass=undefined) {
    const tagElement = document.createElement("BUTTON");
    tagElement.classList.add("tag");
    if(additionalClass)
        tagElement.classList.add(additionalClass);
    tagElement.setAttribute("ev", tagName);
    tagElement.style.setProperty("--the-color", color);
    const redThreshold = parseInt("0xAA", 16);
    const greenThreshold = parseInt("0x55", 16);
    const blueThreshold = parseInt("0xFF", 16);
    const redInt = parseInt("0x" + color.substring(1, 3), 16);
    const greenInt = parseInt("0x" + color.substring(3, 5), 16);
    const blueInt = parseInt("0x" + color.substring(5), 16);
    tagElement.style.backgroundColor = "var(--the-color)"; // used for disabled color
    const textColor = (redInt > redThreshold || blueInt > blueThreshold || greenInt > greenThreshold) ? "black" : "white";
    tagElement.style.color = textColor;
    tagElement.style.setProperty("--the-text-color", textColor);
    if(isArtist) tagElement.classList.add("a");
    if(enableHtml) {
        tagElement.innerHTML = tagName;
    } else {
        tagElement.innerText = tagName;
    }
    return tagElement;
}
