import fs from 'node:fs/promises';

export async function BasicGetFile(path, logSuccess=false) {
    try {
        const data = await fs.readFile(path, { encoding: 'utf8' });
        if(logSuccess) console.log(data);
        return data;
    } catch (err) {
        console.error(err);
        return false;
    }
}

let config = undefined;

export async function GetConfigJSONCached() {
    if(config) return config;
    const defaultConfigs = JSON.parse(await BasicGetFile("./config.json"));
    const privateConfigs = JSON.parse(await BasicGetFile("./config.user.json"));

    config = {
        "DatabaseLocation": privateConfigs.DatabaseLocation ?? defaultConfigs.DatabaseLocation,
        "BaseFolderPath": privateConfigs.BaseFolderPath ?? defaultConfigs.BaseFolderPath
    };
    return config;
}

export function GetMimeTypeFromURI(reqUrl) {
    const extStart = reqUrl.lastIndexOf('.');
    if(extStart === -1) {
        return 'text/plain';
    }
    
    const ext = reqUrl.substr(extStart)

    const extensionDictionary = {
        '.html' : 'text/html',
        '.ico' : 'image/x-icon',
        '.jpg' : 'image/jpeg',
        '.png' : 'image/png',
        '.gif' : 'image/gif',
        '.css' : 'text/css',
        '.js' : 'text/javascript',
        '.json' : 'text/javascript',
        '.mp3' : 'audio/mpeg',
        '.m4a' : 'audio/mpeg',
        '.ogg' : 'audio/ogg',
        '.wav' : 'audio/wav',
        '.aac' : 'audio/aac',
        '.webm' : 'audio/webm',
        '.flac' : 'audio/flac'
    };

    return extensionDictionary[ext] ?? 'text/plain';
}