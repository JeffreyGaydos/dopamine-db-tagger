window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#tag").focus();
    var responseJson = JSON.parse(document.querySelector("#response").innerHTML);
    RenderMetadata(responseJson[0]);
    AddAudio(responseJson[0]);
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
}

function AddAudio(json) {
    // let actualPath = json.Path;
    // actualPath = actualPath.replaceAll(/\s/g, "%20");
    // actualPath = actualPath.replaceAll(/F:[\/\\]Music[\/\\]/g, "");
    // // actualPath = "../../" + actualPath;
    // console.log(actualPath);
    // var audio = document.querySelector("audio #audio-path");
    // audio.setAttribute("src", "../../" + actualPath);
}

function ReturnIfExistsAndNotSet(normalized, rawData) {
    if(normalized) return normalized;
    if(rawData) {
        return rawData;
    }
}