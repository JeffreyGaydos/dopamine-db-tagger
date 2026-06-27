import fs from 'node:fs';
import { GetTrackSearchResults } from './controller.js';

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
                    const result = await GetTrackSearchResults(decodeURI(urlBits[3]));
                    return {
                        apiData: result,
                        modified: true
                    };
                    break;
                case "tags":
                    break;
            }

    }
    return {
        apiData: "",
        modified: false
    };
}