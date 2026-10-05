window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#execute").addEventListener("click", (e) => {
        e.preventDefault();
        const query = document.querySelector("#query").value;
        (async () => await HandleExecuteRawQuery(query, 20))();
    });

    document.querySelector("#full-results").addEventListener("click", (e) => {
        e.preventDefault();
        const query = document.querySelector("#query-type").value != "guided" ? document.querySelector("#query").value : Guided_ConvertToSQLite(Guided_ParseQuery().finalTokens);
        (async () => await HandleExecuteRawQuery(query, 1000))();
    });

    document.querySelector("#generate-playlist").addEventListener("click", (e) => {
        e.preventDefault();
        (async () => await HandleGeneratePlaylist())();
    });

    AddGuidedQueryButtons();

    document.querySelector("#query-type").addEventListener("change", (e) => {
        AddToQueryErrorBox(undefined);
        switch(e.target.value) {
            case "guided":
                document.querySelector("#guided-query").style.display = "block";
                document.querySelector("#sql-query").style.display = "none";
                break;
            case "raw":
            default:
                document.querySelector("#guided-query").style.display = "none";
                document.querySelector("#sql-query").style.display = "block";
                break;    
        }
    });

    setInterval(() => {
        if(cursorBlink) {
            document.querySelectorAll("#cursor-new svg").forEach(c => {
                c.classList.remove("out");
                c.classList.add("in");
            });
        } else {
            document.querySelectorAll("#cursor-new svg").forEach(c => {
                c.classList.remove("in");
                c.classList.add("out");
            });
        }
        cursorBlink = !cursorBlink;
    }, 500);

    document.addEventListener("keydown", (e) => {
        switch(e.key) {
            case "ArrowLeft":
                MoveCursorLeft();
                break;
            case "ArrowRight":
                MoveCursorRight();
                break;
            case "Backspace":
                BackspaceToken();
                break;
        }
    });

    document.querySelector("#view-raw-sql").addEventListener("click", (e) => {
        e.preventDefault();
        const guidedSql = Guided_ConvertToSQLite(Guided_ParseQuery().finalTokens);
        document.querySelector("#query").value = guidedSql;
        document.querySelector("#query-type").value = "raw";
        document.querySelector("#query-type").dispatchEvent(new Event("change"));
    });

    document.querySelector("#guided-execute").addEventListener("click", (e) => {
        e.preventDefault();
        const guidedSql = Guided_ConvertToSQLite(Guided_ParseQuery().finalTokens);
        HandleExecuteRawQuery(guidedSql, 20).then(r => {
            console.log(r)
        });
    });

    // Get default syntax hint
    UpdateSyntaxHint(undefined, undefined);

    
});

let cursorBlink = false;

function MoveCursorLeft() {
    if(document.querySelector("#query-type").value != "guided" || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName.toUpperCase())) return;
    let queryBox = document.querySelector("#guided-query-to-run");
    let cursorPosition = -1;
    queryBox.childNodes.forEach((c, i) => {
        if(c.id == "cursor-new") {
            cursorPosition = i;
        }
    });
    if(cursorPosition > 0) {
        //We can do this
        let insertBefore = document.querySelectorAll(`#guided-query-to-run > *:not(#cursor-new)`)[cursorPosition - 1];
        let cursor = document.querySelector("#guided-query-to-run #cursor-new");
        document.querySelector("#guided-query-to-run #cursor-new").remove();
        queryBox.insertBefore(cursor, insertBefore);
        UpdateSyntaxHint(cursorPosition - 1);
    }
}

function MoveCursorRight() {
    if(document.querySelector("#query-type").value != "guided" || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName.toUpperCase())) return;
    let queryBox = document.querySelector("#guided-query-to-run");
    let cursorPosition = -1;
    queryBox.childNodes.forEach((c, i) => {
        if(c.id == "cursor-new") {
            cursorPosition = i;
        }
    });
    if(cursorPosition + 1 < queryBox.childElementCount) {
        //We can do this
        let insertAfter = document.querySelectorAll(`#guided-query-to-run > *:not(#cursor-new)`)[cursorPosition];
        let cursor = document.querySelector("#guided-query-to-run #cursor-new");
        document.querySelector("#guided-query-to-run #cursor-new").remove();
        insertAfter.insertAdjacentElement("afterend", cursor);
        UpdateSyntaxHint(cursorPosition + 1);
    }
}

