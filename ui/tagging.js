window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#tag").focus();
    document.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
    });
    var responseJson = JSON.parse(document.querySelector("#response").innerHTML);
    RenderMetadata(responseJson);
    AddHandlers(responseJson);
    console.log(responseJson.currentTags[0]);
    responseJson.currentTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag));
    responseJson.allTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#all-tags-box"));
    setInterval(() => {
        SearchInterval(responseJson.TrackID);
    }, 250);
    document.querySelector("#is-artist").addEventListener("change", () => {
        previousSearchQuery = ""; //If the artist tag state changes, we should force a refresh of the search
        SearchInterval(responseJson.TrackID);
    });
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

function AddTagToUI(tagName, isArtist, boxSelector = "#current-tags-box", showX = true, endpoints = undefined) {
    const tagElement = document.createElement("BUTTON");
    tagElement.classList.add("tag");
    if(isArtist) tagElement.classList.add("a");
    tagElement.innerText = tagName;
    if(endpoints?.AddParams) {
        tagElement.addEventListener("click", () => {
            fetch(`http://localhost:8080/api/tag/add/${endpoints.AddParams.trackID}/${encodeURI(tagName)}`).then((f) => {
                f.json().then(r => {
                    HandleAddTagResponse(r, endpoints.AddParams.trackID);
                });
            });
        });
    }
    if(showX) {
        const xButton = document.createElement("BUTTON");
        xButton.innerHTML = "&Cross;"
        tagElement.appendChild(xButton);
    }

    document.querySelector(boxSelector).appendChild(tagElement);
}

let previousSearchQuery = "";

function SearchInterval(trackID) {
    const queryString = document.querySelector("#tag").value;
    if(queryString == previousSearchQuery) return;
    const srBox = document.querySelector("#search-results");
    const ntDisplay = document.querySelector("#new-tag-display");
    if(queryString == "") {
        srBox.innerHTML = ""; //clear existing results
        ntDisplay.innerHTML = "";
        document.querySelector("#new-tag-blurb").style.display = "none";
        document.querySelector("#existing-tag-blurb").style.display = "none";
        previousSearchQuery = queryString;
        return;
    }
    console.log(`Searching for tag "${queryString}" (${encodeURI(queryString)})`);
    fetch(`http://localhost:8080/api/search/tags/${trackID}/${encodeURI(queryString)}`).then((f) => {
        f.json().then(r => {
            srBox.innerHTML = ""; //clear existing results
            ntDisplay.innerHTML = "";
            document.querySelector("#new-tag-blurb").style.display = "none";
            document.querySelector("#existing-tag-blurb").style.display = "none";
            if(!r[0]?.ExactMatch) {
                document.querySelector("#new-tag-blurb").style.display = "block";
                AddTagToUI(queryString, document.querySelector("#is-artist").checked, "#new-tag-display", false, {
                    AddParams: { trackID }
                });
            }
            if(r.length > 0) {
                document.querySelector("#existing-tag-blurb").style.display = "block";
            }
            r.forEach(sr => {
                AddTagToUI(sr.TagName, document.querySelector("#is-artist").checked, "#search-results", false, {
                    AddParams: { trackID }
                });
            });
        });
    });
    previousSearchQuery = queryString;
}

function HandleAddTagResponse(r, trackID) {
    if(r.rejectedTagAdd) {
        alert("ERROR: Tag was already present on the track. Tag not added"); //falback in case my disablement code isn't sealed
        return;
    }

    fetch(`http://localhost:8080/api/tag/refresh-lists/${trackID}/${r.shouldRefreshAllTagList ? 1 : 0}`).then((f) => {
        f.json().then(r => {
            document.querySelector("#current-tags-box").innerHTML = "";
            r.currentTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag));
            if(r.allTags) {
                document.querySelector("#all-tags-box").innerHTML = "";
                r.allTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#all-tags-box", {
                        AddParams: { trackID }
                }));
                console.log("Refreshed all tags list");
            }
        });
    });
    document.querySelector("#tag").value = "";
    document.querySelector("#tag").focus();
}