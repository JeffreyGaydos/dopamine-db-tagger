window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#tag").focus();
    document.querySelector("#tag").addEventListener("keydown", (e) => {
        const chooseExisting = e.key == 'Enter' && !e.shiftKey;
        const chooseNew = e.key == 'Enter' && e.shiftKey;
        if(chooseExisting || chooseNew) {
            const chosenTag = document.querySelector(`${chooseExisting ? "#search-results" : "#new-tag-display"} .tag:nth-child(1)`);
            if(chosenTag) chosenTag.click(); //TODO this double clicks for some reason...
        }
    })
    document.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
    });
    var responseJson = JSON.parse(document.querySelector("#response").innerHTML);
    RenderMetadata(responseJson);
    AddHandlers(responseJson);
    console.log(responseJson.currentTags[0]);
    responseJson.currentTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#current-tags-box", {
        RemoveParams: { trackID: responseJson.TrackID }
    }));
    responseJson.allTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#all-tags-box", {
        AddParams: { trackID: responseJson.TrackID },
        DeleteParams: { trackID: responseJson.TrackID }
    }, responseJson.currentTags.filter(ct => ct.TagName == t.TagName).length > 0));
    setInterval(() => {
        SearchInterval(responseJson.TrackID);
    }, 250);
    document.querySelector("#is-artist").addEventListener("change", () => {
        previousSearchQuery = ""; //If the artist tag state changes, we should force a refresh of the search
        SearchInterval(responseJson.TrackID);
    });
    document.querySelector("#remove-all").addEventListener("click", () => {
        if(confirm("Remove all tags from this track?")) {
            document.querySelectorAll("#current-tags-box .tag").forEach(t => {
                fetch(`http://localhost:8080/api/tag/remove/${responseJson.TrackID}/${t.getAttribute("ev")}`).then((f) => {
                    HandleRemoveTagResponse(responseJson.TrackID);
                });
            });
        }
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

let addLoading = false; //kind of used as a debouncer
let removeLoading = false;
let deleteLoading = false;

function AddTagToUI(tagName, isArtist, boxSelector, endpoints = undefined, disabled=false) {
    const tagElement = document.createElement("BUTTON");
    tagElement.classList.add("tag");
    tagElement.setAttribute("ev", tagName);
    if(isArtist) tagElement.classList.add("a");
    tagElement.innerText = tagName;
    if(endpoints?.AddParams) {
        tagElement.addEventListener("click", () => {
            if(!addLoading) {
                addLoading = true;
                fetch(`http://localhost:8080/api/tag/add/${endpoints.AddParams.trackID}/${encodeURI(tagName)}`).then((f) => {
                    f.json().then(r => {
                        HandleAddTagResponse(r, endpoints.AddParams.trackID);
                        addLoading = false;
                    });
                });
            }
        });
    }
    if(disabled) tagElement.setAttribute("disabled", null);
    if(endpoints?.RemoveParams || endpoints?.DeleteParams) {
        const xButton = document.createElement("BUTTON");
        xButton.innerHTML = "&Cross;"
        if(endpoints?.RemoveParams) {
            xButton.addEventListener("click", () => {
                if(!removeLoading) {
                    removeLoading = true;
                    fetch(`http://localhost:8080/api/tag/remove/${endpoints.RemoveParams.trackID}/${encodeURI(tagName)}`).then((f) => {
                        HandleRemoveTagResponse(endpoints.RemoveParams.trackID);
                        removeLoading = false;
                    });
                }
            });
        }
        if(endpoints?.DeleteParams) {
            xButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(!deleteLoading) {
                    deleteLoading = true;
                    fetch(`http://localhost:8080/api/tag/usage/${encodeURI(tagName)}`).then((f) => {
                        f.json().then(r => {
                            trackCount = r.trackCount[0]["COUNT(*)"];
                            artistCount = r.artistCount[0]["COUNT(*)"]
                            if(confirm(`Confirm Deletion of Tag, affects ${trackCount} tracks excluding ${artistCount} artists`)) {
                                fetch(`http://localhost:8080/api/tag/delete/${encodeURI(tagName)}`).then((f) => {
                                    HandleDeleteTagResponse(endpoints.DeleteParams.trackID);
                                    deleteLoading = false;
                                });
                            } else {
                                deleteLoading = false;
                            }
                        });
                    });
                }
            });
        }
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
            document.querySelector("#existing-tag-blurb").style.display = "none"            
            if(!r[0]?.ExactMatch) {
                document.querySelector("#new-tag-blurb").style.display = "block";
                AddTagToUI(queryString, document.querySelector("#is-artist").checked, "#new-tag-display", {
                    AddParams: { trackID }
                });
            }
            if(r.filter(e => e.AlreadyOnTrack == 0).length > 0) {
                document.querySelector("#existing-tag-blurb").style.display = "block";
            }
            r.filter(e => e.AlreadyOnTrack == 0).forEach(sr => {
                AddTagToUI(sr.TagName, document.querySelector("#is-artist").checked, "#search-results", {
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
    RefreshLists(r.shouldRefreshAllTagList, trackID);
    document.querySelector("#tag").value = "";
    document.querySelector("#tag").focus();
}

function HandleRemoveTagResponse(trackID) {
    RefreshLists(false, trackID);
}

function HandleDeleteTagResponse(trackID) {
    RefreshLists(true, trackID);
}

function RefreshLists(shouldRefreshAllTagList, trackID) {
    fetch(`http://localhost:8080/api/tag/refresh-lists/${trackID}/${shouldRefreshAllTagList ? 1 : 0}`).then((f) => {
        f.json().then(r => {
            console.log(r);
            document.querySelector("#current-tags-box").innerHTML = "";
            r.currentTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#current-tags-box", {
                RemoveParams: { trackID }
            }));
            if(r.allTags) {
                document.querySelector("#all-tags-box").innerHTML = "";
                r.allTags.forEach(t => AddTagToUI(t.TagName, t.IsArtistTag, "#all-tags-box", {
                    AddParams: { trackID },
                    DeleteParams: { trackID }
                }, r.currentTags.filter(ct => ct.TagName == t.TagName).length > 0));
                console.log("Refreshed all tags list");
            }
        });
    });
}