function BackspaceToken() {
    if(document.querySelector("#query-type").value != "guided" || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName.toUpperCase())) return;
    let queryBox = document.querySelector("#guided-query-to-run");
    let cursorPosition = -1;
    queryBox.childNodes.forEach((c, i) => {
        if(c.id == "cursor-new") {
            cursorPosition = i;
        }
    });
    if(cursorPosition > 0) { //TODO here and above we need to prevent movement on input of a form field
        let toDelete = document.querySelectorAll(`#guided-query-to-run > *`)[cursorPosition - 1];
        toDelete.remove();
        Guided_HandleErrors(Guided_ParseQuery());
        UpdateSyntaxHint(cursorPosition - 1);
    }
}

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

    const rawquery = document.querySelector("#query-type").value != "guided" ? document.querySelector("#query").value : Guided_ConvertToSQLite(Guided_ParseQuery().finalTokens);
    const oneResult = await HandleExecuteRawQuery(rawquery, 1); //Can I get 1?
    if(document.querySelector("#right-pane .error:has(*)")) {
        alert("Current query has errors that need corrected");
        return;
    }
    if(oneResult.length === 0) {
        alert("query returned no results!");
        return;
    }
    
    const query = document.querySelector("#query-type").value != "guided" ? document.querySelector("#query").value : Guided_ConvertToSQLite(Guided_ParseQuery().finalTokens);
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

function GetLogicColorByKey(key) {
    switch(key) {
        default:
        case "AND":
        case "OR":
            return "#0C0";
            break;
        case "CONTAINS":
        case "=":
        case ">":
        case "<":
        case ">=":
        case "<=":
        case "!=":
            return "#000";
            break;
        case "(":
        case ")":
            return "#888";
            break;
    }
}

function GetMetadataColorByKey(key) {
    switch(key) {
        case "Raw Text":
            return "#FFF";
            break;
        default:
            return "#A00";
            break;
    }
}

function GetMetadataEnableHTMLByKey(key) {
    return key == "Raw Text";
}

function GetMetadataKeyModificationByKey(key) {
    if(key == "Raw Text") {
        return "<input type=\"text\" placeholder=\"raw text\" />";
    }
    return key;
}

function AddGuidedQueryButtons() {
    const logicButtons = [
        "AND",
        "OR",
        "CONTAINS",
        "=",
        ">",
        "<",
        ">=",
        "<=",
        "!=",
        "(",
        ")",
        "INCLUDE TAG",
        "EXCLUDE TAG"
    ];
    logicButtons.forEach(b => {
        const newButton = CreateTag(b, GetLogicColorByKey(b), false)
        newButton.addEventListener("click", (e) => {
            e.preventDefault();
            Guided_AddToQuery("logic", b);
            Guided_HandleErrors(Guided_ParseQuery());
        });
        document.querySelector("#logic-container").appendChild(newButton);
    });

    fetch(`http://localhost:8080/api/tag/all`).then((f) => {
        f.json().then(r => {
            r.forEach(t => {
                const newButton = CreateTag(t.TagName, t.Color, false);
                newButton.addEventListener("click", (e) => {
                    e.preventDefault();
                    Guided_AddToQuery("tag", t.TagName, t.Color);
                    Guided_HandleErrors(Guided_ParseQuery());
                });
                document.querySelector("#tag-container").appendChild(newButton);
            });
        });
    });

    const metadataButtons = [
        "Duration",
        "Track Title",
        "Artist Name",
        "Album Name",
        "Raw Text"
    ];
    metadataButtons.forEach(b => {
        const newButton = CreateTag(b, GetMetadataColorByKey(b), false);
        newButton.addEventListener("click", (e) => {
            e.preventDefault();
            Guided_AddToQuery("metadata", b, GetMetadataColorByKey(b));
            Guided_HandleErrors(Guided_ParseQuery());
        });
        document.querySelector("#metadata-container").appendChild(newButton);
    });
}

// NOTE: color parameter is only used by tags
function Guided_AddToQuery(type, key, color=undefined) {
    const cursor = document.querySelector("#guided-query-to-run #cursor-new");
    let queryPart = undefined;
    switch(type) {
        case "logic":
            queryPart = CreateTag(key, GetLogicColorByKey(key), false, false, "q-logic");
            break;
        case "tag":
            queryPart = CreateTag(key, color, false, false, "q-tag");
            break;
        case "metadata":
            queryPart = CreateTag(GetMetadataKeyModificationByKey(key), GetMetadataColorByKey(key), false, GetMetadataEnableHTMLByKey(key), "q-metadata");
            break;
        default:
            console.error("Not supposed to get here. You're calling this method incorrectly");
    }
    queryPart.addEventListener("click", (e) => e.preventDefault());
    cursor.insertAdjacentElement("afterend", queryPart);
    MoveCursorRight();
}

