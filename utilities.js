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

export async function GetConfigJSON() {
    const defaultConfigs = JSON.parse(await BasicGetFile("./config.json"));
    const privateConfigs = JSON.parse(await BasicGetFile("./config.user.json"));

    return {
        "DatabaseLocation": privateConfigs.DatabaseLocation ?? defaultConfigs.DatabaseLocation
    };
}