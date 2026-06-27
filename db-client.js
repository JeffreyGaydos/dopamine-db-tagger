
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { GetConfigJSONCached } from './utilities.js';

let dbPath = undefined;

async function GetDBPathCached() {
    if(dbPath) return dbPath;

    const config = await GetConfigJSONCached();
    dbPath = config.DatabaseLocation;
    return dbPath;
}

let db = undefined;

async function GetDBCached() {
    if(db) return db;

    db = await open({
        filename: await GetDBPathCached(),
        driver: sqlite3.Database
    });
    return db;
}

export async function GetLandingLinkData() {
    const myDb = await GetDBCached();
    const result = await myDb.all(`
        SELECT DISTINCT
            coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw,
            coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName) AS TitleRaw,
            TrackID
        FROM Track
        ORDER BY
            coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists),
            coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName)
    `);
    return result;
}

export async function GetAllTrackData(trackID) {
    const myDb = await GetDBCached();
    const result = await myDb.all(`
        SELECT * FROM Track WHERE TrackID = $t
    `, { $t: trackID }
    );
    if(result.length !== 1) {
        console.error("Somehow got 2 track data for 1 track ID. Query might be wrong...");
    }
    return result[0];
}