function Guided_HandleErrors(errorObj) {
    //Reset previous compilation errors:
    document.querySelectorAll("#guided-query-to-run > *:not(#cursor-new)").forEach(t => {
        t.style.borderWidth = "2px";
        t.style.borderStyle = "outset";
        t.style.borderColor = "buttonborder";
        t.style.borderImage = "none";
    });
    AddToQueryErrorBox(undefined);

    if(errorObj.error?.length ?? 0 > 0) {
        AddToQueryErrorBox(errorObj.error);
        document.querySelectorAll("#guided-query-to-run > *:not(#cursor-new)")[errorObj.token].style.border = "5px dashed red";
    }    
}

function Guided_ParseQuery(onlyLookAtFirstNumTokens = -1) {
    const queryBox = document.querySelector("#guided-query-to-run");   

    let finalQuery = [];
    queryBox.childNodes.forEach(c => {
        if(c.id != "cursor-new") {
            finalQuery.push({
                type: c.className.replace("tag ", ""),
                value: c.className.replace("tag ", "") == "q-metadata" && c.getAttribute("ev").includes("<input") ? c.querySelector("input").value : c.getAttribute("ev")
            });
        }
    });

    finalQuery = onlyLookAtFirstNumTokens != -1 ? finalQuery.slice(0, onlyLookAtFirstNumTokens) : finalQuery;
    
    let openParenthesisCount = 0;
    let expectantComparison = false;
    let allowedTokens = GetAllowedTokens(null, openParenthesisCount > 0, expectantComparison);
    let errorMessage = "";
    let erroredToken = -1;
    for(var i = 0; i < finalQuery.length; i++) {
        // console.log({
        //     expectantComparison,
        //     openParenthesisCount,
        //     tokenIndex: i,
        //     allowedTokens
        // });
        const token = finalQuery[i];
        if(allowedTokens.filter(at => at.type == token.type && (at.value ?? token.value) == token.value).length == 1) {
            //This token is allowed, determine parns, comparisons, next allowed tokens, then move to next
            openParenthesisCount += token.value == "(" ? 1 : 0;
            expectantComparison = !expectantComparison ? ["CONTAINS", "=", "!=", ">=", "<=", ">", "<"].includes(token.value) : token.type == "q-metadata";
            allowedTokens = GetAllowedTokens(token, openParenthesisCount > 0, expectantComparison);
        } else {
            errorMessage = `token is not allowed at location: { "${token.type}", "${token.value}" }`;
            erroredToken = i;
            allowedTokens = null; //explicitly turn this off since we can't know what's right after a syntax error
            finalQuery = null; //explicitly turn this off since we can't know what's right after a syntax error
            break;
        }
    }

    return { error: errorMessage, token: erroredToken, nextAllowedTokens: allowedTokens, finalTokens: finalQuery };
}

function GetAllowedTokens(currentToken, hasOpenParenthesis, hasExpectantComparison) {
    if(currentToken == null) { //signifies when the query is empty
        return [
            {type: "q-logic", value: "INCLUDE TAG"},
            {type: "q-logic", value: "EXCLUDE TAG"},
            {type: "q-logic", value: "("},
            {type: "q-metadata", value: null} //null denotes all values from the metadata type are valid
        ];
    } else if(currentToken.type == "q-logic" && ["INCLUDE TAG", "EXCLUDE TAG"].includes(currentToken.value)) {
        return [{type: "q-tag", value: null}]
    } else if(currentToken.type == "q-logic" && currentToken.value == "(") {
        return GetAllowedTokens(null, false, false);
    } else if(currentToken.type == "q-metadata" && !hasExpectantComparison) {
        return [
            {type: "q-logic", value: "CONTAINS"},
            {type: "q-logic", value: "="},
            {type: "q-logic", value: "!="},
            {type: "q-logic", value: ">="},
            {type: "q-logic", value: "<="},
            {type: "q-logic", value: ">"},
            {type: "q-logic", value: "<"},
        ];
    }
    //Ok we've gotten through the first line of the flow chart
    else if(currentToken.type == "q-tag" || (currentToken.type == "q-metadata" && hasExpectantComparison)) {
        const alwaysAbleToComeAfterTag = [
            {type: "q-logic", value: "AND"},
            {type: "q-logic", value: "OR"}
        ];
        if(hasOpenParenthesis) {
            return [...alwaysAbleToComeAfterTag, {type: "q-logic", value: ")"}];
        }
        return alwaysAbleToComeAfterTag;
    } else if(currentToken.type == "q-logic" && ["CONTAINS", "=", "!=", ">=", "<=", ">", "<"].includes(currentToken.value)) {
        return [
            {type: "q-metadata", value: null}
        ];
    } else if(currentToken.type == "q-logic" && currentToken.value == ")") {
        return [
            {type: "q-logic", value: "AND"},
            {type: "q-logic", value: "OR"}
        ];
    } else if(currentToken.type == "q-logic" && ["AND", "OR"].includes(currentToken.value)) {
        return GetAllowedTokens(null, false, false);
    }
    return []; //probably shouldn't get here
}

