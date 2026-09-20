
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

    try {
        db = await open({
            filename: await GetDBPathCached(),
            driver: sqlite3.Database,
            mode: sqlite3.OPEN_READWRITE
        });
        return db;
    }
    catch(e) {
        return false;
    }
}

let rodb = undefined;

async function GetRODBCached() {
    if(rodb) return rodb;

    try {
        rodb = await open({
            filename: await GetDBPathCached(),
            driver: sqlite3.Database,
            mode: sqlite3.OPEN_READONLY
        });
        return rodb;
    }
    catch(e) {
        return false;
    }
}

export function DBClient_BustCaches() {
    db = undefined;
    rodb = undefined;
    dbPath = undefined;
}

export async function GetLandingLinkData() {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
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
    if(!myDb) return undefined;
    const result = await myDb.all(`
        SELECT * FROM Track WHERE TrackID = $t
    `, { $t: trackID }
    );
    if(result.length !== 1) {
        console.error("Somehow got 2 track data for 1 track ID. Query might be wrong...");
    }
    return result[0];
}

export async function GetNextPreviousTrackID(trackID, sequenceType, sequenceOrder) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;

    let sqlOrderColumn = "";
    let nextResult;
    let previousResult;
    switch(sequenceType) {
        case "a-t":
        case "a-a":
        case "a-l":
            switch(sequenceType) {
                case "a-t":
                    sqlOrderColumn = "TrackTitle";
                    break;
                case "a-a":
                    sqlOrderColumn = "coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)";
                    break;
                case "a-l":
                    sqlOrderColumn = "AlbumTitle"; //TODO make tie breaker be TrackNumber instead of TrackID since that is now unique
                    break;
            }

            previousResult = await myDb.all(`
                SELECT TrackID
                FROM Track
                WHERE (
                    ${sqlOrderColumn} = (
                        SELECT ${sqlOrderColumn}
                        FROM Track
                        WHERE TrackID = $t
                    )
                    AND
                    ${(sqlOrderColumn === "AlbumTitle"
                        ? `TrackNumber < (
                            SELECT TrackNumber
                            FROM Track
                            WHERE TrackID = $t
                        )`
                        : "TrackID < $t"
                    )}
                )
                ORDER BY ${sqlOrderColumn} DESC, ${(sqlOrderColumn === "AlbumTitle" ? "TrackNumber" : "TrackID")} DESC
                LIMIT 1
            `, { $t: trackID }
            );

            if(previousResult.length === 0) {
                previousResult = await myDb.all(`
                    SELECT TrackID
                    FROM Track
                    WHERE (
                        ${sqlOrderColumn} < (
                            SELECT ${sqlOrderColumn}
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY ${sqlOrderColumn} DESC, ${(sqlOrderColumn === "AlbumTitle" ? "TrackNumber" : "TrackID")} DESC
                    LIMIT 1
                `, { $t: trackID }
                );
            }

            nextResult = await myDb.all(`
                SELECT TrackID
                FROM Track
                WHERE (
                    ${sqlOrderColumn} = (
                        SELECT ${sqlOrderColumn}
                        FROM Track
                        WHERE TrackID = $t
                    )
                    AND
                    ${(sqlOrderColumn === "AlbumTitle"
                        ? `TrackNumber > (
                            SELECT TrackNumber
                            FROM Track
                            WHERE TrackID = $t
                        )`
                        : "TrackID > $t"
                    )}
                )
                ORDER BY ${sqlOrderColumn} ASC, ${(sqlOrderColumn === "AlbumTitle" ? "TrackNumber" : "TrackID")} ASC
                LIMIT 1
            `, { $t: trackID }
            );

            if(nextResult.length === 0) {
                nextResult = await myDb.all(`
                    SELECT TrackID
                    FROM Track
                    WHERE (
                        ${sqlOrderColumn} > (
                            SELECT ${sqlOrderColumn}
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY ${sqlOrderColumn} ASC, ${(sqlOrderColumn === "AlbumTitle" ? "TrackNumber" : "TrackID")} ASC
                    LIMIT 1
                `, { $t: trackID }
                );
            }
            break;
        case "c-t":
            previousResult = await myDb.all(`
                SELECT TrackID
                FROM Track
                WHERE TrackID < $t
                ORDER BY TrackID DESC
                LIMIT 1
            `, { $t: trackID }
            );

            nextResult = await myDb.all(`
                SELECT TrackID
                FROM Track
                WHERE TrackID > $t
                ORDER BY TrackID ASC
                LIMIT 1
            `, { $t: trackID }
            )
            break;
        case "c-a":
            previousResult = await myDb.all(`
                SELECT TrackID FROM Track
                JOIN (
                    SELECT MIN(TrackID) AS MinID, coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw FROM Track
                    GROUP BY coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                    ORDER BY MIN(TrackID)
                ) SubQ
                    ON SubQ.ArtistsRaw = coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                WHERE SubQ.MinID = (
                    SELECT MIN(TrackID) FROM Track
                    WHERE coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) = (
                        SELECT coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                        FROM Track
                        WHERE TrackID = $t
                    )
                )
                AND TrackID < $t
                ORDER BY SubQ.MinID DESC, TrackID DESC
                LIMIT 1
            `, { $t: trackID }
            );

            if(previousResult.length === 0) {
                previousResult = await myDb.all(`
                    SELECT TrackID FROM Track
                    JOIN (
                        SELECT MIN(TrackID) AS MinID, coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw FROM Track
                        GROUP BY coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                        ORDER BY MIN(TrackID)
                    ) SubQ
                        ON SubQ.ArtistsRaw = coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                    WHERE SubQ.MinID < (
                        SELECT MIN(TrackID) FROM Track
                        WHERE coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) = (
                            SELECT coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY SubQ.MinID DESC, TrackID DESC
                    LIMIT 1
                `, { $t: trackID }
                );
            }

            nextResult = await myDb.all(`
                SELECT TrackID FROM Track
                JOIN (
                    SELECT MIN(TrackID) AS MinID, coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw FROM Track
                    GROUP BY coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                    ORDER BY MIN(TrackID)
                ) SubQ
                    ON SubQ.ArtistsRaw = coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                WHERE SubQ.MinID = (
                    SELECT MIN(TrackID) FROM Track
                    WHERE coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) = (
                        SELECT coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                        FROM Track
                        WHERE TrackID = $t
                    )
                )
                AND TrackID > $t
                ORDER BY SubQ.MinID ASC, TrackID ASC
                LIMIT 1
            `, { $t: trackID }
            );

            if(nextResult.length === 0) {
                nextResult = await myDb.all(`
                    SELECT TrackID FROM Track
                    JOIN (
                        SELECT MIN(TrackID) AS MinID, coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) AS ArtistsRaw FROM Track
                        GROUP BY coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                        ORDER BY MIN(TrackID)
                    ) SubQ
                        ON SubQ.ArtistsRaw = coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                    WHERE SubQ.MinID > (
                        SELECT MIN(TrackID) FROM Track
                        WHERE coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists) = (
                            SELECT coalesce(iif(Artists = '', AlbumArtists, Artists), AlbumArtists)
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY SubQ.MinID ASC, TrackID ASC
                    LIMIT 1
                `, { $t: trackID }
                );
            };
            break;
        case "c-l":
            previousResult = await myDb.all(`
                SELECT TrackID FROM Track
                JOIN (
                    SELECT MIN(TrackID) AS MinID, AlbumTitle AS SubAlbum FROM Track
                    GROUP BY AlbumTitle
                    ORDER BY MIN(TrackID)
                ) SubQ
                    ON SubQ.SubAlbum = AlbumTitle
                WHERE SubQ.MinID = (
                    SELECT MIN(TrackID) FROM Track
                    WHERE AlbumTitle = (
                        SELECT AlbumTitle
                        FROM Track
                        WHERE TrackID = $t
                    )
                )
                AND TrackNumber < (
                    SELECT TrackNumber
                    FROM Track
                    WHERE TrackID = $t
                )
                ORDER BY SubQ.MinID DESC, TrackNumber DESC
                LIMIT 1
            `, { $t: trackID }
            );

            if(previousResult.length === 0) {
                previousResult = await myDb.all(`
                    SELECT TrackID FROM Track
                    JOIN (
                        SELECT MIN(TrackID) AS MinID, AlbumTitle AS SubAlbum FROM Track
                        GROUP BY AlbumTitle
                        ORDER BY MIN(TrackID)
                    ) SubQ
                        ON SubQ.SubAlbum = AlbumTitle
                    WHERE SubQ.MinID < (
                        SELECT MIN(TrackID) FROM Track
                        WHERE AlbumTitle = (
                            SELECT AlbumTitle
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY SubQ.MinID DESC, TrackNumber DESC
                    LIMIT 1
                `, { $t: trackID }
                );  
            }

            nextResult = await myDb.all(`
                SELECT TrackID FROM Track
                JOIN (
                    SELECT MIN(TrackID) AS MinID, AlbumTitle AS SubAlbum FROM Track
                    GROUP BY AlbumTitle
                    ORDER BY MIN(TrackID)
                ) SubQ
                    ON SubQ.SubAlbum = AlbumTitle
                WHERE SubQ.MinID = (
                    SELECT MIN(TrackID) FROM Track
                    WHERE AlbumTitle = (
                        SELECT AlbumTitle
                        FROM Track
                        WHERE TrackID = $t
                    )
                )
                AND TrackNumber > (
                    SELECT TrackNumber
                    FROM Track
                    WHERE TrackID = $t
                )
                ORDER BY SubQ.MinID ASC, TrackNumber ASC
                LIMIT 1
            `, { $t: trackID }
            );

            if(nextResult.length === 0) {
                nextResult = await myDb.all(`
                    SELECT TrackID FROM Track
                    JOIN (
                        SELECT MIN(TrackID) AS MinID, AlbumTitle AS SubAlbum FROM Track
                        GROUP BY AlbumTitle
                        ORDER BY MIN(TrackID)
                    ) SubQ
                        ON SubQ.SubAlbum = AlbumTitle
                    WHERE SubQ.MinID > (
                        SELECT MIN(TrackID) FROM Track
                        WHERE AlbumTitle = (
                            SELECT AlbumTitle
                            FROM Track
                            WHERE TrackID = $t
                        )
                    )
                    ORDER BY SubQ.MinID ASC, TrackNumber ASC
                    LIMIT 1
                `, { $t: trackID }
                );  
            }
            break;
        case "r":
            nextResult = await myDb.all(`
                SELECT * FROM Track
                WHERE ROWID = (
                    SELECT abs(
                        random() % (
                            SELECT COUNT(*)
                            FROM Track
                        )
                    )
                )
            `);

            previousResult = nextResult; //Random has no concept of forwards/backwards
            break;
    }

    if(sequenceOrder) {
        return {
            next: nextResult?.[0]?.TrackID,
            previous: previousResult?.[0]?.TrackID
        };
    } else {
        return {
            previous: nextResult?.[0]?.TrackID,
            next: previousResult?.[0]?.TrackID
        };
    }
}

