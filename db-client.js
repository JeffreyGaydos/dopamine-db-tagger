
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

export async function GetNextPreviousTrackID(trackID) {
    const myDb = await GetDBCached();
    const nextResult = await myDb.all(`
        SELECT TrackID
        FROM Track
        WHERE TrackID > $t
        ORDER BY TrackID ASC
        LIMIT 1
    `, { $t: trackID }
    );

    const previousResult = await myDb.all(`
        SELECT TrackID
        FROM Track
        WHERE TrackID < $t
        ORDER BY TrackID DESC
        LIMIT 1
    `, { $t: trackID }
    );

    return {
        next: nextResult[0].TrackID,
        previous: previousResult[0].TrackID,
    }
}

export async function GetAllTags() {
    const myDb = await GetDBCached();
    const allTagResult = await myDb.all(`
        SELECT TagName FROM Tags
    `);

    return allTagResult;
}

export async function GetAllTagsForTrack(trackID) {
    const myDb = await GetDBCached();
    const allTagResult = await myDb.all(`
        SELECT * FROM TaggedAll
        WHERE TrackID = $t
    `, { $t: trackID }
    );

    return allTagResult;
}

export async function SearchTracks(stringQuery) {
    const myDb = await GetDBCached();
    return await myDb.all(`
        SELECT
            TrackID,
            coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName) AS TitleRaw,
            coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw
        FROM Track
        WHERE TrackID = $s
        UNION
        SELECT
            TrackID,
            coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName) AS TitleRaw,
            coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw
        FROM Track
        WHERE TrackTitle = $s
        OR FileName = $s
        UNION
        SELECT
            TrackID,
            coalesce(iif(TrackTitle = '', FileName, TrackTitle), FileName) AS TitleRaw,
            coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw
        FROM Track
        WHERE TrackTitle LIKE CONCAT('%', $s, '%')
        OR Path LIKE CONCAT('%', $s, '%')
    `, { $s: stringQuery }
    );
}