function UpdateSyntaxHint(cursorPosition) {
    const syntaxHint = document.querySelector("#syntax-hint");

    const typeNameToUIName = {
        "q-tag": "Any Tag",
        "q-metadata": "Any Dopamine Metadata",
        "q-logic": "Any Logic Operation" //unused
    };
    
    const resultsObject = Guided_ParseQuery(cursorPosition);
    if(resultsObject.error?.length ?? 0 > 0) return;
    syntaxHint.innerHTML = resultsObject.nextAllowedTokens.length == 0
        ? "..."
        : resultsObject.nextAllowedTokens.length == 1
            ? "<pre>" + (resultsObject.nextAllowedTokens[0].value ?? typeNameToUIName[resultsObject.nextAllowedTokens[0].type]) + "</pre> can come next"
            : "<pre>" + resultsObject.nextAllowedTokens.map(at => at.value ?? at.type).slice(0, -1).join("</pre>, <pre>") + "</pre> or <pre>" + (resultsObject.nextAllowedTokens[resultsObject.nextAllowedTokens.length - 1].value ?? typeNameToUIName[resultsObject.nextAllowedTokens[resultsObject.nextAllowedTokens.length - 1].type]) + "</pre> can come next";
}

function Guided_ConvertToSQLite(finalTokens) {
    if(finalTokens) {
        let finalQuery = `SELECT DISTINCT T.TrackID, T.TrackTitle AS [Track Title], REPLACE(T.Artists, ';', '') AS [Artist Name], T.AlbumTitle AS [Album Name], T.Duration AS [Duration] FROM Track T`;
        const needTagAssignments = finalTokens.filter(ft => ft.type == "q-tag").length > 0;
        if(needTagAssignments) {
            finalQuery += `
JOIN TaggedAll TAG
    ON TAG.TrackID = T.TrackID`;
        }
        let whereClauses = [];
        let likeNeedsWrapping = false;
        finalTokens.forEach(t => {
            const type = t.type;
            const value = t.value;

            switch(type) {
                case "q-logic":
                    switch(value) {
                        case "AND":
                            whereClauses.push("AND");
                            break;
                        case "OR":
                            whereClauses.push("OR");
                            break;
                        case "CONTAINS":
                            whereClauses.push("LIKE");
                            likeNeedsWrapping = true;
                            break;
                        case "=":
                            whereClauses.push("=");
                            break;
                        case ">":
                            whereClauses.push(">");
                            break;
                        case "<":
                            whereClauses.push("<");
                            break;
                        case ">=":
                            whereClauses.push(">=");
                            break;
                        case "<=":
                            whereClauses.push("<=");
                            break;
                        case "!=":
                            whereClauses.push("!=");
                            break;
                        case "(":
                            whereClauses.push("(");
                            break;
                        case ")":
                            whereClauses.push(")");
                            break;
                        case "INCLUDE TAG":
                            whereClauses.push("TAG.TagName =");
                            break;
                        case "EXCLUDE TAG":
                            whereClauses.push("TAG.TagName !=");
                            break;
                    }
                    
                    break;
                case "q-metadata":
                    let metadataValue = "";
                    switch(value) {
                        case "Duration":
                            metadataValue = "T.Duration";
                            break;
                        case "Track Title":
                            metadataValue = "T.TrackTitle";
                            break;
                        case "Artist Name":
                            metadataValue = "REPLACE(T.Artists, ';', '')";
                            break;
                        case "Album Name":
                            metadataValue = "T.AlbumTitle";
                            break;
                        default:
                            metadataValue = "'" + value.replaceAll("'", "''") + "'"; //TODO this does not actually store the value of the raw text
                            break;
                    }
                    if(likeNeedsWrapping) {
                        metadataValue = `CONCAT('%',${metadataValue},'%')`;
                        likeNeedsWrapping = false;
                    }
                    whereClauses.push(metadataValue);
                    break;
                case "q-tag":
                    whereClauses.push("'" + value.replaceAll("'", "''") + "'");
                    break;
            }
        });
        finalQuery += `
WHERE ${whereClauses.join(" ")}
        `;
        return finalQuery;
    }
}