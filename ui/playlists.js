window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#execute").addEventListener("click", (e) => {
        e.preventDefault();
        const query = document.querySelector("#query").value;
        (async () => await HandleExecuteRawQuery(query, 20))();
    });

    document.querySelector("#full-results").addEventListener("click", (e) => {
        e.preventDefault();
        const query = document.querySelector("#query").value;
        (async () => await HandleExecuteRawQuery(query, 1000))();
    });

    document.querySelector("#generate-playlist").addEventListener("click", (e) => {
        e.preventDefault();
        (async () => await HandleGeneratePlaylist())();
    });
});

async function HandleExecuteRawQuery(query, limit) {
    return new Promise((resolve) => {
        fetch(`http://localhost:8080/api/query/raw/${encodeURIComponent(query)}/${limit}`).then((f) => {
            f.json().then(r => {
                document.querySelector("#query-results").innerHTML = "";
                if(r.error) {
                    AddToQueryErrorBox(JSON.stringify(r.error));
                } else if(r.limited === undefined) {
                    AddToQueryErrorBox("Could not connect to the database. Check your configs in the <a href='./setup.html'>Setup Page</a>.");
                } else {
                    AddToQueryErrorBox(undefined); //innocent until proven guilty
                    if(r.limited) {
                        document.querySelector("#full-results").removeAttribute("disabled");
                    } else {
                        document.querySelector("#full-results").setAttribute("disabled", null);
                    }
                    if(r.results.length > 0) {
                        GenerateResultHeaderRow(r.results);
                        if(limit === true) {
                            // If we are gathering all rows, don't display all them because it takes a long time to display
                            r.results.slice(0, 20).forEach(row => {
                                GenerateResultRow(row);
                            });
                        } else {
                            r.results.forEach(row => {
                                GenerateResultRow(row);
                            });
                        }
                        if(!Object.keys(r.results[0]).includes("TrackID")) {
                            AddToQueryErrorBox(`Query did not contain a column named "TrackID" so cannot be used to generate a playlist.`);
                        }
                    }
                }
                resolve(r.results);
            }, (e) => {
                AddToQueryErrorBox(e);
                resolve([]);
            })
        }, (e) => {
            AddToQueryErrorBox(e);
            resolve([]);
        });
    });
}

async function HandleGeneratePlaylist() {
    document.querySelector("#download").setAttribute("disabled", null);
    const playlistName = document.querySelector("#playlist-name").value;
    if(playlistName.length === 0) {
        alert("Playlist name is missing");
        return;
    }
    const rawquery = document.querySelector("#query").value;
    const oneResult = await HandleExecuteRawQuery(rawquery, 1); //Can I get 1?
    if(document.querySelector("#right-pane .error:has(*)")) {
        alert("Current query has errors that need corrected");
        return;
    }
    if(oneResult.length === 0) {
        alert("query returned no results!");
        return;
    }
    const query = document.querySelector("#query").value;
    const splitQuery = query.split(/\bFROM\b/);
    console.log(splitQuery);
    if(splitQuery.length === 1) {
        alert("Could not find FROM clause in query. It may be empty.");
        return;
    }
    const queryConditions = query.replace(splitQuery[0], "");
    const alias = document.querySelector("#trackid-alias").value;
    const finalQuery = `
        SELECT DDBT_TRACK.TrackID, DDBT_TRACK.Path
        FROM (SELECT ${alias} ${queryConditions}) ORIG
        JOIN Track DDBT_TRACK
            ON DDBT_TRACK.TrackID = ORIG.TrackID`;
    const allResults = await HandleExecuteRawQuery(finalQuery, true);
    await HandleExecuteRawQuery(rawquery, 20);
    const replaceFrom = document.querySelector("#replace-from").value;
    const replaceTo = document.querySelector("#replace-to").value;
    const pType = document.querySelector("#playlist-type").value;
    let fileContents = "";
    switch(pType) {
        case "m3u-r":
            fileContents = await GenerateM3UPlaylist(allResults, true, replaceFrom, replaceTo);
            break;
        case "m3u-a":
            fileContents = await GenerateM3UPlaylist(allResults, false, replaceFrom, replaceTo);
            break;
    }
    //For future use if we want to allow re-importing for tweaks. At least the query will be saved if you want to use that again manually
    fileContents += "\n#Dopamine DB Tagger Playlist Generation Settings";
    fileContents += "\n#---Query---";
    fileContents += "\n#" + rawquery.split("\n").join("\n#");
    fileContents += "\n#---Alias---";
    fileContents += "\n#" + alias;
    fileContents += "\n#---Type---";
    fileContents += "\n#" + pType;
    fileContents += "\n#---ReplaceThis---";
    fileContents += "\n#" + replaceFrom;
    fileContents += "\n#---WithThis---";
    fileContents += "\n#" + replaceTo;
    fileContents += "\n#---Title---";
    fileContents += "\n#" + playlistName;
    EnableDownload(fileContents, ".m3u", playlistName);
}

