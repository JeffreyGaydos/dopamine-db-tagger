import fs from 'node:fs';
import { AddTag, EditTag, GetAvailableTagSearchRestults, GetTrackSearchResults, RefreshTagLists, RemoveTagFromTrack, DeleteTagEverywhere, GetDeletionCounts, IsInstalled, ExecuteRawQuery, ValidateEditTag, GetSortOrder, SetSortOrder } from './controller.js';
import Install from './install.js';
import Uninstall from './uninstall.js';
import { GetConfigJSONCached, SetConfigJSON } from './utilities.js';

export async function GetApiResource(url, mime, res, body) {
    RouteAPIEndpoints(url, body).then(modifiedData => {
        if(modifiedData.modified) {
            mime = 'text/plain';
            res.setHeader('Content-type', mime);
            res.end(JSON.stringify(modifiedData.apiData));
        } else {
            console.log(`API Endpoint not found: "${url}"`);
            res.writeHead(404, "Not Found");
            res.end();
        }
    });
    console.log(`${url} (${mime})`);
}

function WithTypicalResponseContainer(jsonData) {
    return `<div id="response" style="display: none">${JSON.stringify(jsonData)}</div>`;
}

function FormDataToParameterDictionary(rawFormBody) {
    const parameters = {};
    rawFormBody.split("&").map(p => {
        const parameter = decodeURIComponent(p);
        const kvp = parameter.split("=");
        parameters[`${kvp[0]}`] = kvp[1];
    });
    return parameters;
}

async function RouteAPIEndpoints(url, body) {
    const urlBits = url.split("/").filter(b => b !== '');
    if(urlBits[0] !== "api") {
        console.error("It looks like we broke the server. Got a non-API request routed to the api-server.js file");
    }
    switch(urlBits[1]) {
        case "search":
            switch(urlBits[2]) {
                case "tracks":
                    const resultTrack = await GetTrackSearchResults(decodeURIComponent(urlBits[3]));
                    return {
                        apiData: resultTrack,
                        modified: true
                    };
                    break;
                case "tags":
                    const resultTag = await GetAvailableTagSearchRestults(decodeURIComponent(urlBits[4]), urlBits[3]);
                    return {
                        apiData: resultTag,
                        modified: true
                    }
                    break;
            }
        case "tag":
            switch(urlBits[2]) {
                case "add":
                    const addParameters = JSON.parse(body);
                    const addResult = await AddTag(addParameters.tagName, addParameters.color, addParameters.trackID, addParameters.isArtist);
                    return {
                        apiData: addResult,
                        modified: true
                    };
                    break;
                case "remove":
                    await RemoveTagFromTrack(decodeURIComponent(urlBits[4]), urlBits[3]);
                    return {
                        apiData: undefined,
                        modified: true
                    };
                    break;
                case "edit":
                    const editParameters = JSON.parse(body);
                    const validationErrors = await ValidateEditTag(editParameters.tagName, editParameters.newTagName, editParameters.newColor);
                    if(validationErrors.length == 0) {
                        await EditTag(editParameters.tagName, editParameters.newTagName, editParameters.newColor);
                    }
                    return {
                        apiData: validationErrors,
                        modified: true
                    };
                    break;
                case "delete":
                    const deleteResult = await DeleteTagEverywhere(decodeURIComponent(urlBits[3]));
                    return {
                        apiData: deleteResult,
                        modified: true
                    };
                    break;
                case "refresh-lists":
                    const refreshResult = await RefreshTagLists(urlBits[3], urlBits[4]);
                    return {
                        apiData: refreshResult,
                        modified: true
                    };
                    break;
                case "usage":
                    const usageResult = await GetDeletionCounts(decodeURIComponent(urlBits[3]));
                    return {
                        apiData: usageResult,
                        modified: true
                    };
                    break;
                case "merge":
                    const mergeResult = await EditTag(decodeURIComponent(urlBits[3]), decodeURIComponent(urlBits[4]));
                    return {
                        apiData: mergeResult,
                        modified: true
                    };
                    break;
            }
        case "setup":
            switch(urlBits[2]) {
                case "install":
                    let installResult = undefined;
                    try {
                        if(urlBits[4]) {
                            installResult = await Install(urlBits[3], true);
                        } else {
                            installResult = await Install(urlBits[3]);
                        }
                    } catch(e) {
                        
                    }
                    return {
                        apiData: installResult,
                        modified: true
                    };
                    break;
                case "uninstall":
                    await Uninstall();
                    return {
                        apiData: undefined,
                        modified: true
                    };
                    break;
                case "status":
                    const isInstalledResult = await IsInstalled();
                    return {
                        apiData: isInstalledResult,
                        modified: true
                    };
                    break;
                case "configs":
                    switch(urlBits[3]) {
                        case "get":
                            const configsResult = await GetConfigJSONCached();
                            return {
                                apiData: configsResult,
                                modified: true
                            };
                            break;
                        case "set":
                            const realValue4 = decodeURIComponent(urlBits[4]) === "undefined" ? undefined : decodeURIComponent(urlBits[4]);
                            const realValue5 = decodeURIComponent(urlBits[5]) === "undefined" ? undefined : decodeURIComponent(urlBits[5]);
                            const setConfigsResult = await SetConfigJSON(realValue4, realValue5);
                            return {
                                apiData: !!setConfigsResult,
                                modified: true
                            };
                            break;
                    }
                    break;
            }
        case "query":
            switch(urlBits[2]) {
                case "raw":
                try {
                    const queryResult = await ExecuteRawQuery(decodeURIComponent(urlBits[3]), urlBits[4] === "true" ? true : urlBits[4]);
                    return {
                        apiData: {
                            error: undefined,
                            results: queryResult.results,
                            limited: queryResult.limited
                        },
                        modified: true
                    };
                } catch (e) {
                    return {
                        apiData: {
                            error: e,
                            results: [],
                            limited: undefined
                        },
                        modified: true
                    };
                }
                break;   
            }
            break;
        case "settings":
            switch(urlBits[2]) {
                case "sort":
                    switch(urlBits[3]) {
                        case "get":
                            const currentSortOrder = await GetSortOrder();
                            return {
                                apiData: currentSortOrder,
                                modified: true
                            };
                            break;
                        case "set":
                            const newSort = urlBits[4];
                            await SetSortOrder(newSort);
                            return {
                                apiData: undefined,
                                modified: true
                            };
                            break;
                    }
                    break;
            }
            break;
    }
    return {
        apiData: "",
        modified: false
    };
}