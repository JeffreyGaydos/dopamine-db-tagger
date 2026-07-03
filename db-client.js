
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
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READWRITE
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

export async function SearchAvailableTags(stringQuery, trackID) {
    const myDb = await GetDBCached();
    return await myDb.all(`
        SELECT
            T.TagName,
            IIF(T.TagName = $s, 1, 0) AS ExactMatch,
            IIF(TA.TrackID IS NULL, 0, 1) AS AlreadyOnTrack
        FROM Tags T
        LEFT JOIN TaggedAll TA
            ON T.TagName = TA.TagName
            AND TA.TrackID = $t
        WHERE (
            T.TagName = $s
            OR
            T.TagName LIKE CONCAT('%', $s, '%')
        )
    `, { $t: trackID, $s: stringQuery }
    );
}

export async function AddTagForTrack(tagName, trackID) {
    const myDb = await GetDBCached();
    const addedNewTag = await myDb.all(`
        INSERT INTO Tags (TagName)
        SELECT $s
        WHERE NOT EXISTS (
            SELECT NULL
            FROM Tags
            WHERE TagName = $s
        )
        RETURNING TagName
    `, { $s: tagName });

    const addedTrackTag = await myDb.all(`
        INSERT INTO TaggedTracks (TrackID, TagName)
        SELECT $t, $s
        WHERE NOT EXISTS (
            SELECT NULL
            FROM TaggedAll
            WHERE TrackID = $t
            AND TagName = $s
        )
        RETURNING TagName
    `, { $s: tagName, $t: trackID });

    return {
        addedNewTag, 
        addedTrackTag
    };
}

export async function AddArtistTag(tagName, trackID) {

}

export async function RemoveTag(tagName, trackID) {
    const myDb = await GetDBCached();
    const result = await myDb.all(`
        DELETE FROM TaggedTracks
        WHERE TrackID = $t
        AND TagName = $s
    `, { $t: trackID, $s: tagName });
}

export async function GetTagUsageCount(tagName) {
    const myDb = await GetDBCached();
    const trackTagResult = await myDb.all(`
        SELECT COUNT(*) FROM TaggedTracks
        WHERE TagName = $s
    `, { $s: tagName });

    const artistTagResult = await myDb.all(`
        SELECT COUNT(*) FROM TaggedArtists
        WHERE TagName = $s
    `, { $s: tagName });

    return {
        trackCount: trackTagResult,
        artistCount: artistTagResult
    };
}

export async function DeleteTag(tagName) {
    const myDb = await GetDBCached();
    const deleteTracks = await myDb.all(`
        DELETE FROM TaggedTracks
        WHERE TagName = $s
    `, { $s: tagName });

    const deleteArtists = await myDb.all(`
        DELETE FROM TaggedArtists
        WHERE TagName = $s
    `, { $s: tagName });

    const deleteTag = await myDb.all(`
        DELETE FROM Tags
        WHERE TagName = $s
    `, { $s: tagName });
}