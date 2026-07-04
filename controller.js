import {
    AddTagForTrack,
    DeleteTag,
    EvidenceOfInstallation,
    ExecuteRaw,
    GetAllTags,
    GetAllTagsForTrack,
    GetAllTrackData,
    GetCurrentVersionOfInstallation,
    GetLandingLinkData,
    GetNextPreviousTrackID,
    GetTagUsageCount,
    MergeTags,
    RemoveTag,
    SearchAvailableTags,
    SearchTracks,
    UpdateTag
} from "./db-client.js";
import {
    BasicGetFile,
    GetConfigJSONCached
} from "./utilities.js";

/**
 * [
 *      {
 *          "ArtistsRaw": "Adam Skorupa & Krzysztof Wiezynkiewicz"
 *          "Tracks": [
 *              {
 *                  "TrackID": 1,
 *                  "TitleRaw": "The scent of battle"
 *              },
 *              {
 *                  "TrackID": 2,
 *                  "TitleRaw": "The sewers"
 *              }
 *          ]
 *      }
 * ]
*/
export async function Landing() {
    const result = await GetLandingLinkData();
    const groupedArtists = [];
    result?.forEach(r => {
        const safeArtist = r.ArtistsRaw == "" ? "Unknown Artist" : r.ArtistsRaw;
        if(groupedArtists.filter(g => g.ArtistsRaw === safeArtist).length === 0) {
            groupedArtists.push({
                ArtistsRaw: safeArtist,
                Tracks: []
            });
        }

        groupedArtists.filter(g => g.ArtistsRaw === safeArtist)[0].Tracks.push({
            TrackID: r.TrackID,
            TitleRaw: r.TitleRaw
        });
    });
    return groupedArtists;
}

// To figure out what exact audio file path needs to go into the baseHTML, plus the data that needs to come after like a normal response
export async function Tagging(trackID, baseHtml) {
    const trackData = await GetAllTrackData(trackID);
    const pageInfo = await GetNextPreviousTrackID(trackID);
    const currentTags = await GetAllTagsForTrack(trackID);
    const allTags = await GetAllTags();

    let audioBasePath = (await GetConfigJSONCached()).BaseFolderPath;
    
    let audioHtmlPath = trackData.Path;
    audioHtmlPath = encodeURI(audioHtmlPath.replaceAll("\\", "/"));
    audioBasePath = audioBasePath.replaceAll("\\", "\\\\");
    audioBasePath = audioBasePath.replaceAll("/", "\\/");
    console.log(audioBasePath);
    audioHtmlPath = audioHtmlPath.replace(new RegExp(audioBasePath), "../../");

    baseHtml = baseHtml.replace("$$$PATH$$$", audioHtmlPath);
    
    return {
        modifiedBaseHtml: baseHtml,
        apiData: trackData,
        pageInfo: pageInfo,
        currentTags: currentTags,
        allTags: allTags
    };
}

export async function GetTrackSearchResults(stringQuery) {
    const searchResults = await SearchTracks(stringQuery);
    return searchResults;
}

export async function GetAvailableTagSearchRestults(stringQuery, trackID) {
    const searchResults = await SearchAvailableTags(stringQuery, trackID);
    return searchResults;
}

export async function AddTag(tagName, trackID, artist=false) {
    if(!artist) {
        const addResult = await AddTagForTrack(tagName, trackID);
        return {
            shouldRefreshAllTagList: !!addResult.addedNewTag[0],
            rejectedTagAdd: !addResult.addedTrackTag[0]
        }
    }
    
}

export async function EditTag(tagName, newText) {
    await UpdateTag(tagName, newText);
}

export async function GetDeletionCounts(tagName) {
    const result = await GetTagUsageCount(tagName);
    return {
        trackCount: result.trackCount[0]["COUNT(*)"],
        artistCount: result.artistCount[0]["COUNT(*)"],
        allCount: result.allCount[0]["COUNT(*)"],
        tagCount: result.tagCount[0]["COUNT(*)"],
    }
}

export async function DeleteTagEverywhere(tagName) {
    await DeleteTag(tagName);
}

export async function RemoveTagFromTrack(tagName, trackID) {
    await RemoveTag(tagName, trackID);
}

export async function RefreshTagLists(trackID, allTagsRefresh = 0) {
    const currentTags = await GetAllTagsForTrack(trackID);
    const allTags = !!allTagsRefresh ? await GetAllTags() : undefined;

    return {
        currentTags,
        allTags
    };
}

export async function MergeTwoTags(tagName, newTagName) {
    await MergeTags(tagName, newTagName);
}

export async function IsInstalled() {
    const evidenceResult = await EvidenceOfInstallation();
    let versionResult = undefined;
    if(evidenceResult?.length > 0) {
        versionResult = await GetCurrentVersionOfInstallation();
    }
    let versionFile = await BasicGetFile("./versions.json");
    versionFile = JSON.parse(versionFile);
    return {
        installed: evidenceResult?.length > 0,
        existingVersion: versionResult?.length > 0 ? versionResult[0].InfoValue : undefined,
        presentVersion: versionFile.presentVersion
    };
}

export async function ExecuteRawQuery(query, limitOrTrue) {
    const result = await ExecuteRaw(query, limitOrTrue);
    let limited = result.limited;
    if(limitOrTrue === true || result.results.length < limitOrTrue || (result.results.length == limitOrTrue && !result.limited)) {
        limited = false;
    }
    return {
        limited: limited,
        results: result.results
    };
}