window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#tag").focus();
    var responseJson = JSON.parse(document.querySelector("#response").innerHTML);
    RenderMetadata(responseJson[0]);
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
    normalizedArtist = normalizedArtist.replaceAll(/^;|;$/g, "");

    var normalizeAlbum = undefined;
    normalizeAlbum = ReturnIfExistsAndNotSet(normalizeAlbum, json.AlbumTitle);
    normalizeAlbum = ReturnIfExistsAndNotSet(normalizeAlbum, json.AlbumKey3);
    normalizeAlbum = ReturnIfExistsAndNotSet(normalizeAlbum, "Unknown Album");

    console.log(normalizedTitle);
    console.log(normalizedArtist);

    document.querySelector("#track-name").innerText = normalizedTitle
    document.querySelector("#track-artist").innerText = normalizedArtist
    document.querySelector("#track-album").innerText = normalizeAlbum;
}

function ReturnIfExistsAndNotSet(normalized, rawData) {
    if(normalized) return normalized;
    if(rawData) {
        return rawData;
    }
}