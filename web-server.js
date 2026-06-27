import fs from 'node:fs';
import { BasicGetFile, GetConfigJSONCached, GetMimeTypeFromURI } from './utilities.js';
import { Landing, Tagging } from './controller.js';

export async function GetWebResource(url, mime, res) {
    fs.readFile('./' + url, function(err, data) {
        RouteEndpoints(url, data).then(modifiedData => {
            if(modifiedData.modified || !err) {
                mime = modifiedData.modified ? 'text/html' : mime;
                res.setHeader('Content-type', mime);
                res.end(modifiedData.apiData);
            } else {
                console.log(`file not found: "${url}"`);
                res.writeHead(404, "Not Found");
                res.end();
            }
        });
      });
    console.log(`${url} (${mime})`);
}

function WithTypicalResponseContainer(jsonData) {
    return `<div id="response" style="display: none">${JSON.stringify(jsonData)}</div>`;
}

async function RouteEndpoints(url, currentData) {
    const urlBits = url.split("/").filter(b => b !== '');
    switch(urlBits[0]) {
        case "ui":
            switch(urlBits[1]) {
                case "landing.html":
                    const landingData = await Landing();
                    console.log(landingData);
                    return {
                        apiData: `${currentData}${WithTypicalResponseContainer(landingData)}`,
                        modified: true
                    };
                case "tagging":
                    if(urlBits[2]?.match(/[1-9]+[0-9]*/)) {
                        //Since this endpoint doesn't reference 1 page, but many, we have to grab base data
                        let baseHtml = await BasicGetFile(`./${urlBits[0]}/${urlBits[1]}.html`);
                        const taggingData = await Tagging(urlBits[2], baseHtml);
                        const mergedApiData = taggingData.apiData
                        mergedApiData["pageInfo"] = taggingData.pageInfo;
                        mergedApiData["currentTags"] = taggingData.currentTags;
                        mergedApiData["allTags"] = taggingData.allTags;
                        
                        return {
                            apiData: `${taggingData.modifiedBaseHtml}${WithTypicalResponseContainer(mergedApiData)}`,
                            modified: true
                        };
                    }
            }
            break;
    }
    return {
        apiData: currentData,
        modified: false
    };
}