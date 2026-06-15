import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { BasicGetFile, GetConfigJSON } from './utilities.js';

export default async function Install() {
    (async () => {
        const config = await GetConfigJSON();

        const db = await open({
            filename: config.DatabaseLocation,
            driver: sqlite3.Database
        });

        const deployScript = await BasicGetFile('./SchemaDeploy.sql');
        await db.exec(deployScript);
        console.log("Installed!");
    })();
}