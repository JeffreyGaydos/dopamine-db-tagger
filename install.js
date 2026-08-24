import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { BasicGetFile, GetConfigJSONCached } from './utilities.js';
import { EvidenceOfInstallation } from './db-client.js';

/* Force indicates that the user has read the upgrade/backdate notes outlining any breaking changes and has selected to proceed with the installation */
export default async function Install(desiredVersion, force=false) {
    const config = await GetConfigJSONCached();

    const db = await open({
        filename: config.DatabaseLocation,
        driver: sqlite3.Database
    });

    let versionFile = await BasicGetFile("./schema/versions.json");
    versionFile = JSON.parse(versionFile);
    const versionsOnly = versionFile.upgradeNotes.map(u => u.Version);
    const evidence = await EvidenceOfInstallation();
    let existingVersion = "0.0";

    if(evidence?.length > 0) {
        existingVersion = (await db.all(`SELECT InfoValue FROM DBTaggerInfo WHERE InfoName = 'Version'`))[0].InfoValue;
    }

    const existingVersionIndex = versionsOnly.indexOf(existingVersion);
    const desiredVersionIndex = versionsOnly.indexOf(desiredVersion);

    //Looking for when the user is not going from "nothing" to "latest", so either not going to "latest" or has evidence of an installation
    if(desiredVersionIndex > 0 || evidence?.length > 0) {
        if(existingVersionIndex == desiredVersionIndex || existingVersionIndex == -1 || desiredVersionIndex == -1) {
            return false;
        }

        const versionsToRun = [];
        const versionNotes = [];
        let scriptType = "INVALID";
        
        if(existingVersionIndex > desiredVersionIndex) {
            //An update:
            scriptType = "Deploy";
            for(let i = existingVersionIndex - 1; i >= desiredVersionIndex; i--) {
                if(versionFile.upgradeNotes[i].DeployingToHereNotes) {
                    versionNotes.push(`Version ${versionFile.upgradeNotes[i].Version}: ${versionFile.upgradeNotes[i].DeployingToHereNotes}`);
                }
                versionsToRun.push(versionFile.upgradeNotes[i].Version);
            }
        } else {
            //A backdate:
            scriptType = "Rollback";
            for(let i = existingVersionIndex; i < desiredVersionIndex; i++) {
                if(versionFile.upgradeNotes[i + 1].RollingBackToHereNotes) {
                    versionNotes.push(`Version ${versionFile.upgradeNotes[i + 1].Version}: ${versionFile.upgradeNotes[i + 1].RollingBackToHereNotes}`);
                }
                versionsToRun.push(versionFile.upgradeNotes[i].Version);
            }
        }

        console.log(versionsToRun);
        console.log(versionNotes);

        if(versionNotes.length > 0 && !force) {
            return versionNotes.join("\n");
        }

        for(var v = 0; v < versionsToRun.length; v++) {
            if(versionsToRun[v] == "0.0") continue;
            const deployScript = await BasicGetFile(`./schema/v${versionsToRun[v]}_${scriptType}.sql`);
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
    `, { $v: desiredVersion });
    return true;
}