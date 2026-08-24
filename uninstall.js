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

        // Relies on us following the convention that the vX.X_Rollback script can be used to uninstall from any version
        const deployScript = await BasicGetFile('./schema/vX.X_Rollback.sql');
        await db.exec(deployScript);
    })();
}