async function GenerateM3UPlaylist(allResults, relativeToBasePath, replaceThis, withThis) {
    return new Promise((resolve) => {
        const output = document.querySelector("#playlist-results");    
        fetch(`http://localhost:8080/api/setup/configs/get`).then((f) => {
            f.json().then(r => {
                let regexReplacedBaseFolder = r.BaseFolderPath.replace(/[\\\/]/, "[\\\\\\/]");
                if(regexReplacedBaseFolder[regexReplacedBaseFolder.length = 1] !== "]") {
                    regexReplacedBaseFolder += "[\\\\\\/]";
                }
                const relativeReg = new RegExp(`${regexReplacedBaseFolder}`, "i");
                const replaceReg = new RegExp(`${replaceThis}`, "i");
                const finalRows = ["#EXTM3U"];
                allResults.forEach((a, i) => {
                    let path = a.Path;
                    console.log(path);
                    if(replaceThis) {
                        path = path.replace(replaceReg, withThis ?? "");
                    }
                    console.log(path);
                    if(relativeToBasePath) {
                        path = path.replace(relativeReg, "");
                    }
                    console.log(path);
                    finalRows.push(path);
                });
                output.value = finalRows.slice(0, 20).join("\n");
                resolve(finalRows.join("\n"));
            }, () => {
                resolve("");
            });
        }, () => {
            resolve("");
        });
    })
}

function EnableDownload(data, extension, name) {
    const downloadButton = document.querySelector("#download");
    const parent = downloadButton.parentElement;
    downloadButton.remove();
    const newDownloadButton = document.createElement("BUTTON");
    newDownloadButton.id = "download";
    newDownloadButton.innerText = `Download ${name}${extension}`;
    newDownloadButton.addEventListener("click", () => {
        let blob = new Blob([data], {type: "text/plain"});
        let download = document.createElement("A");
        download.href = window.URL.createObjectURL(blob);
        download.download = name + extension;
        download.click();
    });
    parent.appendChild(newDownloadButton);
}

function AddToQueryErrorBox(errorMessage) {
    const errorBox = document.querySelector(".error");
    if(errorMessage) {
        errorBox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-diamond" viewBox="0 0 16 16">
        <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg> ${errorMessage}`;
    } else {
        errorBox.innerHTML = "";
    }
}

function GenerateResultHeaderRow(json) {
    const table = document.createElement("TABLE");
    const thead = document.createElement("THEAD");
    Object.keys(json[0]).forEach(h => {
        const header = document.createElement("TH");
        header.innerText = h;
        thead.appendChild(header);
    });
    table.appendChild(thead);
    const tbody = document.createElement("TBODY");
    table.appendChild(tbody);
    document.querySelector("#query-results").appendChild(table);
}

function GenerateResultRow(item) {
    const tbody = document.querySelector("#query-results table tbody");
    const row = document.createElement("TR");
    Object.keys(item).forEach(k => {
        const data = document.createElement("TD");
        data.innerText = item[k];
        row.appendChild(data);    
    });
    tbody.appendChild(row);
    document.querySelector("#query-results table").appendChild(tbody);
}