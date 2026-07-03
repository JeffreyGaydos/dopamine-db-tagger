import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { BasicGetFile, GetConfigJSONCached } from './utilities.js';
import { EvidenceOfInstallation } from './db-client.js';

/* Force indicates that the user has read the upgrade notes outlining any breaking changes and has selected to proceed with the installation */
export default async function Install(force=false) {
    const config = await GetConfigJSONCached();

    const db = await open({
        filename: config.DatabaseLocation,
        driver: sqlite3.Database
    });

    let versionFile = await BasicGetFile("./versions.json");
    versionFile = JSON.parse(versionFile);

    const evidence = await EvidenceOfInstallation();

    if(evidence?.length > 0) {
        const existingVersion = await db.all(`SELECT InfoValue FROM DBTaggerInfo WHERE InfoName = 'Version'`);
        if(existingVersion && !force) {
            if(
                versionFile.upgradeNotes.filter(n => n.Version == existingVersion[0].InfoValue).length > 0
                && versionFile.upgradeNotes.filter(n => n.Version == existingVersion[0].InfoValue)[0].Notes !== null
                && versionFile.presentVersion != existingVersion[0]
            ) {
                return versionFile.upgradeNotes.filter(n => n.Version == existingVersion[0].InfoValue)[0].Notes;
            }
        }
    }

    const deployScript = await BasicGetFile('./SchemaDeploy.sql');
    await db.exec(deployScript);
    await db.exec(`DELETE FROM DBTaggerInfo WHERE InfoName = 'Version'`);
    await db.all(`
        INSERT INTO DBTaggerInfo
        (InfoName, InfoValue)
        VALUES
        ('Version', $v)
    `, { $v: versionFile.presentVersion });
    return true;
}