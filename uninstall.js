import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { BasicGetFile, GetConfigJSONCached } from './utilities.js';

export default async function Uninstall() {
    (async () => {
        const config = await GetConfigJSONCached();

        const db = await open({
            filename: config.DatabaseLocation,
            driver: sqlite3.Database
        });

        const deployScript = await BasicGetFile('./SchemaRollback.sql');
        await db.exec(deployScript);
        console.log("Uninstalled!");
    })();
}