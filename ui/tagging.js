window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#tag").focus();
    var responseJson = JSON.parse(document.querySelector("#response").innerHTML);
    RenderMetadata(responseJson);
    AddHandlers(responseJson);
    console.log(responseJson.currentTags[0]);
    responseJson.currentTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag));
    responseJson.allTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#all-tags-box"));
});

function RenderMetadata(json) {
    var normalizedTitle = undefined;
    normalizedTitle =  ReturnIfExistsAndNotSet(normalizedTitle, json.TrackTitle);
    normalizedTitle =  ReturnIfExistsAndNotSet(normalizedTitle, json.FileName);
    normalizedTitle =  ReturnIfExistsAndNotSet(normalizedTitle, "Unknown Track");

    var normalizedArtist = undefined;
    normalizedArtist = ReturnIfExistsAndNotSet(normalizedArtist, json.Artists);
    normalizedArtist = ReturnIfExistsAndNotSet(normalizedArtist, json.AlbumArtists);
    normalizedArtist = ReturnIfExistsAndNotSet(normalizedArtist, "Unknown Artist");
    normalizedArtist = SanitizeArtistName(normalizedArtist);

    var normalizedAlbum = undefined;
    normalizedAlbum = ReturnIfExistsAndNotSet(normalizedAlbum, json.AlbumTitle);
    normalizedAlbum = ReturnIfExistsAndNotSet(normalizedAlbum, json.AlbumKey3);
    normalizedAlbum = ReturnIfExistsAndNotSet(normalizedAlbum, "Unknown Album");

    console.log(normalizedTitle);
    console.log(normalizedArtist);

    document.querySelector("#track-name").innerText = normalizedTitle
    document.querySelector("#track-artist").innerText = normalizedArtist
    document.querySelector("#track-album").innerText = normalizedAlbum;

    document.querySelector("title").innerText += `${normalizedTitle} | ${normalizedArtist} | ${normalizedAlbum}`;
}

function ReturnIfExistsAndNotSet(normalized, rawData) {
    if(normalized) return normalized;
    if(rawData) {
        return rawData;
    }
}

function AddHandlers(json) {
    document.querySelector("#previous-track").href = `./${json.pageInfo.previous}`;
    document.querySelector("#next-track").href = `./${json.pageInfo.next}`;
}

function AddTagToUI(tagName, isArtist, boxSelector = "#current-tags-box") {
    console.log(tagName);
    console.log(isArtist);
    const tagElement = document.createElement("DIV");
    tagElement.classList.add("tag");
    if(isArtist) tagElement.classList.add("a");
    tagElement.innerText = tagName;
    const xButton = document.createElement("BUTTON");
    xButton.innerHTML = "&Cross;"
    tagElement.appendChild(xButton);

    document.querySelector(boxSelector).appendChild(tagElement);
}