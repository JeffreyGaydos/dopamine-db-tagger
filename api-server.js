import fs from 'node:fs';
import { AddTag, EditTag, GetAvailableTagSearchRestults, GetTrackSearchResults, RefreshTagLists, RemoveTagFromTrack } from './controller.js';

export async function GetApiResource(url, mime, res) {
    RouteAPIEndpoints(url).then(modifiedData => {
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

async function RouteAPIEndpoints(url) {
    const urlBits = url.split("/").filter(b => b !== '');
    if(urlBits[0] !== "api") {
        console.error("It looks like we broke the server. Got a non-API request routed to the api-server.js file");
    }
    switch(urlBits[1]) {
        case "search":
            switch(urlBits[2]) {
                case "tracks":
                    const resultTrack = await GetTrackSearchResults(decodeURI(urlBits[3]));
                    return {
                        apiData: resultTrack,
                        modified: true
                    };
                    break;
                case "tags":
                    const resultTag = await GetAvailableTagSearchRestults(decodeURI(urlBits[4]), urlBits[3]);
                    return {
                        apiData: resultTag,
                        modified: true
                    }
                    break;
            }
        case "tag":
            switch(urlBits[2]) {
                case "add":
                    const addResult = await AddTag(decodeURI(urlBits[4]), urlBits[3]);
                    return {
                        apiData: addResult,
                        modified: true
                    };
                    break;
                case "remove":
                    await RemoveTagFromTrack(urlBits[4], urlBits[3]);
                    return {
                        apiData: undefined,
                        modified: true
                    };
                    break;
                case "edit":
                    if(!urlBits[3] || !urlBits[4] || !urlBits[5]) {
                        console.log("Expected one or more missing parameters: /edit/tagName/newText/newColor");
                    }
                    const editResult = await EditTag(urlBits[3], urlBits[4], urlBits[5]);
                    return {
                        apiData: editResult,
                        modified: true
                    };
                    break;
                    break;
                case "delete":
                    const deleteResult = await DeleteTag(urlBits[3]);
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
                    }
                    break;
            }
    }
    return {
        apiData: "",
        modified: false
    };
}