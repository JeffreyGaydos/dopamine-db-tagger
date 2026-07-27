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

    let versionFile = await BasicGetFile("./schema/versions.json");
    versionFile = JSON.parse(versionFile);

    const evidence = await EvidenceOfInstallation();

    if(evidence?.length > 0) {
        const existingVersion = (await db.all(`SELECT InfoValue FROM DBTaggerInfo WHERE InfoName = 'Version'`))[0].InfoValue;
        if(existingVersion && !force) {
            if(
                versionFile.upgradeNotes.filter(n => n.Version == existingVersion).length > 0
                && versionFile.upgradeNotes.filter(n => n.Version == existingVersion)[0].Notes !== null
                && versionFile.presentVersion != existingVersion
            ) {
                return versionFile.upgradeNotes.filter(n => n.Version == existingVersion)[0].Notes;
            }
        }

        let versionsToExecuteOrdered = [];
        for(var i = 0; i < versionFile.upgradeNotes.length; i++) {
            if(versionFile.upgradeNotes[i].Version != existingVersion) {
                versionsToExecuteOrdered.push(versionFile.upgradeNotes[i].Version);
            } else {                
                versionsToExecuteOrdered.push(versionFile.presentVersion);
                break; //relies on the versions.json file being deliberately ordered
            }
        }
        versionsToExecuteOrdered = versionsToExecuteOrdered.filter(v => v != '0.0').reverse();
        console.log(versionsToExecuteOrdered);

        for(var v = 0; v < versionsToExecuteOrdered.length; v++) {
            const deployScript = await BasicGetFile(`./schema/v${versionsToExecuteOrdered[v]}_Deploy.sql`);
            await db.exec(deployScript);
        }
    } else {
        const deployScript = await BasicGetFile('./schema/vX.X_Deploy.sql');
        await db.exec(deployScript);
    }

    await db.exec(`DELETE FROM DBTaggerInfo WHERE InfoName = 'Version'`);
    await db.all(`
        INSERT INTO DBTaggerInfo
        (InfoName, InfoValue)
        VALUES
        ('Version', $v)
    `, { $v: versionFile.presentVersion });
    return true;
}