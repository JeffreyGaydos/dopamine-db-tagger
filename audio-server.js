import fs from 'node:fs';
import { GetConfigJSONCached } from './utilities.js';

let audioRepositoryPath = undefined;

async function GetRepoPathCached() {
    if(audioRepositoryPath) return audioRepositoryPath;

    audioRepositoryPath = (await GetConfigJSONCached()).BaseFolderPath;
    return audioRepositoryPath;
}

export async function GetAudioResource(url, mime, res) {
    const basePath = await GetRepoPathCached();
    const audioRequestPath = `${basePath}${decodeURI(url)}`;
    fs.readFile(audioRequestPath, function(err, data) {
        if (!err) {
            res.setHeader('Content-type' , mime);
            res.end(data);
        } else {
            console.log(`file not found: "${audioRequestPath}"`);
            res.writeHead(404, "Not Found");
            res.end();
        }
    });
    console.log(`${audioRequestPath} (${mime})`);
}