export async function GetAllTags() {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const allTagResult = await myDb.all(`
        SELECT TagName, Color FROM Tags
    `);

    return allTagResult;
}

export async function GetAllTagsForTrack(trackID) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const allTagResult = await myDb.all(`
        SELECT * FROM TaggedAll
        WHERE TrackID = $t
    `, { $t: trackID }
    );

    return allTagResult;
}

export async function SearchTracks(stringQuery) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
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
    if(!myDb) return undefined;
    return await myDb.all(`
        SELECT
            T.TagName,
            T.Color,
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

export async function AddTagForTrack(tagName, color, trackID) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const addedNewTag = await myDb.all(`
        INSERT INTO Tags (TagName, Color)
        SELECT $s, $c
        WHERE NOT EXISTS (
            SELECT NULL
            FROM Tags
            WHERE TagName = $s
        )
        RETURNING TagName, Color
    `, { $s: tagName, $c: color });

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

export async function GetTagExists(tagName) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const tagExists = await myDb.all(`
        SELECT NULL
        FROM Tags
        WHERE TagName = $s
    `, { $s: tagName });

    return tagExists.length > 0;
}

export async function AddArtistTag(tagName, trackID) {

}

export async function RemoveTag(tagName, trackID) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const result = await myDb.all(`
        DELETE FROM TaggedTracks
        WHERE TrackID = $t
        AND TagName = $s
    `, { $t: trackID, $s: tagName });
}

export async function GetTagUsageCount(tagName) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const trackTagResult = await myDb.all(`
        SELECT COUNT(*) FROM TaggedTracks
        WHERE TagName = $s
    `, { $s: tagName });

    const artistTagResult = await myDb.all(`
        SELECT COUNT(*) FROM TaggedArtists
        WHERE TagName = $s
    `, { $s: tagName });

    const allResult = await myDb.all(`
        SELECT COUNT(*) FROM TaggedAll
        WHERE TagName = $s
    `, { $s: tagName });

    const tagResult = await myDb.all(`
        SELECT COUNT(*) FROM Tags
        WHERE TagName = $s
    `, { $s: tagName });

    return {
        trackCount: trackTagResult,
        artistCount: artistTagResult,
        allCount: allResult,
        tagCount: tagResult
    };
}

export async function DeleteTag(tagName) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
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

export async function UpdateTag(tagName, newTagName, newColor) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const updateTag = myDb.all(`
        UPDATE Tags
        SET TagName = $n, Color = $c
        WHERE TagName = $s
    `, { $s: tagName, $n: newTagName, $c: newColor });

    const updateTracks = myDb.all(`
        UPDATE TaggedTracks
        SET TagName = $n
        WHERE TagName = $s
    `, { $s: tagName, $n: newTagName });

    const updateArtists = myDb.all(`
        UPDATE TaggedArtists
        SET TagName = $n
        WHERE TagName = $s
    `, { $s: tagName, $n: newTagName });
}

export async function MergeTags(tagName, newTagName) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const deleteTag = await myDb.all(`
        DELETE FROM Tags
        WHERE TagName = $s
    `, { $s: tagName });

    const updateTracks = myDb.all(`
        UPDATE TaggedTracks
        SET TagName = $n
        WHERE TagName = $s
    `, { $s: tagName, $n: newTagName });

    const updateArtists = myDb.all(`
        UPDATE TaggedArtists
        SET TagName = $n
        WHERE TagName = $s
    `, { $s: tagName, $n: newTagName });   
}

export async function EvidenceOfInstallation() {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const evidence = await myDb.all(`
         SELECT name FROM sqlite_master WHERE type='table' AND name='Tags'
    `);

    return evidence;
}

export async function GetCurrentVersionOfInstallation() {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const versionResult = await myDb.all(`
         SELECT InfoValue FROM DBTaggerInfo WHERE InfoName = 'Version'
    `);

    return versionResult;
}

export async function GetSortOrderSetting() {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const sortResult = await myDb.all(`
        SELECT InfoValue FROM DBTaggerInfo WHERE InfoName = 'AllTagsSortOrder'
    `);
    return sortResult;
}

export async function UpsertSortOrderSetting(newSetting) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    await myDb.all(`
        INSERT INTO DBTaggerInfo (InfoValue, InfoName)
        SELECT $d, 'AllTagsSortOrder'
        WHERE NOT EXISTS (
            SELECT NULL
            FROM DBTaggerInfo
            WHERE InfoName = 'AllTagsSortOrder'
        )
    `, { $d: newSetting });

    await myDb.all(`
        UPDATE DBTaggerInfo
        SET InfoValue = $d
        WHERE InfoName = 'AllTagsSortOrder'
    `, { $d: newSetting });
}

export async function ExecuteRaw(query, limitOrTrueForAll) {
    const myDb = await GetRODBCached();
    if(!myDb) return undefined;
    let theQuery = query;
    let limited = false;
    if(limitOrTrueForAll !== true && !theQuery.includes("LIMIT ")) {
        theQuery += ` LIMIT ${limitOrTrueForAll}`;
        limited = true;
    }
    const results = await myDb.all(`
        ${theQuery}
    `);    

    return {
        results,
        limited
    };
}

export async function GetTracksHavingTag(tagName) {
    const myDb = await GetDBCached();
    if(!myDb) return undefined;
    const tracksAffected = await myDb.all(`
        SELECT Track.TrackID, Track.TrackTitle
        FROM TaggedAll
        JOIN Track
            ON Track.TrackID = TaggedAll.TrackID
        WHERE TaggedAll.TagName = $s
    `, { $s: tagName });
    
    return tracksAffected;
}