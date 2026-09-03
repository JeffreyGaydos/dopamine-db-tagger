let sort = "date";

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
    responseJson.currentTags.forEach(t => AddTagToUI(t.TagName, t.Color, t.IsArtistTag, responseJson.TrackID, "#current-tags-box", {
        RemoveParams: true
    }));
    responseJson.allTags.forEach(t => AddTagToUI(t.TagName, t.Color, t.IsArtistTag, responseJson.TrackID, "#all-tags-box", {
        AddParams: true,
        DeleteParams: true,
        EditParams: true
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
    document.body.addEventListener("keydown", (e) => {
        if(e.key === "MediaTrackNext") {
            document.querySelector("#next-track").click();
        }
        else if(e.key === "MediaTrackPrevious") {
            document.querySelector("#previous-track").click();
        }
    });

    // Doing it this way because you can't prevent the redirect will still allowing the form to submit without creating performance issues (iframes in iframes in iframes)
    document.querySelector("#edit-modal form").addEventListener("submit", (e) => {
        e.preventDefault();
        const tagName = document.querySelector("#edit-modal form #tag-name").value;
        const newColor = document.querySelector("#edit-modal form #new-tag-color").value;
        const newTagName = document.querySelector("#edit-modal form #new-tag-name").value;
        fetch(`http://localhost:8080/api/tag/edit`, {
            method: "POST",
            body: JSON.stringify({
                tagName,
                newColor,
                newTagName
            })
        }).then(r => {
            r.json().then(validationErrors => {
                HandleEditTagResponse(responseJson.TrackID, validationErrors);
            });
        });
    });

    // Refreshes the preview of the new tag's color in real time
    document.querySelector("#color").addEventListener("change", (e) => {
        const queryString = document.querySelector("#tag").value;
        const ntDisplay = document.querySelector("#new-tag-display");
        const isArtist = document.querySelector("#is-artist").checked;

        if(queryString !== "" && queryString !== undefined && queryString !== null) {
            ntDisplay.innerHTML = "";
            AddTagToUI(queryString, e.target.value, isArtist, responseJson.TrackID, "#new-tag-display", {
                AddParams: true
            });
        }
    });

    document.querySelector("#all-tag-sort").addEventListener("change", (e) => {
        sort = e.target.value;
        RefreshLists(true, responseJson.TrackID);
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
let editLoading = false;

function AddTagToUI(tagName, color, isArtist, trackID, boxSelector, endpoints = undefined, disabled=false) {
    const tagElement = document.createElement("BUTTON");
    tagElement.classList.add("tag");
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
    tagElement.innerText = tagName;
    if(endpoints?.AddParams) {
        tagElement.addEventListener("click", () => {
            if(!addLoading) {
                addLoading = true;
                fetch(`http://localhost:8080/api/tag/add`, {
                    method: "POST",
                    body: JSON.stringify({
                        trackID,
                        tagName,
                        color,
                        isArtist
                    })
                }).then((f) => {
                    f.json().then(r => {
                        HandleAddTagResponse(r, trackID);
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
                    fetch(`http://localhost:8080/api/tag/remove/${trackID}/${encodeURIComponent(tagName)}`).then((f) => {
                        HandleRemoveTagResponse(trackID);
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
                    fetch(`http://localhost:8080/api/tag/usage/${encodeURIComponent(tagName)}`).then((f) => {
                        f.json().then(r => {
                            if(confirm(`Confirm deletion of tag, affects ${r.trackCount} track tags, ${r.artistCount} artist tags, ${r.allCount} total tracks.`)) {
                                fetch(`http://localhost:8080/api/tag/delete/${encodeURIComponent(tagName)}`).then((f) => {
                                    HandleDeleteTagResponse(trackID);
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

    if(endpoints?.EditParams) {
        const editModal = document.querySelector("#edit-modal");
        const eButton = document.createElement("BUTTON");
        eButton.classList.add("edit");
        eButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
</svg>`;
        eButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if(!editLoading) {
                editLoading = true;
                fetch(`http://localhost:8080/api/tag/usage/${encodeURIComponent(tagName)}`).then((f) => {
                    f.json().then(r => {
                        const baseMessage = `Modifying the tag "${tagName}" will effect ${r.trackCount} track tags, ${r.artistCount} artist tags, ${r.allCount} total tracks.`;
                        editModal.querySelector("p").innerText = baseMessage;
                        editModal.querySelector("#tag-name").value = tagName;
                        editModal.querySelector("#new-tag-name").value = tagName;
                        editModal.querySelector("#new-tag-color").value = color;
                        editModal.show(); //cannot use invoker commands for this because of the heirarchy or something similar, not sure
                        editModal.querySelector("#new-tag-name").focus();
                        editLoading = false;
                    });
                });
            }
        })
        tagElement.appendChild(eButton);
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
    console.log(`Searching for tag "${queryString}" (${encodeURIComponent(queryString)})`);
    fetch(`http://localhost:8080/api/search/tags/${trackID}/${encodeURIComponent(queryString)}`).then((f) => {
        f.json().then(r => {
            srBox.innerHTML = ""; //clear existing results
            ntDisplay.innerHTML = "";
            document.querySelector("#new-tag-blurb").style.display = "none";
            document.querySelector("#existing-tag-blurb").style.display = "none"            

            const color = document.querySelector("#color").value;
            const isArtist = document.querySelector("#is-artist").checked

            if(!r[0]?.ExactMatch) {
                document.querySelector("#new-tag-blurb").style.display = "block";
                AddTagToUI(queryString, color, isArtist, trackID, "#new-tag-display", {
                    AddParams: true
                });
            }
            if(r.filter(e => e.AlreadyOnTrack == 0).length > 0) {
                document.querySelector("#existing-tag-blurb").style.display = "block";
            }
            r.filter(e => e.AlreadyOnTrack == 0).forEach(sr => {
                AddTagToUI(sr.TagName, sr.Color, isArtist, trackID, "#search-results", {
                    AddParams: true
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

function HandleEditTagResponse(trackID, validationErrors) {
    if(validationErrors.length === 0) {
        RefreshLists(true, trackID);
        document.querySelector("#edit-modal").close();
    } else {
        validationErrors.forEach(v => {
            alert(v);
        });
    }
}

function RefreshLists(shouldRefreshAllTagList, trackID) {
    fetch(`http://localhost:8080/api/tag/refresh-lists/${trackID}/${shouldRefreshAllTagList ? 1 : 0}`).then((f) => {
        f.json().then(r => {
            document.querySelector("#current-tags-box").innerHTML = "";
            console.log(r.currentTags);
            r.currentTags.forEach(t => AddTagToUI(t.TagName, t.Color, t.IsArtistTag, trackID, "#current-tags-box", {
                RemoveParams: true
            }));
            if(r.allTags) {
                document.querySelector("#all-tags-box").innerHTML = "";
                let sortedAllTags = r.allTags;
                switch(sort) {
                    case "date":
                        break;
                    case "date-d":
                        sortedAllTags = sortedAllTags.reverse();
                        break;
                    case "alpha":
                        sortedAllTags = sortedAllTags.sort((t1, t2) => {
                            if(t1.TagName > t2.TagName) {
                                return 1;
                            }
                            else if (t1.TagName < t2.TagName) {
                                return -1;
                            }
                            else {
                                return 0;
                            }
                        });
                        break;
                    case "alpha-d":
                        sortedAllTags = sortedAllTags.sort((t1, t2) => {
                            if(t1.TagName > t2.TagName) {
                                return -1;
                            }
                            else if (t1.TagName < t2.TagName) {
                                return 1;
                            }
                            else {
                                return 0;
                            }
                        });
                        break;
                    case "color":
                        sortedAllTags = sortedAllTags.sort((t1, t2) => parseInt(t2.Color.substring(1), 16) - parseInt(t1.Color.substring(1), 16));
                        break;
                    case "color-d":
                        sortedAllTags = sortedAllTags.sort((t1, t2) => parseInt(t1.Color.substring(1), 16) - parseInt(t2.Color.substring(1), 16));
                        break;
                }
                console.log(sortedAllTags);
                sortedAllTags.forEach(t => AddTagToUI(t.TagName, t.Color, t.IsArtistTag, trackID, "#all-tags-box", {
                    AddParams: true,
                    DeleteParams: true,
                    EditParams: true
                }, r.currentTags.filter(ct => ct.TagName == t.TagName).length > 0));
            }
        });
    });
}